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
  const genislik = 32;
  const tarih = new Date(odeme.tarih);
  
  return `
${center('KUYUMCU MAKİNE MALZEME', genislik)}
${center('TAHSİLAT FİŞİ', genislik)}
${line(genislik, '=')}

Müşteri: ${musteri.adSoyad}
Telefon: ${musteri.telefon}
Tarih: ${tarih.toLocaleDateString('tr-TR')} ${tarih.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}

${line(genislik)}

Önceki Borç:    ${align(formatCurrency(oncekiBorc, 'TRY'), 15)}
${odeme.paraBirimi !== 'TRY' ? `
Ödeme Tutarı:   ${align(formatCurrency(odeme.tutar, odeme.paraBirimi), 15)}
Kur:            ${align(odeme.kur.toFixed(2), 15)}` : ''}
TL Karşılığı:   ${align(formatCurrency(odeme.tlKarsiligi, 'TRY'), 15)}

${line(genislik)}

Yeni Borç:      ${align(formatCurrency(odeme.bakiye, 'TRY'), 15)}

${line(genislik)}

Ödeme Yöntemi: ${odeme.odemeTuru?.toUpperCase()}
${odeme.aciklama ? `Not: ${odeme.aciklama}` : ''}

${line(genislik)}
${center('İyi günler dileriz!', genislik)}
${line(genislik)}

${center('Reklam Alanı', genislik)}
${center('Yeni ürünlerimizi inceleyin!', genislik)}

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
