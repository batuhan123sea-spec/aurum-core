import { Satis } from '@/types/satis';
import { getUrunler, saveUrun } from './stok-data';
import { stokHareketKaydet } from './stok-hareket';
import { formatLocalDate } from './utils';

const STORAGE_KEY = 'kuyumcu_satislar';

export const getSatislar = (): Satis[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const saveSatis = (satis: Satis): void => {
  const satislar = getSatislar();
  const existingIndex = satislar.findIndex(s => s.id === satis.id);
  
  if (existingIndex >= 0) {
    satislar[existingIndex] = satis;
  } else {
    satislar.push(satis);
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(satislar));
};

export const getSatisById = (id: string): Satis | undefined => {
  return getSatislar().find(s => s.id === id);
};

export const getSatisBySatisNo = (satisNo: string): Satis | undefined => {
  return getSatislar().find(s => s.satisNo === satisNo);
};

export const getRezervler = (): Satis[] => {
  return getSatislar().filter(s => s.satisTuru === 'rezerv' && s.rezervDurumu === 'beklemede');
};

export const getGunlukSatislar = (tarih: Date): Satis[] => {
  const tarihStr = formatLocalDate(tarih);
  return getSatislar().filter(s => {
    const satisTarih = formatLocalDate(new Date(s.tarih));
    return satisTarih === tarihStr && s.durum === 'tamamlandi' && !s.iptalEdildi;
  });
};

export const getHaftalikSatislar = (baslangicTarih: Date): Satis[] => {
  const baslangic = formatLocalDate(baslangicTarih);
  const bitis = new Date(baslangicTarih);
  bitis.setDate(bitis.getDate() + 6);
  const bitisStr = formatLocalDate(bitis);
  
  return getSatislar().filter(s => {
    const satisTarih = formatLocalDate(new Date(s.tarih));
    return satisTarih >= baslangic && satisTarih <= bitisStr && 
           s.durum === 'tamamlandi' && !s.iptalEdildi;
  });
};

export const generateSatisNo = (): string => {
  const satislar = getSatislar().filter(s => s.satisTuru !== 'rezerv');
  const maxNo = satislar.reduce((max, s) => {
    const num = parseInt(s.satisNo.split('-')[1]);
    return num > max ? num : max;
  }, 0);
  return `SATS-${String(maxNo + 1).padStart(4, '0')}`;
};

export const generateRezervNo = (): string => {
  const rezervler = getSatislar().filter(s => s.satisTuru === 'rezerv');
  const maxNo = rezervler.reduce((max, s) => {
    const num = parseInt(s.satisNo.split('-')[1]);
    return num > max ? num : max;
  }, 0);
  return `REZ-${String(maxNo + 1).padStart(4, '0')}`;
};

export const deleteSatis = (satisId: string): void => {
  const satislar = getSatislar();
  const filtrelenmis = satislar.filter(s => s.id !== satisId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtrelenmis));
};

export const deleteSatisBySatisNo = (satisNo: string): void => {
  const satislar = getSatislar();
  const silinecekSatis = satislar.find(s => s.satisNo === satisNo);
  
  // Satış bulunamazsa çık
  if (!silinecekSatis) {
    console.log('⚠️ Silinecek satış bulunamadı:', satisNo);
    return;
  }
  
  // 🔄 Stokları geri ekle
  silinecekSatis.kalemler.forEach(kalem => {
    const urunler = getUrunler();
    const urun = urunler.find(u => u.id === kalem.urunId);
    
    if (urun) {
      const oncekiMiktar = urun.stokMiktari;
      const yeniMiktar = oncekiMiktar + kalem.adet;
      
      // Stok hareketi kaydet (giriş olarak)
      stokHareketKaydet(
        kalem.urunId,
        'giris',
        kalem.adet,
        `Satış İptali - ${satisNo}`,
        oncekiMiktar,
        yeniMiktar
      );
      
      // Stoğu artır
      urun.stokMiktari = yeniMiktar;
      saveUrun(urun);
      
      console.log(`📦 Stok geri eklendi: ${urun.ad} +${kalem.adet} (Yeni: ${yeniMiktar})`);
    }
  });
  
  // Satışı sil
  const filtrelenmis = satislar.filter(s => s.satisNo !== satisNo);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtrelenmis));
  
  console.log('🗑️ Satış tamamen silindi:', satisNo);
};

export const getBugunSatisTopla = (): number => {
  const bugun = getGunlukSatislar(new Date()).filter(s => !s.iptalEdildi);
  return bugun.reduce((toplam, satis) => toplam + satis.genelToplam, 0);
};
