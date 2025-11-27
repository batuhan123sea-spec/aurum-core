import { Musteri, HesapHareketi } from "@/types/musteri";
import { paraBirimiTLyeCevir, getGuncelKurlar, getKur, formatCurrency } from "./kur-hesaplama";
import { getSatislar, deleteSatisBySatisNo } from "./satis-data";

export const MUSTERI_KEY = 'kuyumcu_musteriler';
export const HAREKET_KEY = 'kuyumcu_hesap_hareketleri';

// Müşteri CRUD
export function getMusteriler(): Musteri[] {
  const stored = localStorage.getItem(MUSTERI_KEY);
  if (!stored) {
    // ✅ MOCK DATA YÜKLEME - Boş array döndür
    console.warn('⚠️ Müşteri verisi bulunamadı, boş liste döndürülüyor');
    return [];
  }
  
  try {
    return JSON.parse(stored);
  } catch (error) {
    console.error('❌ Müşteri verisi parse hatası:', error);
    return [];
  }
}

export function getMusteriById(id: string): Musteri | null {
  const musteriler = getMusteriler();
  return musteriler.find(m => m.id === id) || null;
}

export function saveMusteri(musteri: Musteri): void {
  const musteriler = getMusteriler();
  musteriler.push(musteri);
  localStorage.setItem(MUSTERI_KEY, JSON.stringify(musteriler));
}

export function updateMusteri(musteri: Musteri): void {
  const musteriler = getMusteriler();
  const index = musteriler.findIndex(m => m.id === musteri.id);
  if (index !== -1) {
    musteriler[index] = musteri;
    localStorage.setItem(MUSTERI_KEY, JSON.stringify(musteriler));
  }
}

export function deleteMusteri(id: string): void {
  const musteriler = getMusteriler().filter(m => m.id !== id);
  localStorage.setItem(MUSTERI_KEY, JSON.stringify(musteriler));
  
  // İlgili hareketleri de sil
  const hareketler = getHareketler().filter(h => h.musteriId !== id);
  localStorage.setItem(HAREKET_KEY, JSON.stringify(hareketler));
}

