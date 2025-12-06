export type Konum = 'ic' | 'dis';
export type ParaBirimi = 'TRY' | 'USD' | 'EUR';
export type IslemTuru = 'satis' | 'odeme' | 'iade';
export type OdemeTuru = 'nakit' | 'kredi-karti' | 'eft' | 'havale';
export type MusteriDurumu = 'aktif' | 'pasif';

export interface ManuelKur {
  USD?: number;
  EUR?: number;
  aktif: boolean;
}

export interface Musteri {
  id: string;
  kod: string;
  adSoyad: string;
  telefon: string;
  email?: string;
  adres: string;
  vergiNoTcKimlik?: string;
  konum: Konum;
  varsayilanParaBirimi: ParaBirimi;
  krediLimiti?: number;
  notlar?: string;
  borclar: {
    TRY: number;
    USD: number;
    EUR: number;
  };
  toplamBorcTL: number;
  durumu: MusteriDurumu;
  olusturmaTarihi: string;
  sonIslemTarihi: string;
  manuelKur?: ManuelKur;
}

export interface HesapHareketi {
  id: string;
  musteriId: string;
  tarih: string;
  islemTuru: IslemTuru;
  aciklama: string;
  paraBirimi: ParaBirimi;
  tutar: number;
  kur: number;
  tlKarsiligi: number;
  bakiye: number;
  odemeTuru?: OdemeTuru;
}

export interface OdemeForm {
  musteriId: string;
  odemeTarihi: string;
  odemeTutari: number;
  odemeParaBirimi: ParaBirimi;
  anlikKur: number;
  tlKarsiligi: number;
  odemeTuru: OdemeTuru;
  aciklama?: string;
}
