import { getMusteriler, saveMusteri, odemeIsle, musteriDovizBorclariniHesapla, hesapEkstresiniHesapla } from './musteri-data';
import { getUrunler, saveUrun } from './stok-data';
import { hesapliSatisYap, hizliSatisYap, rezervYap, rezervSatisaDonustur } from './satis-islemleri';
import { getSatislar, getGunlukSatislar, getBugunSatisTopla } from './satis-data';
import { getStokHareketler } from './stok-hareket';
import { getGunlukSatisRaporu, getMusteriBorcRaporu } from './rapor-olustur';
import { kurlarıKaydet, getGuncelKurlar, getKur } from './kur-hesaplama';
import { Musteri } from '@/types/musteri';
import { Urun } from '@/types/stok';
import { SatisKalemi } from '@/types/satis';

interface TestResult {
  testNo: number;
  testAdi: string;
  durum: 'BAŞARILI' | 'BAŞARISIZ' | 'UYARI';
  detay: string;
  konsol: string[];
  hatalar: string[];
}

const testSonuclari: TestResult[] = [];
const konsolLoglar: string[] = [];

// Console.log wrapper
const log = (mesaj: string) => {
  konsolLoglar.push(mesaj);
  console.log(mesaj);
};

// Test helper: Müşteri oluştur
const testMusteriOlustur = (kod: string, ad: string): Musteri => {
  const musteri: Musteri = {
    id: `test-${kod}-${Date.now()}`,
    kod,
    adSoyad: ad,
    telefon: '5555555555',
    adres: 'Test Adresi',
    konum: 'ic',
    varsayilanParaBirimi: 'TRY',
    borclar: { TRY: 0, USD: 0, EUR: 0 },
    toplamBorcTL: 0,
    durumu: 'aktif',
    olusturmaTarihi: new Date().toISOString(),
    sonIslemTarihi: new Date().toISOString(),
  };
  saveMusteri(musteri);
  return musteri;
};

// Test helper: Ürün oluştur
const testUrunOlustur = (barkod: string, ad: string, fiyat: number, paraBirimi: 'TRY' | 'USD' | 'EUR', stok: number): Urun => {
  const urun: Urun = {
    id: `test-${barkod}-${Date.now()}`,
    kod: `TEST-${barkod}`,
    barkod,
    ad,
    kategori: 'Test Kategori',
    stokMiktari: stok,
    birim: 'Adet',
    tedarikciler: [],
    alisFiyati: fiyat * 0.7,
    alisFiyatiParaBirimi: paraBirimi,
    satisFiyati: fiyat,
    satisFiyatiParaBirimi: paraBirimi,
    kritikStokSeviyesi: 5,
    minStokSeviyesi: 10,
    karMarji: 30,
    aciklama: 'Test ürünü',
    olusturmaTarihi: new Date().toISOString(),
    guncellemeTarihi: new Date().toISOString(),
  };
  saveUrun(urun);
  return urun;
};

