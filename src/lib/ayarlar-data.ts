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
    reklamAlani: 'Kaliteli hizmet için teşekkürler!',
    tahsilat: {
      baslik: 'TAHSİLAT FİŞİ',
      altBilgi: 'Teşekkür Ederiz!',
      reklamAlani: '',
      musteriGoster: true,
      odemeTuruGoster: true,
      telefonGoster: true
    },
    rezerv: {
      baslik: 'REZERV FİŞİ',
      altBilgi: 'Teşekkür Ederiz!',
      reklamAlani: '',
      tarihGoster: true,
      toplamGoster: true,
      maliDegeriYokNotGoster: true
    }
  }
};

export const getAyarlar = (): Ayarlar => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_AYARLAR));
    return DEFAULT_AYARLAR;
  }
  
  const ayarlar = JSON.parse(stored);
  
  // Migration: Eski ayarları yeni yapıya dönüştür
  if (!ayarlar.fis.tahsilat || !ayarlar.fis.rezerv) {
    ayarlar.fis = {
      ...ayarlar.fis,
      tahsilat: DEFAULT_AYARLAR.fis.tahsilat,
      rezerv: DEFAULT_AYARLAR.fis.rezerv
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ayarlar));
  }
  
  return ayarlar;
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
