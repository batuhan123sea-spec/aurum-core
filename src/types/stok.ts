// Stok Lotu - Her tedarikçi alımı ayrı lot olarak takip edilir
export interface StokLot {
  id: string;
  urunId: string;                    // Ana ürün referansı
  tedarikciId?: string;              // Tedarikçi referansı
  tedarikciAdi?: string;             // Tedarikçi adı (hızlı erişim için)
  alisFiyati: number;                // Bu lot'un alış fiyatı
  paraBirimi: 'TRY' | 'USD' | 'EUR'; // Para birimi
  stokMiktari: number;               // Bu lot'taki mevcut stok
  alisTarihi: string;                // Alım tarihi (FIFO için)
  batchNo: string;                   // Lot numarası (LOT-001, LOT-002...)
  aciklama?: string;                 // İsteğe bağlı açıklama
}

// Çoklu tedarikçi için
export interface UrunTedarikci {
  id: string;
  tedarikciId: string;
  tedarikciAdi: string;
  alisFiyati: number;
  paraBirimi: 'TRY' | 'USD' | 'EUR';
  sonAlisTarihi?: string;
  varsayilan: boolean;
}

// Varyasyonlar için
export interface UrunVaryasyon {
  id: string;
  renk?: string;
  beden?: string;
  model?: string;
  stokMiktari: number;
  ekFiyat: number; // Ana fiyata eklenecek
}

// Stok hareketi için
export interface StokHareket {
  id: string;
  urunId: string;
  tarih: string;
  islemTuru: 'giris' | 'cikis' | 'duzeltme' | 'sayim';
  miktar: number;
  oncekiMiktar: number;
  yeniMiktar: number;
  aciklama: string;
  kullanici: string;
}

export interface Urun {
  id: string;
  kod: string;
  ad: string;
  barkod: string;
  kategori: string;
  stokMiktari: number;
  birim: string;
  
  // Çoklu tedarikçi desteği
  tedarikciler: UrunTedarikci[];
  
  // Fiyatlandırma
  alisFiyati: number;
  alisFiyatiParaBirimi: 'TRY' | 'USD' | 'EUR';
  karMarji: number; // Yüzde
  satisFiyati: number; // Otomatik hesaplanacak
  satisFiyatiParaBirimi?: 'TRY' | 'USD' | 'EUR'; // Satış fiyatı para birimi (yoksa alisFiyatiParaBirimi kullanılır)
  
  // Varyasyonlar
  varyasyonlar?: UrunVaryasyon[];
  
  minStokSeviyesi: number;
  kritikStokSeviyesi: number;
  aciklama?: string;
  olusturmaTarihi: string;
  guncellemeTarihi: string;
}

export interface Kategori {
  id: string;
  emoji: string;
  ad: string;
}

export const KATEGORILER: Kategori[] = [
  {
    id: 'kuyumcu-makineleri',
    emoji: '⚙️',
    ad: 'MAKİNELER'
  },
  {
    id: 'el-aletleri',
    emoji: '🔧',
    ad: 'EL ALETLERİ'
  },
  {
    id: 'cila-parlatma',
    emoji: '✨',
    ad: 'CİLA & PARLATMA'
  },
  {
    id: 'dokum-malzemeleri',
    emoji: '🔥',
    ad: 'DÖKÜM MALZEMELERİ'
  },
  {
    id: 'kimyasallar',
    emoji: '🧪',
    ad: 'KİMYASALLAR'
  },
  {
    id: 'metaller',
    emoji: '🥈',
    ad: 'METALLER'
  },
  {
    id: 'olcum-cihazlari',
    emoji: '•••',
    ad: 'DİĞER'
  },
  {
    id: 'kutular-aksesuarlar',
    emoji: '💍',
    ad: 'KUTULAR VE AKSESUARLAR'
  }
];