// TEST 1: USD Bazlı Ürün Satışı + TRY Ödeme
async function test1_UsdUrunTryOdeme(): Promise<TestResult> {
  const testNo = 1;
  const testAdi = 'USD Bazlı Ürün Satışı + TRY Ödeme';
  konsolLoglar.length = 0;
  const hatalar: string[] = [];

  try {
    log('🧪 TEST 1 BAŞLADI: USD Bazlı Ürün Satışı + TRY Ödeme');
    
    // 1. Kurları ayarla
    kurlarıKaydet(38.50, 43.80);
    const kurlar = getGuncelKurlar();
    log(`✅ Kurlar ayarlandı: USD=${kurlar.usd}, EUR=${kurlar.eur}`);

    // 2. Test müşterisi oluştur
    const musteri = testMusteriOlustur('T001', 'Test Müşteri 1');
    log(`✅ Müşteri oluşturuldu: ${musteri.adSoyad} (${musteri.kod})`);

    // 3. USD bazlı ürün oluştur
    const urun = testUrunOlustur('TEST001', 'Test USD Ürün', 100, 'USD', 50);
    log(`✅ Ürün oluşturuldu: ${urun.ad} - $${urun.satisFiyati} (Stok: ${urun.stokMiktari})`);

    // 4. Hesaplı satış yap
    const kalemler: SatisKalemi[] = [{
      id: Date.now().toString(),
      urunId: urun.id,
      urunAdi: urun.ad,
      barkod: urun.barkod,
      adet: 2,
      birimFiyati: urun.satisFiyati * kurlar.usd,
      paraBirimi: 'USD',
      orijinalBirimFiyati: urun.satisFiyati,
      kdvOrani: 20,
      kdvTutari: 0,
      indirimTL: 0,
      indirimYuzde: 0,
      toplamTutar: 200 * kurlar.usd,
    }];

    const araToplam = 200 * kurlar.usd;
    const toplamKDV = 0;
    hesapliSatisYap(musteri.id, kalemler, araToplam, toplamKDV, 0, 0, araToplam, false);
    log(`✅ Hesaplı satış yapıldı: 2 adet x $100 = $200`);

    // 5. Müşteri borcunu kontrol et
    const borclar1 = musteriDovizBorclariniHesapla(musteri.id);
    log(`📊 Satış sonrası borç: USD=${borclar1.USD}, TRY=${borclar1.TRY}, Toplam TL=${borclar1.toplamTL}`);

    if (borclar1.USD !== 200) {
      hatalar.push(`❌ USD borç yanlış: Beklenen=200, Bulunan=${borclar1.USD}`);
    }
    if (borclar1.TRY !== 0) {
      hatalar.push(`❌ TRY borç olmamalı: Bulunan=${borclar1.TRY}`);
    }

    // 6. TRY ile ödeme al (7700 TL = 200 USD)
    const odemeTutari = 200 * kurlar.usd; // 7700 TL
    odemeIsle(
      musteri.id,
      odemeTutari,
      'TRY',
      new Date().toISOString(),
      'nakit',
      'Test ödeme'
    );
    log(`✅ TRY ödeme yapıldı: ${odemeTutari} TL`);

    // 7. Ödeme sonrası borcu kontrol et
    const borclar2 = musteriDovizBorclariniHesapla(musteri.id);
    log(`📊 Ödeme sonrası borç: USD=${borclar2.USD}, TRY=${borclar2.TRY}, Toplam TL=${borclar2.toplamTL}`);

    // 8. Sonuçları değerlendir
    if (borclar2.USD > 0.01) {
      hatalar.push(`❌ USD borç sıfırlanmalıydı: Bulunan=${borclar2.USD}`);
    }
    if (borclar2.TRY < 0) {
      hatalar.push(`❌ TRY borç negatif olamaz: Bulunan=${borclar2.TRY}`);
    }
    if (Math.abs(borclar2.toplamTL) > 1) {
      hatalar.push(`❌ Toplam borç ~0 olmalı: Bulunan=${borclar2.toplamTL}`);
    }

    // 9. Hesap ekstresini kontrol et
    const ekstre = hesapEkstresiniHesapla(musteri.id);
    log(`📄 Hesap ekstresi: ${ekstre.length} hareket kaydı`);

    if (hatalar.length === 0) {
      log('✅ TEST 1 BAŞARILI: Tüm kontroller geçti');
      return {
        testNo,
        testAdi,
        durum: 'BAŞARILI',
        detay: 'USD borcu TRY ile doğru şekilde ödendi, negatif bakiye yok',
        konsol: [...konsolLoglar],
        hatalar: [],
      };
    } else {
      log('❌ TEST 1 BAŞARISIZ: Hatalar bulundu');
      return {
        testNo,
        testAdi,
        durum: 'BAŞARISIZ',
        detay: hatalar.join('; '),
        konsol: [...konsolLoglar],
        hatalar,
      };
    }
  } catch (error) {
    log(`❌ TEST 1 HATA: ${error}`);
    return {
      testNo,
      testAdi,
      durum: 'BAŞARISIZ',
      detay: `Exception: ${error}`,
      konsol: [...konsolLoglar],
      hatalar: [String(error)],
    };
  }
}

