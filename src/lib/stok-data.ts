import { Urun } from '@/types/stok';

const STORAGE_KEY = 'kuyumcu_stok_urunler';

// Mock data - 8. kategori örnek ürünleri
const MOCK_URUNLER: Urun[] = [
  {
    id: '1',
    kod: 'KUT-001',
    ad: 'Lüks Takı Kutusu - Büyük',
    barkod: '8697123456789',
    kategori: 'kutular-aksesuarlar',
    altKategori: 'Takı Kutuları',
    stokMiktari: 45,
    birim: 'Adet',
    alisFiyati: 85.50,
    satisFiyati: 150.00,
    kdvOrani: 20,
    tedarikci: 'Kutu Dünyası A.Ş.',
    minStokSeviyesi: 20,
    aciklama: 'Kadife iç kaplama, manyetik kapak',
    durum: 'aktif',
    olusturmaTarihi: new Date().toISOString(),
    guncellemeTarihi: new Date().toISOString()
  },
  {
    id: '2',
    kod: 'KUT-002',
    ad: 'Yüzük Kutusu - Kadife İç',
    barkod: '8697123456790',
    kategori: 'kutular-aksesuarlar',
    altKategori: 'Yüzük Kutuları',
    stokMiktari: 120,
    birim: 'Adet',
    alisFiyati: 15.00,
    satisFiyati: 28.00,
    kdvOrani: 20,
    tedarikci: 'Kutu Dünyası A.Ş.',
    minStokSeviyesi: 50,
    aciklama: 'Siyah kadife iç, 5x5 cm',
    durum: 'aktif',
    olusturmaTarihi: new Date().toISOString(),
    guncellemeTarihi: new Date().toISOString()
  },
  {
    id: '3',
    kod: 'KUT-003',
    ad: 'Kolye Standı - Ahşap',
    barkod: '8697123456791',
    kategori: 'kutular-aksesuarlar',
    altKategori: 'Kolye Standları',
    stokMiktari: 30,
    birim: 'Adet',
    alisFiyati: 120.00,
    satisFiyati: 220.00,
    kdvOrani: 20,
    tedarikci: 'Ahşap Sanatları Ltd.',
    minStokSeviyesi: 10,
    aciklama: 'Ceviz ağacı, 30 cm yükseklik',
    durum: 'aktif',
    olusturmaTarihi: new Date().toISOString(),
    guncellemeTarihi: new Date().toISOString()
  },
  {
    id: '4',
    kod: 'KUT-004',
    ad: 'Bileklik Yastığı - Siyah',
    barkod: '8697123456792',
    kategori: 'kutular-aksesuarlar',
    altKategori: 'Bileklik Yastıkları',
    stokMiktari: 75,
    birim: 'Adet',
    alisFiyati: 22.50,
    satisFiyati: 45.00,
    kdvOrani: 20,
    tedarikci: 'Kutu Dünyası A.Ş.',
    minStokSeviyesi: 30,
    aciklama: 'Kadife kaplı, yuvarlak yastık',
    durum: 'aktif',
    olusturmaTarihi: new Date().toISOString(),
    guncellemeTarihi: new Date().toISOString()
  },
  {
    id: '5',
    kod: 'KUT-005',
    ad: 'Takı Temizleme Bezi',
    barkod: '8697123456793',
    kategori: 'kutular-aksesuarlar',
    altKategori: 'Temizleme Bezleri',
    stokMiktari: 200,
    birim: 'Adet',
    alisFiyati: 3.50,
    satisFiyati: 8.00,
    kdvOrani: 20,
    tedarikci: 'Kimya Ticaret A.Ş.',
    minStokSeviyesi: 100,
    aciklama: 'Mikrofiber, 20x20 cm',
    durum: 'aktif',
    olusturmaTarihi: new Date().toISOString(),
    guncellemeTarihi: new Date().toISOString()
  }
];

export const getUrunler = (): Urun[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_URUNLER));
    return MOCK_URUNLER;
  }
  return JSON.parse(stored);
};

export const saveUrun = (urun: Urun): void => {
  const urunler = getUrunler();
  const existingIndex = urunler.findIndex(u => u.id === urun.id);
  
  if (existingIndex >= 0) {
    urunler[existingIndex] = { ...urun, guncellemeTarihi: new Date().toISOString() };
  } else {
    urunler.push(urun);
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(urunler));
};

export const deleteUrun = (id: string): void => {
  const urunler = getUrunler().filter(u => u.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(urunler));
};

export const getUrunByKategori = (kategoriId: string): Urun[] => {
  return getUrunler().filter(u => u.kategori === kategoriId);
};

export const searchUrunler = (query: string): Urun[] => {
  const lowerQuery = query.toLowerCase();
  return getUrunler().filter(u => 
    u.ad.toLowerCase().includes(lowerQuery) ||
    u.barkod.toLowerCase().includes(lowerQuery) ||
    u.tedarikci.toLowerCase().includes(lowerQuery) ||
    u.kod.toLowerCase().includes(lowerQuery)
  );
};

export const generateUrunKodu = (): string => {
  const urunler = getUrunler();
  const maxKod = urunler.reduce((max, u) => {
    const num = parseInt(u.kod.split('-')[1]);
    return num > max ? num : max;
  }, 0);
  return `URN-${String(maxKod + 1).padStart(3, '0')}`;
};
