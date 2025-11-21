import { Urun, KATEGORILER } from "@/types/stok";

export const barkodYazdir = (urunler: Urun[]): void => {
  // Ürünleri kategoriye göre grupla
  const kategoriGruplari = urunler.reduce((acc, urun) => {
    if (!acc[urun.kategori]) {
      acc[urun.kategori] = [];
    }
    acc[urun.kategori].push(urun);
    return acc;
  }, {} as Record<string, Urun[]>);

  // HTML içeriği oluştur
  let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Barkod Yazdırma</title>
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
      <style>
        @page {
          size: A4 portrait;
          margin: 10mm;
        }
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
        }
        .kategori-grubu {
          page-break-before: always;
          margin-bottom: 20px;
        }
        .kategori-grubu:first-child {
          page-break-before: auto;
        }
        .kategori-baslik {
          text-align: center;
          font-size: 18pt;
          font-weight: bold;
          margin-bottom: 8mm;
          padding-bottom: 4mm;
          border-bottom: 2px solid #000;
        }
        .barkod-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8mm;
          margin-bottom: 12mm;
        }
        .barkod-etiket {
          border: 1px solid #333;
          border-radius: 4px;
          width: 99mm;
          height: 68mm;
          padding: 4mm;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          page-break-inside: avoid;
          background: white;
        }
        .urun-ad {
          font-size: 10pt;
          font-weight: bold;
          text-align: center;
          margin-bottom: 2mm;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .barkod-container {
          background: white;
          padding: 2mm;
        }
        .urun-kod {
          font-size: 8pt;
          color: #666;
          text-align: center;
          margin-top: 2mm;
        }
        @media print {
          .no-print {
            display: none;
          }
        }
      </style>
    </head>
    <body>
  `;

  // Her kategori için içerik ekle
  Object.entries(kategoriGruplari).forEach(([kategoriId, kategoriUrunler]) => {
    const kategori = KATEGORILER.find(k => k.id === kategoriId);
    
    htmlContent += `
      <div class="kategori-grubu">
        <div class="kategori-baslik">${kategori?.emoji} ${kategori?.ad}</div>
        <div class="barkod-grid">
    `;

    kategoriUrunler.forEach((urun) => {
      htmlContent += `
        <div class="barkod-etiket">
          <div class="urun-ad">${urun.ad}</div>
          <div class="barkod-container">
            <svg class="barkod" data-barkod="${urun.barkod}"></svg>
          </div>
          <div class="urun-kod">${urun.kod}</div>
        </div>
      `;
    });

    htmlContent += `
        </div>
      </div>
    `;
  });

  htmlContent += `
      <script>
        // Tüm barkodları oluştur
        document.addEventListener('DOMContentLoaded', function() {
          document.querySelectorAll('.barkod').forEach(function(svg) {
            const barkod = svg.getAttribute('data-barkod');
            JsBarcode(svg, barkod, {
              format: 'EAN13',
              width: 1.5,
              height: 50,
              displayValue: true,
              fontSize: 12,
              margin: 0
            });
          });
          
          // Otomatik yazdır
          setTimeout(function() {
            window.print();
          }, 500);
        });
      </script>
    </body>
    </html>
  `;

  // Yeni pencerede aç
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }
};
