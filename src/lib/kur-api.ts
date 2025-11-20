export interface KurVerisi {
  usd: number;
  eur: number;
  kaynak: 'tcmb' | 'doviz-dev' | 'manuel';
  guncelleme: string;
}

/**
 * TCMB (Türkiye Cumhuriyet Merkez Bankası) API'sinden güncel döviz kurlarını çeker
 * Satış kurlarını (ForexSelling) kullanır
 */
export async function tcmbKurCek(): Promise<KurVerisi | null> {
  try {
    console.log('TCMB API\'den kurlar çekiliyor...');
    
    // TCMB API proxy üzerinden erişim
    const response = await fetch('https://hasanadiguzel.com.tr/api/kurgetir', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.TCMB_AnlikKurBilgileri) {
      throw new Error('TCMB verisi bulunamadı');
    }

    // USD ve EUR satış kurlarını bul
    const usdData = data.TCMB_AnlikKurBilgileri.find(
      (k: any) => k.CurrencyName === 'US DOLLAR'
    );
    const eurData = data.TCMB_AnlikKurBilgileri.find(
      (k: any) => k.CurrencyName === 'EURO'
    );
    
    if (!usdData || !eurData) {
      throw new Error('USD veya EUR kuru bulunamadı');
    }

    // Satış kurunu al (ForexSelling) - bu piyasa satış kuruna yakın
    const usdSatis = parseFloat(usdData.ForexSelling);
    const eurSatis = parseFloat(eurData.ForexSelling);

    if (isNaN(usdSatis) || isNaN(eurSatis)) {
      throw new Error('Kur değerleri geçersiz');
    }

    console.log('TCMB kurları başarıyla çekildi:', { usdSatis, eurSatis });

    return {
      usd: usdSatis,
      eur: eurSatis,
      kaynak: 'tcmb',
      guncelleme: new Date().toISOString()
    };
  } catch (error) {
    console.error('TCMB kur çekme hatası:', error);
    return null;
  }
}

/**
 * doviz.dev API'sinden gerçek piyasa kurlarını çeker
 * TCMB'den daha güncel ve piyasa gerçeklerini yansıtır
 */
export async function dovizDevKurCek(): Promise<KurVerisi | null> {
  try {
    console.log('doviz.dev API\'den kurlar çekiliyor...');
    
    const response = await fetch('https://api.doviz.dev/v1/currencies', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.data || !data.data.USD || !data.data.EUR) {
      throw new Error('doviz.dev verisi bulunamadı');
    }

    // USD ve EUR satış kurları - gerçek piyasa kurları
    const usdSatis = parseFloat(data.data.USD.satis);
    const eurSatis = parseFloat(data.data.EUR.satis);

    if (isNaN(usdSatis) || isNaN(eurSatis)) {
      throw new Error('Kur değerleri geçersiz');
    }

    console.log('doviz.dev kurları başarıyla çekildi:', { usdSatis, eurSatis });

    return {
      usd: usdSatis,
      eur: eurSatis,
      kaynak: 'doviz-dev',
      guncelleme: new Date().toISOString()
    };
  } catch (error) {
    console.error('doviz.dev kur çekme hatası:', error);
    return null;
  }
}

/**
 * Döviz piyasasında kullanılan satış kurlarına daha yakın değerler için marj ekler
 * Örnek: %1-2 marj ekleyerek kuyumcu/sarraf satış kurlarına yaklaşır
 */
export function marjEkle(kurlar: KurVerisi, marjYuzdesi: number): KurVerisi {
  const marjKatsayisi = 1 + (marjYuzdesi / 100);
  
  return {
    ...kurlar,
    usd: Number((kurlar.usd * marjKatsayisi).toFixed(4)),
    eur: Number((kurlar.eur * marjKatsayisi).toFixed(4))
  };
}
