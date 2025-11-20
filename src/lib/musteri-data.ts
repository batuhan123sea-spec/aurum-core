import { Musteri, HesapHareketi } from "@/types/musteri";
import { paraBirimiTLyeCevir } from "./kur-hesaplama";

const MUSTERI_KEY = 'kuyumcu_musteriler';
const HAREKET_KEY = 'kuyumcu_hesap_hareketleri';

// Müşteri CRUD
export function getMusteriler(): Musteri[] {
  const stored = localStorage.getItem(MUSTERI_KEY);
  if (!stored) {
    initializeMockData();
    return getMusteriler();
  }
  return JSON.parse(stored);
}

export function getMusteriById(id: string): Musteri | null {
  const musteriler = getMusteriler();
  return musteriler.find(m => m.id === id) || null;
}

export function saveMusteri(musteri: Musteri): void {
  const musteriler = getMusteriler();
  musteriler.push(musteri);
  localStorage.setItem(MUSTERI_KEY, JSON.stringify(musteriler));
}

export function updateMusteri(musteri: Musteri): void {
  const musteriler = getMusteriler();
  const index = musteriler.findIndex(m => m.id === musteri.id);
  if (index !== -1) {
    musteriler[index] = musteri;
    localStorage.setItem(MUSTERI_KEY, JSON.stringify(musteriler));
  }
}

export function deleteMusteri(id: string): void {
  const musteriler = getMusteriler().filter(m => m.id !== id);
  localStorage.setItem(MUSTERI_KEY, JSON.stringify(musteriler));
  
  // İlgili hareketleri de sil
  const hareketler = getHareketler().filter(h => h.musteriId !== id);
  localStorage.setItem(HAREKET_KEY, JSON.stringify(hareketler));
}

