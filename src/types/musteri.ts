export type Konum = 'ic' | 'dis';
export type ParaBirimi = 'TRY' | 'USD' | 'EUR';
export type IslemTuru = 'satis' | 'odeme' | 'iade';
export type OdemeTuru = 'nakit' | 'kredi-karti' | 'eft' | 'havale';
export type MusteriDurumu = 'aktif' | 'pasif';

export interface Musteri {
  id: string;
  kod: string;
  adSoyad: string;
  telefon: string;
  adres: string;
  konum: Konum;
  varsayilanParaBirimi: ParaBirimi;
  krediLimiti?: number;
  notlar?: string;
  toplamBorc: number;
  durumu: MusteriDurumu;
  olusturmaTarihi: string;
  sonIslemTarihi: string;
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
