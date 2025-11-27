import { Urun } from '@/types/stok';

const STORAGE_KEY = 'kuyumcu_stok_urunler';
const MIGRATION_KEY = 'kuyumcu_urunler_migration_v1';

// 🗑️ Otomatik veri temizleme (bir kerelik)
const URUN_CLEANUP_VERSION = 'urun_cleanup_v1';
if (!localStorage.getItem(URUN_CLEANUP_VERSION)) {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.setItem(URUN_CLEANUP_VERSION, 'done');
  console.log('🗑️ Ürün verileri sıfırlandı');
}

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

// Barkod validasyon fonksiyonu
const isValidEAN13 = (barcode: string): boolean => {
  if (barcode.length !== 13 || !/^\d+$/.test(barcode)) return false;
  
  const digits = barcode.slice(0, 12).split('').map(Number);
  let sum = 0;
  
  digits.forEach((digit, index) => {
    sum += index % 2 === 0 ? digit : digit * 3;
  });
  
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(barcode[12]);
};

// Migration fonksiyonu - var olan ürünlere otomatik barkod ataması
const BARKOD_MIGRATION_KEY = 'kuyumcu_barkod_migration_v2';
const migrateBarcodes = (): void => {
  const migrated = localStorage.getItem(BARKOD_MIGRATION_KEY);
  if (migrated) return;
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return;
  
  try {
    const urunler: Urun[] = JSON.parse(stored);
    let updated = false;
    
    const updatedUrunler = urunler.map(urun => {
      // Eğer barkod yoksa, 13 haneli değilse veya geçersizse yeni oluştur
      if (!urun.barkod || !isValidEAN13(urun.barkod)) {
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
    // ✅ MOCK DATA YÜKLEME - Boş array döndür
    console.warn('⚠️ Ürün verisi bulunamadı, boş liste döndürülüyor');
    return [];
  }
  
  try {
    return JSON.parse(stored);
  } catch (error) {
    console.error('❌ Ürün verisi parse hatası:', error);
    // JSON bozuksa, VERİYİ SİLME, sadece hata döndür
    return [];
  }
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
