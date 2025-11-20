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
    console.log('BigPara\'dan kurlar çekiliyor...');
    
    // BigPara mobil sitesini çek
    const response = await fetch('https://sm.bigpara.com/doviz', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    console.log('HTML alındı, parse ediliyor...');
    
    let usdSatis = 0;
    let eurSatis = 0;
    
    // Yöntem 1: JSON içinde data-exchange-rate attribute'ları ara
    const usdJsonMatch = html.match(/data-name="dolar"[^>]*data-exchange-rate="([\d,]+)"/i);
    const eurJsonMatch = html.match(/data-name="euro"[^>]*data-exchange-rate="([\d,]+)"/i);
    
    if (usdJsonMatch) {
      usdSatis = parseFloat(usdJsonMatch[1].replace(',', '.'));
      console.log('USD bulundu (method 1):', usdSatis);
    }
    if (eurJsonMatch) {
      eurSatis = parseFloat(eurJsonMatch[1].replace(',', '.'));
      console.log('EUR bulundu (method 1):', eurSatis);
    }
    
    // Yöntem 2: Alternatif pattern - JSON içinde doğrudan değerler
    if (!usdSatis || !eurSatis) {
      const jsonMatch = html.match(/\{[^}]*"DOLAR"[^}]*"SATIS":"([\d,]+)"[^}]*\}/);
      const jsonMatch2 = html.match(/\{[^}]*"EURO"[^}]*"SATIS":"([\d,]+)"[^}]*\}/);
      
      if (jsonMatch) {
        usdSatis = parseFloat(jsonMatch[1].replace(',', '.'));
        console.log('USD bulundu (method 2):', usdSatis);
      }
      if (jsonMatch2) {
        eurSatis = parseFloat(jsonMatch2[1].replace(',', '.'));
        console.log('EUR bulundu (method 2):', eurSatis);
      }
    }
    
    // Yöntem 3: Table row içinde satış değeri ara
    if (!usdSatis || !eurSatis) {
      // USD için: <tr data-name="dolar"...><td>...</td><td class="selling">38.5473</td>
      const usdTableMatch = html.match(/data-name="dolar"[\s\S]{0,200}?class="[^"]*sell[^"]*"[^>]*>([\d,]+)/i);
      const eurTableMatch = html.match(/data-name="euro"[\s\S]{0,200}?class="[^"]*sell[^"]*"[^>]*>([\d,]+)/i);
      
      if (usdTableMatch) {
        usdSatis = parseFloat(usdTableMatch[1].replace(',', '.'));
        console.log('USD bulundu (method 3):', usdSatis);
      }
      if (eurTableMatch) {
        eurSatis = parseFloat(eurTableMatch[1].replace(',', '.'));
        console.log('EUR bulundu (method 3):', eurSatis);
      }
    }

    // Yöntem 4: Basit pattern matching
    if (!usdSatis) {
      const simpleUsd = html.match(/DOLAR[\s\S]{0,100}?([\d]+[,\.][\d]+)/);
      if (simpleUsd) {
        usdSatis = parseFloat(simpleUsd[1].replace(',', '.'));
        console.log('USD bulundu (method 4):', usdSatis);
      }
    }
    if (!eurSatis) {
      const simpleEur = html.match(/EURO[\s\S]{0,100}?([\d]+[,\.][\d]+)/);
      if (simpleEur) {
        eurSatis = parseFloat(simpleEur[1].replace(',', '.'));
        console.log('EUR bulundu (method 4):', eurSatis);
      }
    }

    // Geçerlilik kontrolü
    if (!usdSatis || !eurSatis || usdSatis < 10 || eurSatis < 10 || usdSatis > 100 || eurSatis > 100) {
      console.error('Parse edilen değerler geçersiz:', { usdSatis, eurSatis });
      throw new Error(`Kurlar parse edilemedi veya geçersiz (USD: ${usdSatis}, EUR: ${eurSatis})`);
    }

    console.log('BigPara kurları başarıyla çekildi:', { usdSatis, eurSatis });

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
    console.error('BigPara kur çekme hatası:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    
    // Fallback değerleri döndür
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        // Fallback değerleri (güncel piyasa seviyesi)
        fallback: {
          usd: 38.50,
          eur: 43.80
        }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
