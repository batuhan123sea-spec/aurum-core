import { Satis, SatisKalemi } from '@/types/satis';
import { saveSatis, generateSatisNo, generateRezervNo } from './satis-data';
import { stokHareketKaydet } from './stok-hareket';
import { getUrunler, saveUrun } from './stok-data';
import { getMusteriler, saveHareket, musteriBalanceGuncelle, musteriDovizBorclariniHesapla } from './musteri-data';
import { getKur } from './kur-hesaplama';
import { toast } from '@/hooks/use-toast';

export function hesapliSatisYap(
  musteriId: string,
  kalemler: SatisKalemi[],
  araToplam: number,
  toplamKDV: number,
  genelIndirimTL: number,
  genelIndirimYuzde: number,
  genelToplam: number,
  kdvDahil: boolean
): void {
  console.log('🔵 Hesaplı satış başladı:', { musteriId, genelToplam });
  
  const musteri = getMusteriler().find(m => m.id === musteriId);
  if (!musteri) {
    toast({
      title: "Hata",
      description: "Müşteri bulunamadı",
      variant: "destructive"
    });
    return;
  }

  try {
    // Satış kaydı oluştur
    const satis: Satis = {
      id: Date.now().toString(),
      satisNo: generateSatisNo(),
      tarih: new Date().toISOString(),
      satisTuru: 'hesapli',
      musteriId,
      musteriAdi: musteri.adSoyad,
      kalemler,
      araToplam,
      toplamKDV,
      genelIndirimTL,
      genelIndirimYuzde,
      genelToplam,
      kdvDahil,
      durum: 'tamamlandi',
      kullanici: 'Admin'
    };
    
    // ✅ Stokları düş - ATOMIC (Tek seferde kaydet)
    let urunler = getUrunler();
    
    kalemler.forEach(kalem => {
      const urunIndex = urunler.findIndex(u => u.id === kalem.urunId);
      
      if (urunIndex !== -1) {
        const oncekiMiktar = urunler[urunIndex].stokMiktari;
        const yeniMiktar = oncekiMiktar - kalem.adet;
        
        stokHareketKaydet(
          kalem.urunId,
          'cikis',
          kalem.adet,
          `Satış - ${satis.satisNo}`,
          oncekiMiktar,
          yeniMiktar
        );
        
        // Hafızada güncelle
        urunler[urunIndex] = {
          ...urunler[urunIndex],
          stokMiktari: yeniMiktar,
          guncellemeTarihi: new Date().toISOString()
        };

        // Stok uyarısı kontrolü
        if (yeniMiktar <= urunler[urunIndex].kritikStokSeviyesi) {
          toast({
            title: "🚨 Kritik Stok Uyarısı!",
            description: `${urunler[urunIndex].ad} kritik seviyede! (Kalan: ${yeniMiktar})`,
            variant: "destructive"
          });
        } else if (yeniMiktar <= urunler[urunIndex].minStokSeviyesi) {
          toast({
            title: "⚠️ Düşük Stok",
            description: `${urunler[urunIndex].ad} minimum seviyeye yaklaştı! (Kalan: ${yeniMiktar})`
          });
        }
      }
    });
    
    // ✅ TÜM ÜRÜNLERİ TEK SEFERDE KAYDET
    localStorage.setItem('kuyumcu_stok_urunler', JSON.stringify(urunler));
    
    // Mevcut borcu hesapla (hareket kaydetmeden ÖNCE)
    const mevcutBorclar = musteriDovizBorclariniHesapla(musteriId);
    let bakiye = mevcutBorclar.toplamTL;
    
    // Sepetteki her kalemin para birimini grupla
    const paraBirimiGroups: { [key: string]: number } = {
      TRY: 0,
      USD: 0,
      EUR: 0
    };

    kalemler.forEach(kalem => {
      let kalemTutari = kalem.orijinalBirimFiyati * kalem.adet;
      
      // KDV dahil satışsa, KDV'yi ekle
      if (kdvDahil) {
        const kdvTutari = kalemTutari * (kalem.kdvOrani / 100);
        kalemTutari += kdvTutari;
      }
      
      paraBirimiGroups[kalem.paraBirimi] += kalemTutari;
    });

    // Her para birimi için ayrı hareket kaydet
    const hareketler: any[] = [];
    Object.keys(paraBirimiGroups).forEach((pb) => {
      const paraBirimi = pb as 'TRY' | 'USD' | 'EUR';
      if (paraBirimiGroups[pb] > 0) {
        const kur = paraBirimi === 'TRY' ? 1 : getKur(paraBirimi);
        const tlKarsiligi = paraBirimiGroups[pb] * kur;
        
        // Yeni bakiyeyi hesapla
        bakiye += tlKarsiligi;
        
        const hareket = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          musteriId,
          tarih: satis.tarih,
          islemTuru: 'satis',
          aciklama: `Satış - ${satis.satisNo} (${paraBirimi})`,
          paraBirimi,
          tutar: paraBirimiGroups[pb],
          kur,
          tlKarsiligi,
          bakiye // ✅ Doğru hesaplanmış bakiye
        };
        
        hareketler.push(hareket);
        console.log('✅ Hareket hazırlandı:', hareket);
      }
    });
    
    // Tüm işlemler başarılıysa, kaydet
    saveSatis(satis);
    hareketler.forEach(h => saveHareket(h));
    musteriBalanceGuncelle(musteriId);
    
    console.log('📊 Yeni bakiye:', bakiye);
    
    toast({
      title: "Satış Tamamlandı",
      description: `${satis.satisNo} nolu satış müşteri hesabına kaydedildi.`,
    });
  } catch (error) {
    console.error('❌ Satış hatası:', error);
    toast({
      title: "Hata",
      description: "Satış kaydedilirken bir hata oluştu.",
      variant: "destructive"
    });
  }
}

