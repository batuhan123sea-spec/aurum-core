import { Musteri, HesapHareketi } from "@/types/musteri";
import { formatCurrency } from "./kur-hesaplama";

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
  const tarih = new Date(odeme.tarih);
  const formatTarih = tarih.toLocaleDateString('tr-TR');
  const formatSaat = tarih.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  
  const pad = (text: string, length: number = 20) => text.substring(0, length).padEnd(length);
  const padRight = (text: string, length: number = 14) => text.padStart(length);
  
  const odemeTuruText = odeme.odemeTuru === 'kredi-karti' ? 'Kredi Kartı' :
                        odeme.odemeTuru === 'eft' ? 'EFT' :
                        odeme.odemeTuru === 'havale' ? 'Havale' : 'Nakit';
  
  return `
╔═══════════════════════════════╗
║   KUYUMCU MAKİNE MALZEME      ║
║       LTD. ŞTİ.               ║
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
║       Teşekkür Ederiz!        ║
║     📞 0212 123 45 67         ║
║   www.kuyumcumakine.com       ║
╚═══════════════════════════════╝

[Özelleştirilebilir Reklam Alanı]
  Yeni ürünlerimizi inceleyin!
  `.trim();
}

export function haftalikTahsilatFisiOlustur(
  musteri: { adSoyad: string; kod: string; telefon: string },
  baslangicTarihi: string,
  bitisTarihi: string,
  baslangicBakiyesi: number,
  buHaftaOdemeler: Array<{ tarih: string; aciklama: string; tutar: number }>,
  buHaftaSatislar: Array<{ tarih: string; satisNo: string; tutar: number }>,
  guncelBakiye: number
): string {
  const formatTarih = (tarih: string) => new Date(tarih).toLocaleDateString('tr-TR');
  const pad = (text: string, length: number = 20) => text.substring(0, length).padEnd(length);
  const padRight = (text: string, length: number = 14) => text.padStart(length);
  
  const toplamOdeme = buHaftaOdemeler.reduce((sum, o) => sum + o.tutar, 0);
  const toplamSatis = buHaftaSatislar.reduce((sum, s) => sum + s.tutar, 0);
  
  let odemelerText = '';
  if (buHaftaOdemeler.length > 0) {
    buHaftaOdemeler.forEach(odeme => {
      const tarih = formatTarih(odeme.tarih).substring(0, 5);
      const aciklama = odeme.aciklama.substring(0, 10).padEnd(10);
      odemelerText += `║ ${tarih} - ${aciklama} ${padRight(formatCurrency(-odeme.tutar, 'TRY'))} ║\n`;
    });
  } else {
    odemelerText = '║ (Ödeme yapılmadı)              ║\n';
  }
  
  let satislarText = '';
  if (buHaftaSatislar.length > 0) {
    buHaftaSatislar.forEach(satis => {
      const tarih = formatTarih(satis.tarih).substring(0, 5);
      const satisNo = satis.satisNo.substring(0, 10).padEnd(10);
      satislarText += `║ ${tarih} - ${satisNo} ${padRight(formatCurrency(satis.tutar, 'TRY'))} ║\n`;
    });
  } else {
    satislarText = '║ (Satış yapılmadı)               ║\n';
  }
  
  return `
╔═══════════════════════════════╗
║   KUYUMCU MAKİNE MALZEME      ║
║       LTD. ŞTİ.               ║
╠═══════════════════════════════╣
║   HAFTALİK TAHSİLAT FİŞİ     ║
║  ${formatTarih(baslangicTarihi)} - ${formatTarih(bitisTarihi)}  ║
╠═══════════════════════════════╣
║ Müşteri: ${pad(musteri.adSoyad)} ║
║ Kod: ${pad(musteri.kod)} ║
║ Telefon: ${pad(musteri.telefon)} ║
╠═══════════════════════════════╣
║ GEÇEN HAFTADAN KALAN:         ║
║           ${padRight(formatCurrency(baslangicBakiyesi, 'TRY'))} ║
╠═══════════════════════════════╣
║ BU HAFTA YAPILAN ÖDEMELER:    ║
${odemelerText}║ Toplam ödemeler: ${padRight(formatCurrency(-toplamOdeme, 'TRY'))} ║
╠═══════════════════════════════╣
║ BU HAFTA YAPILAN SATIŞLAR:    ║
${satislarText}║ Toplam satışlar: ${padRight(formatCurrency(toplamSatis, 'TRY'))} ║
╠═══════════════════════════════╣
║ GÜNCEL BAKİYE:                ║
║           ${padRight(formatCurrency(guncelBakiye, 'TRY'))} ║
╠═══════════════════════════════╣
║       Teşekkür Ederiz!        ║
║     📞 0212 123 45 67         ║
║   www.kuyumcumakine.com       ║
╚═══════════════════════════════╝
  `.trim();
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
        <title>Tahsilat Fişi</title>
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
