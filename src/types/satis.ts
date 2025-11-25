export interface SatisKalemi {
  id: string;
  urunId: string;
  urunAdi: string;
  barkod: string;
  adet: number;
  birimFiyati: number; // TL cinsinden
  alisFiyati: number; // Alış fiyatı (TL cinsinden)
  paraBirimi: 'TRY' | 'USD' | 'EUR'; // Ürünün orijinal para birimi
  orijinalBirimFiyati: number; // Ürünün kendi para birimindeki fiyatı
  kdvOrani: number;
  kdvTutari: number;
  indirimTL: number;
  indirimYuzde: number;
  toplamTutar: number;
  varyasyonId?: string;
}

export interface Satis {
  id: string;
  satisNo: string; // SATS-0001 formatında
  tarih: string;
  satisTuru: 'hesapli' | 'rezerv' | 'hizli';
  
  // Müşteri bilgisi (hesaplı satış için zorunlu)
  musteriId?: string;
  musteriAdi?: string;
  
  // Ürün kalemleri
  kalemler: SatisKalemi[];
  
  // Fiyat bilgileri
  araToplam: number;
  toplamKDV: number;
  genelIndirimTL: number;
  genelIndirimYuzde: number;
  genelToplam: number;
  
  // KDV dahil/hariç
  kdvDahil: boolean;
  
  // Ödeme bilgisi (hızlı satış için)
  odemeTuru?: 'nakit' | 'kredi-karti';
  odemeTutari?: number;
  
  // Rezerv durumu
  rezervDurumu?: 'beklemede' | 'tamamlandi' | 'iptal';
  rezervNotu?: string;
  
  durum: 'tamamlandi' | 'iptal' | 'rezerv';
  iptalEdildi?: boolean; // Hareket silme ile iptal edildi mi?
  iptalTarihi?: string; // İptal tarihi
  kullanici: string;
}