export function rezervYap(
  kalemler: SatisKalemi[],
  araToplam: number,
  toplamKDV: number,
  genelIndirimTL: number,
  genelIndirimYuzde: number,
  genelToplam: number,
  kdvDahil: boolean,
  musteriNotu: string
): void {
  const rezerv: Satis = {
    id: Date.now().toString(),
    satisNo: generateRezervNo(),
    tarih: new Date().toISOString(),
    satisTuru: 'rezerv',
    kalemler,
    araToplam,
    toplamKDV,
    genelIndirimTL,
    genelIndirimYuzde,
    genelToplam,
    kdvDahil,
    rezervDurumu: 'beklemede',
    rezervNotu: musteriNotu,
    durum: 'rezerv',
    kullanici: 'Admin'
  };
  
  saveSatis(rezerv);
  
  toast({
    title: "Rezervasyon Oluşturuldu",
    description: `${rezerv.satisNo} nolu rezervasyon kaydedildi.`,
  });
}

export function hizliSatisYap(
  kalemler: SatisKalemi[],
  araToplam: number,
  toplamKDV: number,
  genelIndirimTL: number,
  genelIndirimYuzde: number,
  genelToplam: number,
  kdvDahil: boolean,
  odemeTuru: 'nakit' | 'kredi-karti'
): void {
  const satis: Satis = {
    id: Date.now().toString(),
    satisNo: generateSatisNo(),
    tarih: new Date().toISOString(),
    satisTuru: 'hizli',
    kalemler,
    araToplam,
    toplamKDV,
    genelIndirimTL,
    genelIndirimYuzde,
    genelToplam,
    kdvDahil,
    odemeTuru,
    odemeTutari: genelToplam,
    durum: 'tamamlandi',
    kullanici: 'Admin'
  };
  
  saveSatis(satis);
  
  // ✅ Stokları düş - ATOMIC (Tek seferde kaydet)
  let urunler = getUrunler();
  
  kalemler.forEach(kalem => {
    const urunIndex = urunler.findIndex(u => u.id === kalem.urunId);
    
    if (urunIndex !== -1) {
      const oncekiMiktar = urunler[urunIndex].stokMiktari;
      const yeniMiktar = oncekiMiktar - kalem.adet;
      
      stokHareketKaydet(
        kalem.urunId,
        'cikis',
        kalem.adet,
        `Hızlı Satış - ${odemeTuru === 'nakit' ? 'Nakit' : 'Kredi Kartı'}`,
        oncekiMiktar,
        yeniMiktar
      );
      
      // Hafızada güncelle
      urunler[urunIndex] = {
        ...urunler[urunIndex],
        stokMiktari: yeniMiktar,
        guncellemeTarihi: new Date().toISOString()
      };

      // Stok uyarısı kontrolü
      if (yeniMiktar <= urunler[urunIndex].kritikStokSeviyesi) {
        toast({
          title: "🚨 Kritik Stok Uyarısı!",
          description: `${urunler[urunIndex].ad} kritik seviyede! (Kalan: ${yeniMiktar})`,
          variant: "destructive"
        });
      } else if (yeniMiktar <= urunler[urunIndex].minStokSeviyesi) {
        toast({
          title: "⚠️ Düşük Stok",
          description: `${urunler[urunIndex].ad} minimum seviyeye yaklaştı! (Kalan: ${yeniMiktar})`
        });
      }
    }
  });
  
  // ✅ TÜM ÜRÜNLERİ TEK SEFERDE KAYDET
  localStorage.setItem('kuyumcu_stok_urunler', JSON.stringify(urunler));
  
  toast({
    title: "Satış Tamamlandı",
    description: `${genelToplam.toFixed(2)} TL ${odemeTuru === 'nakit' ? 'nakit' : 'kredi kartı ile'} tahsil edildi.`,
  });
}

