import { Musteri, HesapHareketi } from "@/types/musteri";
import { formatCurrency, paraBirimiTLyeCevir } from "./kur-hesaplama";
import { getAyarlar } from "./ayarlar-data";

// HTML tag'lerini hariç tutarak gerçek metin uzunluğunu hesapla
function getTextLength(text: string): number {
  return text.replace(/<[^>]*>/g, '').length;
}

function center(text: string, genislik: number): string {
  const textLen = getTextLength(text);
  const padding = Math.max(0, Math.floor((genislik - textLen) / 2));
  return ' '.repeat(padding) + text;
}

function line(genislik: number, char: string = '-'): string {
  return char.repeat(genislik);
}

function boldLine(width: number): string {
  return '━'.repeat(width);
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
  const fisAyarlari = ayarlar.fis.tahsilat;
  
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
  const telefon = (fisAyarlari.telefonGoster && firma.telefon) ? center(`📞 ${firma.telefon}`, 31) : '';
  const email = firma.email ? center(firma.email, 31) : '';
  const reklamAlani = fisAyarlari.reklamAlani ? `\n${fisAyarlari.reklamAlani}\n` : '';
  
  let fis = `
╔═══════════════════════════════╗
║${baslik}║
║${firmaAdi}║
╠═══════════════════════════════╣
║       TAHSİLAT FİŞİ          ║
║  Tarih: ${formatTarih} ${formatSaat}  ║
╠═══════════════════════════════╣`;

  if (fisAyarlari.musteriGoster) {
    fis += `
║ Müşteri: ${pad(musteri.adSoyad)} ║
║ Telefon: ${pad(musteri.telefon)} ║`;
    if (musteri.email) {
      fis += `
║ E-posta: ${pad(musteri.email)} ║`;
    }
    fis += `
╠═══════════════════════════════╣`;
  }

  fis += `
║ ÖNCEKİ BORÇ:  ${padRight(formatCurrency(oncekiBorc, 'TRY'))} ║
║ TAHSİLAT:     ${padRight(formatCurrency(odeme.tlKarsiligi, 'TRY'))} ║`;

  if (odeme.paraBirimi !== 'TRY') {
    fis += `
║ (${formatCurrency(odeme.tutar, odeme.paraBirimi)} x ${odeme.kur.toFixed(2)})${' '.repeat(Math.max(0, 30 - (`(${formatCurrency(odeme.tutar, odeme.paraBirimi)} x ${odeme.kur.toFixed(2)})`.length)))} ║`;
  }

  fis += `
╠═══════════════════════════════╣
║ YENİ BAKİYE:  ${padRight(formatCurrency(odeme.bakiye, 'TRY'))} ║
╠═══════════════════════════════╣`;

  if (fisAyarlari.odemeTuruGoster) {
    fis += `
║ Ödeme: ${pad(odemeTuruText, 23)} ║`;
  }

  fis += `
║ Para Birimi: ${pad(odeme.paraBirimi, 18)} ║`;

  if (odeme.aciklama) {
    fis += `
║ Not: ${pad(odeme.aciklama, 26)} ║`;
  }

  fis += `
╠═══════════════════════════════╣
║${altBilgi}║`;

  if (telefon) {
    fis += `
║${telefon}║`;
  }

  if (email) {
    fis += `
║${email}║`;
  }

  fis += `
╚═══════════════════════════════╝${reklamAlani}`;

  return fis.trim();
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
  const W = 40; // Sabit genişlik - 40 karakter
  let fis = '\n';
  
  // 1. BAŞLIK - Kalın çizgi + Firma bilgileri (SABİT)
  fis += boldLine(W) + '\n';
  fis += center('[LOGO]', W) + '\n';
  fis += boldLine(W) + '\n';
  fis += center('<b>SUPHI TICARET - KUSCU ALI</b>', W) + '\n';
  fis += center('KUYUMCU MAKINALARI VE MALZEMELERI', W) + '\n';
  fis += center('TOPTAN PERAKENDE YENI VE 2.EL ALINIR', W) + '\n';
  fis += center('SATILIR', W) + '\n';
  fis += boldLine(W) + '\n';
  fis += '\n';
  
  // 2. MÜŞTERİ + TARİH (Tarih: yazısı YOK)
  const bugun = new Date().toLocaleDateString('tr-TR');
  const musteriStr = `Sayin ${musteri.adSoyad}`;
  const musteriLine = musteriStr.padEnd(W - bugun.length) + bugun;
  fis += musteriLine + '\n';
  fis += '\n';
  
  // 3. ÖNCEKİ BAKİYE + TARİHLİ ÖDEMELER + KALAN BAKİYE
  const oncekiLabel = 'Onceki Bakiye:';
  const oncekiTutar = formatCurrency(baslangicBakiyesi, 'TRY');
  fis += oncekiLabel + ' '.repeat(W - oncekiLabel.length - oncekiTutar.length) + oncekiTutar + '\n';
  
  // Tarihli Ödemeler
  buHaftaOdemeler.forEach(odeme => {
    const tarih = new Date(odeme.tarih).toLocaleDateString('tr-TR');
    const yontem = odeme.odemeTuru === 'kredi-karti' ? 'Kredi Karti' :
                   odeme.odemeTuru === 'eft' ? 'EFT' :
                   odeme.odemeTuru === 'havale' ? 'Havale' : 'Nakit';
    const label = `${tarih} - Odeme (${yontem})`;
    const tutar = `-${formatCurrency(odeme.tutar, 'TRY')}`;
    fis += label + ' '.repeat(W - label.length - tutar.length) + tutar + '\n';
  });
  
  // Çizgi + Kalan Bakiye (KALIN)
  const toplamOdeme = buHaftaOdemeler.reduce((sum, o) => sum + o.tutar, 0);
  const kalanBakiye = baslangicBakiyesi - toplamOdeme;
  fis += ' '.repeat(W - 10) + '----------\n';
  const kalanLabel = '<b>Kalan Bakiye:</b>';
  const kalanTutar = `<b>${formatCurrency(kalanBakiye, 'TRY')}</b>`;
  const kalanLabelLen = getTextLength(kalanLabel);
  const kalanTutarLen = getTextLength(kalanTutar);
  fis += kalanLabel + ' '.repeat(W - kalanLabelLen - kalanTutarLen) + kalanTutar + '\n';
  fis += '\n';
  
  // 4. ÜRÜN TABLOSU (ÜRÜN | ADET | FİYAT - TL'ye çevrilmiş)
  fis += line(W, '=') + '\n';
  fis += 'URUN'.padEnd(18) + 'ADET'.padStart(6) + 'FIYAT'.padStart(16) + '\n';
  fis += line(W, '=') + '\n';
  
  buHaftaSatislar.forEach(satis => {
    satis.kalemler.forEach((kalem: any) => {
      const urunAdi = kalem.urunAdi.substring(0, 18).padEnd(18);
      const adet = String(kalem.adet).padStart(6);
      const birimFiyatTL = paraBirimiTLyeCevir(kalem.orijinalBirimFiyati, kalem.paraBirimi as 'TRY' | 'USD' | 'EUR');
      const fiyat = formatCurrency(birimFiyatTL, 'TRY').padStart(16);
      fis += urunAdi + adet + fiyat + '\n';
    });
  });
  
  // İadeler (negatif, TL'ye çevrilmiş)
  buHaftaIadeler.forEach(iade => {
    const parts = iade.aciklama.split(' - ');
    const urunAdi = (parts.length >= 3 ? parts.slice(2).join(' - ').substring(0, 14) + ' (i)' : 'Iade').padEnd(18);
    const adet = '1'.padStart(6);
    const iadeTutarTL = paraBirimiTLyeCevir(Math.abs(iade.orijinalTutar), iade.paraBirimi as 'TRY' | 'USD' | 'EUR');
    const fiyat = `-${formatCurrency(iadeTutarTL, 'TRY')}`.padStart(16);
    fis += urunAdi + adet + fiyat + '\n';
  });
  
  fis += line(W, '=') + '\n';
  fis += '\n';
  
  // 5. GÜNCEL KALAN BAKİYE (EN KALIN + BÜYÜK + kalın çizgi)
  fis += boldLine(W) + '\n';
  const bakiyeText = `GUNCEL KALAN BAKIYE: ${formatCurrency(guncelBakiye, 'TRY')}`;
  fis += center(`<b class="large">${bakiyeText}</b>`, W) + '\n';
  fis += boldLine(W) + '\n';
  fis += '\n';
  
  // 6. ALT BİLGİ (SABİT - merkeze hizalı)
  fis += center('Tel: 0322 363 04 75 - 0543 809 44 00', W) + '\n';
  fis += center('535 377 77 70', W) + '\n';
  fis += center('Tepebag Mah. Cakmak Cad. Hilal Han', W) + '\n';
  fis += center('Is Merkezi Kat:1 No:117 Seyhan/ADANA', W) + '\n';
  fis += center('@suphiticaretkuyumcumalzemeleri', W) + '\n';
  fis += boldLine(W) + '\n';
  
  return fis;
}