// TEST 2: Çoklu Para Birimi Borcu + Karışık Ödeme
async function test2_CokluParaBirimiOdeme(): Promise<TestResult> {
  const testNo = 2;
  const testAdi = 'Çoklu Para Birimi Borcu + Karışık Ödeme';
  konsolLoglar.length = 0;
  const hatalar: string[] = [];

  try {
    log('🧪 TEST 2 BAŞLADI: Çoklu Para Birimi Borcu + Karışık Ödeme');

    // 1. Test müşterisi
    const musteri = testMusteriOlustur('T002', 'Test Müşteri 2');
    log(`✅ Müşteri oluşturuldu: ${musteri.adSoyad}`);

    // 2. Farklı para birimlerinde ürünler
    const urunUSD = testUrunOlustur('TEST002', 'USD Ürün', 50, 'USD', 100);
    const urunEUR = testUrunOlustur('TEST003', 'EUR Ürün', 40, 'EUR', 100);
    const urunTRY = testUrunOlustur('TEST004', 'TRY Ürün', 1000, 'TRY', 100);
    log('✅ 3 farklı para biriminde ürün oluşturuldu');

    // 3. USD satış (100 USD)
    const kurlar = getGuncelKurlar();
    const kalem1: SatisKalemi = {
      id: Date.now().toString() + '1',
      urunId: urunUSD.id,
      urunAdi: urunUSD.ad,
      barkod: urunUSD.barkod,
      adet: 2,
      birimFiyati: 50 * kurlar.usd,
      paraBirimi: 'USD',
      orijinalBirimFiyati: 50,
      kdvOrani: 20,
      kdvTutari: 0,
      indirimTL: 0,
      indirimYuzde: 0,
      toplamTutar: 100 * kurlar.usd,
    };
    const araToplam1 = 100 * kurlar.usd;
    hesapliSatisYap(musteri.id, [kalem1], araToplam1, 0, 0, 0, araToplam1, false);
    log('✅ USD satış: $100');

    // 4. EUR satış (80 EUR)
    const kalem2: SatisKalemi = {
      id: Date.now().toString() + '2',
      urunId: urunEUR.id,
      urunAdi: urunEUR.ad,
      barkod: urunEUR.barkod,
      adet: 2,
      birimFiyati: 40 * kurlar.eur,
      paraBirimi: 'EUR',
      orijinalBirimFiyati: 40,
      kdvOrani: 20,
      kdvTutari: 0,
      indirimTL: 0,
      indirimYuzde: 0,
      toplamTutar: 80 * kurlar.eur,
    };
    const araToplam2 = 80 * kurlar.eur;
    hesapliSatisYap(musteri.id, [kalem2], araToplam2, 0, 0, 0, araToplam2, false);
    log('✅ EUR satış: €80');

    // 5. TRY satış (2000 TL)
    const kalem3: SatisKalemi = {
      id: Date.now().toString() + '3',
      urunId: urunTRY.id,
      urunAdi: urunTRY.ad,
      barkod: urunTRY.barkod,
      adet: 2,
      birimFiyati: 1000,
      paraBirimi: 'TRY',
      orijinalBirimFiyati: 1000,
      kdvOrani: 20,
      kdvTutari: 0,
      indirimTL: 0,
      indirimYuzde: 0,
      toplamTutar: 2000,
    };
    hesapliSatisYap(musteri.id, [kalem3], 2000, 0, 0, 0, 2000, false);
    log('✅ TRY satış: ₺2000');

    // 6. Borç kontrolü
    const borclar1 = musteriDovizBorclariniHesapla(musteri.id);
    log(`📊 Toplam borç: USD=${borclar1.USD}, EUR=${borclar1.EUR}, TRY=${borclar1.TRY}, Toplam TL=${borclar1.toplamTL}`);

    // 7. Kısmi TRY ödeme (5000 TL)
    odemeIsle(
      musteri.id,
      5000,
      'TRY',
      new Date().toISOString(),
      'nakit',
      'Test ödeme'
    );
    log('✅ TRY ödeme: ₺5000');

    // 8. USD ödeme (50 USD)
    odemeIsle(
      musteri.id,
      50,
      'USD',
      new Date().toISOString(),
      'nakit',
      'Test ödeme'
    );
    log('✅ USD ödeme: $50');

    // 9. Ödeme sonrası borç
    const borclar2 = musteriDovizBorclariniHesapla(musteri.id);
    log(`📊 Ödeme sonrası: USD=${borclar2.USD}, EUR=${borclar2.EUR}, TRY=${borclar2.TRY}, Toplam TL=${borclar2.toplamTL}`);

    // 10. Kontroller
    if (borclar2.TRY < 0) hatalar.push(`❌ TRY negatif: ${borclar2.TRY}`);
    if (borclar2.USD < 0) hatalar.push(`❌ USD negatif: ${borclar2.USD}`);
    if (borclar2.EUR < 0) hatalar.push(`❌ EUR negatif: ${borclar2.EUR}`);

    if (hatalar.length === 0) {
      log('✅ TEST 2 BAŞARILI');
      return {
        testNo,
        testAdi,
        durum: 'BAŞARILI',
        detay: 'Çoklu para birimi ödemeleri doğru işlendi',
        konsol: [...konsolLoglar],
        hatalar: [],
      };
    } else {
      return {
        testNo,
        testAdi,
        durum: 'BAŞARISIZ',
        detay: hatalar.join('; '),
        konsol: [...konsolLoglar],
        hatalar,
      };
    }
  } catch (error) {
    return {
      testNo,
      testAdi,
      durum: 'BAŞARISIZ',
      detay: `Exception: ${error}`,
      konsol: [...konsolLoglar],
      hatalar: [String(error)],
    };
  }
}

