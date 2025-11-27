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
import { formatCurrency } from "@/lib/kur-hesaplama";
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
    if (!baslangicTarihi || !bitisTarihi) {
      return {
        baslangicBakiyesi: 0,
        buHaftaOdemeler: [],
        buHaftaSatislar: [],
        guncelBakiye: 0
      };
    }

    const baslangic = new Date(baslangicTarihi);
    const bitis = new Date(bitisTarihi);

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

    // Bu hafta yapılan satışları al
    const tumSatislar = getSatislar();
    const buHaftaSatislar = tumSatislar
      .filter(s => {
        const tarih = new Date(s.tarih);
        return s.musteriId === musteri.id && 
               s.durum === 'tamamlandi' &&
               tarih >= baslangic && 
               tarih <= bitis;
      })
      .map(s => ({
        tarih: s.tarih,
        satisNo: s.satisNo,
        tutar: s.genelToplam,
        kalemler: s.kalemler
      }));

    // Güncel bakiyeyi hesapla
    const toplamOdeme = buHaftaOdemeler.reduce((sum, o) => sum + o.tutar, 0);
    const toplamSatis = buHaftaSatislar.reduce((sum, s) => sum + s.tutar, 0);
    const guncelBakiye = baslangicBakiyesi - toplamOdeme + toplamSatis;

    return {
      baslangicBakiyesi,
      buHaftaOdemeler,
      buHaftaSatislar,
      guncelBakiye
    };
  }, [musteri.id, baslangicTarihi, bitisTarihi]);

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
      hesaplamalar.buHaftaSatislar,
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
                  +{formatCurrency(hesaplamalar.buHaftaSatislar.reduce((sum, s) => sum + s.tutar, 0), 'TRY')}
                </span>
              </div>
              {hesaplamalar.buHaftaSatislar.length > 0 && (
                <div className="text-xs text-muted-foreground pl-4">
                  {hesaplamalar.buHaftaSatislar.map((satis, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{new Date(satis.tarih).toLocaleDateString('tr-TR')} - {satis.satisNo}</span>
                      <span>+{formatCurrency(satis.tutar, 'TRY')}</span>
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
