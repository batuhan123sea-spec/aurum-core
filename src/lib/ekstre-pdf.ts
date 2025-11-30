import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Musteri, HesapHareketi } from '@/types/musteri';
import { Satis } from '@/types/satis';
import { getHareketlerByMusteriId, musteriDovizBorclariniHesapla } from './musteri-data';
import { getSatislar } from './satis-data';
import { formatCurrency, getKur } from './kur-hesaplama';
import { getAyarlar } from './ayarlar-data';

interface ProductRow {
  stokKodu: string;
  tanim: string;
  miktar: string;
  fiyat: number;
  kur: string;
  netFiyat: number;
  tutar: number;
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

  let currentY = 15;
  
  // BAŞLIK BÖLÜMÜ
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('SUPHİ TİCARET - KUŞÇU ALİ', 105, currentY, { align: 'center' });
  
  currentY += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('KUYUMCU MAKİNALARI VE MALZEMELERİ', 105, currentY, { align: 'center' });
  
  currentY += 10;
  doc.setLineWidth(0.5);
  doc.line(15, currentY, 195, currentY);
  
  currentY += 8;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('DETAYLI HESAP EKSTRESİ', 105, currentY, { align: 'center' });
  
  currentY += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Müşteri: ${musteri.adSoyad}`, 15, currentY);
  
  currentY += 6;
  const baslangicStr = baslangicTarihi.toLocaleDateString('tr-TR');
  const bitisStr = bitisTarihi.toLocaleDateString('tr-TR');
  doc.text(`Dönem: ${baslangicStr} - ${bitisStr}`, 15, currentY);
  
  currentY += 6;
  doc.text(`Düzenleme Tarihi: ${new Date().toLocaleDateString('tr-TR')}`, 15, currentY);
  
  currentY += 8;
  doc.setLineWidth(0.5);
  doc.line(15, currentY, 195, currentY);
  
  currentY += 8;

  // Satış kayıtlarını çek
  const satislar = getSatislar().filter(s => s.musteriId === musteri.id);
  
  // İŞLEM TABLOSU
  let toplamSatislar = 0;
  let toplamOdemeler = 0;
  let toplamIadeler = 0;

  for (const hareket of donemIciHareketler) {
    const tarih = new Date(hareket.tarih).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    const tlKarsiligi = hareket.tutar * getKur(hareket.paraBirimi);
    
    if (hareket.islemTuru === 'satis') {
      toplamSatislar += tlKarsiligi;
    } else if (hareket.islemTuru === 'odeme') {
      toplamOdemeler += tlKarsiligi;
    } else if (hareket.islemTuru === 'iade') {
      toplamIadeler += tlKarsiligi;
    }

    // İşlem başlığı
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    
    let islemAciklama = '';
    let tutarText = '';
    
    if (hareket.islemTuru === 'odeme') {
      islemAciklama = `${tarih}  ${hareket.odemeTuru?.toUpperCase() || 'NAKİT'}  TAHSİLAT`;
      tutarText = `${formatCurrency(hareket.tutar, hareket.paraBirimi)}`;
    } else if (hareket.islemTuru === 'iade') {
      islemAciklama = `${tarih}  İADE`;
      tutarText = `-${formatCurrency(hareket.tutar, hareket.paraBirimi)}`;
    } else {
      // Satış - satış numarasını aciklamadan çıkar
      const satisNoMatch = hareket.aciklama.match(/(SATS-\d+|REZ-\d+)/);
      const satisNo = satisNoMatch ? satisNoMatch[1] : '';
      islemAciklama = `${tarih}  ${satisNo}  Satış Fatura`;
      tutarText = `${formatCurrency(tlKarsiligi, 'TRY')} (B)`;
    }
    
    doc.text(islemAciklama, 15, currentY);
    doc.text(tutarText, 195, currentY, { align: 'right' });
    
    currentY += 6;
    doc.setLineWidth(0.3);
    doc.line(15, currentY, 195, currentY);
    currentY += 2;

    // Eğer satışsa, ürün detaylarını göster
    if (hareket.islemTuru === 'satis') {
      const satisNoMatch = hareket.aciklama.match(/(SATS-\d+|REZ-\d+)/);
      if (satisNoMatch) {
        const satisNo = satisNoMatch[1];
        const satis = satislar.find(s => s.satisNo === satisNo);
        
        if (satis && satis.kalemler.length > 0) {
          const urunRows: ProductRow[] = satis.kalemler.map(kalem => ({
            stokKodu: kalem.barkod || '-',
            tanim: kalem.urunAdi.length > 30 ? kalem.urunAdi.substring(0, 27) + '...' : kalem.urunAdi,
            miktar: `${kalem.adet} ADET`,
            fiyat: kalem.orijinalBirimFiyati,
            kur: kalem.paraBirimi === 'TRY' ? 'TL' : kalem.paraBirimi === 'USD' ? 'USD' : 'EUR',
            netFiyat: kalem.orijinalBirimFiyati * (1 - kalem.indirimYuzde / 100),
            tutar: kalem.toplamTutar
          }));

          autoTable(doc, {
            startY: currentY,
            head: [[
              { content: 'STOK', styles: { fontStyle: 'bold', fontSize: 8 } },
              { content: 'TANIM', styles: { fontStyle: 'bold', fontSize: 8 } },
              { content: 'MİKTAR', styles: { fontStyle: 'bold', fontSize: 8 } },
              { content: 'FİYAT', styles: { fontStyle: 'bold', fontSize: 8 } },
              { content: 'KUR', styles: { fontStyle: 'bold', fontSize: 8 } },
              { content: 'NET FİYAT', styles: { fontStyle: 'bold', fontSize: 8 } },
              { content: 'TUTAR', styles: { fontStyle: 'bold', fontSize: 8 } }
            ]],
            body: urunRows.map(row => [
              row.stokKodu,
              row.tanim,
              row.miktar,
              row.fiyat.toFixed(2),
              row.kur,
              row.netFiyat.toFixed(2),
              row.tutar.toFixed(2)
            ]),
            margin: { left: 15, right: 15 },
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
            columnStyles: {
              0: { cellWidth: 20 },
              1: { cellWidth: 50 },
              2: { cellWidth: 20 },
              3: { cellWidth: 20 },
              4: { cellWidth: 15 },
              5: { cellWidth: 25 },
              6: { cellWidth: 25 }
            }
          });

          currentY = (doc as any).lastAutoTable.finalY + 4;

          // Fiş toplamları
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          
          const fisToplamY = currentY;
          doc.text('Fiş Toplamı:', 135, fisToplamY);
          doc.text(formatCurrency(satis.araToplam, 'TRY'), 195, fisToplamY, { align: 'right' });
          
          currentY += 5;
          doc.text('KDV Toplamı:', 135, currentY);
          doc.text(formatCurrency(satis.toplamKDV, 'TRY'), 195, currentY, { align: 'right' });
          
          currentY += 5;
          doc.setFont('helvetica', 'bold');
          doc.text('Genel Toplam:', 135, currentY);
          doc.text(formatCurrency(satis.genelToplam, 'TRY'), 195, currentY, { align: 'right' });
          
          currentY += 8;
          doc.setLineWidth(0.3);
          doc.line(15, currentY, 195, currentY);
          currentY += 5;
        }
      }
    }

    // Sayfa sonu kontrolü
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }
  }

  // DÖNEM ÖZETİ
  currentY += 5;
  doc.setLineWidth(0.5);
  doc.line(15, currentY, 195, currentY);
  
  currentY += 8;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DÖNEM ÖZETİ', 105, currentY, { align: 'center' });
  
  currentY += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  doc.text('Dönem Başı Bakiye:', 30, currentY);
  doc.text(formatCurrency(donemBasiBakiye, 'TRY'), 170, currentY, { align: 'right' });
  
  currentY += 7;
  doc.text('Toplam Satışlar:', 30, currentY);
  doc.text(`+${formatCurrency(toplamSatislar, 'TRY')}`, 170, currentY, { align: 'right' });
  
  currentY += 7;
  doc.text('Toplam Tahsilatlar:', 30, currentY);
  doc.text(`-${formatCurrency(toplamOdemeler, 'TRY')}`, 170, currentY, { align: 'right' });
  
  currentY += 7;
  doc.text('Toplam İadeler:', 30, currentY);
  doc.text(`-${formatCurrency(toplamIadeler, 'TRY')}`, 170, currentY, { align: 'right' });
  
  currentY += 8;
  doc.setLineWidth(0.3);
  doc.line(30, currentY, 180, currentY);
  
  currentY += 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  const donemSonuBakiye = donemBasiBakiye + toplamSatislar - toplamOdemeler - toplamIadeler;
  doc.text('DÖNEM SONU BAKİYE:', 30, currentY);
  doc.text(formatCurrency(donemSonuBakiye, 'TRY'), 170, currentY, { align: 'right' });
  
  // ALT BİLGİ
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    
    const footerY = 285;
    doc.setLineWidth(0.3);
    doc.line(15, footerY, 195, footerY);
    
    doc.text('Tel: 0322 363 04 75 - 0543 809 44 00 - 535 377 77 70', 105, footerY + 5, { align: 'center' });
    doc.text('Tepebağ Mah. Çakmak Cad. Hilal Han İş Merkezi Kat:1 No:117 Seyhan/ADANA', 105, footerY + 10, { align: 'center' });
    doc.text('@suphiticaretkuyumcumalzemeleri', 105, footerY + 15, { align: 'center' });
  }

  // PDF'i indir
  const dosyaAdi = `Ekstre_${musteri.adSoyad.replace(/\s+/g, '_')}_${baslangicStr.replace(/\./g, '-')}_${bitisStr.replace(/\./g, '-')}.pdf`;
  doc.save(dosyaAdi);
}