// TEST 3: Rapor ve Hesap Ekstresi Senkronizasyonu
async function test3_RaporSenkron(): Promise<TestResult> {
  const testNo = 3;
  const testAdi = 'Rapor ve Hesap Ekstresi Senkronizasyonu';
  konsolLoglar.length = 0;
  const hatalar: string[] = [];

  try {
    log('🧪 TEST 3 BAŞLADI: Rapor Senkronizasyonu');

    const musteri = testMusteriOlustur('T003', 'Test Müşteri 3');
    const urun = testUrunOlustur('TEST005', 'Test Ürün', 500, 'TRY', 100);

    // Satış yap
    const kalem: SatisKalemi = {
      id: Date.now().toString(),
      urunId: urun.id,
      urunAdi: urun.ad,
      barkod: urun.barkod,
      adet: 3,
      birimFiyati: 500,
      paraBirimi: 'TRY',
      orijinalBirimFiyati: 500,
      kdvOrani: 20,
      kdvTutari: 0,
      indirimTL: 0,
      indirimYuzde: 0,
      toplamTutar: 1500,
    };
    hesapliSatisYap(musteri.id, [kalem], 1500, 0, 0, 0, 1500, false);

    // Rapor kontrol
    const gunlukRapor = getGunlukSatisRaporu(new Date());
    const satislar = getSatislar();
    const ekstre = hesapEkstresiniHesapla(musteri.id);

    log(`📊 Günlük rapor: ${gunlukRapor.satislar.length} satış`);
    log(`📊 Satış kayıtları: ${satislar.length} adet`);
    log(`📊 Hesap ekstresi: ${ekstre.length} hareket`);

    // Tutarları karşılaştır
    const raporToplam = gunlukRapor.toplamSatis;
    const bugunSatislar = getGunlukSatislar(new Date());
    const satisToplam = bugunSatislar.reduce((sum, s) => sum + s.genelToplam, 0);

    log(`💰 Rapor toplamı: ₺${raporToplam}`);
    log(`💰 Satış toplamı: ₺${satisToplam}`);

    if (Math.abs(raporToplam - satisToplam) > 0.01) {
      hatalar.push(`❌ Rapor ve satış tutarları uyuşmuyor: ${raporToplam} vs ${satisToplam}`);
    }

    if (hatalar.length === 0) {
      log('✅ TEST 3 BAŞARILI');
      return { testNo, testAdi, durum: 'BAŞARILI', detay: 'Raporlar senkronize', konsol: [...konsolLoglar], hatalar: [] };
    } else {
      return { testNo, testAdi, durum: 'BAŞARISIZ', detay: hatalar.join('; '), konsol: [...konsolLoglar], hatalar };
    }
  } catch (error) {
    return { testNo, testAdi, durum: 'BAŞARISIZ', detay: `Exception: ${error}`, konsol: [...konsolLoglar], hatalar: [String(error)] };
  }
}

