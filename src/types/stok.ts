export interface Urun {
  id: string;
  kod: string;
  ad: string;
  barkod: string;
  kategori: string;
  altKategori: string;
  stokMiktari: number;
  birim: string;
  alisFiyati: number;
  satisFiyati: number;
  kdvOrani: number;
  tedarikci: string;
  minStokSeviyesi: number;
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
