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

export interface TahsilatFisAyarlari {
  baslik: string;
  altBilgi: string;
  reklamAlani: string;
  musteriGoster: boolean;
  odemeTuruGoster: boolean;
  telefonGoster: boolean;
}

export interface RezervFisAyarlari {
  baslik: string;
  altBilgi: string;
  reklamAlani: string;
  tarihGoster: boolean;
  toplamGoster: boolean;
  maliDegeriYokNotGoster: boolean;
}

export interface FisAyarlari {
  baslik: string;
  altBilgi: string;
  reklamAlani: string;
  tahsilat: TahsilatFisAyarlari;
  rezerv: RezervFisAyarlari;
}

export interface Ayarlar {
  firma: FirmaAyarlari;
  paraBirimi: ParaBirimiAyarlari;
  kdv: KDVAyarlari;
  stok: StokAyarlari;
  fis: FisAyarlari;
}
