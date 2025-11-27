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
    kalemler: Array<{
      urunAdi: string;
      adet: number;
      birimFiyati: number;
      toplamTutar: number;
    }>
  }>,
  guncelBakiye: number
): string {
  const ayarlar = getAyarlar();
  const firma = ayarlar.firma;
  const fisAyarlari = ayarlar.fis;
  
  // Hesaplamalar
  const toplamSatis = buHaftaSatislar.reduce((sum, s) => sum + s.tutar, 0);
  const toplamOdeme = buHaftaOdemeler.reduce((sum, o) => sum + o.tutar, 0);
  
  let fis = '\n';
  
  // 1. BAŞLIK - Firma adı ve reklam
  fis += `${firma.firmaAdi || 'FİRMA ADI'}`;
  if (fisAyarlari.reklamAlani) {
    fis += ` ${fisAyarlari.reklamAlani}`;
  }
  fis += '\n\n';
  
  // 2. MÜŞTERİ - Sadece isim
  fis += `Sayın ${musteri.adSoyad}\n\n`;
  
  // 3. GEÇEN HAFTA BORÇ
  fis += `geçen haftadan kalan borç: ${formatCurrency(baslangicBakiyesi, 'TRY')}\n\n`;
  
  // 4. BU HAFTA ÜRÜNLER
  fis += `bu hafta alınan ürünler:\n`;
  fis += `Ürün          adet    fiyat    toplam\n`;
  
  buHaftaSatislar.forEach(satis => {
    satis.kalemler.forEach(kalem => {
      const urunAdi = kalem.urunAdi.substring(0, 12).padEnd(12);
      const adet = String(kalem.adet).padStart(4);
      const fiyat = kalem.birimFiyati.toFixed(0).padStart(8);
      const toplam = `${kalem.toplamTutar.toFixed(0)} ₺`.padStart(10);
      fis += ` ${urunAdi}  ${adet}  ${fiyat}  ${toplam}\n`;
    });
  });
  
  fis += `                    ürünler toplamı: ${formatCurrency(toplamSatis, 'TRY')}\n\n`;
  
  // 5. BU HAFTA ÖDEMELER (SADECE VARSA)
  if (buHaftaOdemeler.length > 0) {
    fis += `bu hafta yapılan ödemeler:\n`;
    buHaftaOdemeler.forEach(odeme => {
      const odemeTuru = odeme.odemeTuru === 'kredi-karti' ? 'Kredi Kartı' :
                        odeme.odemeTuru === 'eft' ? 'EFT' :
                        odeme.odemeTuru === 'havale' ? 'Havale' : 'Nakit';
      fis += `- ${odemeTuru}: ${formatCurrency(odeme.tutar, 'TRY')}\n`;
    });
    fis += `                    ödemeler toplamı: ${formatCurrency(toplamOdeme, 'TRY')}\n\n`;
  }
  
  // 6. TOPLAM BAKİYE
  fis += `toplam bakiye: ${formatCurrency(guncelBakiye, 'TRY')}\n\n`;
  
  // 7. TEŞEKKÜR
  fis += `Bizi tercih ettiğiniz için teşekkür ederiz.\n`;
  
  return fis;
}

export function rezervFisiOlustur(rezerv: any): string {
  const ayarlar = getAyarlar();
  const firma = ayarlar.firma;
  const fisAyarlari = ayarlar.fis;
  
  const W = 45;
  let fis = '';
  
  fis += '\n';
  fis += line(W, '═') + '\n';
  fis += center(fisAyarlari.baslik || 'REZERV FİŞİ', W) + '\n';
  fis += center(firma.firmaAdi || 'Firma Adı', W) + '\n';
  fis += line(W, '═') + '\n';
  fis += '\n';
  
  // Rezerv bilgileri
  fis += `  Rezerv No: ${rezerv.satisNo}\n`;
  fis += `  Tarih: ${new Date(rezerv.tarih).toLocaleString('tr-TR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })}\n`;
  if (rezerv.rezervNotu) {
    fis += `  Not: ${rezerv.rezervNotu}\n`;
  }
  fis += '\n';
  fis += line(W, '─') + '\n';
  fis += center('REZERVE EDİLEN ÜRÜNLER', W) + '\n';
  fis += line(W, '─') + '\n';
  fis += '\n';
  
  // Ürünler - KDV detaylı
  rezerv.kalemler.forEach((kalem: any, index: number) => {
    fis += `  ${index + 1}. ${kalem.urunAdi}\n`;
    fis += `     ${kalem.adet} adet x ${kalem.birimFiyati.toFixed(2)} ₺\n`;
    fis += `     KDV (%${kalem.kdvOrani}): ${kalem.kdvTutari.toFixed(2)} ₺\n`;
    fis += `     Toplam: ${kalem.toplamTutar.toFixed(2)} ₺\n`;
    fis += '\n';
  });
  
  fis += line(W, '─') + '\n';
  fis += '\n';
  
  // Toplam - Detaylı
  fis += `  Ara Toplam (KDV Hariç): ${rezerv.araToplam.toFixed(2)} ₺\n`;
  fis += `  Toplam KDV: ${rezerv.toplamKDV.toFixed(2)} ₺\n`;
  fis += line(W, '─') + '\n';
  fis += center(`GENEL TOPLAM: ${rezerv.genelToplam.toFixed(2)} ₺`, W) + '\n';
  fis += center('(KDV Dahil)', W) + '\n';
  fis += '\n';
  fis += line(W, '═') + '\n';
  fis += '\n';
  fis += center('Bu fiş bilgi amaçlıdır,', W) + '\n';
  fis += center('mali değeri yoktur.', W) + '\n';
  fis += '\n';
  fis += line(W, '═') + '\n';
  fis += center(fisAyarlari.altBilgi || 'Teşekkür Ederiz!', W) + '\n';
  if (firma.telefon) {
    fis += center(`📞 ${firma.telefon}`, W) + '\n';
  }
  if (firma.email) {
    fis += center(firma.email, W) + '\n';
  }
  fis += line(W, '═') + '\n';
  if (fisAyarlari.reklamAlani) {
    fis += '\n';
    fis += center(fisAyarlari.reklamAlani, W) + '\n';
  }
  fis += '\n';
  
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
