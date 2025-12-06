import { ParaBirimi, Musteri } from "@/types/musteri";

const KUR_STORAGE_KEY = 'kuyumcu_doviz_kurlari';

export interface DovizKurlari {
  usd: number;
  eur: number;
  guncellemeTarihi: string;
}

// Müşteri ID'si ile müşterinin kurunu al
export function getMusteriKurById(musteriId: string, paraBirimi: ParaBirimi): number {
  if (paraBirimi === 'TRY') return 1;
  
  // Lazy import to avoid circular dependency
  const stored = localStorage.getItem('kuyumcu_musteriler');
  if (!stored) return getKur(paraBirimi);
  
  try {
    const musteriler = JSON.parse(stored) as Musteri[];
    const musteri = musteriler.find(m => m.id === musteriId);
    return getMusteriKur(musteri, paraBirimi);
  } catch {
    return getKur(paraBirimi);
  }
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

// Müşteri bazlı kur al (manuel kur aktifse onu kullan, yoksa sistem kuru)
export function getMusteriKur(musteri: { manuelKur?: { aktif: boolean; USD?: number; EUR?: number } } | null, paraBirimi: ParaBirimi): number {
  if (paraBirimi === 'TRY') return 1;
  
  // Müşterinin aktif manuel kuru varsa onu kullan
  if (musteri?.manuelKur?.aktif) {
    if (paraBirimi === 'USD' && musteri.manuelKur.USD !== undefined) {
      return musteri.manuelKur.USD;
    }
    if (paraBirimi === 'EUR' && musteri.manuelKur.EUR !== undefined) {
      return musteri.manuelKur.EUR;
    }
  }
  
  // Yoksa sistem kurunu kullan
  return getKur(paraBirimi);
}

// Kur yaşını dakika cinsinden hesapla
export function getKurYasi(): number {
  const kurlar = getGuncelKurlar();
  const guncellemeZamani = new Date(kurlar.guncellemeTarihi);
  const simdikiZaman = new Date();
  return Math.floor((simdikiZaman.getTime() - guncellemeZamani.getTime()) / 60000);
}

// Kur yaşını anlamlı metin olarak formatla
export function formatKurYasi(dakika: number): string {
  if (dakika < 1) return 'Az önce';
  if (dakika === 1) return '1 dakika önce';
  if (dakika < 60) return `${dakika} dakika önce`;
  
  const saat = Math.floor(dakika / 60);
  if (saat === 1) return '1 saat önce';
  if (saat < 24) return `${saat} saat önce`;
  
  const gun = Math.floor(saat / 24);
  return gun === 1 ? '1 gün önce' : `${gun} gün önce`;
}

// Kur yaşına göre renk durumu
export function getKurDurumu(dakika: number): 'yeni' | 'eski' | 'cok-eski' {
  if (dakika <= 10) return 'yeni';
  if (dakika <= 30) return 'eski';
  return 'cok-eski';
}

// Kur değişim yüzdesini hesapla
export function hesaplaKurDegisimi(eskiKur: number, yeniKur: number): number {
  return ((yeniKur - eskiKur) / eskiKur) * 100;
}

// Kurları kaydet ve değişim kontrolü yap
export function kurlarıKaydetVeKontrolEt(
  usd: number, 
  eur: number,
  onKurDegisimi?: (para: 'USD' | 'EUR', eskiKur: number, yeniKur: number, degisimYuzdesi: number) => void
): void {
  // Eski kurları al
  const eskiKurlar = getGuncelKurlar();
  
  // Değişim kontrolü
  const usdDegisim = hesaplaKurDegisimi(eskiKurlar.usd, usd);
  const eurDegisim = hesaplaKurDegisimi(eskiKurlar.eur, eur);
  
  // Yeni kurları kaydet
  kurlarıKaydet(usd, eur);
  
  // %2'den fazla değişim varsa callback'i çağır
  if (onKurDegisimi) {
    if (Math.abs(usdDegisim) >= 2) {
      onKurDegisimi('USD', eskiKurlar.usd, usd, usdDegisim);
    }
    if (Math.abs(eurDegisim) >= 2) {
      onKurDegisimi('EUR', eskiKurlar.eur, eur, eurDegisim);
    }
  }
}
