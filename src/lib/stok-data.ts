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
    stokMiktari: 45,
    birim: 'Adet',
    tedarikciler: [{
      id: '1',
      tedarikciId: '1',
      tedarikciAdi: 'Kutu Dünyası A.Ş.',
      alisFiyati: 85.50,
      paraBirimi: 'TRY',
      teslimatSuresi: 7,
      varsayilan: true
    }],
    alisFiyati: 85.50,
    alisFiyatiParaBirimi: 'TRY',
    karMarji: 30,
    satisFiyati: 150.00,
    kdvOrani: 20,
    minStokSeviyesi: 20,
    kritikStokSeviyesi: 10,
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
    stokMiktari: 120,
    birim: 'Adet',
    tedarikciler: [{
      id: '2',
      tedarikciId: '1',
      tedarikciAdi: 'Kutu Dünyası A.Ş.',
      alisFiyati: 15.00,
      paraBirimi: 'TRY',
      teslimatSuresi: 5,
      varsayilan: true
    }],
    alisFiyati: 15.00,
    alisFiyatiParaBirimi: 'TRY',
    karMarji: 35,
    satisFiyati: 28.00,
    kdvOrani: 20,
    minStokSeviyesi: 50,
    kritikStokSeviyesi: 25,
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
    stokMiktari: 30,
    birim: 'Adet',
    tedarikciler: [{
      id: '3',
      tedarikciId: '2',
      tedarikciAdi: 'Ahşap Sanatları Ltd.',
      alisFiyati: 120.00,
      paraBirimi: 'TRY',
      teslimatSuresi: 10,
      varsayilan: true
    }],
    alisFiyati: 120.00,
    alisFiyatiParaBirimi: 'TRY',
    karMarji: 40,
    satisFiyati: 220.00,
    kdvOrani: 20,
    minStokSeviyesi: 10,
    kritikStokSeviyesi: 5,
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
    stokMiktari: 75,
    birim: 'Adet',
    tedarikciler: [{
      id: '4',
      tedarikciId: '1',
      tedarikciAdi: 'Kutu Dünyası A.Ş.',
      alisFiyati: 22.50,
      paraBirimi: 'TRY',
      teslimatSuresi: 5,
      varsayilan: true
    }],
    alisFiyati: 22.50,
    alisFiyatiParaBirimi: 'TRY',
    karMarji: 50,
    satisFiyati: 45.00,
    kdvOrani: 20,
    minStokSeviyesi: 30,
    kritikStokSeviyesi: 15,
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
    stokMiktari: 200,
    birim: 'Adet',
    tedarikciler: [{
      id: '5',
      tedarikciId: '3',
      tedarikciAdi: 'Kimya Ticaret A.Ş.',
      alisFiyati: 3.50,
      paraBirimi: 'TRY',
      teslimatSuresi: 3,
      varsayilan: true
    }],
    alisFiyati: 3.50,
    alisFiyatiParaBirimi: 'TRY',
    karMarji: 60,
    satisFiyati: 8.00,
    kdvOrani: 20,
    minStokSeviyesi: 100,
    kritikStokSeviyesi: 50,
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
    u.tedarikciler.some(t => t.tedarikciAdi.toLowerCase().includes(lowerQuery)) ||
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
