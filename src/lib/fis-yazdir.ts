import { Musteri, HesapHareketi } from "@/types/musteri";
import { formatCurrency } from "./kur-hesaplama";
import { getAyarlar } from "./ayarlar-data";

function center(text: string, genislik: number): string {
  const padding = Math.max(0, Math.floor((genislik - text.length) / 2));
  return ' '.repeat(padding) + text;
}

function line(genislik: number, char: string = '-'): string {
  return char.repeat(genislik);
}

function align(text: string, genislik: number = 32): string {
  return text.padStart(genislik);
}

export function tahsilatFisiOlustur(
  musteri: Musteri,
  odeme: HesapHareketi,
  oncekiBorc: number
): string {
  const ayarlar = getAyarlar();
  const firma = ayarlar.firma;
  const fisAyarlari = ayarlar.fis;
  
  const tarih = new Date(odeme.tarih);
  const formatTarih = tarih.toLocaleDateString('tr-TR');
  const formatSaat = tarih.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  
  const pad = (text: string, length: number = 20) => text.substring(0, length).padEnd(length);
  const padRight = (text: string, length: number = 14) => text.padStart(length);
  
  const odemeTuruText = odeme.odemeTuru === 'kredi-karti' ? 'Kredi Kartı' :
                        odeme.odemeTuru === 'eft' ? 'EFT' :
                        odeme.odemeTuru === 'havale' ? 'Havale' : 'Nakit';
  
  const baslik = center(fisAyarlari.baslik || 'TAHSİLAT FİŞİ', 31);
  const firmaAdi = center(firma.firmaAdi || 'Firma Adı', 31);
  const altBilgi = center(fisAyarlari.altBilgi || 'Teşekkür Ederiz!', 31);
  const telefon = firma.telefon ? center(`📞 ${firma.telefon}`, 31) : '';
  const email = firma.email ? center(firma.email, 31) : '';
  const reklamAlani = fisAyarlari.reklamAlani ? `\n${fisAyarlari.reklamAlani}\n` : '';
  
  return `
╔═══════════════════════════════╗
║${baslik}║
║${firmaAdi}║
╠═══════════════════════════════╣
║       TAHSİLAT FİŞİ          ║
║  Tarih: ${formatTarih} ${formatSaat}  ║
╠═══════════════════════════════╣
║ Müşteri: ${pad(musteri.adSoyad)} ║
║ Telefon: ${pad(musteri.telefon)} ║
${musteri.email ? `║ E-posta: ${pad(musteri.email)} ║` : ''}
╠═══════════════════════════════╣
║ ÖNCEKİ BORÇ:  ${padRight(formatCurrency(oncekiBorc, 'TRY'))} ║
║ TAHSİLAT:     ${padRight(formatCurrency(odeme.tlKarsiligi, 'TRY'))} ║
${odeme.paraBirimi !== 'TRY' ? `║ (${formatCurrency(odeme.tutar, odeme.paraBirimi)} x ${odeme.kur.toFixed(2)})${' '.repeat(Math.max(0, 30 - (`(${formatCurrency(odeme.tutar, odeme.paraBirimi)} x ${odeme.kur.toFixed(2)})`.length)))} ║` : ''}
╠═══════════════════════════════╣
║ YENİ BAKİYE:  ${padRight(formatCurrency(odeme.bakiye, 'TRY'))} ║
╠═══════════════════════════════╣
║ Ödeme: ${pad(odemeTuruText, 23)} ║
║ Para Birimi: ${pad(odeme.paraBirimi, 18)} ║
${odeme.aciklama ? `║ Not: ${pad(odeme.aciklama, 26)} ║` : ''}
╠═══════════════════════════════╣
║${altBilgi}║
${telefon ? `║${telefon}║\n` : ''}${email ? `║${email}║\n` : ''}╚═══════════════════════════════╝${reklamAlani}`.trim();
}

