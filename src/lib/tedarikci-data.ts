import { Tedarikci, TedarikciAlim } from '@/types/tedarikci';

const TEDARIKCI_KEY = 'kuyumcu_tedarikciler';
const ALIM_KEY = 'kuyumcu_tedarikci_alimlar';

const MOCK_TEDARIKCILER: Tedarikci[] = [
  {
    id: '1',
    kod: 'TED-001',
    firmaAdi: 'Kutu Dünyası A.Ş.',
    yetkiliKisi: 'Ahmet Yılmaz',
    telefon: '0532 123 4567',
    email: 'info@kutudunyasi.com',
    adres: 'İstanbul Kuyumcular Çarşısı No:45',
    vergiNo: '1234567890',
    durum: 'aktif',
    olusturmaTarihi: new Date().toISOString(),
    guncellemeTarihi: new Date().toISOString()
  },
  {
    id: '2',
    kod: 'TED-002',
    firmaAdi: 'Ahşap Sanatları Ltd.',
    yetkiliKisi: 'Mehmet Demir',
    telefon: '0533 234 5678',
    email: 'info@ahsapsanatlar.com',
    adres: 'Ankara Ticaret Merkezi No:12',
    vergiNo: '9876543210',
    durum: 'aktif',
    olusturmaTarihi: new Date().toISOString(),
    guncellemeTarihi: new Date().toISOString()
  }
];

export const getTedarikciler = (): Tedarikci[] => {
  const stored = localStorage.getItem(TEDARIKCI_KEY);
  if (!stored) {
    localStorage.setItem(TEDARIKCI_KEY, JSON.stringify(MOCK_TEDARIKCILER));
    return MOCK_TEDARIKCILER;
  }
  return JSON.parse(stored);
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
  const alimlar = getTedarikciAlimlar();
  alimlar.push(alim);
  localStorage.setItem(ALIM_KEY, JSON.stringify(alimlar));
};

export const getTedarikciAlimlari = (tedarikciId: string): TedarikciAlim[] => {
  return getTedarikciAlimlar().filter(a => a.tedarikciId === tedarikciId);
};
