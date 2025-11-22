import { Satis, SatisKalemi } from '@/types/satis';
import { HesapHareketi } from '@/types/musteri';
import { saveSatis } from './satis-data';
import { saveHareket, musteriBalanceGuncelle } from './musteri-data';
import { kurlarıKaydet } from './kur-hesaplama';

// 5 haftalık test verisi yükle
export function yukle5HaftalikTestVerisi(musteriId: string): {
  yuklendiMi: boolean;
  mesaj: string;
  satirSayisi: number;
} {
  const musteriIdStr = musteriId;
  let toplamSatir = 0;

  // HAFTA 1: 21-27 Ekim 2025
  console.log('📅 HAFTA 1: 21-27 Ekim 2025 yükleniyor...');
  kurlarıKaydet(38.20, 43.50);
  
  // 21 Ekim (Pazartesi) - TRY satışlar
  olusturSatis({
    musteriId: musteriIdStr,
    tarih: '2025-10-21T10:30:00',
    satisNo: generateTestSatisNo(),
    kalemler: [
      { urunAdi: 'Yüzük Kutusu', barkod: 'YK001', adet: 2, birimFiyati: 28, paraBirimi: 'TRY', kur: 1 },
      { urunAdi: 'Takı Temizleme Bezi', barkod: 'TTB001', adet: 1, birimFiyati: 8, paraBirimi: 'TRY', kur: 1 }
    ]
  });
  toplamSatir++;

  // 23 Ekim (Çarşamba) - EUR satışlar
  olusturSatis({
    musteriId: musteriIdStr,
    tarih: '2025-10-23T14:15:00',
    satisNo: generateTestSatisNo(),
    kalemler: [
      { urunAdi: 'Lüks Takı Kutusu', barkod: 'LTK001', adet: 1, birimFiyati: 3.50, paraBirimi: 'EUR', kur: 43.50 },
      { urunAdi: 'Bileklik Yastığı', barkod: 'BY001', adet: 2, birimFiyati: 1.05, paraBirimi: 'EUR', kur: 43.50 }
    ]
  });
  toplamSatir++;

  // 25 Ekim (Cuma) - USD satış
  olusturSatis({
    musteriId: musteriIdStr,
    tarih: '2025-10-25T16:45:00',
    satisNo: generateTestSatisNo(),
    kalemler: [
      { urunAdi: 'Kolye Standı', barkod: 'KS001', adet: 1, birimFiyati: 120, paraBirimi: 'USD', kur: 38.20 }
    ]
  });
  toplamSatir++;

  // 27 Ekim (Cumartesi) - Hafta sonu tahsilatı
  olusturOdeme({
    musteriId: musteriIdStr,
    tarih: '2025-10-27T17:00:00',
    tutar: 300,
    paraBirimi: 'TRY',
    kur: 1,
    aciklama: 'Hafta sonu tahsilatı'
  });
  toplamSatir++;

  // HAFTA 2: 28 Ekim - 3 Kasım 2025
  console.log('📅 HAFTA 2: 28 Ekim - 3 Kasım 2025 yükleniyor...');
  kurlarıKaydet(38.45, 43.75);

  // 29 Ekim (Salı) - TRY satışlar
  olusturSatis({
    musteriId: musteriIdStr,
    tarih: '2025-10-29T11:20:00',
    satisNo: generateTestSatisNo(),
    kalemler: [
      { urunAdi: 'Yüzük Kutusu', barkod: 'YK001', adet: 3, birimFiyati: 28, paraBirimi: 'TRY', kur: 1 },
      { urunAdi: 'Takı Temizleme Bezi', barkod: 'TTB001', adet: 2, birimFiyati: 8, paraBirimi: 'TRY', kur: 1 }
    ]
  });
  toplamSatir++;

  // 31 Ekim (Perşembe) - EUR satışlar
  olusturSatis({
    musteriId: musteriIdStr,
    tarih: '2025-10-31T15:30:00',
    satisNo: generateTestSatisNo(),
    kalemler: [
      { urunAdi: 'Lüks Takı Kutusu', barkod: 'LTK001', adet: 2, birimFiyati: 3.50, paraBirimi: 'EUR', kur: 43.75 }
    ]
  });
  toplamSatir++;

  // 2 Kasım (Pazar) - USD satış
  olusturSatis({
    musteriId: musteriIdStr,
    tarih: '2025-11-02T13:00:00',
    satisNo: generateTestSatisNo(),
    kalemler: [
      { urunAdi: 'Kolye Standı', barkod: 'KS001', adet: 1, birimFiyati: 120, paraBirimi: 'USD', kur: 38.45 }
    ]
  });
  toplamSatir++;

  // 3 Kasım (Pazartesi) - Tahsilat
  olusturOdeme({
    musteriId: musteriIdStr,
    tarih: '2025-11-03T09:00:00',
    tutar: 500,
    paraBirimi: 'TRY',
    kur: 1,
    aciklama: 'Hafta sonu tahsilatı'
  });
  toplamSatir++;

  // HAFTA 3: 4-10 Kasım 2025
  console.log('📅 HAFTA 3: 4-10 Kasım 2025 yükleniyor...');
  kurlarıKaydet(38.60, 43.90);

  // 5 Kasım (Salı) - Karışık TRY+EUR
  olusturSatis({
    musteriId: musteriIdStr,
    tarih: '2025-11-05T10:45:00',
    satisNo: generateTestSatisNo(),
    kalemler: [
      { urunAdi: 'Yüzük Kutusu', barkod: 'YK001', adet: 2, birimFiyati: 28, paraBirimi: 'TRY', kur: 1 },
      { urunAdi: 'Lüks Takı Kutusu', barkod: 'LTK001', adet: 1, birimFiyati: 3.50, paraBirimi: 'EUR', kur: 43.90 },
      { urunAdi: 'Takı Temizleme Bezi', barkod: 'TTB001', adet: 2, birimFiyati: 8, paraBirimi: 'TRY', kur: 1 }
    ]
  });
  toplamSatir++;

  // 7 Kasım (Perşembe) - USD+EUR
  olusturSatis({
    musteriId: musteriIdStr,
    tarih: '2025-11-07T14:00:00',
    satisNo: generateTestSatisNo(),
    kalemler: [
      { urunAdi: 'Kolye Standı', barkod: 'KS001', adet: 1, birimFiyati: 120, paraBirimi: 'USD', kur: 38.60 },
      { urunAdi: 'Bileklik Yastığı', barkod: 'BY001', adet: 3, birimFiyati: 1.05, paraBirimi: 'EUR', kur: 43.90 }
    ]
  });
  toplamSatir++;

  // 9 Kasım (Cumartesi) - TRY satış
  olusturSatis({
    musteriId: musteriIdStr,
    tarih: '2025-11-09T16:30:00',
    satisNo: generateTestSatisNo(),
    kalemler: [
      { urunAdi: 'Yüzük Kutusu', barkod: 'YK001', adet: 2, birimFiyati: 28, paraBirimi: 'TRY', kur: 1 },
      { urunAdi: 'Takı Temizleme Bezi', barkod: 'TTB001', adet: 1, birimFiyati: 8, paraBirimi: 'TRY', kur: 1 }
    ]
  });
  toplamSatir++;

  // 10 Kasım (Pazar) - Büyük tahsilat
  olusturOdeme({
    musteriId: musteriIdStr,
    tarih: '2025-11-10T10:00:00',
    tutar: 1200,
    paraBirimi: 'TRY',
    kur: 1,
    aciklama: 'Haftalık toplu tahsilat'
  });
  toplamSatir++;

  // HAFTA 4: 11-17 Kasım 2025
  console.log('📅 HAFTA 4: 11-17 Kasım 2025 yükleniyor...');
  kurlarıKaydet(38.75, 44.10);

  // 12 Kasım (Salı) - Büyük sipariş EUR+TRY
  olusturSatis({
    musteriId: musteriIdStr,
    tarih: '2025-11-12T11:00:00',
    satisNo: generateTestSatisNo(),
    kalemler: [
      { urunAdi: 'Lüks Takı Kutusu', barkod: 'LTK001', adet: 3, birimFiyati: 3.50, paraBirimi: 'EUR', kur: 44.10 },
      { urunAdi: 'Yüzük Kutusu', barkod: 'YK001', adet: 5, birimFiyati: 28, paraBirimi: 'TRY', kur: 1 }
    ]
  });
  toplamSatir++;

  // 14 Kasım (Perşembe) - İkili USD satış
  olusturSatis({
    musteriId: musteriIdStr,
    tarih: '2025-11-14T15:20:00',
    satisNo: generateTestSatisNo(),
    kalemler: [
      { urunAdi: 'Kolye Standı', barkod: 'KS001', adet: 2, birimFiyati: 120, paraBirimi: 'USD', kur: 38.75 }
    ]
  });
  toplamSatir++;

  // 14 Kasım (Perşembe) - EUR tahsilatı
  olusturOdeme({
    musteriId: musteriIdStr,
    tarih: '2025-11-14T18:00:00',
    tutar: 50,
    paraBirimi: 'EUR',
    kur: 44.10,
    aciklama: 'Euro tahsilatı'
  });
  toplamSatir++;

  // 16 Kasım (Cumartesi) - TRY toplu satış
  olusturSatis({
    musteriId: musteriIdStr,
    tarih: '2025-11-16T12:45:00',
    satisNo: generateTestSatisNo(),
    kalemler: [
      { urunAdi: 'Takı Temizleme Bezi', barkod: 'TTB001', adet: 5, birimFiyati: 8, paraBirimi: 'TRY', kur: 1 }
    ]
  });
  toplamSatir++;

  // 17 Kasım (Pazar) - USD tahsilat
  olusturOdeme({
    musteriId: musteriIdStr,
    tarih: '2025-11-17T14:00:00',
    tutar: 300,
    paraBirimi: 'USD',
    kur: 38.75,
    aciklama: 'Döviz tahsilatı'
  });
  toplamSatir++;

  // HAFTA 5: 18-22 Kasım 2025 (Bu hafta)
  console.log('📅 HAFTA 5: 18-22 Kasım 2025 yükleniyor...');
  kurlarıKaydet(38.50, 43.80);

  // 19 Kasım (Salı) - TRY+EUR satış
  olusturSatis({
    musteriId: musteriIdStr,
    tarih: '2025-11-19T10:00:00',
    satisNo: generateTestSatisNo(),
    kalemler: [
      { urunAdi: 'Yüzük Kutusu', barkod: 'YK001', adet: 3, birimFiyati: 28, paraBirimi: 'TRY', kur: 1 },
      { urunAdi: 'Bileklik Yastığı', barkod: 'BY001', adet: 4, birimFiyati: 1.05, paraBirimi: 'EUR', kur: 43.80 }
    ]
  });
  toplamSatir++;

  // 20 Kasım (Çarşamba) - Ara tahsilat
  olusturOdeme({
    musteriId: musteriIdStr,
    tarih: '2025-11-20T16:00:00',
    tutar: 800,
    paraBirimi: 'TRY',
    kur: 1,
    aciklama: 'Ara tahsilat'
  });
  toplamSatir++;

  // 21 Kasım (Perşembe) - USD+EUR satış
  olusturSatis({
    musteriId: musteriIdStr,
    tarih: '2025-11-21T13:30:00',
    satisNo: generateTestSatisNo(),
    kalemler: [
      { urunAdi: 'Kolye Standı', barkod: 'KS001', adet: 1, birimFiyati: 120, paraBirimi: 'USD', kur: 38.50 },
      { urunAdi: 'Lüks Takı Kutusu', barkod: 'LTK001', adet: 2, birimFiyati: 3.50, paraBirimi: 'EUR', kur: 43.80 }
    ]
  });
  toplamSatir++;

  // Tüm müşteri bakiyelerini güncelle
  musteriBalanceGuncelle(musteriIdStr);

  console.log('✅ Test verisi yükleme tamamlandı!');
  return {
    yuklendiMi: true,
    mesaj: `5 haftalık test verisi başarıyla yüklendi! ${toplamSatir} işlem eklendi.`,
    satirSayisi: toplamSatir
  };
}

