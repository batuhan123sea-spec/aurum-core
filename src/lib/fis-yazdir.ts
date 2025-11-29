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
  const ayarlar = getAyarlar();
  const firma = ayarlar.firma;
  const fisAyarlari = ayarlar.fis;
  
  // ✅ Hesaplamalar - HesapHareketi'nden gelen gerçek tutarları kullan
  const toplamlarByPB: Record<string, number> = { TRY: 0, USD: 0, EUR: 0 };
  buHaftaSatislar.forEach(satis => {
    // ✅ Her satış için orijinalTutar zaten HesapHareketi'nden gelen gerçek tutar (indirim/KDV dahil)
    toplamlarByPB[satis.paraBirimi] += satis.orijinalTutar;
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
  const gecenHaftaBorcStr = `Gecen Haftadan Kalan Borc:`;
  const borcTutarStr = `${formatCurrency(baslangicBakiyesi, 'TRY')}`;
  const borcSatir = gecenHaftaBorcStr + ' '.repeat(Math.max(1, W - gecenHaftaBorcStr.length - borcTutarStr.length)) + borcTutarStr;
  fis += borcSatir + '\n';
  fis += '\n';
  
  // 4. BU HAFTA SATIŞLAR
  const toplamSatis = buHaftaSatislar.reduce((sum, s) => sum + s.tutar, 0);
  
  if (buHaftaSatislar.length > 0) {
    fis += 'Alinan Urunler:\n';
    fis += 'Urun           Adet   Fiyat\n';
    
    buHaftaSatislar.forEach(satis => {
      satis.kalemler.forEach((kalem: any) => {
        const urunAdi = kalem.urunAdi.substring(0, 13).padEnd(13);
        const adet = String(kalem.adet).padStart(4);
        
        const paraBirimi = kalem.paraBirimi;
        const birimFiyat = kalem.orijinalBirimFiyati;
        
        const symbol = paraBirimi === 'USD' ? '$' : paraBirimi === 'EUR' ? '€' : '₺';
        const fiyat = `${birimFiyat.toFixed(0)} ${symbol}`.padStart(10);
        fis += ` ${urunAdi} ${adet} ${fiyat}\n`;
      });
    });
    
    
    // İadeler - ürünlerin hemen altında, orijinal para biriminde
    if (buHaftaIadeler.length > 0) {
      buHaftaIadeler.forEach(iade => {
        // Açıklamadan ürün adını çıkar (örn: "İade - SATS-0001 - Istim Makine" → "Istim Makine")
        const parts = iade.aciklama.split(' - ');
        const urunAdi = parts.length >= 3 ? parts.slice(2).join(' - ').substring(0, 10) : 'Iade';
        
        // Orijinal para biriminde göster
        const symbol = iade.paraBirimi === 'USD' ? '$' : iade.paraBirimi === 'EUR' ? '€' : '₺';
        const iadeStr = ` ${urunAdi.padEnd(10)} (iade)    -${Math.abs(iade.orijinalTutar).toFixed(0)} ${symbol}`;
        fis += iadeStr + '\n';
      });
    }
    
    fis += '\n';
  }

  
  // 5. BU HAFTA ÖDEMELER
  if (buHaftaOdemeler.length > 0) {
    const odemeStr = `Yapilan Odemeler: -${formatCurrency(toplamOdeme, 'TRY')}`;
    fis += ' '.repeat(Math.max(0, W - odemeStr.length)) + odemeStr + '\n';
    fis += '\n';
  }
  
  // 6. GÜNCEL BAKİYE
  fis += line(W, '=') + '\n';
  const bakiyeStr = `GUNCEL BAKIYE: ${formatCurrency(guncelBakiye, 'TRY')}`;
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
