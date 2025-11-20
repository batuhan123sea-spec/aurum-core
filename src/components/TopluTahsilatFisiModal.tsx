import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Calendar, Printer, Info } from "lucide-react";
import { toast } from "sonner";
import { getMusteriler, getHareketlerByMusteriId } from "@/lib/musteri-data";
import { getSatislar } from "@/lib/satis-data";
import { formatCurrency } from "@/lib/kur-hesaplama";
import { haftalikTahsilatFisiOlustur, fisYazdir } from "@/lib/fis-yazdir";

interface TopluTahsilatFisiModalProps {
  musteriIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getLastSaturday(): Date {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 6 ? 7 : day + 1;
  const lastSaturday = new Date(today);
  lastSaturday.setDate(today.getDate() - diff);
  lastSaturday.setHours(0, 0, 0, 0);
  return lastSaturday;
}

function getThisSaturday(): Date {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 6 ? 0 : 6 - day;
  const thisSaturday = new Date(today);
  thisSaturday.setDate(today.getDate() + diff);
  thisSaturday.setHours(23, 59, 59, 999);
  return thisSaturday;
}

export function TopluTahsilatFisiModal({ musteriIds, open, onOpenChange }: TopluTahsilatFisiModalProps) {
  const [baslangicTarihi, setBaslangicTarihi] = useState<string>('');
  const [bitisTarihi, setBitisTarihi] = useState<string>('');
  const [yazdiriliyor, setYazdiriliyor] = useState(false);
  const [yazdirilanSayisi, setYazdirilanSayisi] = useState(0);

  useEffect(() => {
    if (open) {
      const lastSat = getLastSaturday();
      const thisSat = getThisSaturday();
      setBaslangicTarihi(lastSat.toISOString().split('T')[0]);
      setBitisTarihi(thisSat.toISOString().split('T')[0]);
      setYazdirilanSayisi(0);
    }
  }, [open]);

  const musteriBilgileri = getMusteriler()
    .filter(m => musteriIds.includes(m.id))
    .map(musteri => {
      const hareketler = getHareketlerByMusteriId(musteri.id);
      const guncelBorc = hareketler.reduce((borc, h) => {
        if (h.islemTuru === 'satis') return borc + h.tlKarsiligi;
        if (h.islemTuru === 'odeme') return borc - h.tlKarsiligi;
        if (h.islemTuru === 'iade') return borc - h.tlKarsiligi;
        return borc;
      }, 0);
      
      return {
        id: musteri.id,
        kod: musteri.kod,
        adSoyad: musteri.adSoyad,
        telefon: musteri.telefon,
        guncelBorc
      };
    })
    .sort((a, b) => b.guncelBorc - a.guncelBorc);

  const handleCumartesileriAyarla = () => {
    const lastSat = getLastSaturday();
    const thisSat = getThisSaturday();
    setBaslangicTarihi(lastSat.toISOString().split('T')[0]);
    setBitisTarihi(thisSat.toISOString().split('T')[0]);
  };

  const handleTopluYazdir = async () => {
    if (!baslangicTarihi || !bitisTarihi) {
      toast.error("Lütfen tarih aralığını seçin");
      return;
    }

    setYazdiriliyor(true);
    setYazdirilanSayisi(0);

    const baslangic = new Date(baslangicTarihi);
    const bitis = new Date(bitisTarihi);

    for (let i = 0; i < musteriBilgileri.length; i++) {
      const musteriInfo = musteriBilgileri[i];
      
      try {
        const tumHareketler = getHareketlerByMusteriId(musteriInfo.id);
        
        let baslangicBakiyesi = 0;
        tumHareketler
          .filter(h => new Date(h.tarih) < baslangic)
          .forEach(h => {
            if (h.islemTuru === 'satis') baslangicBakiyesi += h.tlKarsiligi;
            else if (h.islemTuru === 'odeme') baslangicBakiyesi -= h.tlKarsiligi;
            else if (h.islemTuru === 'iade') baslangicBakiyesi -= h.tlKarsiligi;
          });

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
            tutar: h.tlKarsiligi
          }));

        const tumSatislar = getSatislar();
        const buHaftaSatislar = tumSatislar
          .filter(s => {
            const tarih = new Date(s.tarih);
            return s.musteriId === musteriInfo.id && 
                   s.durum === 'tamamlandi' &&
                   tarih >= baslangic && 
                   tarih <= bitis;
          })
          .map(s => ({
            tarih: s.tarih,
            satisNo: s.satisNo,
            tutar: s.genelToplam
          }));

        const toplamOdeme = buHaftaOdemeler.reduce((sum, o) => sum + o.tutar, 0);
        const toplamSatis = buHaftaSatislar.reduce((sum, s) => sum + s.tutar, 0);
        const guncelBakiye = baslangicBakiyesi - toplamOdeme + toplamSatis;

        const fisIcerigi = haftalikTahsilatFisiOlustur(
          {
            adSoyad: musteriInfo.adSoyad,
            kod: musteriInfo.kod,
            telefon: musteriInfo.telefon
          },
          baslangicTarihi,
          bitisTarihi,
          baslangicBakiyesi,
          buHaftaOdemeler,
          buHaftaSatislar,
          guncelBakiye
        );

        fisYazdir(fisIcerigi);
        
        setYazdirilanSayisi(i + 1);
        
        await new Promise(resolve => setTimeout(resolve, 800));
        
      } catch (error) {
        console.error(`Fiş yazdırma hatası (${musteriInfo.adSoyad}):`, error);
        toast.error(`${musteriInfo.adSoyad} için fiş yazdırılamadı`);
      }
    }

    setYazdiriliyor(false);
    toast.success(`${musteriBilgileri.length} müşteri için fiş yazdırıldı`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Toplu Haftalık Tahsilat Fişi Yazdır</DialogTitle>
        </DialogHeader>

        <Alert>
          <Info className="w-4 h-4" />
          <AlertDescription>
            <strong>{musteriIds.length} müşteri</strong> için haftalık tahsilat fişi yazdırılacak.
            Her müşteri için ayrı fiş oluşturulacaktır.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="baslangic">Başlangıç Tarihi</Label>
              <Input
                id="baslangic"
                type="date"
                value={baslangicTarihi}
                onChange={(e) => setBaslangicTarihi(e.target.value)}
                disabled={yazdiriliyor}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bitis">Bitiş Tarihi</Label>
              <Input
                id="bitis"
                type="date"
                value={bitisTarihi}
                onChange={(e) => setBitisTarihi(e.target.value)}
                disabled={yazdiriliyor}
              />
            </div>
          </div>

          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={handleCumartesileriAyarla}
            disabled={yazdiriliyor}
            className="w-full"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Geçen Cumartesi - Bu Cumartesi
          </Button>

          <Separator />

          <div className="space-y-2">
            <Label>Seçili Müşteriler ({musteriBilgileri.length})</Label>
            <ScrollArea className="h-[200px] rounded-md border p-4">
              <div className="space-y-2">
                {musteriBilgileri.map((musteri, index) => (
                  <div 
                    key={musteri.id} 
                    className={`flex items-center justify-between p-2 rounded ${
                      yazdiriliyor && index < yazdirilanSayisi 
                        ? 'bg-green-100 dark:bg-green-900/20' 
                        : 'bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {yazdiriliyor && index < yazdirilanSayisi && (
                        <span className="text-green-600">✓</span>
                      )}
                      {yazdiriliyor && index === yazdirilanSayisi && (
                        <span className="animate-pulse">🖨️</span>
                      )}
                      <span className="font-mono text-sm text-muted-foreground">
                        {musteri.kod}
                      </span>
                      <span className="font-medium">{musteri.adSoyad}</span>
                    </div>
                    <span className={`text-sm font-semibold ${
                      musteri.guncelBorc > 0 ? 'text-destructive' : 'text-green-600'
                    }`}>
                      {formatCurrency(musteri.guncelBorc, 'TRY')}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {yazdiriliyor && (
            <div className="space-y-2">
              <Progress value={(yazdirilanSayisi / musteriBilgileri.length) * 100} />
              <p className="text-sm text-muted-foreground text-center">
                {yazdirilanSayisi} / {musteriBilgileri.length} müşteri yazdırıldı
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={yazdiriliyor}
          >
            {yazdiriliyor ? 'Bekleyin...' : 'İptal'}
          </Button>
          <Button 
            type="button" 
            onClick={handleTopluYazdir}
            disabled={yazdiriliyor || !baslangicTarihi || !bitisTarihi}
          >
            <Printer className="w-4 h-4 mr-2" />
            {yazdiriliyor ? 'Yazdırılıyor...' : `Toplu Yazdır (${musteriBilgileri.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
