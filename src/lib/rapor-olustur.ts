import { getSatislar, getGunlukSatislar, getHaftalikSatislar } from './satis-data';
import { getMusteriler, getHareketler } from './musteri-data';
import { getUrunler } from './stok-data';
import { Satis } from '@/types/satis';
import { paraBirimiTLyeCevir, getKur } from './kur-hesaplama';
import { formatLocalDate } from './utils';
import type { ParaBirimi } from '@/types/musteri';

export interface GunlukSatisRapor {
  tarih: string;
  toplamSatis: number;
  toplamAdet: number;
  ortalamaSepet: number;
  satislar: Satis[];
}

export interface MusteriBorcRapor {
  musteriId: string;
  musteriAdi: string;
  konum: string;
  borcTL: number;
  paraBirimi: string;
  borcOrijinal: number;
}

export interface StokDurumRapor {
  kategori: string;
  toplamUrun: number;
  toplamStokDegeri: number;
  kritikStokUrunler: number;
}

export interface HaftalikSatisRapor {
  baslangicTarih: string;
  bitisTarih: string;
  toplamSatis: number;
  toplamAdet: number;
  ortalamaSepet: number;
  gunlukDetay: {
    tarih: string;
    gun: string;
    toplamSatis: number;
    toplamAdet: number;
    satisSayisi: number;
  }[];
  satislar: Satis[];
}

export const getGunlukSatisRaporu = (tarih: Date): GunlukSatisRapor => {
  const satislar = getGunlukSatislar(tarih).filter(s => !s.iptalEdildi);
  const toplamSatis = satislar.reduce((sum, s) => sum + s.genelToplam, 0);
  const toplamAdet = satislar.reduce((sum, s) => 
    sum + s.kalemler.reduce((adet, k) => adet + k.adet, 0), 0);
  
  return {
    tarih: tarih.toISOString().split('T')[0],
    toplamSatis,
    toplamAdet,
    ortalamaSepet: satislar.length > 0 ? toplamSatis / satislar.length : 0,
    satislar
  };
};

export const getMusteriBorcRaporu = (): MusteriBorcRapor[] => {
  const musteriler = getMusteriler();
  const tumHareketler = getHareketler();
  
  // ✅ Her müşteri için borcu HesapHareketi'den güncel kurla hesapla
  const musteriListesi = musteriler.map(musteri => {
    const hareketler = tumHareketler.filter(h => h.musteriId === musteri.id);
    
    // Para birimi bazında borç hesaplama
    const paraBirimiBorc: Record<ParaBirimi, number> = {
      TRY: 0,
      USD: 0,
      EUR: 0
    };
    
    // Hareketleri kronolojik sırala ve hesapla
    hareketler
      .sort((a, b) => new Date(a.tarih).getTime() - new Date(b.tarih).getTime())
      .forEach(hareket => {
        if (hareket.islemTuru === 'satis') {
          paraBirimiBorc[hareket.paraBirimi] += hareket.tutar;
        } else if (hareket.islemTuru === 'odeme' || hareket.islemTuru === 'iade') {
          // Ödeme ve iade para biriminden düş
          paraBirimiBorc[hareket.paraBirimi] = Math.max(0, paraBirimiBorc[hareket.paraBirimi] - hareket.tutar);
        }
      });
    
    // Toplam borcu güncel kurla TL'ye çevir
    const borcTL = 
      paraBirimiBorc.TRY +
      (paraBirimiBorc.USD * getKur('USD')) +
      (paraBirimiBorc.EUR * getKur('EUR'));
    
    return {
      musteriId: musteri.id,
      musteriAdi: musteri.adSoyad,
      konum: musteri.konum,
      borcTL: Math.round(borcTL * 100) / 100, // Virgülden sonra 2 basamak
      paraBirimi: musteri.varsayilanParaBirimi,
      borcOrijinal: borcTL
    };
  });
  
  // Sadece borçlu müşterileri filtrele ve sırala
  return musteriListesi
    .filter(m => m.borcTL > 0)
    .sort((a, b) => b.borcTL - a.borcTL);
};