// Hesap hareketi CRUD
export function getHareketler(): HesapHareketi[] {
  const stored = localStorage.getItem(HAREKET_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function getHareketlerByMusteriId(musteriId: string): HesapHareketi[] {
  return getHareketler()
    .filter(h => h.musteriId === musteriId)
    .sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime());
}

export function saveHareket(hareket: HesapHareketi): void {
  const hareketler = getHareketler();
  hareketler.push(hareket);
  localStorage.setItem(HAREKET_KEY, JSON.stringify(hareketler));
}

export function updateHareket(hareket: HesapHareketi): void {
  const hareketler = getHareketler();
  const index = hareketler.findIndex(h => h.id === hareket.id);
  if (index !== -1) {
    hareketler[index] = hareket;
    localStorage.setItem(HAREKET_KEY, JSON.stringify(hareketler));
    
    // Bakiyeleri yeniden hesapla
    musteriBalanceGuncelle(hareket.musteriId);
  }
}

export function deleteHareket(hareketId: string, musteriId: string): void {
  const hareketler = getHareketler();
  const silinecekHareket = hareketler.find(h => h.id === hareketId);
  
  if (!silinecekHareket) {
    console.warn('🗑️ Silinecek hareket bulunamadı:', hareketId);
    return;
  }

  console.log('🗑️ Hareket siliniyor:', {
    id: hareketId,
    islemTuru: silinecekHareket.islemTuru,
    tutar: silinecekHareket.tutar,
    paraBirimi: silinecekHareket.paraBirimi,
    tlKarsiligi: silinecekHareket.tlKarsiligi
  });

  // Bakiye değişimini izlemek için silme öncesi durumu kaydet
  const oncekiBorclar = musteriDovizBorclariniHesapla(musteriId);
  
  // Eğer bu bir satış hareketi ise, ilgili satışı tamamen sil
  if (silinecekHareket.islemTuru === 'satis') {
    // Satış numarasını aciklama alanından çıkar
    const satisNoMatch = silinecekHareket.aciklama.match(/Satış - (SATS-\d+|REZ-\d+)/);
    
    if (satisNoMatch) {
      const satisNo = satisNoMatch[1];
      deleteSatisBySatisNo(satisNo);
      console.log('🗑️ Satış tamamen silindi:', satisNo);
    }
  }
  
  // Hareketi sil
  const filtrelenmisHareketler = hareketler.filter(h => h.id !== hareketId);
  localStorage.setItem(HAREKET_KEY, JSON.stringify(filtrelenmisHareketler));
  
  // Bakiyeleri yeniden hesapla
  musteriBalanceGuncelle(musteriId);

  // Silme sonrası durumu kontrol et
  const sonrakiBorclar = musteriDovizBorclariniHesapla(musteriId);
  
  console.log('📊 Bakiye değişimi:', {
    onceki: {
      TRY: oncekiBorclar.TRY,
      USD: oncekiBorclar.USD,
      EUR: oncekiBorclar.EUR,
      toplamTL: oncekiBorclar.toplamTL
    },
    sonraki: {
      TRY: sonrakiBorclar.TRY,
      USD: sonrakiBorclar.USD,
      EUR: sonrakiBorclar.EUR,
      toplamTL: sonrakiBorclar.toplamTL
    },
    fark: {
      TRY: sonrakiBorclar.TRY - oncekiBorclar.TRY,
      USD: sonrakiBorclar.USD - oncekiBorclar.USD,
      EUR: sonrakiBorclar.EUR - oncekiBorclar.EUR,
      toplamTL: sonrakiBorclar.toplamTL - oncekiBorclar.toplamTL
    }
  });
}

// Satışları hesaba aktar - Senkronizasyon fonksiyonu
export function satislariHesabaAktar(musteriId: string): {
  aktarilanSatislar: number;
  basarili: boolean;
  mesaj: string;
} {
  const satislar = getSatislar().filter(
    s => s.musteriId === musteriId && 
         s.satisTuru === 'hesapli' && 
         s.durum === 'tamamlandi'
  );
  
  const mevcutHareketler = getHareketlerByMusteriId(musteriId);
  let aktarilanSayisi = 0;
  
  satislar.forEach(satis => {
    // Bu satış için hesap hareketi var mı kontrol et
    const hareketVar = mevcutHareketler.some(h => 
      h.aciklama.includes(satis.satisNo) && h.islemTuru === 'satis'
    );
    
    if (!hareketVar) {
      // Satış TL cinsinden, direkt ekle
      const hareket: HesapHareketi = {
        id: `hareket-${Date.now()}-${Math.random()}`,
        musteriId: satis.musteriId!,
        tarih: satis.tarih,
        islemTuru: 'satis',
        aciklama: `Satış ${satis.satisNo} - ${satis.kalemler.length} ürün`,
        paraBirimi: 'TRY',
        tutar: satis.genelToplam,
        kur: 1,
        tlKarsiligi: satis.genelToplam,
        bakiye: 0 // Sonra hesaplanacak
      };
      
      saveHareket(hareket);
      aktarilanSayisi++;
    }
  });
  
  // Bakiyeleri yeniden hesapla
  if (aktarilanSayisi > 0) {
    musteriBalanceGuncelle(musteriId);
  }
  
  return {
    aktarilanSatislar: aktarilanSayisi,
    basarili: true,
    mesaj: `${aktarilanSayisi} satış hesaba aktarıldı`
  };
}

// Ödeme işlemi - para birimi öncelikli
export function odemeIsle(
  musteriId: string,
  odemeTutari: number,
  odemeParaBirimi: 'TRY' | 'USD' | 'EUR',
  odemeTarihi: string,
  odemeTuru: string,
  aciklama: string
): { success: boolean; message: string; hareketler: HesapHareketi[] } {
  console.log('🔵 Ödeme işlemi başladı:', { musteriId, odemeTutari, odemeParaBirimi });
  
  const musteri = getMusteriById(musteriId);
  if (!musteri) {
    return { success: false, message: 'Müşteri bulunamadı', hareketler: [] };
  }

  // Mevcut borçları hesapla
  const mevcutBorclar = musteriDovizBorclariniHesapla(musteriId);
  console.log('📊 Mevcut borçlar:', mevcutBorclar);

  // Fazla ödeme kontrolü
  const odemeTLKarsiligi = odemeTutari * getKur(odemeParaBirimi);
  if (odemeTLKarsiligi > mevcutBorclar.toplamTL) {
    return {
      success: false,
      message: `Hata: Ödeme tutarı (${formatCurrency(odemeTLKarsiligi, 'TRY')}) mevcut borçtan (${formatCurrency(mevcutBorclar.toplamTL, 'TRY')}) fazla olamaz.`,
      hareketler: []
    };
  }

  // Ödeme önceliği: Önce ödeme yapılan para birimi, sonra TRY, USD, EUR
  const oncelikSirasi: Array<'TRY' | 'USD' | 'EUR'> = [
    odemeParaBirimi,
    ...(['TRY', 'USD', 'EUR'] as Array<'TRY' | 'USD' | 'EUR'>).filter(pb => pb !== odemeParaBirimi)
  ];

  const hareketler: HesapHareketi[] = [];
  let kalanOdeme = odemeTutari;
  let bakiye = mevcutBorclar.toplamTL;

  oncelikSirasi.forEach(paraBirimi => {
    if (kalanOdeme <= 0) return;
    if (mevcutBorclar[paraBirimi] <= 0) return;

    // Bu para biriminden ne kadar düşebiliriz?
    let dusulecekTutar = 0;

    if (paraBirimi === odemeParaBirimi) {
      // Aynı para birimindeyse direkt düş
      dusulecekTutar = Math.min(kalanOdeme, mevcutBorclar[paraBirimi]);
    } else {
      // Farklı para birimindeyse, önce kurla çevir
      const odemeKuru = getKur(odemeParaBirimi);
      const borcKuru = getKur(paraBirimi);
      
      // Ödemeyi hedef para birimine çevir
      const odemeTLKarsiligi = kalanOdeme * odemeKuru;
      const borcTLKarsiligi = mevcutBorclar[paraBirimi] * borcKuru;
      
      // Hedef para biriminde ne kadar düşebiliriz?
      const dusulecekTL = Math.min(odemeTLKarsiligi, borcTLKarsiligi);
      dusulecekTutar = dusulecekTL / borcKuru;
    }

    if (dusulecekTutar > 0) {
      const kur = getKur(paraBirimi);
      const tlKarsiligi = dusulecekTutar * kur;
      
      // Bakiyeyi güncelle
      bakiye -= tlKarsiligi;

      const hareket: HesapHareketi = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        musteriId,
        tarih: new Date(odemeTarihi).toISOString(),
        islemTuru: 'odeme',
        aciklama: aciklama || `Ödeme alındı (${odemeParaBirimi} → ${paraBirimi})`,
        paraBirimi,
        tutar: dusulecekTutar,
        kur,
        tlKarsiligi,
        bakiye,
        odemeTuru: odemeTuru as any,
      };

      hareketler.push(hareket);
      console.log('✅ Hareket kaydedildi:', hareket);

      // Kalan ödemeyi güncelle
      if (paraBirimi === odemeParaBirimi) {
        kalanOdeme -= dusulecekTutar;
      } else {
        const odemeKuru = getKur(odemeParaBirimi);
        const borcKuru = getKur(paraBirimi);
        kalanOdeme -= (dusulecekTutar * borcKuru) / odemeKuru;
      }

      // Borçtan düş
      mevcutBorclar[paraBirimi] -= dusulecekTutar;
    }
  });

  // Tüm hareketleri kaydet
  hareketler.forEach(h => saveHareket(h));

  console.log('📊 Yeni bakiye:', bakiye);
  
  return {
    success: true,
    message: 'Ödeme başarıyla kaydedildi',
    hareketler
  };
}