// Hesap hareketi CRUD
export function getHareketler(): HesapHareketi[] {
  const stored = localStorage.getItem(HAREKET_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function getHareketlerByMusteriId(musteriId: string): HesapHareketi[] {
  return getHareketler()
    .filter(h => h.musteriId === musteriId)
    .sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime());
}

export function saveHareket(hareket: HesapHareketi): void {
  const hareketler = getHareketler();
  hareketler.push(hareket);
  localStorage.setItem(HAREKET_KEY, JSON.stringify(hareketler));
}

// Müşteri bakiyesini güncelle
export function musteriBalanceGuncelle(
  musteriId: string,
  islemTuru: 'satis' | 'odeme' | 'iade',
  tlTutar: number
): void {
  const musteri = getMusteriById(musteriId);
  if (!musteri) return;
  
  if (islemTuru === 'satis') {
    musteri.toplamBorc += tlTutar;
  } else {
    musteri.toplamBorc -= tlTutar;
  }
  
  musteri.sonIslemTarihi = new Date().toISOString();
  updateMusteri(musteri);
}

// Hesap ekstresini bakiyelerle birlikte hesapla
export function hesapEkstresiniHesapla(musteriId: string): HesapHareketi[] {
  const hareketler = getHareketlerByMusteriId(musteriId);
  const sortedHareketler = [...hareketler].sort(
    (a, b) => new Date(a.tarih).getTime() - new Date(b.tarih).getTime()
  );
  
  let bakiye = 0;
  return sortedHareketler.map(hareket => {
    if (hareket.islemTuru === 'satis') {
      bakiye += hareket.tlKarsiligi;
    } else {
      bakiye -= hareket.tlKarsiligi;
    }
    
    return { ...hareket, bakiye };
  }).reverse(); // En yeni üstte
}

// Arama
export function searchMusteriler(query: string): Musteri[] {
  const lowerQuery = query.toLowerCase();
  return getMusteriler().filter(m =>
    m.adSoyad.toLowerCase().includes(lowerQuery) ||
    m.telefon.toLowerCase().includes(lowerQuery) ||
    m.adres.toLowerCase().includes(lowerQuery) ||
    m.kod.toLowerCase().includes(lowerQuery)
  );
}

// Alfabetik filtreleme
export function getMusterilerByAlphabet(harf: string): Musteri[] {
  if (harf === 'TÜM') return getMusteriler();
  return getMusteriler().filter(m => 
    m.adSoyad.charAt(0).toLocaleUpperCase('tr-TR') === harf
  );
}

// Konum filtreleme
export function filterMusterilerByKonum(konum: 'ic' | 'dis'): Musteri[] {
  return getMusteriler().filter(m => m.konum === konum);
}

// Borç filtreleme
export function filterMusterilerByBorc(durum: 'borclu' | 'borcsuz'): Musteri[] {
  return getMusteriler().filter(m => 
    durum === 'borclu' ? m.toplamBorc > 0 : m.toplamBorc === 0
  );
}

// Müşteri kodu üret
export function generateMusteriKodu(): string {
  const musteriler = getMusteriler();
  const sonKod = musteriler.length > 0
    ? Math.max(...musteriler.map(m => parseInt(m.kod.split('-')[1])))
    : 0;
  return `MUS-${String(sonKod + 1).padStart(4, '0')}`;
}

// Mock data
export function initializeMockData(): void {
  const mockMusteriler: Musteri[] = [
    {
    id: '1',
    kod: 'MUS-0001',
    adSoyad: 'Ahmet Yılmaz',
    telefon: '0532 123 45 67',
    email: 'ahmet.yilmaz@email.com',
    adres: 'Kapalıçarşı, No: 15, Fatih/İstanbul',
    vergiNoTcKimlik: '12345678901',
    konum: 'ic',
    varsayilanParaBirimi: 'TRY',
      toplamBorc: 15000,
      durumu: 'aktif',
      olusturmaTarihi: '2024-01-15T10:00:00Z',
      sonIslemTarihi: '2024-03-20T14:30:00Z'
    },
    {
      id: '2',
      kod: 'MUS-0002',
      adSoyad: 'Ayşe Demir',
      telefon: '0533 234 56 78',
      email: 'ayse.demir@email.com',
      adres: 'Bakırcılar Çarşısı, No: 42, Fatih/İstanbul',
      vergiNoTcKimlik: '9876543210',
      konum: 'ic',
      varsayilanParaBirimi: 'USD',
      toplamBorc: 8500,
      durumu: 'aktif',
      olusturmaTarihi: '2024-02-10T09:15:00Z',
      sonIslemTarihi: '2024-03-18T11:20:00Z'
    },
    {
      id: '3',
      kod: 'MUS-0003',
      adSoyad: 'Mehmet Kaya',
      telefon: '0534 345 67 89',
      adres: 'Atatürk Bulvarı, No: 123, Çankaya/Ankara',
      konum: 'dis',
      varsayilanParaBirimi: 'TRY',
      toplamBorc: 0,
      durumu: 'aktif',
      olusturmaTarihi: '2024-01-05T13:45:00Z',
      sonIslemTarihi: '2024-03-15T16:00:00Z'
    },
    {
      id: '4',
      kod: 'MUS-0004',
      adSoyad: 'Fatma Şahin',
      telefon: '0535 456 78 90',
      adres: 'Kızılay Meydanı, No: 56, Çankaya/Ankara',
      konum: 'dis',
      varsayilanParaBirimi: 'EUR',
      toplamBorc: 22300,
      durumu: 'aktif',
      olusturmaTarihi: '2024-02-20T08:30:00Z',
      sonIslemTarihi: '2024-03-19T15:45:00Z'
    },
    {
      id: '5',
      kod: 'MUS-0005',
      adSoyad: 'Can Öztürk',
      telefon: '0536 567 89 01',
      adres: 'Mücevherci Sokak, No: 8, Fatih/İstanbul',
      konum: 'ic',
      varsayilanParaBirimi: 'TRY',
      toplamBorc: 5200,
      durumu: 'aktif',
      olusturmaTarihi: '2024-03-01T11:00:00Z',
      sonIslemTarihi: '2024-03-21T10:15:00Z'
    }
  ];
  
  const mockHareketler: HesapHareketi[] = [
    {
      id: 'h1',
      musteriId: '1',
      tarih: '2024-03-20T14:30:00Z',
      islemTuru: 'satis',
      aciklama: 'Altın Bilezik, Kolye Ucu',
      paraBirimi: 'TRY',
      tutar: 15000,
      kur: 1,
      tlKarsiligi: 15000,
      bakiye: 15000
    },
    {
      id: 'h2',
      musteriId: '2',
      tarih: '2024-03-18T11:20:00Z',
      islemTuru: 'odeme',
      aciklama: 'Nakit ödeme',
      paraBirimi: 'USD',
      tutar: 200,
      kur: 32.45,
      tlKarsiligi: 6490,
      bakiye: 8500,
      odemeTuru: 'nakit'
    },
    {
      id: 'h3',
      musteriId: '4',
      tarih: '2024-03-19T15:45:00Z',
      islemTuru: 'satis',
      aciklama: 'Pırlanta Yüzük',
      paraBirimi: 'EUR',
      tutar: 650,
      kur: 35.18,
      tlKarsiligi: 22867,
      bakiye: 22300
    }
  ];
  
  localStorage.setItem(MUSTERI_KEY, JSON.stringify(mockMusteriler));
  localStorage.setItem(HAREKET_KEY, JSON.stringify(mockHareketler));
}