export const getStokDurumRaporu = (): StokDurumRapor[] => {
  const urunler = getUrunler();
  const kategoriler = [...new Set(urunler.map(u => u.kategori))];
  
  return kategoriler.map(kategori => {
    const kategoriUrunler = urunler.filter(u => u.kategori === kategori);
    const toplamStokDegeri = kategoriUrunler.reduce((sum, u) => {
      const alisFiyatiTL = paraBirimiTLyeCevir(
        u.alisFiyati,
        u.alisFiyatiParaBirimi
      );
      return sum + (u.stokMiktari * alisFiyatiTL);
    }, 0);
    const kritikStokUrunler = kategoriUrunler.filter(u => 
      u.stokMiktari <= u.kritikStokSeviyesi).length;
    
    return {
      kategori,
      toplamUrun: kategoriUrunler.length,
      toplamStokDegeri,
      kritikStokUrunler
    };
  });
};

export const getHaftalikSatisRaporu = (baslangicTarih: Date): HaftalikSatisRapor => {
  // Hafta başlangıcını Pazartesi'ye ayarla
  const gunIndex = baslangicTarih.getDay();
  const pazartesi = new Date(baslangicTarih);
  const fark = gunIndex === 0 ? -6 : 1 - gunIndex; // Pazar ise -6, diğerleri için 1-gunIndex
  pazartesi.setDate(pazartesi.getDate() + fark);
  
  const satislar = getHaftalikSatislar(pazartesi);
  const toplamSatis = satislar.reduce((sum, s) => sum + s.genelToplam, 0);
  const toplamAdet = satislar.reduce((sum, s) => 
    sum + s.kalemler.reduce((adet, k) => adet + k.adet, 0), 0);
  
  // Günlük detay
  const gunler = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
  const gunlukDetay = gunler.map((gun, index) => {
    const gunTarih = new Date(pazartesi);
    gunTarih.setDate(pazartesi.getDate() + index);
    const gunSatislar = satislar.filter(s => 
      formatLocalDate(new Date(s.tarih)) === formatLocalDate(gunTarih)
    );
    
    return {
      tarih: formatLocalDate(gunTarih),
      gun,
      toplamSatis: gunSatislar.reduce((sum, s) => sum + s.genelToplam, 0),
      toplamAdet: gunSatislar.reduce((sum, s) => 
        sum + s.kalemler.reduce((adet, k) => adet + k.adet, 0), 0),
      satisSayisi: gunSatislar.length
    };
  });
  
  const pazar = new Date(pazartesi);
  pazar.setDate(pazartesi.getDate() + 6);
  
  return {
    baslangicTarih: formatLocalDate(pazartesi),
    bitisTarih: formatLocalDate(pazar),
    toplamSatis,
    toplamAdet,
    ortalamaSepet: satislar.length > 0 ? toplamSatis / satislar.length : 0,
    gunlukDetay,
    satislar
  };
};

export const getKarZararAnalizi = (baslangic: Date, bitis: Date) => {
  const baslangicStr = formatLocalDate(baslangic);
  const bitisStr = formatLocalDate(bitis);
  
  const satislar = getSatislar().filter(s => {
    const satisTarih = formatLocalDate(new Date(s.tarih));
    return satisTarih >= baslangicStr && satisTarih <= bitisStr && s.durum === 'tamamlandi' && !s.iptalEdildi;
  });
  
  const toplamSatis = satislar.reduce((sum, s) => sum + s.genelToplam, 0);
  
  // Gerçek alış fiyatı ve para birimi ile maliyet hesaplama
  const tumUrunler = getUrunler();
  const toplamMaliyet = satislar.reduce((sum, s) => {
    const maliyet = s.kalemler.reduce((m, k) => {
      const urun = tumUrunler.find(u => u.id === k.urunId);
      if (!urun) return m;
      
      // Ürünün alış fiyatını TL'ye çevir
      const alisFiyatiTL = paraBirimiTLyeCevir(
        urun.alisFiyati,
        urun.alisFiyatiParaBirimi
      );
      
      return m + (alisFiyatiTL * k.adet);
    }, 0);
    return sum + maliyet;
  }, 0);
  
  // Tahsilat hesaplama - Güncel kurla
  const tumHareketler = getHareketler();
  const toplamTahsilat = tumHareketler
    .filter(h => {
      const hareketTarih = formatLocalDate(new Date(h.tarih));
      return (
        hareketTarih >= baslangicStr && 
        hareketTarih <= bitisStr && 
        h.islemTuru === 'odeme'
      );
    })
    .reduce((sum, h) => {
      const kur = getKur(h.paraBirimi);
      return sum + (h.tutar * kur);
    }, 0);
  
  return {
    toplamSatis,
    toplamMaliyet,
    toplamTahsilat,
    brutKar: toplamSatis - toplamMaliyet,
    karMarji: toplamSatis > 0 ? ((toplamSatis - toplamMaliyet) / toplamSatis) * 100 : 0
  };
};