export function haftalikTahsilatFisiOlustur(
  musteri: { adSoyad: string; kod: string; telefon: string },
  baslangicTarihi: string,
  bitisTarihi: string,
  baslangicBakiyesi: number,
  buHaftaOdemeler: Array<{ tarih: string; aciklama: string; tutar: number; odemeTuru?: string }>,
  buHaftaSatislar: Array<{
    tarih: string;
    satisNo: string;
    tutar: number;
    paraBirimi: string;
    orijinalTutar: number;
    kalemler: Array<{
      urunAdi: string;
      adet: number;
      orijinalBirimFiyati: number;
      paraBirimi: string;
      toplamTutar: number;
    }>;
  }>,
  buHaftaIadeler: Array<{
    tarih: string;
    aciklama: string;
    tutar: number;
    paraBirimi: string;
    orijinalTutar: number;
  }>,
  guncelBakiye: number
): string {
  const ayarlar = getAyarlar();
  const firma = ayarlar.firma;
  const fisAyarlari = ayarlar.fis;
  
  // Hesaplamalar - Para birimine göre grupla
  const toplamlarByPB: Record<string, number> = { TRY: 0, USD: 0, EUR: 0 };
  buHaftaSatislar.forEach(satis => {
    satis.kalemler.forEach(kalem => {
      const pb = kalem.paraBirimi;
      const birimFiyat = kalem.orijinalBirimFiyati;
      toplamlarByPB[pb] += kalem.adet * birimFiyat;
    });
  });
  
  const toplamOdeme = buHaftaOdemeler.reduce((sum, o) => sum + o.tutar, 0);
  
  const W = 40; // Termal yazıcı genişliği
  let fis = '\n';
  
  // 1. BAŞLIK
  fis += line(W, '=') + '\n';
  fis += center(firma.firmaAdi || 'FIRMA ADI', W) + '\n';
  if (fisAyarlari.reklamAlani) {
    fis += center(`(${fisAyarlari.reklamAlani})`, W) + '\n';
  }
  fis += line(W, '=') + '\n';
  fis += '\n';
  
  // 2. MÜŞTERİ
  fis += `Sayin ${musteri.adSoyad}\n`;
  fis += '\n';
  
  // 3. GEÇEN HAFTA BORÇ
  fis += line(W, '-') + '\n';
  const gecenHaftaBorcStr = `Gecen Haftadan Kalan Borc:`;
  const borcTutarStr = `${formatCurrency(baslangicBakiyesi, 'TRY')}`;
  const borcSatir = gecenHaftaBorcStr + ' '.repeat(Math.max(1, W - gecenHaftaBorcStr.length - borcTutarStr.length)) + borcTutarStr;
  fis += borcSatir + '\n';
  fis += line(W, '-') + '\n';
  fis += '\n';
  
  // 4. BU HAFTA SATIŞLAR
  const toplamSatis = buHaftaSatislar.reduce((sum, s) => sum + s.tutar, 0);
  
  if (buHaftaSatislar.length > 0) {
    fis += 'Bu Hafta Alinan Urunler:\n';
    fis += line(W, '-') + '\n';
    fis += 'Urun           Adet   Fiyat    Toplam\n';
    fis += line(W, '-') + '\n';
    
    buHaftaSatislar.forEach(satis => {
      satis.kalemler.forEach(kalem => {
        const urunAdi = kalem.urunAdi.substring(0, 13).padEnd(13);
        const adet = String(kalem.adet).padStart(4);
        
        // Para birimine göre fiyat ve sembol
        const paraBirimi = kalem.paraBirimi;
        const birimFiyat = kalem.orijinalBirimFiyati;
        const kalemToplam = kalem.adet * birimFiyat;
        
        const symbol = paraBirimi === 'USD' ? '$' : paraBirimi === 'EUR' ? '€' : 'TL';
        const fiyat = birimFiyat.toFixed(0).padStart(7);
        const toplam = `${kalemToplam.toFixed(0)} ${symbol}`.padStart(10);
        
        fis += ` ${urunAdi} ${adet} ${fiyat} ${toplam}\n`;
      });
    });
    
    fis += line(W, '-') + '\n';
    
    // Her para birimi için ayrı toplam satırı
    if (toplamlarByPB.USD > 0) {
      const usdToplamStr = `Urunler (USD): ${toplamlarByPB.USD.toFixed(0)} $`;
      fis += ' '.repeat(Math.max(0, W - usdToplamStr.length)) + usdToplamStr + '\n';
    }
    if (toplamlarByPB.EUR > 0) {
      const eurToplamStr = `Urunler (EUR): ${toplamlarByPB.EUR.toFixed(0)} €`;
      fis += ' '.repeat(Math.max(0, W - eurToplamStr.length)) + eurToplamStr + '\n';
    }
    if (toplamlarByPB.TRY > 0) {
      const tryToplamStr = `Urunler (TRY): ${formatCurrency(toplamlarByPB.TRY, 'TRY')}`;
      fis += ' '.repeat(Math.max(0, W - tryToplamStr.length)) + tryToplamStr + '\n';
    }
    
    fis += line(W, '-') + '\n';
    const satisToplamStr = `Satislar Toplami: ${formatCurrency(toplamSatis, 'TRY')}`;
    fis += ' '.repeat(Math.max(0, W - satisToplamStr.length)) + satisToplamStr + '\n';
    fis += '\n';
  }

  // 4.5. BU HAFTA İADELER
  const toplamIade = buHaftaIadeler.reduce((sum, i) => sum + i.tutar, 0);
  
  if (buHaftaIadeler.length > 0) {
    fis += 'Bu Hafta Iadeler:\n';
    fis += line(W, '-') + '\n';
    
    buHaftaIadeler.forEach(iade => {
      const tarihStr = new Date(iade.tarih).toLocaleDateString('tr-TR');
      const iadeTutarStr = `-${formatCurrency(iade.tutar, 'TRY')}`;
      const aciklama = iade.aciklama.substring(0, 20);
      
      fis += `${tarihStr}\n`;
      fis += `  ${aciklama}`;
      fis += ' '.repeat(Math.max(1, W - aciklama.length - iadeTutarStr.length - 2));
      fis += iadeTutarStr + '\n';
    });
    
    fis += line(W, '-') + '\n';
    const iadeToplamStr = `Iadeler Toplami: -${formatCurrency(toplamIade, 'TRY')}`;
    fis += ' '.repeat(Math.max(0, W - iadeToplamStr.length)) + iadeToplamStr + '\n';
    fis += '\n';
  }

  // Net satış (satışlar - iadeler)
  const netSatis = toplamSatis - toplamIade;
  if (toplamIade > 0) {
    const netSatisStr = `Net Satis: ${formatCurrency(netSatis, 'TRY')}`;
    fis += ' '.repeat(Math.max(0, W - netSatisStr.length)) + netSatisStr + '\n';
    fis += '\n';
  }
  
  // 5. BU HAFTA ÖDEMELER
  if (buHaftaOdemeler.length > 0) {
    fis += 'Bu Hafta Yapilan Odemeler:\n';
    fis += line(W, '-') + '\n';
    
    buHaftaOdemeler.forEach(odeme => {
      const odemeTuru = odeme.odemeTuru === 'kredi-karti' ? 'Kredi Karti' :
                        odeme.odemeTuru === 'eft' ? 'EFT' :
                        odeme.odemeTuru === 'havale' ? 'Havale' : 'Nakit';
      const odemeTutarStr = formatCurrency(odeme.tutar, 'TRY');
      const odemeSatir = `- ${odemeTuru}:` + ' '.repeat(Math.max(1, W - odemeTuru.length - odemeTutarStr.length - 4)) + odemeTutarStr;
      fis += odemeSatir + '\n';
    });
    
    fis += line(W, '-') + '\n';
    const odemelerToplamStr = `Odemeler Toplami: ${formatCurrency(toplamOdeme, 'TRY')}`;
    fis += ' '.repeat(Math.max(0, W - odemelerToplamStr.length)) + odemelerToplamStr + '\n';
    fis += '\n';
  }
  
  // 6. TOPLAM BAKİYE
  fis += line(W, '=') + '\n';
  const bakiyeStr = `TOPLAM BAKIYE: ${formatCurrency(guncelBakiye, 'TRY')}`;
  fis += center(bakiyeStr, W) + '\n';
  fis += line(W, '=') + '\n';
  fis += '\n';
  
  // 7. TEŞEKKÜR
  fis += center('Bizi tercih ettiginiz icin', W) + '\n';
  fis += center('tesekkur ederiz.', W) + '\n';
  fis += '\n';
  fis += line(W, '=') + '\n';
  
  return fis;
}

