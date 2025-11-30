import jsPDF from 'jspdf';
import { Musteri, HesapHareketi } from '@/types/musteri';
import { Satis } from '@/types/satis';
import { getHareketlerByMusteriId } from './musteri-data';
import { getSatislar } from './satis-data';
import { formatCurrency, getKur } from './kur-hesaplama';
import { getAyarlar } from './ayarlar-data';

export async function detayliEkstrePdfOlustur(
  musteri: Musteri,
  baslangicTarihi: Date,
  bitisTarihi: Date
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const ayarlar = getAyarlar();
  
  // Tüm hareketleri çek
  const tumHareketler = getHareketlerByMusteriId(musteri.id);
  
  // Dönem öncesi ve dönem içi hareketleri ayır
  const donemOncesiHareketler = tumHareketler.filter(h => 
    new Date(h.tarih) < baslangicTarihi
  );
  
  const donemIciHareketler = tumHareketler.filter(h => {
    const tarih = new Date(h.tarih);
    return tarih >= baslangicTarihi && tarih <= bitisTarihi;
  }).sort((a, b) => new Date(a.tarih).getTime() - new Date(b.tarih).getTime());
  
  // Dönem başı bakiye hesapla
  let donemBasiBakiye = 0;
  donemOncesiHareketler.forEach(h => {
    const tlKarsiligi = h.tutar * getKur(h.paraBirimi);
    if (h.islemTuru === 'satis') {
      donemBasiBakiye += tlKarsiligi;
    } else {
      donemBasiBakiye -= tlKarsiligi;
    }
  });

  let currentY = 15;
  
  // BAŞLIK BÖLÜMÜ
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('SUPHİ TİCARET - KUŞÇU ALİ', 105, currentY, { align: 'center' });
  
  currentY += 5;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('KUYUMCU MAKİNALARI VE MALZEMELERİ', 105, currentY, { align: 'center' });
  
  currentY += 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('CARİ HESAP EKSTRESİ', 105, currentY, { align: 'center' });
  
  currentY += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  // Sol taraf - Müşteri bilgileri
  doc.text(`Hesap Adı   : ${musteri.adSoyad}`, 15, currentY);
  
  // Sağ taraf - Tarih bilgileri
  const baslangicStr = baslangicTarihi.toLocaleDateString('tr-TR');
  const bitisStr = bitisTarihi.toLocaleDateString('tr-TR');
  doc.text(`Başlangıç Tarihi : ${baslangicStr}`, 140, currentY);
  
  currentY += 5;
  if (musteri.telefon) {
    doc.text(`Telefon     : ${musteri.telefon}`, 15, currentY);
  }
  doc.text(`Bitiş Tarihi     : ${bitisStr}`, 140, currentY);
  
  currentY += 8;

  // Satış kayıtlarını çek
  const satislar = getSatislar().filter(s => s.musteriId === musteri.id);
  
  // TABLO BAŞLIĞI
  doc.setLineWidth(0.5);
  doc.line(15, currentY, 195, currentY);
  currentY += 5;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  
  // Kolon başlıkları
  doc.text('TARİH', 15, currentY);
  doc.text('TÜRÜ', 42, currentY);
  doc.text('AÇIKLAMA', 77, currentY);
  doc.text('BORÇ', 147, currentY, { align: 'right' });
  doc.text('ALACAK', 174, currentY, { align: 'right' });
  doc.text('BAKİYE', 195, currentY, { align: 'right' });
  
  currentY += 2;
  doc.line(15, currentY, 195, currentY);
  currentY += 5;

  // İşlem satırları
  let mevcutBakiye = donemBasiBakiye;
  let toplamBorc = 0;
  let toplamAlacak = 0;
  
  doc.setFont('helvetica', 'normal');

  // İlk satır: Devir (Açılış bakiyesi)
  doc.text(baslangicStr, 15, currentY);
  doc.text('Devir', 42, currentY);
  doc.text('Önceki Bakiye', 77, currentY);
  doc.text(formatCurrency(mevcutBakiye, 'TRY'), 195, currentY, { align: 'right' });
  currentY += 5;

  // Hareketleri işle
  for (const hareket of donemIciHareketler) {
    const tarih = new Date(hareket.tarih).toLocaleDateString('tr-TR');
    const tlKarsiligi = hareket.tutar * getKur(hareket.paraBirimi);
    
    let tur = '';
    let aciklama = '';
    let borcTutar = '';
    let alacakTutar = '';
    
    if (hareket.islemTuru === 'satis') {
      tur = 'Satış';
      aciklama = 'Mal Satışı';
      borcTutar = formatCurrency(tlKarsiligi, 'TRY');
      toplamBorc += tlKarsiligi;
      mevcutBakiye += tlKarsiligi;
    } else if (hareket.islemTuru === 'odeme') {
      tur = `Ödeme (${hareket.odemeTuru === 'nakit' ? 'Nakit' : hareket.odemeTuru === 'kredi-karti' ? 'Kredi Kartı' : hareket.odemeTuru === 'eft' ? 'EFT' : 'Havale'})`;
      aciklama = 'Tahsilat';
      alacakTutar = formatCurrency(tlKarsiligi, 'TRY');
      toplamAlacak += tlKarsiligi;
      mevcutBakiye -= tlKarsiligi;
    } else if (hareket.islemTuru === 'iade') {
      tur = 'İade';
      aciklama = 'İade İşlemi';
      alacakTutar = formatCurrency(tlKarsiligi, 'TRY');
      toplamAlacak += tlKarsiligi;
      mevcutBakiye -= tlKarsiligi;
    }
    
    // İşlem satırı
    doc.text(tarih, 15, currentY);
    doc.text(tur, 42, currentY);
    doc.text(aciklama, 77, currentY);
    if (borcTutar) doc.text(borcTutar, 147, currentY, { align: 'right' });
    if (alacakTutar) doc.text(alacakTutar, 174, currentY, { align: 'right' });
    doc.text(formatCurrency(mevcutBakiye, 'TRY'), 195, currentY, { align: 'right' });
    
    currentY += 5;

    // Eğer satışsa, ürün detaylarını göster
    if (hareket.islemTuru === 'satis') {
      const satisNoMatch = hareket.aciklama.match(/(SATS-\d+|REZ-\d+)/);
      if (satisNoMatch) {
        const satisNo = satisNoMatch[1];
        const satis = satislar.find(s => s.satisNo === satisNo);
        
        if (satis && satis.kalemler.length > 0) {
          doc.setFontSize(8);
          
          // Ürün detaylarını girintili göster
          satis.kalemler.forEach(kalem => {
            const stokKodu = kalem.barkod || '-';
            const urunAdi = kalem.urunAdi.length > 35 ? kalem.urunAdi.substring(0, 32) + '...' : kalem.urunAdi;
            
            // Ürün satırı
            doc.text(`   ${stokKodu} - ${urunAdi}`, 17, currentY);
            currentY += 4;
            
            // Fiyat satırı
            const miktar = kalem.adet;
            const birimFiyat = kalem.orijinalBirimFiyati.toFixed(2);
            const paraBirimi = kalem.paraBirimi;
            const toplamOrijinal = (kalem.adet * kalem.orijinalBirimFiyati * (1 - kalem.indirimYuzde / 100)).toFixed(2);
            const tlTutar = kalem.toplamTutar.toFixed(2);
            
            doc.text(`   ${miktar} ADET x ${birimFiyat} ${paraBirimi} = ${toplamOrijinal} ${paraBirimi} → ${tlTutar} TL`, 17, currentY);
            currentY += 5;
            
            // Sayfa sonu kontrolü
            if (currentY > 260) {
              doc.addPage();
              currentY = 20;
            }
          });
          
          doc.setFontSize(10);
          currentY += 2;
        }
      }
    }

    // Sayfa sonu kontrolü
    if (currentY > 260) {
      doc.addPage();
      currentY = 20;
      
      // Yeni sayfada tablo başlığı tekrarla
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('TARİH', 15, currentY);
      doc.text('TÜRÜ', 42, currentY);
      doc.text('AÇIKLAMA', 77, currentY);
      doc.text('BORÇ', 147, currentY, { align: 'right' });
      doc.text('ALACAK', 174, currentY, { align: 'right' });
      doc.text('BAKİYE', 195, currentY, { align: 'right' });
      currentY += 2;
      doc.setLineWidth(0.5);
      doc.line(15, currentY, 195, currentY);
      currentY += 5;
      doc.setFont('helvetica', 'normal');
    }
  }

  // TOPLAM SATIRI
  doc.setLineWidth(0.5);
  doc.line(15, currentY, 195, currentY);
  currentY += 5;
  
  doc.setFont('helvetica', 'bold');
  doc.text('TOPLAM:', 77, currentY);
  doc.text(formatCurrency(toplamBorc, 'TRY'), 147, currentY, { align: 'right' });
  doc.text(formatCurrency(toplamAlacak, 'TRY'), 174, currentY, { align: 'right' });
  doc.text(formatCurrency(mevcutBakiye, 'TRY'), 195, currentY, { align: 'right' });
  
  currentY += 2;
  doc.line(15, currentY, 195, currentY);

  // ALT BİLGİ (Tüm sayfalara)
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    
    const footerY = 285;
    doc.text('Tel: 0322 363 04 75 - 0543 809 44 00', 105, footerY, { align: 'center' });
    doc.text('Tepebağ Mah. Çakmak Cad. Hilal Han İş Merkezi Kat:1 No:117 Seyhan/ADANA', 105, footerY + 4, { align: 'center' });
  }

  // PDF'i indir
  const dosyaAdi = `CariHesapEkstresi_${musteri.adSoyad.replace(/\s+/g, '_')}_${baslangicStr.replace(/\./g, '-')}_${bitisStr.replace(/\./g, '-')}.pdf`;
  doc.save(dosyaAdi);
}