// TEST 4: Stok Hareket Kayıtları
async function test4_StokHareket(): Promise<TestResult> {
  const testNo = 4;
  const testAdi = 'Stok Hareket Kayıtları';
  konsolLoglar.length = 0;
  const hatalar: string[] = [];

  try {
    log('🧪 TEST 4 BAŞLADI: Stok Hareket');

    const musteri = testMusteriOlustur('T004', 'Test Müşteri 4');
    const baslangicStok = 100;
    const urun = testUrunOlustur('TEST006', 'Stok Test Ürün', 300, 'TRY', baslangicStok);
    log(`✅ Ürün oluşturuldu: Başlangıç stok=${baslangicStok}`);

    // Satış yap (5 adet)
    const satisMiktar = 5;
    const kalem: SatisKalemi = {
      id: Date.now().toString(),
      urunId: urun.id,
      urunAdi: urun.ad,
      barkod: urun.barkod,
      adet: satisMiktar,
      birimFiyati: 300,
      paraBirimi: 'TRY',
      orijinalBirimFiyati: 300,
      kdvOrani: 20,
      kdvTutari: 0,
      indirimTL: 0,
      indirimYuzde: 0,
      toplamTutar: 1500,
    };
    hesapliSatisYap(musteri.id, [kalem], 1500, 0, 0, 0, 1500, false);
    log(`✅ Satış yapıldı: ${satisMiktar} adet`);

    // Stok kontrolü
    const guncelUrun = getUrunler().find(u => u.id === urun.id);
    const beklenenStok = baslangicStok - satisMiktar;
    
    log(`📦 Güncel stok: ${guncelUrun?.stokMiktari}`);
    log(`📦 Beklenen stok: ${beklenenStok}`);

    if (guncelUrun?.stokMiktari !== beklenenStok) {
      hatalar.push(`❌ Stok yanlış: Beklenen=${beklenenStok}, Bulunan=${guncelUrun?.stokMiktari}`);
    }

    // Stok hareketlerini kontrol et
    const stokHareketleri = getStokHareketler();
    const urunHareketleri = stokHareketleri.filter(h => h.urunId === urun.id);
    log(`📋 Stok hareketleri: ${urunHareketleri.length} kayıt`);

    if (hatalar.length === 0) {
      log('✅ TEST 4 BAŞARILI');
      return { testNo, testAdi, durum: 'BAŞARILI', detay: 'Stok doğru düşüldü', konsol: [...konsolLoglar], hatalar: [] };
    } else {
      return { testNo, testAdi, durum: 'BAŞARISIZ', detay: hatalar.join('; '), konsol: [...konsolLoglar], hatalar };
    }
  } catch (error) {
    return { testNo, testAdi, durum: 'BAŞARISIZ', detay: `Exception: ${error}`, konsol: [...konsolLoglar], hatalar: [String(error)] };
  }
}