// Müşterinin döviz borçlarını hesapla
export function musteriDovizBorclariniHesapla(musteriId: string): {
  TRY: number;
  USD: number;
  EUR: number;
  toplamTL: number;
} {
  const hareketler = getHareketlerByMusteriId(musteriId);
  
  console.log('🔢 Borç hesaplama başladı, hareket sayısı:', hareketler.length);
  
  // 🆕 AŞAMA 1: Önce tüm satışları topla (para birimi bazında)
  const satislar = { TRY: 0, USD: 0, EUR: 0 };
  
  hareketler.forEach(hareket => {
    if (hareket.islemTuru === 'satis') {
      satislar[hareket.paraBirimi] += hareket.tutar;
      console.log(`  ➕ Satış: +${hareket.tutar.toFixed(2)} ${hareket.paraBirimi}`);
    }
  });
  
  // 🆕 AŞAMA 2: Sonra tüm ödeme ve iadeleri topla
  const odemeler = { TRY: 0, USD: 0, EUR: 0 };
  
  hareketler.forEach(hareket => {
    if (hareket.islemTuru === 'odeme' || hareket.islemTuru === 'iade') {
      odemeler[hareket.paraBirimi] += hareket.tutar;
      console.log(`  ➖ ${hareket.islemTuru}: -${hareket.tutar.toFixed(2)} ${hareket.paraBirimi}`);
    }
  });
  
  // 🆕 AŞAMA 3: Net borç = Satışlar - Ödemeler (negatif olamaz)
  const borclar = {
    TRY: Math.max(0, satislar.TRY - odemeler.TRY),
    USD: Math.max(0, satislar.USD - odemeler.USD),
    EUR: Math.max(0, satislar.EUR - odemeler.EUR)
  };
  
  // Güncel kurlarla TL karşılığını hesapla
  const kurlar = getGuncelKurlar();
  const toplamTL = 
    borclar.TRY + 
    (borclar.USD * kurlar.usd) + 
    (borclar.EUR * kurlar.eur);
  
  console.log('✅ Hesaplama tamamlandı:', {
    satislar,
    odemeler,
    netBorclar: borclar,
    toplamTL: toplamTL.toFixed(2)
  });
  
  return {
    ...borclar,
    toplamTL
  };
}

