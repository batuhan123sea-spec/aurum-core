import jsPDF from 'jspdf';
import { Musteri, HesapHareketi } from '@/types/musteri';
import { Satis } from '@/types/satis';
import { getHareketlerByMusteriId } from './musteri-data';
import { getSatislar } from './satis-data';
import { getKur } from './kur-hesaplama';
import { getAyarlar } from './ayarlar-data';

// Türkçe karakterleri ASCII'ye çevir (jsPDF helvetica fontunda çalışması için)
function tr(text: string): string {
  return text
    .replace(/İ/g, 'I').replace(/ı/g, 'i')
    .replace(/Ş/g, 'S').replace(/ş/g, 's')
    .replace(/Ğ/g, 'G').replace(/ğ/g, 'g')
    .replace(/Ü/g, 'U').replace(/ü/g, 'u')
    .replace(/Ö/g, 'O').replace(/ö/g, 'o')
    .replace(/Ç/g, 'C').replace(/ç/g, 'c')
    .replace(/₺/g, 'TL').replace(/€/g, 'EUR').replace(/\$/g, 'USD');
}

// PDF için para formatı (₺ yerine TL yazar)
function pdfParaFormat(tutar: number, paraBirimi: string = 'TRY'): string {
  const formatted = tutar.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  const sembol: Record<string, string> = {
    'TRY': 'TL',
    'USD': 'USD',
    'EUR': 'EUR'
  };
  
  return `${formatted} ${sembol[paraBirimi] || 'TL'}`;
}

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

  // Satış kayıtlarını çek
  const satislar = getSatislar().filter(s => s.musteriId === musteri.id);

  // Hareketleri tarihe göre grupla
  const gunlukGruplar = new Map<string, HesapHareketi[]>();
  
  donemIciHareketler.forEach(hareket => {
    const tarihKey = new Date(hareket.tarih).toLocaleDateString('tr-TR');
    if (!gunlukGruplar.has(tarihKey)) {
      gunlukGruplar.set(tarihKey, []);
    }
    gunlukGruplar.get(tarihKey)!.push(hareket);
  });

  let currentY = 15;
  
  // BAŞLIK BÖLÜMÜ
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(tr('SUPHI TICARET - KUSCU ALI'), 105, currentY, { align: 'center' });
  
  currentY += 5;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(tr('KUYUMCU MAKINALARI VE MALZEMELERI'), 105, currentY, { align: 'center' });
  
  currentY += 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(tr('CARI HESAP EKSTRESI'), 105, currentY, { align: 'center' });
  
  currentY += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  // Sol taraf - Müşteri bilgileri
  doc.text(tr(`Hesap Adi   : ${musteri.adSoyad}`), 15, currentY);
  
  // Sağ taraf - Tarih bilgileri
  const baslangicStr = baslangicTarihi.toLocaleDateString('tr-TR');
  const bitisStr = bitisTarihi.toLocaleDateString('tr-TR');
  doc.text(tr(`Baslangic Tarihi : ${baslangicStr}`), 140, currentY);
  
  currentY += 5;
  if (musteri.telefon) {
    doc.text(tr(`Telefon     : ${musteri.telefon}`), 15, currentY);
  }
  doc.text(tr(`Bitis Tarihi     : ${bitisStr}`), 140, currentY);
  
  currentY += 8;

  // TABLO BAŞLIĞI
  doc.setLineWidth(0.5);
  doc.line(15, currentY, 195, currentY);
  currentY += 5;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  
  // Yeni sütun başlıkları (sadeleştirilmiş)
  doc.text('TARIH', 15, currentY);
  doc.text('ISLEM DETAYI', 50, currentY);
  doc.text('BORC', 135, currentY, { align: 'right' });
  doc.text('ALACAK', 165, currentY, { align: 'right' });
  doc.text('BAKIYE', 195, currentY, { align: 'right' });
  
  currentY += 2;
  doc.line(15, currentY, 195, currentY);
  currentY += 5;

  // İşlem satırları
  let mevcutBakiye = donemBasiBakiye;
  let toplamBorc = 0;
  let toplamAlacak = 0;
  
  doc.setFont('helvetica', 'normal');

  // İlk satır: Devir (Açılış bakiyesi)
  doc.text(tr(baslangicStr), 15, currentY);
  doc.text(tr('Devir'), 50, currentY);
  doc.text(pdfParaFormat(mevcutBakiye), 195, currentY, { align: 'right' });
  currentY += 3;
  
  // Devir satırından sonra ayırıcı çizgi
  doc.setLineWidth(0.2);
  doc.line(15, currentY, 195, currentY);
  currentY += 4;

  // Tarihe göre gruplu işlemleri göster
  const tarihler = Array.from(gunlukGruplar.keys()).sort((a, b) => {
    const dateA = a.split('.').reverse().join('-');
    const dateB = b.split('.').reverse().join('-');
    return dateA.localeCompare(dateB);
  });

  for (const tarih of tarihler) {
    const gunlukHareketler = gunlukGruplar.get(tarih)!;
    
    // Satışları grupla
    const satisHareketleri = gunlukHareketler.filter(h => h.islemTuru === 'satis');
    const odemeHareketleri = gunlukHareketler.filter(h => h.islemTuru === 'odeme');
    const iadeHareketleri = gunlukHareketler.filter(h => h.islemTuru === 'iade');
    
    // SATIŞLAR - hepsi tek satırda
    if (satisHareketleri.length > 0) {
      let gunlukSatisToplam = 0;
      const tumUrunler: any[] = [];
      
      // Tüm satışların ürünlerini ve toplamlarını hesapla
      satisHareketleri.forEach(hareket => {
        const tlKarsiligi = hareket.tutar * getKur(hareket.paraBirimi);
        gunlukSatisToplam += tlKarsiligi;
        
        // Ürün detaylarını bul
        const satisNoMatch = hareket.aciklama.match(/(SATS-\d+|REZ-\d+)/);
        if (satisNoMatch) {
          const satisNo = satisNoMatch[1];
          const satis = satislar.find(s => s.satisNo === satisNo);
          if (satis && satis.kalemler.length > 0) {
            tumUrunler.push(...satis.kalemler.map(k => ({
              ...k,
              satisNo
            })));
          }
        }
      });
      
      // Satış ana satırı
      doc.text(tr(tarih), 15, currentY);
      doc.text(tr(`Satis (${tumUrunler.length} urun)`), 50, currentY);
      doc.text(pdfParaFormat(gunlukSatisToplam), 135, currentY, { align: 'right' });
      
      mevcutBakiye += gunlukSatisToplam;
      toplamBorc += gunlukSatisToplam;
      doc.text(pdfParaFormat(mevcutBakiye), 195, currentY, { align: 'right' });
      currentY += 5;
      
      // Ürün detaylarını alt satırlarda göster
      if (tumUrunler.length > 0) {
        doc.setFontSize(8);
        
        tumUrunler.forEach(kalem => {
          const stokKodu = kalem.barkod || '-';
          const urunAdi = kalem.urunAdi.length > 35 ? tr(kalem.urunAdi.substring(0, 32) + '...') : tr(kalem.urunAdi);
          
          const miktar = kalem.adet;
          const birimFiyat = kalem.orijinalBirimFiyati.toFixed(2);
          const paraBirimi = kalem.paraBirimi === 'TRY' ? 'TL' : kalem.paraBirimi;
          
          doc.text(tr(`   - ${urunAdi} (${miktar} adet x ${birimFiyat} ${paraBirimi})`), 17, currentY);
          currentY += 4;
          
          // Sayfa sonu kontrolü
          if (currentY > 260) {
            doc.addPage();
            currentY = 20;
            
            // Yeni sayfada tablo başlığı
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('TARIH', 15, currentY);
            doc.text('ISLEM DETAYI', 50, currentY);
            doc.text('BORC', 135, currentY, { align: 'right' });
            doc.text('ALACAK', 165, currentY, { align: 'right' });
            doc.text('BAKIYE', 195, currentY, { align: 'right' });
            currentY += 2;
            doc.setLineWidth(0.5);
            doc.line(15, currentY, 195, currentY);
            currentY += 5;
            doc.setFont('helvetica', 'normal');
          }
        });
        
        doc.setFontSize(10);
        currentY += 1;
      }
      
      // Satış blokundan sonra ayırıcı çizgi
      doc.setLineWidth(0.2);
      doc.line(15, currentY, 195, currentY);
      currentY += 4;
    }
    
    // ÖDEMELER - her ödeme ayrı satır
    odemeHareketleri.forEach(hareket => {
      const tlKarsiligi = hareket.tutar * getKur(hareket.paraBirimi);
      const odemeTipi = hareket.odemeTuru === 'nakit' ? 'Nakit' : 
                        hareket.odemeTuru === 'kredi-karti' ? 'Kredi Karti' : 
                        hareket.odemeTuru === 'eft' ? 'EFT' : 'Havale';
      
      doc.text(tr(tarih), 15, currentY);
      doc.text(tr(`${odemeTipi} Odeme`), 50, currentY);
      doc.text(pdfParaFormat(tlKarsiligi), 165, currentY, { align: 'right' });
      
      mevcutBakiye -= tlKarsiligi;
      toplamAlacak += tlKarsiligi;
      doc.text(pdfParaFormat(mevcutBakiye), 195, currentY, { align: 'right' });
      currentY += 3;
      
      doc.setLineWidth(0.2);
      doc.line(15, currentY, 195, currentY);
      currentY += 4;
    });
    
    // İADELER - her iade ayrı satır
    iadeHareketleri.forEach(hareket => {
      const tlKarsiligi = hareket.tutar * getKur(hareket.paraBirimi);
      
      doc.text(tr(tarih), 15, currentY);
      doc.text(tr('Iade'), 50, currentY);
      doc.text(pdfParaFormat(tlKarsiligi), 165, currentY, { align: 'right' });
      
      mevcutBakiye -= tlKarsiligi;
      toplamAlacak += tlKarsiligi;
      doc.text(pdfParaFormat(mevcutBakiye), 195, currentY, { align: 'right' });
      currentY += 3;
      
      doc.setLineWidth(0.2);
      doc.line(15, currentY, 195, currentY);
      currentY += 4;
    });

    // Sayfa sonu kontrolü
    if (currentY > 260) {
      doc.addPage();
      currentY = 20;
      
      // Yeni sayfada tablo başlığı tekrarla
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('TARIH', 15, currentY);
      doc.text('ISLEM DETAYI', 50, currentY);
      doc.text('BORC', 135, currentY, { align: 'right' });
      doc.text('ALACAK', 165, currentY, { align: 'right' });
      doc.text('BAKIYE', 195, currentY, { align: 'right' });
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
  doc.text('TOPLAM:', 50, currentY);
  doc.text(pdfParaFormat(toplamBorc), 135, currentY, { align: 'right' });
  doc.text(pdfParaFormat(toplamAlacak), 165, currentY, { align: 'right' });
  doc.text(pdfParaFormat(mevcutBakiye), 195, currentY, { align: 'right' });
  
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
    doc.text(tr('Tepebag Mah. Cakmak Cad. Hilal Han Is Merkezi Kat:1 No:117 Seyhan/ADANA'), 105, footerY + 4, { align: 'center' });
  }

  // PDF'i indir (dosya adında Türkçe karakter yok)
  const temizMusteriAdi = tr(musteri.adSoyad).replace(/\s+/g, '_');
  const temizBaslangic = tr(baslangicStr).replace(/\./g, '-');
  const temizBitis = tr(bitisStr).replace(/\./g, '-');
  const dosyaAdi = `CariHesapEkstresi_${temizMusteriAdi}_${temizBaslangic}_${temizBitis}.pdf`;
  doc.save(dosyaAdi);
}