export function rezervIadeIsle(
  urunId: string,
  iadeMiktari: number,
  rezervNo: string
): void {
  const urunler = getUrunler();
  const urun = urunler.find(u => u.id === urunId);
  
  if (!urun) {
    toast({
      title: "Hata",
      description: "Ürün bulunamadı",
      variant: "destructive"
    });
    return;
  }

  const oncekiMiktar = urun.stokMiktari;
  const yeniMiktar = oncekiMiktar + iadeMiktari;
  
  // Stok hareketine kaydet (ürün adını da ekle)
  const aciklama = `Rezerv İadesi - ${rezervNo} - ${urun.ad}`;
  stokHareketKaydet(
    urunId,
    'giris',
    iadeMiktari,
    aciklama,
    oncekiMiktar,
    yeniMiktar
  );
  
  // Stoğu artır
  urun.stokMiktari = yeniMiktar;
  saveUrun(urun);
}

export function rezervKismiSatisYap(
  rezervId: string,
  urunIslemleri: Array<{
    urunId: string;
    satilanMiktar: number;
    iadeMiktar: number;
  }>,
  odemeTuru: 'hesapli' | 'nakit' | 'kredi-karti',
  musteriId?: string
): void {
  const satislar = JSON.parse(localStorage.getItem('kuyumcu_satislar') || '[]');
  const rezerv = satislar.find((s: any) => s.id === rezervId);
  
  if (!rezerv || rezerv.satisTuru !== 'rezerv') {
    toast({
      title: "Hata",
      description: "Rezerv bulunamadı",
      variant: "destructive"
    });
    return;
  }

  // İade edilen ürünleri stoğa ekle
  urunIslemleri.forEach(islem => {
    if (islem.iadeMiktar > 0) {
      rezervIadeIsle(
        islem.urunId,
        islem.iadeMiktar,
        `Rezerv İadesi - ${rezerv.satisNo}`
      );
    }
  });

  // Satılan ürünler için yeni kalemler oluştur
  const satilanKalemler = rezerv.kalemler
    .map((kalem: any) => {
      const islem = urunIslemleri.find(i => i.urunId === kalem.urunId);
      if (!islem || islem.satilanMiktar === 0) return null;
      
      return {
        ...kalem,
        adet: islem.satilanMiktar,
        toplamTutar: kalem.birimFiyati * islem.satilanMiktar,
      };
    })
    .filter(Boolean);

  if (satilanKalemler.length === 0) {
    toast({
      title: "Uyarı",
      description: "Satılan ürün yok. Tüm ürünler iade edildi.",
    });
  } else {
    // Yeni toplam hesapla
    const yeniAraToplam = satilanKalemler.reduce((sum: number, k: any) => sum + k.toplamTutar, 0);
    const yeniToplamKDV = satilanKalemler.reduce((sum: number, k: any) => sum + k.kdvTutari, 0);
    const yeniGenelToplam = yeniAraToplam + yeniToplamKDV;

    // Satış yap
    if (odemeTuru === 'hesapli' && musteriId) {
      hesapliSatisYap(
        musteriId,
        satilanKalemler,
        yeniAraToplam,
        yeniToplamKDV,
        0,
        0,
        yeniGenelToplam,
        rezerv.kdvDahil
      );
    } else if (odemeTuru === 'nakit' || odemeTuru === 'kredi-karti') {
      hizliSatisYap(
        satilanKalemler,
        yeniAraToplam,
        yeniToplamKDV,
        0,
        0,
        yeniGenelToplam,
        rezerv.kdvDahil,
        odemeTuru
      );
    }
  }
  
  // Rezerv durumunu güncelle
  rezerv.rezervDurumu = 'tamamlandi';
  rezerv.durum = 'iptal';
  saveSatis(rezerv);
  
  toast({
    title: "İşlem Tamamlandı",
    description: `${rezerv.satisNo} nolu rezerv başarıyla işleme alındı.`,
  });
}

export function rezervSatisaDonustur(
  rezervId: string,
  musteriId: string,
  odemeTuru: 'hesapli' | 'nakit' | 'kredi-karti'
): void {
  const satislar = JSON.parse(localStorage.getItem('kuyumcu_satislar') || '[]');
  const rezerv = satislar.find((s: any) => s.id === rezervId);
  
  if (!rezerv || rezerv.satisTuru !== 'rezerv') {
    toast({
      title: "Hata",
      description: "Rezerv bulunamadı",
      variant: "destructive"
    });
    return;
  }

  if (odemeTuru === 'hesapli') {
    hesapliSatisYap(
      musteriId,
      rezerv.kalemler,
      rezerv.araToplam,
      rezerv.toplamKDV,
      rezerv.genelIndirimTL,
      rezerv.genelIndirimYuzde,
      rezerv.genelToplam,
      rezerv.kdvDahil
    );
  } else {
    hizliSatisYap(
      rezerv.kalemler,
      rezerv.araToplam,
      rezerv.toplamKDV,
      rezerv.genelIndirimTL,
      rezerv.genelIndirimYuzde,
      rezerv.genelToplam,
      rezerv.kdvDahil,
      odemeTuru
    );
  }
  
  // Rezerv durumunu güncelle
  rezerv.rezervDurumu = 'tamamlandi';
  rezerv.durum = 'iptal';
  saveSatis(rezerv);
}
