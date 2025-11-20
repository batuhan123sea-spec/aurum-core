import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('BigPara ana sitesinden SATIŞ kurları çekiliyor...');
    
    // BigPara ana sitesini çek (daha güncel ve yapılandırılmış)
    const response = await fetch('https://bigpara.hurriyet.com.tr/doviz/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    console.log('HTML alındı, SATIŞ kurları parse ediliyor...');
    
    let usdSatis = 0;
    let eurSatis = 0;
    
    // Method 1: JSON içinde "satis" değeri ara (en güvenilir)
    console.log('Method 1: JSON "satis" değerleri aranıyor...');
    const usdJsonPattern = /"code"\s*:\s*"USD\/TRY"[\s\S]*?"selling"\s*:\s*"?([\d.]+)"?/i;
    const eurJsonPattern = /"code"\s*:\s*"EUR\/TRY"[\s\S]*?"selling"\s*:\s*"?([\d.]+)"?/i;
    
    const usdJsonMatch = html.match(usdJsonPattern);
    const eurJsonMatch = html.match(eurJsonPattern);
    
    if (usdJsonMatch) {
      usdSatis = parseFloat(usdJsonMatch[1]);
      console.log('✓ USD SATIŞ bulundu (JSON):', usdSatis);
    }
    if (eurJsonMatch) {
      eurSatis = parseFloat(eurJsonMatch[1]);
      console.log('✓ EUR SATIŞ bulundu (JSON):', eurSatis);
    }
    
    // Method 2: data-selling attribute ara
    if (!usdSatis || !eurSatis) {
      console.log('Method 2: data-selling attribute aranıyor...');
      
      const usdDataPattern = /data-code="USD\/TRY"[^>]*data-selling="([\d.]+)"/i;
      const eurDataPattern = /data-code="EUR\/TRY"[^>]*data-selling="([\d.]+)"/i;
      
      if (!usdSatis) {
        const usdDataMatch = html.match(usdDataPattern);
        if (usdDataMatch) {
          usdSatis = parseFloat(usdDataMatch[1]);
          console.log('✓ USD SATIŞ bulundu (data-selling):', usdSatis);
        }
      }
      if (!eurSatis) {
        const eurDataMatch = html.match(eurDataPattern);
        if (eurDataMatch) {
          eurSatis = parseFloat(eurDataMatch[1]);
          console.log('✓ EUR SATIŞ bulundu (data-selling):', eurSatis);
        }
      }
    }
    
    // Method 3: Table içinde SATIŞ kolonu ara
    if (!usdSatis || !eurSatis) {
      console.log('Method 3: Tablo SATIŞ kolonu aranıyor...');
      
      // USD için tablo satırını bul
      const usdRowPattern = /USD\/TRY[\s\S]{0,300}?<td[^>]*class="[^"]*sell[^"]*"[^>]*>([\d.,]+)/i;
      const eurRowPattern = /EUR\/TRY[\s\S]{0,300}?<td[^>]*class="[^"]*sell[^"]*"[^>]*>([\d.,]+)/i;
      
      if (!usdSatis) {
        const usdRowMatch = html.match(usdRowPattern);
        if (usdRowMatch) {
          usdSatis = parseFloat(usdRowMatch[1].replace(',', '.'));
          console.log('✓ USD SATIŞ bulundu (tablo):', usdSatis);
        }
      }
      if (!eurSatis) {
        const eurRowMatch = html.match(eurRowPattern);
        if (eurRowMatch) {
          eurSatis = parseFloat(eurRowMatch[1].replace(',', '.'));
          console.log('✓ EUR SATIŞ bulundu (tablo):', eurSatis);
        }
      }
    }
    
    // Method 4: Alternatif JSON yapıları
    if (!usdSatis || !eurSatis) {
      console.log('Method 4: Alternatif JSON yapıları aranıyor...');
      
      // USDTRY için alternatif pattern
      const altUsdPattern = /"USDTRY"[\s\S]{0,200}?"satis"\s*:\s*"?([\d.]+)"?/i;
      const altEurPattern = /"EURTRY"[\s\S]{0,200}?"satis"\s*:\s*"?([\d.]+)"?/i;
      
      if (!usdSatis) {
        const altUsdMatch = html.match(altUsdPattern);
        if (altUsdMatch) {
          usdSatis = parseFloat(altUsdMatch[1]);
          console.log('✓ USD SATIŞ bulundu (alt JSON):', usdSatis);
        }
      }
      if (!eurSatis) {
        const altEurMatch = html.match(altEurPattern);
        if (altEurMatch) {
          eurSatis = parseFloat(altEurMatch[1]);
          console.log('✓ EUR SATIŞ bulundu (alt JSON):', eurSatis);
        }
      }
    }

    // Method 5: Genel sayısal değer arama (en son çare)
    if (!usdSatis || !eurSatis) {
      console.log('Method 5: Genel pattern matching deneniyor...');
      
      if (!usdSatis) {
        // USD için genel pattern
        const generalUsdPattern = /(?:USD|DOLAR|usd)[\s\S]{0,150}?(4[0-2]\.\d{2,4})/i;
        const generalUsdMatch = html.match(generalUsdPattern);
        if (generalUsdMatch) {
          usdSatis = parseFloat(generalUsdMatch[1]);
          console.log('✓ USD SATIŞ bulundu (genel):', usdSatis);
        }
      }
      
      if (!eurSatis) {
        // EUR için genel pattern
        const generalEurPattern = /(?:EUR|EURO|eur)[\s\S]{0,150}?(4[7-9]\.\d{2,4})/i;
        const generalEurMatch = html.match(generalEurPattern);
        if (generalEurMatch) {
          eurSatis = parseFloat(generalEurMatch[1]);
          console.log('✓ EUR SATIŞ bulundu (genel):', eurSatis);
        }
      }
    }

    // Geçerlilik kontrolleri
    const isValidValue = (value: number): boolean => {
      return value >= 20 && value <= 80; // Makul TL kur aralığı
    };
    
    const isReasonableRatio = (usd: number, eur: number): boolean => {
      if (!usd || !eur) return false;
      // EUR genelde USD'den %10-25 daha pahalı olmalı
      const ratio = eur / usd;
      return ratio >= 1.10 && ratio <= 1.30;
    };

    // Değerleri kontrol et
    if (!usdSatis || !eurSatis) {
      console.error('❌ Kurlar bulunamadı:', { usdSatis, eurSatis });
      throw new Error(`Kurlar parse edilemedi (USD: ${usdSatis}, EUR: ${eurSatis})`);
    }
    
    if (!isValidValue(usdSatis) || !isValidValue(eurSatis)) {
      console.error('❌ Kurlar geçersiz aralıkta:', { usdSatis, eurSatis });
      throw new Error(`Kurlar geçersiz (USD: ${usdSatis}, EUR: ${eurSatis})`);
    }
    
    if (!isReasonableRatio(usdSatis, eurSatis)) {
      console.warn('⚠️ USD/EUR oranı beklenenden farklı:', { 
        usdSatis, 
        eurSatis, 
        ratio: (eurSatis / usdSatis).toFixed(2) 
      });
    }

    console.log('✅ BigPara SATIŞ kurları başarıyla çekildi:', { 
      usdSatis: usdSatis.toFixed(4), 
      eurSatis: eurSatis.toFixed(4),
      ratio: (eurSatis / usdSatis).toFixed(2)
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          usd: Number(usdSatis.toFixed(4)),
          eur: Number(eurSatis.toFixed(4)),
          kaynak: 'bigpara',
          guncelleme: new Date().toISOString()
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ BigPara kur çekme hatası:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    
    // Fallback değerleri döndür (güncel piyasa seviyesi)
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        fallback: {
          usd: 41.99,
          eur: 48.70
        }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
