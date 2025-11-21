import { Urun } from '@/types/stok';

const STORAGE_KEY = 'kuyumcu_stok_urunler';
const MIGRATION_KEY = 'kuyumcu_urunler_migration_v1';

// Mock data - 8. kategori örnek ürünleri
const MOCK_URUNLER: Urun[] = [
  {
    id: '1',
    kod: 'KUT-001',
    ad: 'Lüks Takı Kutusu - Büyük',
    barkod: '8697123456789',
    kategori: 'kutular-aksesuarlar',
    stokMiktari: 45,
    birim: 'Adet',
    tedarikciler: [{
      id: '1',
      tedarikciId: '1',
      tedarikciAdi: 'Kutu Dünyası A.Ş.',
      alisFiyati: 2.20,
      paraBirimi: 'EUR',
      teslimatSuresi: 7,
      varsayilan: true
    }],
    alisFiyati: 2.20,
    alisFiyatiParaBirimi: 'EUR',
    karMarji: 40,
    satisFiyati: 3.50,
    minStokSeviyesi: 20,
    kritikStokSeviyesi: 10,
    aciklama: 'Kadife iç kaplama, manyetik kapak',
    olusturmaTarihi: new Date().toISOString(),
    guncellemeTarihi: new Date().toISOString()
  },
  {
    id: '2',
    kod: 'KUT-002',
    ad: 'Yüzük Kutusu - Kadife İç',
    barkod: '8697123456790',
    kategori: 'kutular-aksesuarlar',
    stokMiktari: 120,
    birim: 'Adet',
    tedarikciler: [{
      id: '2',
      tedarikciId: '1',
      tedarikciAdi: 'Kutu Dünyası A.Ş.',
      alisFiyati: 15.00,
      paraBirimi: 'TRY',
      teslimatSuresi: 5,
      varsayilan: true
    }],
    alisFiyati: 15.00,
    alisFiyatiParaBirimi: 'TRY',
    karMarji: 35,
    satisFiyati: 28.00,
    minStokSeviyesi: 50,
    kritikStokSeviyesi: 25,
    aciklama: 'Siyah kadife iç, 5x5 cm',
    olusturmaTarihi: new Date().toISOString(),
    guncellemeTarihi: new Date().toISOString()
  },
  {
    id: '3',
    kod: 'KUT-003',
    ad: 'Kolye Standı - Ahşap',
    barkod: '8697123456791',
    kategori: 'kutular-aksesuarlar',
    stokMiktari: 30,
    birim: 'Adet',
    tedarikciler: [{
      id: '3',
      tedarikciId: '2',
      tedarikciAdi: 'Ahşap Sanatları Ltd.',
      alisFiyati: 85,
      paraBirimi: 'USD',
      teslimatSuresi: 10,
      varsayilan: true
    }],
    alisFiyati: 85,
    alisFiyatiParaBirimi: 'USD',
    karMarji: 40,
    satisFiyati: 120,
    minStokSeviyesi: 10,
    kritikStokSeviyesi: 5,
    aciklama: 'Ceviz ağacı, 30 cm yükseklik',
    olusturmaTarihi: new Date().toISOString(),
    guncellemeTarihi: new Date().toISOString()
  },
  {
    id: '4',
    kod: 'KUT-004',
    ad: 'Bileklik Yastığı - Siyah',
    barkod: '8697123456792',
    kategori: 'kutular-aksesuarlar',
    stokMiktari: 75,
    birim: 'Adet',
    tedarikciler: [{
      id: '4',
      tedarikciId: '1',
      tedarikciAdi: 'Kutu Dünyası A.Ş.',
      alisFiyati: 0.50,
      paraBirimi: 'EUR',
      teslimatSuresi: 5,
      varsayilan: true
    }],
    alisFiyati: 0.50,
    alisFiyatiParaBirimi: 'EUR',
    karMarji: 50,
    satisFiyati: 1.05,
    minStokSeviyesi: 30,
    kritikStokSeviyesi: 15,
    aciklama: 'Kadife kaplı, yuvarlak yastık',
    olusturmaTarihi: new Date().toISOString(),
    guncellemeTarihi: new Date().toISOString()
  },
  {
    id: '5',
    kod: 'KUT-005',
    ad: 'Takı Temizleme Bezi',
    barkod: '8697123456793',
    kategori: 'kutular-aksesuarlar',
    stokMiktari: 200,
    birim: 'Adet',
    tedarikciler: [{
      id: '5',
      tedarikciId: '3',
      tedarikciAdi: 'Kimya Ticaret A.Ş.',
      alisFiyati: 3.50,
      paraBirimi: 'TRY',
      teslimatSuresi: 3,
      varsayilan: true
    }],
    alisFiyati: 3.50,
    alisFiyatiParaBirimi: 'TRY',
    karMarji: 60,
    satisFiyati: 8.00,
    minStokSeviyesi: 100,
    kritikStokSeviyesi: 50,
    aciklama: 'Mikrofiber, 20x20 cm',
    olusturmaTarihi: new Date().toISOString(),
    guncellemeTarihi: new Date().toISOString()
  }
];