export function rezervFisiOlustur(rezerv: any): string {
  const ayarlar = getAyarlar();
  const firma = ayarlar.firma;
  const fisAyarlari = ayarlar.fis.rezerv;
  
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
  fis += `${fisAyarlari.baslik || 'REZERV FISI'} - ${rezerv.satisNo}\n`;
  
  if (fisAyarlari.tarihGoster) {
    fis += `Tarih: ${new Date(rezerv.tarih).toLocaleString('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })}\n`;
  }
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
  if (fisAyarlari.toplamGoster) {
    fis += center(`GENEL TOPLAM: ${rezerv.genelToplam.toLocaleString('tr-TR', {minimumFractionDigits: 2})} TL`, W) + '\n';
    fis += '\n';
  }
  
  // Mali değeri yoktur notu
  if (fisAyarlari.maliDegeriYokNotGoster) {
    fis += line(W, '=') + '\n';
    fis += center('Bu fis bilgi amaclidir,', W) + '\n';
    fis += center('mali degeri yoktur.', W) + '\n';
    fis += line(W, '=') + '\n';
  }
  
  // Alt bilgi
  if (fisAyarlari.altBilgi) {
    fis += center(fisAyarlari.altBilgi, W) + '\n';
  }
  if (firma.telefon && fisAyarlari.tarihGoster) {
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
            line-height: 1.2;
          }
          b { 
            font-weight: bold; 
          }
          b.large { 
            font-weight: 900; 
            font-size: 14px;
          }
          .logo {
            text-align: center;
            margin-bottom: 5px;
          }
          .logo img {
            width: 50px;
            height: auto;
          }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body onload="window.print(); window.close();">
        <div class="logo">
          <img src="/logo-suphi.png" alt="Logo" />
        </div>
${fisIcerigi}
      </body>
    </html>
  `);
  printWindow.document.close();
}