// Satış oluşturma helper fonksiyonu
function olusturSatis(params: {
  musteriId: string;
  tarih: string;
  satisNo: string;
  kalemler: Array<{
    urunAdi: string;
    barkod: string;
    adet: number;
    birimFiyati: number;
    paraBirimi: 'TRY' | 'USD' | 'EUR';
    kur: number;
  }>;
}) {
  const { musteriId, tarih, satisNo, kalemler } = params;

  // Satış kalemlerini oluştur (KDV HARİÇ)
  const satisKalemleri: SatisKalemi[] = kalemler.map((k, index) => {
    const tlFiyat = k.birimFiyati * k.kur;
    const toplamTutar = tlFiyat * k.adet;

    return {
      id: `kalem-${Date.now()}-${index}`,
      urunId: `test-urun-${k.barkod}`,
      urunAdi: k.urunAdi,
      barkod: k.barkod,
      adet: k.adet,
      birimFiyati: tlFiyat,
      paraBirimi: k.paraBirimi,
      orijinalBirimFiyati: k.birimFiyati,
      kdvOrani: 0,
      kdvTutari: 0,
      indirimTL: 0,
      indirimYuzde: 0,
      toplamTutar: toplamTutar
    };
  });

  // Ara toplam ve genel toplam hesapla
  const araToplam = satisKalemleri.reduce((sum, k) => sum + (k.birimFiyati * k.adet), 0);
  const toplamKDV = 0;
  const genelToplam = araToplam;

  // Satış kaydı oluştur
  const satis: Satis = {
    id: `test-satis-${Date.now()}-${Math.random()}`,
    satisNo: satisNo,
    tarih: tarih,
    satisTuru: 'hesapli',
    musteriId: musteriId,
    musteriAdi: 'Test Müşteri',
    kalemler: satisKalemleri,
    araToplam: araToplam,
    toplamKDV: 0,
    genelIndirimTL: 0,
    genelIndirimYuzde: 0,
    genelToplam: genelToplam,
    kdvDahil: false,
    durum: 'tamamlandi',
    kullanici: 'Test Kullanıcı'
  };

  // Satışı kaydet
  saveSatis(satis);

  // Hesap hareketine de ekle
  const hareket: HesapHareketi = {
    id: `hareket-${Date.now()}-${Math.random()}`,
    musteriId: musteriId,
    tarih: tarih,
    islemTuru: 'satis',
    aciklama: `Satış ${satisNo} - ${satisKalemleri.length} ürün`,
    paraBirimi: 'TRY',
    tutar: genelToplam,
    kur: 1,
    tlKarsiligi: genelToplam,
    bakiye: 0
  };

  saveHareket(hareket);
}

// Ödeme oluşturma helper fonksiyonu
function olusturOdeme(params: {
  musteriId: string;
  tarih: string;
  tutar: number;
  paraBirimi: 'TRY' | 'USD' | 'EUR';
  kur: number;
  aciklama: string;
}) {
  const { musteriId, tarih, tutar, paraBirimi, kur, aciklama } = params;

  const hareket: HesapHareketi = {
    id: `odeme-${Date.now()}-${Math.random()}`,
    musteriId: musteriId,
    tarih: tarih,
    islemTuru: 'odeme',
    aciklama: aciklama,
    paraBirimi: paraBirimi,
    tutar: tutar,
    kur: kur,
    tlKarsiligi: tutar * kur,
    bakiye: 0,
    odemeTuru: 'nakit'
  };

  saveHareket(hareket);
}

// Test satış numarası oluştur
let testSatisCounter = 1;
function generateTestSatisNo(): string {
  const no = `TEST-${String(testSatisCounter).padStart(4, '0')}`;
  testSatisCounter++;
  return no;
}