// Müşteri bakiyesini güncelle
export function musteriBalanceGuncelle(musteriId: string): void {
  const musteri = getMusteriById(musteriId);
  if (!musteri) return;
  
  // Dinamik hesaplama
  const hesaplananBorclar = musteriDovizBorclariniHesapla(musteriId);
  
  musteri.borclar = {
    TRY: hesaplananBorclar.TRY,
    USD: hesaplananBorclar.USD,
    EUR: hesaplananBorclar.EUR
  };
  musteri.toplamBorcTL = hesaplananBorclar.toplamTL;
  musteri.sonIslemTarihi = new Date().toISOString();
  
  updateMusteri(musteri);
}

// Tüm müşteri borçlarını güncelle (kur değiştiğinde)
export function tumMusteriBorclariniGuncelle(): void {
  const musteriler = getMusteriler();
  
  musteriler.forEach(musteri => {
    musteriBalanceGuncelle(musteri.id);
  });
  
  console.log('✅ Tüm müşteri borçları güncel kurlarla güncellendi');
}

// Hesap ekstresini bakiyelerle birlikte hesapla
export function hesapEkstresiniHesapla(musteriId: string): HesapHareketi[] {
  const hareketler = getHareketlerByMusteriId(musteriId);
  const sortedHareketler = [...hareketler].sort(
    (a, b) => new Date(a.tarih).getTime() - new Date(b.tarih).getTime()
  );
  
  let bakiye = 0;
  return sortedHareketler.map(hareket => {
    if (hareket.islemTuru === 'satis') {
      bakiye += hareket.tlKarsiligi;
    } else {
      bakiye -= hareket.tlKarsiligi;
      // Bakiye negatif olamaz
      bakiye = Math.max(0, bakiye);
    }
    
    return { ...hareket, bakiye };
  }).reverse(); // En yeni üstte
}

// Arama
export function searchMusteriler(query: string): Musteri[] {
  const lowerQuery = query.toLowerCase();
  return getMusteriler().filter(m =>
    m.adSoyad.toLowerCase().includes(lowerQuery) ||
    m.telefon.toLowerCase().includes(lowerQuery) ||
    m.adres.toLowerCase().includes(lowerQuery) ||
    m.kod.toLowerCase().includes(lowerQuery)
  );
}

// Alfabetik filtreleme
export function getMusterilerByAlphabet(harf: string): Musteri[] {
  if (harf === 'TÜM') return getMusteriler();
  return getMusteriler().filter(m => 
    m.adSoyad.charAt(0).toLocaleUpperCase('tr-TR') === harf
  );
}

// Konum filtreleme
export function filterMusterilerByKonum(konum: 'ic' | 'dis'): Musteri[] {
  return getMusteriler().filter(m => m.konum === konum);
}

