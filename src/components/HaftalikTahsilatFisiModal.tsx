import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Printer, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Musteri } from "@/types/musteri";
import { formatCurrency, getKur } from "@/lib/kur-hesaplama";
import { formatLocalDate } from "@/lib/utils";
import { getSatislar } from "@/lib/satis-data";
import { getHareketlerByMusteriId } from "@/lib/musteri-data";
import { haftalikTahsilatFisiOlustur, fisYazdir } from "@/lib/fis-yazdir";

interface HaftalikTahsilatFisiModalProps {
  musteri: Musteri;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getLastSaturday(): Date {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 6 ? 7 : day + 1; // Geçen cumartesi
  const lastSaturday = new Date(today);
  lastSaturday.setDate(today.getDate() - diff);
  lastSaturday.setHours(0, 0, 0, 0);
  return lastSaturday;
}

function getThisSaturday(): Date {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 6 ? 0 : 6 - day; // Bu cumartesi
  const thisSaturday = new Date(today);
  thisSaturday.setDate(today.getDate() + diff);
  thisSaturday.setHours(23, 59, 59, 999);
  return thisSaturday;
}

export function HaftalikTahsilatFisiModal({ musteri, open, onOpenChange }: HaftalikTahsilatFisiModalProps) {
  const [baslangicTarihi, setBaslangicTarihi] = useState<string>('');
  const [bitisTarihi, setBitisTarihi] = useState<string>('');

  useEffect(() => {
    if (open) {
      const lastSat = getLastSaturday();
      const thisSat = getThisSaturday();
      setBaslangicTarihi(formatLocalDate(lastSat));
      setBitisTarihi(formatLocalDate(thisSat));
    }
  }, [open]);

  const hesaplamalar = useMemo(() => {
    if (!open || !baslangicTarihi || !bitisTarihi) {
      return {
        baslangicBakiyesi: 0,
        buHaftaOdemeler: [] as Array<{ tarih: string; aciklama: string; tutar: number; odemeTuru?: string }>,
        buHaftaSatisDetaylari: [] as Array<{ tarih: string; satisNo: string; tutar: number; paraBirimi: string; orijinalTutar: number; kalemler: any[] }>,
        buHaftaIadeDetaylari: [] as Array<{ tarih: string; aciklama: string; tutar: number; paraBirimi: string; orijinalTutar: number }>,
        guncelBakiye: 0,
        satisToplamGuncel: 0,
        iadeToplamGuncel: 0
      };
    }

    const baslangic = new Date(baslangicTarihi);
    baslangic.setHours(0, 0, 0, 0); // Günün başı
    
    const bitis = new Date(bitisTarihi);
    bitis.setHours(23, 59, 59, 999); // Günün sonu

    // Tüm hareketleri al
    const tumHareketler = getHareketlerByMusteriId(musteri.id);

    // Başlangıç bakiyesini hesapla (seçilen tarih aralığından önce)
    let baslangicBakiyesi = 0;
    tumHareketler
      .filter(h => new Date(h.tarih) < baslangic)
      .forEach(h => {
        if (h.islemTuru === 'satis') baslangicBakiyesi += h.tlKarsiligi;
        else if (h.islemTuru === 'odeme') baslangicBakiyesi -= h.tlKarsiligi;
        else if (h.islemTuru === 'iade') baslangicBakiyesi -= h.tlKarsiligi;
      });

    // Bu hafta yapılan ödemeleri al
    const buHaftaOdemeler = tumHareketler
      .filter(h => {
        const tarih = new Date(h.tarih);
        return h.islemTuru === 'odeme' && tarih >= baslangic && tarih <= bitis;
      })
      .map(h => ({
        tarih: h.tarih,
        aciklama: h.odemeTuru === 'nakit' ? 'Nakit' :
                  h.odemeTuru === 'kredi-karti' ? 'K.Kartı' :
                  h.odemeTuru === 'eft' ? 'EFT' : 'Havale',
        tutar: h.tlKarsiligi,
        odemeTuru: h.odemeTuru
      }));

    // ✅ GÜNCEL KUR İLE HESAPLAMA: HesapHareketi'nden satış ve iade toplamlarını al
    // Bu hafta yapılan satış hareketlerini al (islemTuru='satis')
    const buHaftaSatisHareketleri = tumHareketler
      .filter(h => {
        const tarih = new Date(h.tarih);
        return h.musteriId === musteri.id && 
               h.islemTuru === 'satis' &&
               tarih >= baslangic && 
               tarih <= bitis;
      });
    
    const satisToplamByHareket = buHaftaSatisHareketleri
      .reduce((sum, h) => sum + (h.tutar * getKur(h.paraBirimi)), 0);

    // İade hareketlerini al
    const buHaftaIadeHareketleri = tumHareketler
      .filter(h => {
        const tarih = new Date(h.tarih);
        return h.musteriId === musteri.id && 
               h.islemTuru === 'iade' &&
               tarih >= baslangic && 
               tarih <= bitis;
      });

    const iadeToplamByHareket = buHaftaIadeHareketleri
      .reduce((sum, h) => sum + (h.tutar * getKur(h.paraBirimi)), 0);

    // ✅ Fiş için satış detaylarını HesapHareketi'nden hesapla (defterdeki gibi)
    const tumSatislar = getSatislar();
    const buHaftaSatisDetaylari = buHaftaSatisHareketleri.map(h => {
      // Satış numarasını açıklamadan çıkar
      const satisNoMatch = h.aciklama.match(/(SATS-\d+|REZ-\d+)/);
      const satisNo = satisNoMatch ? satisNoMatch[1] : 'SATIS';
      
      // Güncel kur ile TL tutarını hesapla (defterdeki gibi)
      const tutarTL = h.tutar * getKur(h.paraBirimi);
      
      // Ürün detayları için Satis kaydına bak
      const satis = tumSatislar.find(s => h.aciklama.includes(s.satisNo));
      
      // ✅ Gerçek fiyatları hesapla (indirim + KDV dahil)
      const gercekFiyatliKalemler = satis?.kalemler.map(kalem => {
        // Sadece bu para birimindeki kalemleri al
        if (kalem.paraBirimi !== h.paraBirimi) return null;
        
        let gercekBirimFiyat = kalem.orijinalBirimFiyati;
        
        // İndirim uygula
        if (kalem.indirimYuzde > 0) {
          gercekBirimFiyat = gercekBirimFiyat * (1 - kalem.indirimYuzde / 100);
        } else if (kalem.indirimTL > 0) {
          const indirimOrani = kalem.indirimTL / (kalem.birimFiyati * kalem.adet);
          gercekBirimFiyat = gercekBirimFiyat * (1 - indirimOrani);
        }
        
        // KDV dahil satışsa KDV'yi ekle
        if (satis.kdvDahil) {
          gercekBirimFiyat = gercekBirimFiyat * (1 + kalem.kdvOrani / 100);
        }
        
        return {
          urunAdi: kalem.urunAdi,
          adet: kalem.adet,
          orijinalBirimFiyati: gercekBirimFiyat, // ✅ Gerçek fiyat
          paraBirimi: kalem.paraBirimi,
          toplamTutar: gercekBirimFiyat * kalem.adet
        };
      }).filter(Boolean) || [];
      
      return {
        tarih: h.tarih,
        satisNo,
        tutar: tutarTL, // ✅ HesapHareketi'nden
        paraBirimi: h.paraBirimi,
        orijinalTutar: h.tutar,
        kalemler: gercekFiyatliKalemler // ✅ Gerçek fiyatlarla
      };
    });

    // ✅ İade detaylarını HesapHareketi'nden hesapla
    const buHaftaIadeDetaylari = buHaftaIadeHareketleri.map(h => {
      const tutarTL = h.tutar * getKur(h.paraBirimi);
      
      return {
        tarih: h.tarih,
        aciklama: h.aciklama,
        tutar: tutarTL,
        paraBirimi: h.paraBirimi,
        orijinalTutar: h.tutar
      };
    });

    // Güncel bakiyeyi hesapla - HesapHareketi'nden gelen güncel kur ile hesaplanmış tutarları kullan
    const toplamOdeme = buHaftaOdemeler.reduce((sum, o) => sum + o.tutar, 0);
    const netSatis = satisToplamByHareket - iadeToplamByHareket;
    const guncelBakiye = baslangicBakiyesi - toplamOdeme + netSatis;

    return {
      baslangicBakiyesi,
      buHaftaOdemeler,
      buHaftaSatisDetaylari,
      buHaftaIadeDetaylari,
      guncelBakiye,
      satisToplamGuncel: satisToplamByHareket,
      iadeToplamGuncel: iadeToplamByHareket
    };
  }, [musteri.id, baslangicTarihi, bitisTarihi, open]);

  const handleFisYazdir = () => {
    if (!baslangicTarihi || !bitisTarihi) {
      toast.error("Lütfen tarih aralığını seçin");
      return;
    }

    const fisIcerigi = haftalikTahsilatFisiOlustur(
      {
        adSoyad: musteri.adSoyad,
        kod: musteri.kod,
        telefon: musteri.telefon
      },
      baslangicTarihi,
      bitisTarihi,
      hesaplamalar.baslangicBakiyesi,
      hesaplamalar.buHaftaOdemeler,
      hesaplamalar.buHaftaSatisDetaylari,
      hesaplamalar.buHaftaIadeDetaylari,
      hesaplamalar.guncelBakiye
    );

    fisYazdir(fisIcerigi);
    toast.success("Haftalık tahsilat fişi yazdırılıyor");
    onOpenChange(false);
  };

  const handleCumartesileriAyarla = () => {
    const lastSat = getLastSaturday();
    const thisSat = getThisSaturday();
    setBaslangicTarihi(formatLocalDate(lastSat));
    setBitisTarihi(formatLocalDate(thisSat));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Haftalık Tahsilat Fişi - {musteri.adSoyad}</DialogTitle>
        </DialogHeader>

        <Alert>
          <AlertDescription className="text-sm">
            Bu fiş tahsilatçı için hazırlanır. Ödeme sisteme <strong>kaydedilmez</strong>.
            Tahsilat sonrası "Ödeme Al" ile kaydedebilirsiniz.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          {/* Tarih Aralığı */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="baslangic">Başlangıç Tarihi</Label>
              <Input
                id="baslangic"
                type="date"
                value={baslangicTarihi}
                onChange={(e) => setBaslangicTarihi(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bitis">Bitiş Tarihi</Label>
              <Input
                id="bitis"
                type="date"
                value={bitisTarihi}
                onChange={(e) => setBitisTarihi(e.target.value)}
              />
            </div>
          </div>

          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={handleCumartesileriAyarla}
            className="w-full"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Geçen Cumartesi - Bu Cumartesi
          </Button>

          <Separator />

          {/* Özet Bilgiler */}
          <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Geçen Haftadan Kalan:</span>
              <span className="font-semibold text-lg">
                {formatCurrency(hesaplamalar.baslangicBakiyesi, 'TRY')}
              </span>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Bu Hafta Ödemeler:</span>
                <span className="text-green-600 font-semibold">
                  -{formatCurrency(hesaplamalar.buHaftaOdemeler.reduce((sum, o) => sum + o.tutar, 0), 'TRY')}
                </span>
              </div>
              {hesaplamalar.buHaftaOdemeler.length > 0 && (
                <div className="text-xs text-muted-foreground pl-4">
                  {hesaplamalar.buHaftaOdemeler.map((odeme, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{new Date(odeme.tarih).toLocaleDateString('tr-TR')} - {odeme.aciklama}</span>
                      <span>-{formatCurrency(odeme.tutar, 'TRY')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Bu Hafta Satışlar:</span>
                <span className="text-destructive font-semibold">
                  +{formatCurrency(hesaplamalar.satisToplamGuncel - hesaplamalar.iadeToplamGuncel, 'TRY')}
                </span>
              </div>
              {hesaplamalar.buHaftaSatisDetaylari.length > 0 && (
                <div className="text-xs text-muted-foreground pl-4">
                  {hesaplamalar.buHaftaSatisDetaylari.map((satis, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{new Date(satis.tarih).toLocaleDateString('tr-TR')} - {satis.satisNo}</span>
                      <span>+{formatCurrency(satis.tutar, 'TRY')}</span>
                    </div>
                  ))}
                </div>
              )}
              {hesaplamalar.buHaftaIadeDetaylari.length > 0 && (
                <div className="text-xs text-muted-foreground pl-4">
                  {hesaplamalar.buHaftaIadeDetaylari.map((iade, idx) => (
                    <div key={idx} className="flex justify-between text-blue-600">
                      <span>{new Date(iade.tarih).toLocaleDateString('tr-TR')} - İade</span>
                      <span>-{formatCurrency(iade.tutar, 'TRY')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            <div className="flex justify-between items-center">
              <span className="font-bold text-base">Güncel Bakiye:</span>
              <span className={`font-bold text-xl ${hesaplamalar.guncelBakiye > 0 ? 'text-destructive' : 'text-green-600'}`}>
                {formatCurrency(hesaplamalar.guncelBakiye, 'TRY')}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          <Button type="button" onClick={handleFisYazdir}>
            <Printer className="w-4 h-4 mr-2" />
            Fiş Yazdır
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
