import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('doviz.com\'dan kurlar çekiliyor...');
    
    // doviz.com ana sayfasını çek
    const response = await fetch('https://www.doviz.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    
    // USD/TRY satış kurunu bul (doviz.com'un HTML yapısına göre)
    const usdMatch = html.match(/data-name="dolar"[\s\S]*?data-selling="([\d.,]+)"/);
    const usdSatis = usdMatch ? parseFloat(usdMatch[1].replace(',', '.')) : null;
    
    // EUR/TRY satış kurunu bul
    const eurMatch = html.match(/data-name="euro"[\s\S]*?data-selling="([\d.,]+)"/);
    const eurSatis = eurMatch ? parseFloat(eurMatch[1].replace(',', '.')) : null;

    if (!usdSatis || !eurSatis) {
      throw new Error('Kurlar parse edilemedi');
    }

    console.log('doviz.com kurları başarıyla çekildi:', { usdSatis, eurSatis });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          usd: usdSatis,
          eur: eurSatis,
          kaynak: 'doviz.com',
          guncelleme: new Date().toISOString()
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('doviz.com kur çekme hatası:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