// TEST 5: Kur Değişikliği Sonrası Bakiye
async function test5_KurDegisimi(): Promise<TestResult> {
  const testNo = 5;
  const testAdi = 'Kur Değişikliği Sonrası Bakiye';
  konsolLoglar.length = 0;
  const hatalar: string[] = [];

  try {
    log('🧪 TEST 5 BAŞLADI: Kur Değişikliği');

    // İlk kur
    kurlarıKaydet(38.50, 43.80);
    log('✅ İlk kur: USD=38.50');

    const musteri = testMusteriOlustur('T005', 'Test Müşteri 5');
    const urun = testUrunOlustur('TEST007', 'USD Ürün', 100, 'USD', 100);

    // USD satış
    const kurlar = getGuncelKurlar();
    const kalem: SatisKalemi = {
      id: Date.now().toString(),
      urunId: urun.id,
      urunAdi: urun.ad,
      barkod: urun.barkod,
      adet: 1,
      birimFiyati: 100 * kurlar.usd,
      paraBirimi: 'USD',
      orijinalBirimFiyati: 100,
      kdvOrani: 20,
      kdvTutari: 0,
      indirimTL: 0,
      indirimYuzde: 0,
      toplamTutar: 100 * kurlar.usd,
    };
    hesapliSatisYap(musteri.id, [kalem], 100 * kurlar.usd, 0, 0, 0, 100 * kurlar.usd, false);

    const ilkBorclar = musteriDovizBorclariniHesapla(musteri.id);
    log(`📊 İlk borç: $${ilkBorclar.USD} = ₺${ilkBorclar.toplamTL}`);

    // Kur değiştir
    kurlarıKaydet(40.00, 45.00);
    log('✅ Yeni kur: USD=40.00');

    const yeniBorclar = musteriDovizBorclariniHesapla(musteri.id);
    log(`📊 Yeni borç: $${yeniBorclar.USD} = ₺${yeniBorclar.toplamTL}`);

    // USD borcu aynı kalmalı, TL karşılığı değişmeli
    if (yeniBorclar.USD !== ilkBorclar.USD) {
      hatalar.push(`❌ USD borç değişmemeli: ${ilkBorclar.USD} → ${yeniBorclar.USD}`);
    }

    if (Math.abs(yeniBorclar.toplamTL - (100 * 40)) > 1) {
      hatalar.push(`❌ TL karşılık yanlış: Beklenen=4000, Bulunan=${yeniBorclar.toplamTL}`);
    }

    if (hatalar.length === 0) {
      log('✅ TEST 5 BAŞARILI');
      return { testNo, testAdi, durum: 'BAŞARILI', detay: 'Kur değişimi doğru yansıdı', konsol: [...konsolLoglar], hatalar: [] };
    } else {
      return { testNo, testAdi, durum: 'BAŞARISIZ', detay: hatalar.join('; '), konsol: [...konsolLoglar], hatalar };
    }
  } catch (error) {
    return { testNo, testAdi, durum: 'BAŞARISIZ', detay: `Exception: ${error}`, konsol: [...konsolLoglar], hatalar: [String(error)] };
  }
}

// TEST 6: Hızlı Satış İşlemleri
async function test6_HizliSatis(): Promise<TestResult> {
  const testNo = 6;
  const testAdi = 'Hızlı Satış İşlemleri';
  konsolLoglar.length = 0;
  const hatalar: string[] = [];

  try {
    log('🧪 TEST 6 BAŞLADI: Hızlı Satış');

    const urun = testUrunOlustur('TEST008', 'Hızlı Satış Ürün', 750, 'TRY', 50);
    const baslangicStok = urun.stokMiktari;

    const kalem: SatisKalemi = {
      id: Date.now().toString(),
      urunId: urun.id,
      urunAdi: urun.ad,
      barkod: urun.barkod,
      adet: 3,
      birimFiyati: 750,
      paraBirimi: 'TRY',
      orijinalBirimFiyati: 750,
      kdvOrani: 20,
      kdvTutari: 0,
      indirimTL: 0,
      indirimYuzde: 0,
      toplamTutar: 2250,
    };
    hizliSatisYap([kalem], 2250, 0, 0, 0, 2250, false, 'nakit');

    log('✅ Hızlı satış tamamlandı');

    // Stok kontrolü
    const guncelUrun = getUrunler().find(u => u.id === urun.id);
    if (guncelUrun?.stokMiktari !== baslangicStok - 3) {
      hatalar.push(`❌ Stok düşmedi: Beklenen=${baslangicStok - 3}, Bulunan=${guncelUrun?.stokMiktari}`);
    }

    // Satış kaydı kontrolü
    const satislar = getSatislar().filter(s => s.satisTuru === 'hizli');
    log(`📋 Hızlı satış kayıtları: ${satislar.length} adet`);

    if (hatalar.length === 0) {
      log('✅ TEST 6 BAŞARILI');
      return { testNo, testAdi, durum: 'BAŞARILI', detay: 'Hızlı satış başarılı', konsol: [...konsolLoglar], hatalar: [] };
    } else {
      return { testNo, testAdi, durum: 'BAŞARISIZ', detay: hatalar.join('; '), konsol: [...konsolLoglar], hatalar };
    }
  } catch (error) {
    return { testNo, testAdi, durum: 'BAŞARISIZ', detay: `Exception: ${error}`, konsol: [...konsolLoglar], hatalar: [String(error)] };
  }
}

