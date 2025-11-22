import { Musteri, HesapHareketi } from "@/types/musteri";
import { paraBirimiTLyeCevir, getGuncelKurlar, getKur } from "./kur-hesaplama";

const MUSTERI_KEY = 'kuyumcu_musteriler';
const HAREKET_KEY = 'kuyumcu_hesap_hareketleri';

// Müşteri CRUD
export function getMusteriler(): Musteri[] {
  const stored = localStorage.getItem(MUSTERI_KEY);
  if (!stored) {
    initializeMockData();
    return getMusteriler();
  }
  return JSON.parse(stored);
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
  
  const borclar = {
    TRY: 0,
    USD: 0,
    EUR: 0
  };
  
  hareketler.forEach(hareket => {
    const miktar = hareket.tutar;
    const paraBirimi = hareket.paraBirimi;
    
    if (hareket.islemTuru === 'satis') {
      borclar[paraBirimi] += miktar;
    } else if (hareket.islemTuru === 'odeme') {
      borclar[paraBirimi] -= miktar;
    } else if (hareket.islemTuru === 'iade') {
      borclar[paraBirimi] -= miktar;
    }
  });
  
  // Güncel kurlarla TL karşılığını hesapla
  const kurlar = getGuncelKurlar();
  const toplamTL = 
    borclar.TRY + 
    (borclar.USD * kurlar.usd) + 
    (borclar.EUR * kurlar.eur);
  
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

// Mock data
export function initializeMockData(): void {
  const mockMusteriler: Musteri[] = [
    {
    id: '1',
    kod: 'MUS-0001',
    adSoyad: 'Ahmet Yılmaz',
    telefon: '0532 123 45 67',
    email: 'ahmet.yilmaz@email.com',
    adres: 'Kapalıçarşı, No: 15, Fatih/İstanbul',
    vergiNoTcKimlik: '12345678901',
    konum: 'ic',
    varsayilanParaBirimi: 'TRY',
      borclar: { TRY: 15000, USD: 0, EUR: 0 },
      toplamBorcTL: 15000,
      durumu: 'aktif',
      olusturmaTarihi: '2024-01-15T10:00:00Z',
      sonIslemTarihi: '2024-03-20T14:30:00Z'
    },
    {
      id: '2',
      kod: 'MUS-0002',
      adSoyad: 'Ayşe Demir',
      telefon: '0533 234 56 78',
      email: 'ayse.demir@email.com',
      adres: 'Bakırcılar Çarşısı, No: 42, Fatih/İstanbul',
      vergiNoTcKimlik: '9876543210',
      konum: 'ic',
      varsayilanParaBirimi: 'USD',
      borclar: { TRY: 0, USD: 250, EUR: 0 },
      toplamBorcTL: 8500,
      durumu: 'aktif',
      olusturmaTarihi: '2024-02-10T09:15:00Z',
      sonIslemTarihi: '2024-03-18T11:20:00Z'
    },
    {
      id: '3',
      kod: 'MUS-0003',
      adSoyad: 'Mehmet Kaya',
      telefon: '0534 345 67 89',
      adres: 'Atatürk Bulvarı, No: 123, Çankaya/Ankara',
      konum: 'dis',
      varsayilanParaBirimi: 'TRY',
      borclar: { TRY: 0, USD: 0, EUR: 0 },
      toplamBorcTL: 0,
      durumu: 'aktif',
      olusturmaTarihi: '2024-01-05T13:45:00Z',
      sonIslemTarihi: '2024-03-15T16:00:00Z'
    },
    {
      id: '4',
      kod: 'MUS-0004',
      adSoyad: 'Fatma Şahin',
      telefon: '0535 456 78 90',
      adres: 'Kızılay Meydanı, No: 56, Çankaya/Ankara',
      konum: 'dis',
      varsayilanParaBirimi: 'EUR',
      borclar: { TRY: 0, USD: 0, EUR: 650 },
      toplamBorcTL: 22867,
      durumu: 'aktif',
      olusturmaTarihi: '2024-02-20T08:30:00Z',
      sonIslemTarihi: '2024-03-19T15:45:00Z'
    },
    {
      id: '5',
      kod: 'MUS-0005',
      adSoyad: 'Can Öztürk',
      telefon: '0536 567 89 01',
      adres: 'Mücevherci Sokak, No: 8, Fatih/İstanbul',
      konum: 'ic',
      varsayilanParaBirimi: 'TRY',
      borclar: { TRY: 5200, USD: 0, EUR: 0 },
      toplamBorcTL: 5200,
      durumu: 'aktif',
      olusturmaTarihi: '2024-03-01T11:00:00Z',
      sonIslemTarihi: '2024-03-21T10:15:00Z'
    }
  ];
  
  const mockHareketler: HesapHareketi[] = [
    {
      id: 'h1',
      musteriId: '1',
      tarih: '2024-03-20T14:30:00Z',
      islemTuru: 'satis',
      aciklama: 'Altın Bilezik, Kolye Ucu',
      paraBirimi: 'TRY',
      tutar: 15000,
      kur: 1,
      tlKarsiligi: 15000,
      bakiye: 15000
    },
    {
      id: 'h2',
      musteriId: '2',
      tarih: '2024-03-18T11:20:00Z',
      islemTuru: 'odeme',
      aciklama: 'Nakit ödeme',
      paraBirimi: 'USD',
      tutar: 200,
      kur: 32.45,
      tlKarsiligi: 6490,
      bakiye: 8500,
      odemeTuru: 'nakit'
    },
    {
      id: 'h3',
      musteriId: '4',
      tarih: '2024-03-19T15:45:00Z',
      islemTuru: 'satis',
      aciklama: 'Pırlanta Yüzük',
      paraBirimi: 'EUR',
      tutar: 650,
      kur: 35.18,
      tlKarsiligi: 22867,
      bakiye: 22300
    }
  ];
  
  localStorage.setItem(MUSTERI_KEY, JSON.stringify(mockMusteriler));
  localStorage.setItem(HAREKET_KEY, JSON.stringify(mockHareketler));
}