export function rezervFisiOlustur(rezerv: any): string {
  const ayarlar = getAyarlar();
  const firma = ayarlar.firma;
  const fisAyarlari = ayarlar.fis;
  
  const W = 40;
  let fis = '';
  
  // Başlık
  fis += '\n';
  fis += line(W, '=') + '\n';
  fis += center(firma.firmaAdi || 'Firma Adı', W) + '\n';
  if (fisAyarlari.reklamAlani) {
    fis += center(`(${fisAyarlari.reklamAlani})`, W) + '\n';
  }
  fis += line(W, '=') + '\n';
  fis += '\n';
  
  // Rezerv bilgileri
  fis += `REZERV FISI - ${rezerv.satisNo}\n`;
  fis += `Tarih: ${new Date(rezerv.tarih).toLocaleString('tr-TR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })}\n`;
  fis += '\n';
  
  fis += line(W, '-') + '\n';
  fis += center('REZERVE EDILEN URUNLER', W) + '\n';
  fis += line(W, '-') + '\n';
  
  // Ürünler - orijinal para biriminde
  rezerv.kalemler.forEach((kalem: any, index: number) => {
    const paraBirimiSimge = kalem.paraBirimi === 'USD' ? '$' : 
                           kalem.paraBirimi === 'EUR' ? '€' : 'TL';
    const birimFiyat = kalem.orijinalBirimFiyati || kalem.birimFiyati;
    const toplamFiyat = birimFiyat * kalem.adet;
    
    fis += ` ${index + 1}. ${kalem.urunAdi}\n`;
    fis += `    ${kalem.adet} adet x ${birimFiyat.toLocaleString('tr-TR', {minimumFractionDigits: 2})} ${paraBirimiSimge}`;
    fis += ` = ${toplamFiyat.toLocaleString('tr-TR', {minimumFractionDigits: 2})} ${paraBirimiSimge}\n`;
    fis += '\n';
  });
  
  fis += line(W, '-') + '\n';
  fis += '\n';
  
  // Genel toplam (TL cinsinden)
  fis += center(`GENEL TOPLAM: ${rezerv.genelToplam.toLocaleString('tr-TR', {minimumFractionDigits: 2})} TL`, W) + '\n';
  fis += '\n';
  
  // Mali değeri yoktur notu
  fis += line(W, '=') + '\n';
  fis += center('Bu fis bilgi amaclidir,', W) + '\n';
  fis += center('mali degeri yoktur.', W) + '\n';
  fis += line(W, '=') + '\n';
  
  // Alt bilgi
  fis += center(fisAyarlari.altBilgi || 'Tesekkur Ederiz!', W) + '\n';
  if (firma.telefon) {
    fis += center(`Tel: ${firma.telefon}`, W) + '\n';
  }
  fis += line(W, '=') + '\n';
  
  return fis;
}

export function fisYazdir(fisIcerigi: string): void {
  const printWindow = window.open('', '', 'width=300,height=600');
  if (!printWindow) {
    alert('Pop-up engelleyici etkin. Lütfen izin verin.');
    return;
  }
  
  printWindow.document.write(`
    <html>
      <head>
        <title>Fiş</title>
        <style>
          @page { 
            size: 80mm auto; 
            margin: 5mm; 
          }
          body { 
            font-family: 'Courier New', monospace; 
            font-size: 12px;
            white-space: pre;
            margin: 0;
            padding: 10px;
          }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body onload="window.print(); window.close();">
${fisIcerigi}
      </body>
    </html>
  `);
  printWindow.document.close();
}