// Migration fonksiyonu - eski ürünlere satisFiyatiParaBirimi ekle
const migrateProductCurrencies = (): void => {
  const migrated = localStorage.getItem(MIGRATION_KEY);
  if (migrated) return; // Zaten migrate edilmiş
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return;
  
  try {
    const urunler: Urun[] = JSON.parse(stored);
    const updatedUrunler = urunler.map(urun => ({
      ...urun,
      satisFiyatiParaBirimi: urun.satisFiyatiParaBirimi || urun.alisFiyatiParaBirimi
    }));
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUrunler));
    localStorage.setItem(MIGRATION_KEY, 'done');
  } catch (error) {
    console.error('Migration failed:', error);
  }
};

// Migration fonksiyonu - tedarikciler array'inin undefined olmaması için
const TEDARIKCILER_MIGRATION_KEY = 'kuyumcu_urunler_tedarikciler_v1';
const migrateTedarikcilerArray = (): void => {
  const migrated = localStorage.getItem(TEDARIKCILER_MIGRATION_KEY);
  if (migrated) return;
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return;
  
  try {
    const urunler: Urun[] = JSON.parse(stored);
    const updatedUrunler = urunler.map(urun => ({
      ...urun,
      tedarikciler: urun.tedarikciler && urun.tedarikciler.length > 0 ? urun.tedarikciler : []
    }));
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUrunler));
    localStorage.setItem(TEDARIKCILER_MIGRATION_KEY, 'done');
  } catch (error) {
    console.error('Tedarikciler migration failed:', error);
  }
};

// Migration fonksiyonu - var olan ürünlere otomatik barkod ataması
const BARKOD_MIGRATION_KEY = 'kuyumcu_barkod_migration_v1';
const migrateBarcodes = (): void => {
  const migrated = localStorage.getItem(BARKOD_MIGRATION_KEY);
  if (migrated) return;
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return;
  
  try {
    const urunler: Urun[] = JSON.parse(stored);
    let updated = false;
    
    const updatedUrunler = urunler.map(urun => {
      // Eğer barkod yoksa veya geçersizse yeni oluştur
      if (!urun.barkod || urun.barkod.length !== 13) {
        updated = true;
        return {
          ...urun,
          barkod: generateBarkod()
        };
      }
      return urun;
    });
    
    if (updated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUrunler));
      console.log('✅ Barkod migration tamamlandı:', updatedUrunler.length, 'ürün güncellendi');
    }
    localStorage.setItem(BARKOD_MIGRATION_KEY, 'done');
  } catch (error) {
    console.error('Barkod migration failed:', error);
  }
};

export const getUrunler = (): Urun[] => {
  // Migration kontrolü
  migrateProductCurrencies();
  migrateTedarikcilerArray();
  migrateBarcodes();
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    // İlk kez çalışıyorsa mock data'yı kaydet (migration ile)
    const migratedMockData = MOCK_URUNLER.map(urun => ({
      ...urun,
      satisFiyatiParaBirimi: urun.satisFiyatiParaBirimi || urun.alisFiyatiParaBirimi
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedMockData));
    localStorage.setItem(MIGRATION_KEY, 'done');
    return migratedMockData;
  }
  return JSON.parse(stored);
};

export const saveUrun = (urun: Urun): void => {
  const urunler = getUrunler();
  const existingIndex = urunler.findIndex(u => u.id === urun.id);
  
  if (existingIndex >= 0) {
    urunler[existingIndex] = { ...urun, guncellemeTarihi: new Date().toISOString() };
  } else {
    urunler.push(urun);
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(urunler));
};

export const deleteUrun = (id: string): void => {
  const urunler = getUrunler().filter(u => u.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(urunler));
};

export const getUrunByKategori = (kategoriId: string): Urun[] => {
  return getUrunler().filter(u => u.kategori === kategoriId);
};

export const searchUrunler = (query: string): Urun[] => {
  const lowerQuery = query.toLowerCase();
  return getUrunler().filter(u => 
    u.ad.toLowerCase().includes(lowerQuery) ||
    u.barkod.toLowerCase().includes(lowerQuery) ||
    u.tedarikciler.some(t => t.tedarikciAdi.toLowerCase().includes(lowerQuery)) ||
    u.kod.toLowerCase().includes(lowerQuery)
  );
};

export const generateUrunKodu = (): string => {
  const urunler = getUrunler();
  const maxKod = urunler.reduce((max, u) => {
    const num = parseInt(u.kod.split('-')[1]);
    return num > max ? num : max;
  }, 0);
  return `URN-${String(maxKod + 1).padStart(3, '0')}`;
};

// EAN-13 kontrol hanesi hesaplama
function calculateEAN13CheckDigit(code: string): string {
  const digits = code.split('').map(Number);
  let sum = 0;
  
  digits.forEach((digit, index) => {
    sum += index % 2 === 0 ? digit : digit * 3;
  });
  
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit.toString();
}

// Otomatik barkod numarası oluşturma (EAN-13 formatında)
export const generateBarkod = (): string => {
  const timestamp = Date.now().toString().slice(-8); // Son 8 hane
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  // 12 haneli barkod (EAN-13 için kontrol hanesi hariç)
  const prefix = '869'; // Türkiye prefix
  const code = `${prefix}${timestamp}${random}`.slice(0, 12);
  
  // EAN-13 kontrol hanesi hesapla
  const checkDigit = calculateEAN13CheckDigit(code);
  
  return `${code}${checkDigit}`;
};
