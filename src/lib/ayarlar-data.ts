import { Ayarlar } from '@/types/ayarlar';

const STORAGE_KEY = 'kuyumcu_ayarlar';

const DEFAULT_AYARLAR: Ayarlar = {
  firma: {
    firmaAdi: 'Kuyumcu İşletmesi',
    vergiNo: '',
    adres: '',
    telefon: '',
    email: ''
  },
  paraBirimi: {
    varsayilanParaBirimi: 'TRY',
    otomatikKurGuncelleme: false,
    kurGuncellemeSikligi: 60,
    manuelKurlar: {
      usd: 34.50,
      eur: 37.20
    }
  },
  kdv: {
    varsayilanKDVOrani: 20,
    kdvDahilSatis: false
  },
  stok: {
    minStokSeviyesi: 10,
    kritikStokSeviyesi: 5,
    barkodPrefixi: 'URN',
    otomatikBarkod: true
  },
  fis: {
    baslik: 'KUYUMCU İŞLETMESİ',
    altBilgi: 'Teşekkür ederiz.',
    reklamAlani: 'Kaliteli hizmet için teşekkürler!'
  }
};

export const getAyarlar = (): Ayarlar => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_AYARLAR));
    return DEFAULT_AYARLAR;
  }
  return JSON.parse(stored);
};

export const saveAyarlar = (ayarlar: Ayarlar): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ayarlar));
};

export const updateFirmaAyarlari = (firma: Partial<Ayarlar['firma']>): void => {
  const ayarlar = getAyarlar();
  ayarlar.firma = { ...ayarlar.firma, ...firma };
  saveAyarlar(ayarlar);
};

export const updateParaBirimiAyarlari = (paraBirimi: Partial<Ayarlar['paraBirimi']>): void => {
  const ayarlar = getAyarlar();
  ayarlar.paraBirimi = { ...ayarlar.paraBirimi, ...paraBirimi };
  saveAyarlar(ayarlar);
};
