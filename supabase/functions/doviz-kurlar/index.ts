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
    
    // doviz.com API endpoint'ini çağır (mobil API)
    const response = await fetch('https://www.doviz.com/api/v1/currencies/USD/latest', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const usdData = await response.json();
    console.log('USD verisi:', usdData);
    
    // EUR için ayrı istek
    const eurResponse = await fetch('https://www.doviz.com/api/v1/currencies/EUR/latest', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      }
    });

    if (!eurResponse.ok) {
      throw new Error(`HTTP error! status: ${eurResponse.status}`);
    }

    const eurData = await eurResponse.json();
    console.log('EUR verisi:', eurData);
    
    // Satış kurlarını al
    const usdSatis = parseFloat(usdData.selling);
    const eurSatis = parseFloat(eurData.selling);

    if (isNaN(usdSatis) || isNaN(eurSatis)) {
      throw new Error('Kur değerleri geçersiz');
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
