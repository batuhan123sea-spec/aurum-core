import { ParaBirimi } from "@/types/musteri";

const KUR_STORAGE_KEY = 'kuyumcu_doviz_kurlari';

export interface DovizKurlari {
  usd: number;
  eur: number;
  guncellemeTarihi: string;
}

// Header'dan kurları localStorage'a kaydet
export function kurlarıKaydet(usd: number, eur: number): void {
  const kurlar: DovizKurlari = {
    usd,
    eur,
    guncellemeTarihi: new Date().toISOString(),
  };
  localStorage.setItem(KUR_STORAGE_KEY, JSON.stringify(kurlar));
}

// Güncel kurları al (localStorage, ayarlar veya varsayılan)
export function getGuncelKurlar(): DovizKurlari {
  // Önce localStorage'dan BigPara kurlarını kontrol et
  const stored = localStorage.getItem(KUR_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // Parse hatası varsa devam et
    }
  }
  
  // Yoksa ayarlardan manuel kurları al
  try {
    const ayarlarStored = localStorage.getItem('kuyumcu_ayarlar');
    if (ayarlarStored) {
      const ayarlar = JSON.parse(ayarlarStored);
      if (ayarlar?.paraBirimi?.manuelKurlar) {
        return {
          usd: ayarlar.paraBirimi.manuelKurlar.usd,
          eur: ayarlar.paraBirimi.manuelKurlar.eur,
          guncellemeTarihi: new Date().toISOString(),
        };
      }
    }
  } catch {
    // Parse hatası varsa varsayılana geç
  }
  
  // En son çare: Varsayılan kurlar (güncel piyasa seviyesine yakın)
  return {
    usd: 38.50,
    eur: 43.80,
    guncellemeTarihi: new Date().toISOString(),
  };
}

// Belirli bir para biriminin kurunu al
export function getKur(paraBirimi: ParaBirimi): number {
  if (paraBirimi === 'TRY') return 1;
  
  const kurlar = getGuncelKurlar();
  return paraBirimi === 'USD' ? kurlar.usd : kurlar.eur;
}

// Para birimini TL'ye çevir
export function paraBirimiTLyeCevir(
  tutar: number,
  paraBirimi: ParaBirimi,
  kur?: number
): number {
  if (paraBirimi === 'TRY') return tutar;
  
  const kullanilacakKur = kur || getKur(paraBirimi);
  return tutar * kullanilacakKur;
}

// TL'yi başka bir para birimine çevir
export function tlParaBirimine(
  tlTutar: number,
  paraBirimi: ParaBirimi
): number {
  if (paraBirimi === 'TRY') return tlTutar;
  
  const kur = getKur(paraBirimi);
  return tlTutar / kur;
}

// Para birimi formatla
export function formatCurrency(tutar: number, paraBirimi: ParaBirimi = 'TRY'): string {
  const formatted = tutar.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  const symbols: Record<ParaBirimi, string> = {
    TRY: '₺',
    USD: '$',
    EUR: '€',
  };
  
  return `${formatted} ${symbols[paraBirimi]}`;
}
