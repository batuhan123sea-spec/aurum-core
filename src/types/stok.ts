// Çoklu tedarikçi için
export interface UrunTedarikci {
  id: string;
  tedarikciId: string;
  tedarikciAdi: string;
  alisFiyati: number;
  paraBirimi: 'TRY' | 'USD' | 'EUR';
  teslimatSuresi: number; // gün
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
  altKategori: string;
  stokMiktari: number;
  birim: string;
  
  // Çoklu tedarikçi desteği
  tedarikciler: UrunTedarikci[];
  
  // Fiyatlandırma
  alisFiyati: number;
  alisFiyatiParaBirimi: 'TRY' | 'USD' | 'EUR';
  karMarji: number; // Yüzde
  satisFiyati: number; // Otomatik hesaplanacak
  
  kdvOrani: number;
  
  // Varyasyonlar
  varyasyonlar?: UrunVaryasyon[];
  
  minStokSeviyesi: number;
  kritikStokSeviyesi: number;
  aciklama?: string;
  durum: 'aktif' | 'pasif';
  olusturmaTarihi: string;
  guncellemeTarihi: string;
}

export interface Kategori {
  id: string;
  emoji: string;
  ad: string;
  altKategoriler: string[];
}

export const KATEGORILER: Kategori[] = [
  {
    id: 'kuyumcu-makineleri',
    emoji: '🛠️',
    ad: 'KUYUMCU MAKİNELERİ',
    altKategoriler: [
      'Döküm Makineleri',
      'Hadde Makineleri',
      'Kaynak Makineleri',
      'CNC Makineleri',
      'Lazer Kaynak',
      'Ultrasonik Temizleyiciler'
    ]
  },
  {
    id: 'el-aletleri',
    emoji: '🔧',
    ad: 'EL ALETLERİ',
    altKategoriler: [
      'Kuyumcu Pensleri',
      'Markürler',
      'Eğeler',
      'Kerpetenler',
      'Bileği Taşları',
      'Çekiçler'
    ]
  },
  {
    id: 'cila-parlatma',
    emoji: '✨',
    ad: 'CİLA & PARLATMA',
    altKategoriler: [
      'Cila Makineleri',
      'Polisaj Motorları',
      'Cila Bezleri',
      'Parlatma Tozları',
      'Rodyum Kaplama',
      'Ultrasonik Cihazlar'
    ]
  },
  {
    id: 'dokum-malzemeleri',
    emoji: '🔥',
    ad: 'DÖKÜM MALZEMELERİ',
    altKategoriler: [
      'Döküm Mumları',
      'Alçı Kalıplar',
      'Krüzübler',
      'Oksijen Kartuşları'
    ]
  },
  {
    id: 'kimyasallar',
    emoji: '🧪',
    ad: 'KİMYASALLAR',
    altKategoriler: [
      'Ayar Suları',
      'Elektrolitler',
      'Asitler',
      'Temizleyiciler',
      'Yağlar',
      'Sıvılar'
    ]
  },
  {
    id: 'metaller',
    emoji: '🥈',
    ad: 'METALLER',
    altKategoriler: [
      'Altın Tel',
      'Gümüş Levha',
      'Platin',
      'Palladyum',
      'Rhodium',
      'Granül Altın'
    ]
  },
  {
    id: 'olcum-cihazlari',
    emoji: '📏',
    ad: 'ÖLÇÜM CİHAZLARI',
    altKategoriler: [
      'Teraziler',
      'Mikrometreler',
      'Kumpaslar',
      'Lüpeler',
      'Kalınlık Ölçerler'
    ]
  },
  {
    id: 'kutular-aksesuarlar',
    emoji: '💎',
    ad: 'KUTULAR VE AKSESUARLAR',
    altKategoriler: [
      'Takı Kutuları',
      'Yüzük Kutuları',
      'Kolye Standları',
      'Bileklik Yastıkları',
      'Temizleme Bezleri'
    ]
  }
];