// Borç filtreleme
export function filterMusterilerByBorc(durum: 'borclu' | 'borcsuz'): Musteri[] {
  return getMusteriler().filter(m => 
    durum === 'borclu' ? m.toplamBorcTL > 0 : m.toplamBorcTL === 0
  );
}

// Müşteri kodu üret
export function generateMusteriKodu(): string {
  const musteriler = getMusteriler();
  const sonKod = musteriler.length > 0
    ? Math.max(...musteriler.map(m => parseInt(m.kod.split('-')[1])))
    : 0;
  return `MUS-${String(sonKod + 1).padStart(4, '0')}`;
}

// Manuel hareket oluştur
export function createManualHareket(params: {
  musteriId: string;
  islemTuru: 'satis' | 'odeme' | 'iade';
  tarih: string;
  tutar: number;
  paraBirimi: 'TRY' | 'USD' | 'EUR';
  aciklama: string;
  odemeTuru?: 'nakit' | 'kredi-karti' | 'eft' | 'havale';
}): void {
  const { musteriId, islemTuru, tarih, tutar, paraBirimi, aciklama, odemeTuru } = params;
  
  const kur = getKur(paraBirimi);
  const tlKarsiligi = tutar * kur;
  
  const yeniHareket: HesapHareketi = {
    id: `hareket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    musteriId,
    tarih,
    islemTuru,
    aciklama,
    paraBirimi,
    tutar,
    kur,
    tlKarsiligi,
    bakiye: 0,
    odemeTuru: islemTuru === 'odeme' ? odemeTuru : undefined,
  };
  
  saveHareket(yeniHareket);
  musteriBalanceGuncelle(musteriId);
}

// İade hareketi oluştur
export function createIadeHareket(params: {
  musteriId: string;
  tarih: string;
  tutar: number;
  paraBirimi: 'TRY' | 'USD' | 'EUR';
  aciklama: string;
}): void {
  const { musteriId, tarih, tutar, paraBirimi, aciklama } = params;
  
  const kur = getKur(paraBirimi);
  const tlKarsiligi = tutar * kur;
  
  const iadeHareket: HesapHareketi = {
    id: `iade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    musteriId,
    tarih,
    islemTuru: 'iade',
    aciklama,
    paraBirimi,
    tutar,
    kur,
    tlKarsiligi,
    bakiye: 0,
  };
  
  saveHareket(iadeHareket);
  musteriBalanceGuncelle(musteriId);
}

// Eski müşteri verilerini yeni yapıya dönüştür (migrasyon)
export function migrateOldData(): void {
  const musteriler = getMusteriler();
  let migrasyonYapildi = false;
  
  musteriler.forEach(musteri => {
    // Eğer eski formattaysa (toplamBorc var ama borclar yok)
    if ('toplamBorc' in musteri && !('borclar' in musteri)) {
      const musteriAny = musteri as any;
      const eskiBorc = musteriAny.toplamBorc;
      const varsayilanPB = musteriAny.varsayilanParaBirimi || 'TRY';
      
      // Güncel kurları al
      const kurlar = getGuncelKurlar();
      
      // Eski borcu varsayılan para birimine ata
      musteriAny.borclar = {
        TRY: varsayilanPB === 'TRY' ? eskiBorc : 0,
        USD: varsayilanPB === 'USD' ? eskiBorc / kurlar.usd : 0,
        EUR: varsayilanPB === 'EUR' ? eskiBorc / kurlar.eur : 0
      };
      musteriAny.toplamBorcTL = eskiBorc;
      
      // Eski alanı sil
      delete musteriAny.toplamBorc;
      
      updateMusteri(musteri);
      migrasyonYapildi = true;
    }
  });
  
  if (migrasyonYapildi) {
    console.log('✅ Eski müşteri verileri yeni yapıya dönüştürüldü');
  }
}

// ⛔ Mock data - DEVRE DIŞI
export function initializeMockData(): void {
  console.error('⛔ initializeMockData() DEVRE DIŞI BIRAKILDI - Mock data üretim ortamında yüklenemez!');
  console.error('⛔ Bu fonksiyon veri kaybına neden olduğu için tamamen devre dışı bırakıldı.');
  return; // Hiçbir şey yapma
}
