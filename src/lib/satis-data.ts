import { Satis } from '@/types/satis';

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

export const getRezervler = (): Satis[] => {
  return getSatislar().filter(s => s.satisTuru === 'rezerv' && s.rezervDurumu === 'beklemede');
};

export const getGunlukSatislar = (tarih: Date): Satis[] => {
  const tarihStr = tarih.toISOString().split('T')[0];
  return getSatislar().filter(s => {
    const satisTarih = new Date(s.tarih).toISOString().split('T')[0];
    return satisTarih === tarihStr && s.durum === 'tamamlandi';
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

export const getBugunSatisTopla = (): number => {
  const bugun = getGunlukSatislar(new Date()).filter(s => !s.iptalEdildi);
  return bugun.reduce((toplam, satis) => toplam + satis.genelToplam, 0);
};
