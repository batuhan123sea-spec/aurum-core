import { Musteri, HesapHareketi } from '@/types/musteri';
import { Urun } from '@/types/stok';
import { Satis, SatisKalemi } from '@/types/satis';
import { saveMusteri, getMusteriler, saveHareket } from './musteri-data';
import { saveUrun, getUrunler, generateBarkod } from './stok-data';
import { saveSatis } from './satis-data';
import { stokHareketKaydet } from './stok-hareket';
import { getKur } from './kur-hesaplama';

/**
 * Haftalık satış simülasyonu - Ahmet Yılmaz müşterisi ve Çift ürünü için
 * Son 7 günde rastgele tarihlerle 5-7 satış kaydı oluşturur
 */
export function simulasyonCalistir(): void {
  console.log('🧪 Simülasyon başlatılıyor...');
  
  // 1. Müşteri Oluştur veya Bul
  let musteri = getMusteriler().find(m => m.adSoyad === 'Ahmet Yılmaz');
  
  if (!musteri) {
    const musteriId = Date.now().toString();
    musteri = {
      id: musteriId,
      kod: `MST-${String(getMusteriler().length + 1).padStart(3, '0')}`,
      adSoyad: 'Ahmet Yılmaz',
      telefon: '0532 123 45 67',
      email: 'ahmet@example.com',
      adres: 'İstanbul',
      vergiNoTcKimlik: '',
      konum: 'ic',
      varsayilanParaBirimi: 'USD',
      krediLimiti: 0,
      notlar: 'Simülasyon müşterisi',
      borclar: { TRY: 0, USD: 0, EUR: 0 },
      toplamBorcTL: 0,
      durumu: 'aktif',
      olusturmaTarihi: new Date().toISOString(),
      sonIslemTarihi: new Date().toISOString()
    };
    saveMusteri(musteri);
    console.log('✅ Ahmet Yılmaz müşterisi oluşturuldu');
  } else {
    console.log('✅ Ahmet Yılmaz müşterisi mevcut');
  }

  // 2. Ürün Oluştur veya Bul
  let urun = getUrunler().find(u => u.ad === 'Çift');
  
  if (!urun) {
    const urunId = Date.now().toString();
    urun = {
      id: urunId,
      kod: `URN-${String(getUrunler().length + 1).padStart(3, '0')}`,
      ad: 'Çift',
      barkod: generateBarkod(),
      kategori: 'el-aletleri',
      stokMiktari: 50,
      birim: 'Adet',
      tedarikciler: [],
      alisFiyati: 100,
      alisFiyatiParaBirimi: 'USD',
      karMarji: 20,
      satisFiyati: 120,
      satisFiyatiParaBirimi: 'USD',
      minStokSeviyesi: 10,
      kritikStokSeviyesi: 5,
      aciklama: 'Simülasyon ürünü',
      olusturmaTarihi: new Date().toISOString(),
      guncellemeTarihi: new Date().toISOString()
    };
    saveUrun(urun);
    console.log('✅ Çift ürünü oluşturuldu (50 adet stok)');
  } else {
    console.log('✅ Çift ürünü mevcut');
  }

  // 3. Geçmiş Tarihli Satışlar Oluştur (Son 7 gün)
  const bugun = new Date();
  const satisAdedi = Math.floor(Math.random() * 3) + 5; // 5-7 satış
  
  console.log(`📊 ${satisAdedi} adet geçmiş satış oluşturuluyor...`);
  
  let toplamSatilanAdet = 0;
  const usdKur = getKur('USD');

  for (let i = 0; i < satisAdedi; i++) {
    // Rastgele geçmiş tarih (son 7 gün içinde)
    const gunOnce = Math.floor(Math.random() * 7);
    const satisTarihi = new Date(bugun);
    satisTarihi.setDate(satisTarihi.getDate() - gunOnce);
    satisTarihi.setHours(10 + Math.floor(Math.random() * 8)); // 10:00 - 18:00 arası
    satisTarihi.setMinutes(Math.floor(Math.random() * 60));
    satisTarihi.setSeconds(0);
    
    const adet = Math.floor(Math.random() * 3) + 1; // 1-3 adet
    toplamSatilanAdet += adet;
    
    const birimFiyati = urun.satisFiyati * usdKur; // TL cinsinden
    const toplamTutar = birimFiyati * adet;
    
    // Satış kalemi oluştur
    const kalem: SatisKalemi = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      urunId: urun.id,
      urunAdi: urun.ad,
      barkod: urun.barkod,
      adet: adet,
      birimFiyati: birimFiyati,
      alisFiyati: urun.alisFiyati * usdKur,
      paraBirimi: 'USD',
      orijinalBirimFiyati: urun.satisFiyati,
      kdvOrani: 0,
      kdvTutari: 0,
      indirimTL: 0,
      indirimYuzde: 0,
      toplamTutar: toplamTutar
    };

    // Satış kaydı oluştur
    const satisNo = `SATS-${String(i + 1).padStart(4, '0')}`;
    const satis: Satis = {
      id: Date.now().toString() + i,
      satisNo: satisNo,
      tarih: satisTarihi.toISOString(),
      satisTuru: 'hesapli',
      musteriId: musteri.id,
      musteriAdi: musteri.adSoyad,
      kalemler: [kalem],
      araToplam: toplamTutar,
      toplamKDV: 0,
      genelIndirimTL: 0,
      genelIndirimYuzde: 0,
      genelToplam: toplamTutar,
      kdvDahil: false,
      durum: 'tamamlandi',
      kullanici: 'Admin'
    };
    
    saveSatis(satis);
    
    // Hesap hareketi oluştur
    const hareket: HesapHareketi = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      musteriId: musteri.id,
      tarih: satisTarihi.toISOString(),
      islemTuru: 'satis',
      aciklama: `Satış - ${satisNo} (USD)`,
      paraBirimi: 'USD',
      tutar: urun.satisFiyati * adet,
      kur: usdKur,
      tlKarsiligi: toplamTutar,
      bakiye: 0 // Sonra recalculate edilecek
    };
    
    saveHareket(hareket);
    
    // Stok hareketi kaydet
    const oncekiStok = urun.stokMiktari;
    urun.stokMiktari -= adet;
    stokHareketKaydet(
      urun.id,
      'cikis',
      adet,
      `Satış - ${satisNo}`,
      oncekiStok,
      urun.stokMiktari
    );
    
    console.log(`  ✓ ${satisTarihi.toLocaleDateString('tr-TR')} - ${adet} adet (${satisNo})`);
  }

  // 4. Ürün stoğunu güncelle
  saveUrun(urun);
  
  console.log(`\n✅ Simülasyon tamamlandı:`);
  console.log(`   - Müşteri: ${musteri.adSoyad}`);
  console.log(`   - Ürün: ${urun.ad}`);
  console.log(`   - Toplam Satış: ${satisAdedi} adet işlem`);
  console.log(`   - Satılan Ürün: ${toplamSatilanAdet} adet`);
  console.log(`   - Kalan Stok: ${urun.stokMiktari} adet`);
  console.log(`\n💡 Raporlar sayfasından haftalık satışları görüntüleyebilirsiniz.`);
}