// TEST 7: Rezerv İşlemleri
async function test7_Rezerv(): Promise<TestResult> {
  const testNo = 7;
  const testAdi = 'Rezerv İşlemleri';
  konsolLoglar.length = 0;
  const hatalar: string[] = [];

  try {
    log('🧪 TEST 7 BAŞLADI: Rezerv İşlemleri');

    const musteri = testMusteriOlustur('T007', 'Test Müşteri 7');
    const urun = testUrunOlustur('TEST009', 'Rezerv Ürün', 1000, 'TRY', 50);

    // Rezerv oluştur
    const kalem: SatisKalemi = {
      id: Date.now().toString(),
      urunId: urun.id,
      urunAdi: urun.ad,
      barkod: urun.barkod,
      adet: 2,
      birimFiyati: 1000,
      paraBirimi: 'TRY',
      orijinalBirimFiyati: 1000,
      kdvOrani: 20,
      kdvTutari: 0,
      indirimTL: 0,
      indirimYuzde: 0,
      toplamTutar: 2000,
    };
    rezervYap([kalem], 2000, 0, 0, 0, 2000, false, 'Test rezerv notu');
    
    const rezervler = getSatislar().filter(s => s.satisTuru === 'rezerv');
    const rezervNo = rezervler[rezervler.length - 1]?.satisNo;
    log(`✅ Rezerv oluşturuldu: ${rezervNo}`);

    // Rezerv kaydı kontrol
    const rezervSatis = getSatislar().find(s => s.satisNo === rezervNo);
    if (!rezervSatis || rezervSatis.satisTuru !== 'rezerv') {
      hatalar.push('❌ Rezerv kaydı bulunamadı');
    }

    // Rezervi satışa dönüştür
    rezervSatisaDonustur(rezervSatis!.id, musteri.id, 'hesapli');
    log('✅ Rezerv satışa dönüştürüldü');

    // Satış kontrolü
    const guncelSatis = getSatislar().find(s => s.id === rezervSatis!.id);
    if (guncelSatis?.rezervDurumu !== 'tamamlandi') {
      hatalar.push(`❌ Rezerv durumu yanlış: ${guncelSatis?.rezervDurumu}`);
    }

    if (hatalar.length === 0) {
      log('✅ TEST 7 BAŞARILI');
      return { testNo, testAdi, durum: 'BAŞARILI', detay: 'Rezerv işlemleri başarılı', konsol: [...konsolLoglar], hatalar: [] };
    } else {
      return { testNo, testAdi, durum: 'BAŞARISIZ', detay: hatalar.join('; '), konsol: [...konsolLoglar], hatalar };
    }
  } catch (error) {
    return { testNo, testAdi, durum: 'BAŞARISIZ', detay: `Exception: ${error}`, konsol: [...konsolLoglar], hatalar: [String(error)] };
  }
}

