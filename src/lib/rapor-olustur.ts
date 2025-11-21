import { getSatislar, getGunlukSatislar } from './satis-data';
import { getMusteriler, getHareketler } from './musteri-data';
import { getUrunler } from './stok-data';
import { Satis } from '@/types/satis';

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

export const getGunlukSatisRaporu = (tarih: Date): GunlukSatisRapor => {
  const satislar = getGunlukSatislar(tarih);
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
  
  return musteriler
    .filter(m => m.toplamBorcTL > 0)
    .map(m => ({
      musteriId: m.id,
      musteriAdi: m.adSoyad,
      konum: m.konum,
      borcTL: m.toplamBorcTL,
      paraBirimi: m.varsayilanParaBirimi,
      borcOrijinal: m.toplamBorcTL
    }))
    .sort((a, b) => b.borcTL - a.borcTL);
};

export const getStokDurumRaporu = (): StokDurumRapor[] => {
  const urunler = getUrunler();
  const kategoriler = [...new Set(urunler.map(u => u.kategori))];
  
  return kategoriler.map(kategori => {
    const kategoriUrunler = urunler.filter(u => u.kategori === kategori);
    const toplamStokDegeri = kategoriUrunler.reduce((sum, u) => 
      sum + (u.stokMiktari * u.alisFiyati), 0);
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

export const getKarZararAnalizi = (baslangic: Date, bitis: Date) => {
  const satislar = getSatislar().filter(s => {
    const satisTarih = new Date(s.tarih);
    return satisTarih >= baslangic && satisTarih <= bitis && s.durum === 'tamamlandi';
  });
  
  const toplamSatis = satislar.reduce((sum, s) => sum + s.genelToplam, 0);
  const toplamMaliyet = satislar.reduce((sum, s) => {
    const maliyet = s.kalemler.reduce((m, k) => {
      // Basitleştirilmiş maliyet hesabı, gerçekte ürünün alış fiyatı kullanılmalı
      return m + (k.birimFiyati * 0.7 * k.adet); // %30 kar marjı varsayımı
    }, 0);
    return sum + maliyet;
  }, 0);
  
  // Tahsilat hesaplama
  const tumHareketler = getHareketler();
  const toplamTahsilat = tumHareketler
    .filter(h => {
      const hareketTarih = new Date(h.tarih);
      return (
        hareketTarih >= baslangic && 
        hareketTarih <= bitis && 
        h.islemTuru === 'odeme'
      );
    })
    .reduce((sum, h) => sum + h.tlKarsiligi, 0);
  
  return {
    toplamSatis,
    toplamMaliyet,
    toplamTahsilat,
    brutKar: toplamSatis - toplamMaliyet,
    karMarji: toplamSatis > 0 ? ((toplamSatis - toplamMaliyet) / toplamSatis) * 100 : 0
  };
};
