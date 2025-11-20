import { Satis, SatisKalemi } from '@/types/satis';
import { saveSatis, generateSatisNo, generateRezervNo } from './satis-data';
import { stokHareketKaydet } from './stok-hareket';
import { getUrunler, saveUrun } from './stok-data';
import { getMusteriler, saveHareket, musteriBalanceGuncelle } from './musteri-data';
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
  const musteri = getMusteriler().find(m => m.id === musteriId);
  if (!musteri) {
    toast({
      title: "Hata",
      description: "Müşteri bulunamadı",
      variant: "destructive"
    });
    return;
  }

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
  
  saveSatis(satis);
  
  // Stokları düş
  kalemler.forEach(kalem => {
    const urunler = getUrunler();
    const urun = urunler.find(u => u.id === kalem.urunId);
    if (urun) {
      const oncekiMiktar = urun.stokMiktari;
      const yeniMiktar = oncekiMiktar - kalem.adet;
      
      stokHareketKaydet(
        kalem.urunId,
        'cikis',
        kalem.adet,
        `Satış - ${satis.satisNo}`,
        oncekiMiktar,
        yeniMiktar
      );
      
      urun.stokMiktari = yeniMiktar;
      saveUrun(urun);
    }
  });
  
  // Müşteri borcuna ekle
  const paraBirimi = musteri.varsayilanParaBirimi;
  let borcTutari = genelToplam;
  
  if (paraBirimi !== 'TRY') {
    const kur = getKur(paraBirimi);
    borcTutari = genelToplam / kur;
  }
  
  saveHareket({
    id: Date.now().toString(),
    musteriId,
    tarih: satis.tarih,
    islemTuru: 'satis',
    aciklama: `Satış - ${kalemler.map(k => k.urunAdi).join(', ')}`,
    paraBirimi,
    tutar: borcTutari,
    kur: paraBirimi === 'TRY' ? 1 : getKur(paraBirimi),
    tlKarsiligi: genelToplam,
    bakiye: 0
  });
  
  musteriBalanceGuncelle(musteriId, 'satis', genelToplam);
  
  toast({
    title: "Satış Tamamlandı",
    description: `${satis.satisNo} nolu satış müşteri hesabına kaydedildi.`,
  });
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
  
  // Stokları düş
  kalemler.forEach(kalem => {
    const urunler = getUrunler();
    const urun = urunler.find(u => u.id === kalem.urunId);
    if (urun) {
      const oncekiMiktar = urun.stokMiktari;
      const yeniMiktar = oncekiMiktar - kalem.adet;
      
      stokHareketKaydet(
        kalem.urunId,
        'cikis',
        kalem.adet,
        `Hızlı Satış - ${odemeTuru === 'nakit' ? 'Nakit' : 'Kredi Kartı'}`,
        oncekiMiktar,
        yeniMiktar
      );
      
      urun.stokMiktari = yeniMiktar;
      saveUrun(urun);
    }
  });
  
  toast({
    title: "Satış Tamamlandı",
    description: `${genelToplam.toFixed(2)} TL ${odemeTuru === 'nakit' ? 'nakit' : 'kredi kartı ile'} tahsil edildi.`,
  });
}

export function rezervSatisaDonustur(
  rezervId: string,
  musteriId: string,
  odemeTuru: 'hesapli' | 'nakit' | 'kredi-karti'
): void {
  const satislar = JSON.parse(localStorage.getItem('kuyumcu_satislar') || '[]');
  const rezerv = satislar.find((s: Satis) => s.id === rezervId);
  
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
