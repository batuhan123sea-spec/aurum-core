import { StokHareket, Urun } from '@/types/stok';

const STORAGE_KEY = 'kuyumcu_stok_hareketler';

export const getStokHareketler = (): StokHareket[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const saveStokHareket = (hareket: StokHareket): void => {
  const hareketler = getStokHareketler();
  hareketler.push(hareket);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(hareketler));
};

export const getUrunHareketleri = (urunId: string): StokHareket[] => {
  return getStokHareketler().filter(h => h.urunId === urunId);
};

export const stokHareketKaydet = (
  urunId: string,
  islemTuru: 'giris' | 'cikis' | 'duzeltme' | 'sayim',
  miktar: number,
  aciklama: string,
  oncekiMiktar: number,
  yeniMiktar: number
): void => {
  const hareket: StokHareket = {
    id: Date.now().toString(),
    urunId,
    tarih: new Date().toISOString(),
    islemTuru,
    miktar,
    oncekiMiktar,
    yeniMiktar,
    aciklama,
    kullanici: 'Admin'
  };
  
  saveStokHareket(hareket);
};
