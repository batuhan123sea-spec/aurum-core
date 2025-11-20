export interface FirmaAyarlari {
  firmaAdi: string;
  vergiNo: string;
  adres: string;
  telefon: string;
  email: string;
  logoUrl?: string;
}

export interface ParaBirimiAyarlari {
  varsayilanParaBirimi: 'TRY' | 'USD' | 'EUR';
  otomatikKurGuncelleme: boolean;
  kurGuncellemeSikligi: number; // dakika
  manuelKurlar: {
    usd: number;
    eur: number;
  };
}

export interface KDVAyarlari {
  varsayilanKDVOrani: number;
  kdvDahilSatis: boolean;
}

export interface StokAyarlari {
  minStokSeviyesi: number;
  kritikStokSeviyesi: number;
  barkodPrefixi: string;
  otomatikBarkod: boolean;
}

export interface FisAyarlari {
  baslik: string;
  altBilgi: string;
  reklamAlani: string;
}

export interface Ayarlar {
  firma: FirmaAyarlari;
  paraBirimi: ParaBirimiAyarlari;
  kdv: KDVAyarlari;
  stok: StokAyarlari;
  fis: FisAyarlari;
}