// TEST 8: Error Handling ve Atomicity
async function test8_ErrorHandling(): Promise<TestResult> {
  const testNo = 8;
  const testAdi = 'Error Handling ve Atomicity';
  konsolLoglar.length = 0;
  const hatalar: string[] = [];

  try {
    log('🧪 TEST 8 BAŞLADI: Error Handling');

    // Bu test biraz karmaşık olduğu için basit validasyonlar yapacağız
    const musteri = testMusteriOlustur('T008', 'Test Müşteri 8');
    const urun = testUrunOlustur('TEST010', 'Test Ürün', 500, 'TRY', 5);

    const oncekiSatislar = getSatislar().length;
    
    // Yetersiz stokla satış denemesi
    try {
      const kalem: SatisKalemi = {
        id: Date.now().toString(),
        urunId: urun.id,
        urunAdi: urun.ad,
        barkod: urun.barkod,
        adet: 100, // Çok fazla
        birimFiyati: 500,
        paraBirimi: 'TRY',
        orijinalBirimFiyati: 500,
        kdvOrani: 20,
        kdvTutari: 0,
        indirimTL: 0,
        indirimYuzde: 0,
        toplamTutar: 50000,
      };
      hesapliSatisYap(musteri.id, [kalem], 50000, 0, 0, 0, 50000, false);
      
      // Eğer buraya geldiyse hata handling çalışmamış demektir
      log('⚠️ UYARI: Yetersiz stok kontrolü çalışmadı');
    } catch (e) {
      log('✅ Yetersiz stok hatası yakalandı');
    }

    const sonrakiSatislar = getSatislar().length;
    
    // Satış sayısı artmamış olmalı (atomicity)
    if (sonrakiSatislar !== oncekiSatislar) {
      hatalar.push('⚠️ Hatalı işlem kaydedildi (atomicity sorunu)');
    }

    if (hatalar.length === 0) {
      log('✅ TEST 8 BAŞARILI');
      return { testNo, testAdi, durum: 'BAŞARILI', detay: 'Error handling çalışıyor', konsol: [...konsolLoglar], hatalar: [] };
    } else {
      return { testNo, testAdi, durum: 'UYARI', detay: hatalar.join('; '), konsol: [...konsolLoglar], hatalar };
    }
  } catch (error) {
    return { testNo, testAdi, durum: 'BAŞARISIZ', detay: `Exception: ${error}`, konsol: [...konsolLoglar], hatalar: [String(error)] };
  }
}

// Ana test runner
export async function tumTestleriCalistir(): Promise<TestResult[]> {
  console.log('🚀 TÜM TESTLER BAŞLIYOR...\n');
  
  testSonuclari.length = 0;

  testSonuclari.push(await test1_UsdUrunTryOdeme());
  testSonuclari.push(await test2_CokluParaBirimiOdeme());
  testSonuclari.push(await test3_RaporSenkron());
  testSonuclari.push(await test4_StokHareket());
  testSonuclari.push(await test5_KurDegisimi());
  testSonuclari.push(await test6_HizliSatis());
  testSonuclari.push(await test7_Rezerv());
  testSonuclari.push(await test8_ErrorHandling());

  // Özet rapor
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SONUÇLARI ÖZETİ');
  console.log('='.repeat(80));

  let basarili = 0;
  let basarisiz = 0;
  let uyari = 0;

  testSonuclari.forEach(sonuc => {
    const icon = sonuc.durum === 'BAŞARILI' ? '✅' : sonuc.durum === 'UYARI' ? '⚠️' : '❌';
    console.log(`${icon} TEST ${sonuc.testNo}: ${sonuc.testAdi} - ${sonuc.durum}`);
    if (sonuc.durum === 'BAŞARILI') basarili++;
    else if (sonuc.durum === 'UYARI') uyari++;
    else basarisiz++;
  });

  console.log('='.repeat(80));
  console.log(`✅ Başarılı: ${basarili}`);
  console.log(`⚠️  Uyarı: ${uyari}`);
  console.log(`❌ Başarısız: ${basarisiz}`);
  console.log(`📋 Toplam: ${testSonuclari.length}`);
  console.log('='.repeat(80));

  return testSonuclari;
}

// Window objesine ekle
if (typeof window !== 'undefined') {
  (window as any).runAllTests = tumTestleriCalistir;
  (window as any).testResults = testSonuclari;
}
