import { Tedarikci, TedarikciAlim } from '@/types/tedarikci';

const TEDARIKCI_KEY = 'kuyumcu_tedarikciler';
const ALIM_KEY = 'kuyumcu_tedarikci_alimlar';

export const getTedarikciler = (): Tedarikci[] => {
  const stored = localStorage.getItem(TEDARIKCI_KEY);
  if (!stored) {
    // ✅ MOCK DATA YÜKLEME - Boş array döndür
    console.warn('⚠️ Tedarikçi verisi bulunamadı, boş liste döndürülüyor');
    return [];
  }
  
  try {
    return JSON.parse(stored);
  } catch (error) {
    console.error('❌ Tedarikçi verisi parse hatası:', error);
    return [];
  }
};

export const saveTedarikci = (tedarikci: Tedarikci): void => {
  const tedarikciler = getTedarikciler();
  const existingIndex = tedarikciler.findIndex(t => t.id === tedarikci.id);
  
  if (existingIndex >= 0) {
    tedarikciler[existingIndex] = { ...tedarikci, guncellemeTarihi: new Date().toISOString() };
  } else {
    tedarikciler.push(tedarikci);
  }
  
  localStorage.setItem(TEDARIKCI_KEY, JSON.stringify(tedarikciler));
};

export const getTedarikciById = (id: string): Tedarikci | undefined => {
  return getTedarikciler().find(t => t.id === id);
};

export const generateTedarikciKodu = (): string => {
  const tedarikciler = getTedarikciler();
  const maxKod = tedarikciler.reduce((max, t) => {
    const num = parseInt(t.kod.split('-')[1]);
    return num > max ? num : max;
  }, 0);
  return `TED-${String(maxKod + 1).padStart(3, '0')}`;
};

export const getTedarikciAlimlar = (): TedarikciAlim[] => {
  const stored = localStorage.getItem(ALIM_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const saveTedarikciAlim = (alim: TedarikciAlim): void => {
  console.log('💾 saveTedarikciAlim çağrıldı:', alim);
  const alimlar = getTedarikciAlimlar();
  console.log('📋 Mevcut alımlar sayısı:', alimlar.length);
  alimlar.push(alim);
  localStorage.setItem(ALIM_KEY, JSON.stringify(alimlar));
  console.log('✅ Alım kaydedildi, yeni toplam:', alimlar.length);
};

export const getTedarikciAlimlari = (tedarikciId: string): TedarikciAlim[] => {
  return getTedarikciAlimlar().filter(a => a.tedarikciId === tedarikciId);
};

export const updateTedarikciAlim = (alim: TedarikciAlim): void => {
  const alimlar = getTedarikciAlimlar();
  const index = alimlar.findIndex(a => a.id === alim.id);
  if (index >= 0) {
    alimlar[index] = alim;
    localStorage.setItem(ALIM_KEY, JSON.stringify(alimlar));
    console.log('✅ Alım güncellendi:', alim.id);
  }
};

export const deleteTedarikciAlim = (alimId: string): void => {
  const alimlar = getTedarikciAlimlar().filter(a => a.id !== alimId);
  localStorage.setItem(ALIM_KEY, JSON.stringify(alimlar));
  console.log('🗑️ Alım silindi:', alimId);
};
