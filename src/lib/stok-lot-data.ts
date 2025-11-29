import { StokLot } from '@/types/stok';

const STORAGE_KEY = 'kuyumcu_stok_lotlar';
const MIGRATION_KEY = 'kuyumcu_lot_migration_v1';

// Tüm stok lotlarını getir
export const getStokLotlar = (): StokLot[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return [];
  }
  
  try {
    return JSON.parse(stored);
  } catch (error) {
    console.error('❌ Stok lot verisi parse hatası:', error);
    return [];
  }
};

// Stok lotu kaydet/güncelle
export const saveStokLot = (lot: StokLot): void => {
  const lotlar = getStokLotlar();
  const existingIndex = lotlar.findIndex(l => l.id === lot.id);
  
  if (existingIndex >= 0) {
    lotlar[existingIndex] = lot;
  } else {
    lotlar.push(lot);
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lotlar));
};

// Bir ürüne ait tüm lotları getir
export const getUrunLotlari = (urunId: string): StokLot[] => {
  return getStokLotlar()
    .filter(l => l.urunId === urunId)
    .sort((a, b) => new Date(a.alisTarihi).getTime() - new Date(b.alisTarihi).getTime()); // FIFO için tarihe göre sıralama
};

// Lot numarası oluştur
export const generateLotNo = (urunId: string): string => {
  const urunLotlari = getUrunLotlari(urunId);
  const maxLotNo = urunLotlari.reduce((max, lot) => {
    const num = parseInt(lot.batchNo.split('-')[1]);
    return num > max ? num : max;
  }, 0);
  return `LOT-${String(maxLotNo + 1).padStart(3, '0')}`;
};

// FIFO mantığıyla stok düş ve kullanılan lotları döndür
export const stokDus = (
  urunId: string, 
  miktar: number
): Array<{ lotId: string; alisFiyati: number; paraBirimi: 'TRY' | 'USD' | 'EUR'; dusulecekMiktar: number }> => {
  const lotlar = getUrunLotlari(urunId); // Zaten FIFO sıralı geliyor
  const kullanilanLotlar: Array<{ lotId: string; alisFiyati: number; paraBirimi: 'TRY' | 'USD' | 'EUR'; dusulecekMiktar: number }> = [];
  
  let kalanMiktar = miktar;
  
  for (const lot of lotlar) {
    if (kalanMiktar <= 0) break;
    if (lot.stokMiktari <= 0) continue;
    
    const dusulecekMiktar = Math.min(kalanMiktar, lot.stokMiktari);
    
    // Lotu güncelle
    lot.stokMiktari -= dusulecekMiktar;
    saveStokLot(lot);
    
    // Kullanılan lot kaydı
    kullanilanLotlar.push({
      lotId: lot.id,
      alisFiyati: lot.alisFiyati,
      paraBirimi: lot.paraBirimi,
      dusulecekMiktar
    });
    
    kalanMiktar -= dusulecekMiktar;
    
    console.log(`🔹 LOT düştü: ${lot.batchNo} - ${dusulecekMiktar} adet (Kalan: ${lot.stokMiktari})`);
  }
  
  if (kalanMiktar > 0) {
    console.warn(`⚠️ Yetersiz stok! ${kalanMiktar} adet daha düşülemedi.`);
  }
  
  return kullanilanLotlar;
};

// Lot sil
export const deleteStokLot = (lotId: string): void => {
  const lotlar = getStokLotlar().filter(l => l.id !== lotId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lotlar));
};

// Ürün toplam stok miktarını hesapla (tüm lotların toplamı)
export const calculateUrunToplamStok = (urunId: string): number => {
  return getUrunLotlari(urunId).reduce((total, lot) => total + lot.stokMiktari, 0);
};

// Mevcut ürünleri lot sistemine migrate et (bir kere çalışır)
export const migrateUrunlerToLots = (): void => {
  const migrated = localStorage.getItem(MIGRATION_KEY);
  if (migrated) return;
  
  const urunlerStr = localStorage.getItem('kuyumcu_stok_urunler');
  if (!urunlerStr) return;
  
  try {
    const urunler = JSON.parse(urunlerStr);
    const lotlar: StokLot[] = [];
    
    urunler.forEach((urun: any) => {
      if (urun.stokMiktari > 0) {
        const lot: StokLot = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          urunId: urun.id,
          tedarikciId: undefined,
          tedarikciAdi: 'Başlangıç Stoku',
          alisFiyati: urun.alisFiyati || 0,
          paraBirimi: urun.alisFiyatiParaBirimi || 'TRY',
          stokMiktari: urun.stokMiktari,
          alisTarihi: urun.olusturmaTarihi || new Date().toISOString(),
          batchNo: 'LOT-001',
          aciklama: 'Sistem başlangıç stoku - mevcut verilerden otomatik oluşturuldu'
        };
        
        lotlar.push(lot);
      }
    });
    
    if (lotlar.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lotlar));
      console.log(`✅ ${lotlar.length} ürün lot sistemine migrate edildi`);
    }
    
    localStorage.setItem(MIGRATION_KEY, 'done');
  } catch (error) {
    console.error('❌ Lot migration hatası:', error);
  }
};
