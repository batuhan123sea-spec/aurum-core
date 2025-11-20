export interface Tedarikci {
  id: string;
  kod: string; // TED-0001
  firmaAdi: string;
  yetkiliKisi: string;
  telefon: string;
  email?: string;
  adres: string;
  vergiNo?: string;
  notlar?: string;
  durum: 'aktif' | 'pasif';
  olusturmaTarihi: string;
  guncellemeTarihi: string;
}

export interface TedarikciAlim {
  id: string;
  tedarikciId: string;
  tarih: string;
  faturaNo: string;
  urunler: {
    urunId: string;
    urunAdi: string;
    miktar: number;
    birimFiyat: number;
    paraBirimi: 'TRY' | 'USD' | 'EUR';
    toplamTutar: number;
  }[];
  genelToplam: number;
  odemeDurumu: 'odendi' | 'beklemede' | 'kismi';
  aciklama?: string;
}
