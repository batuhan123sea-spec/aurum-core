import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, FileDown, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Musteri } from "@/types/musteri";
import { detayliEkstreExcelOlustur } from "@/lib/excel-export";
import { getHareketlerByMusteriId } from "@/lib/musteri-data";
import { formatCurrency, getKur } from "@/lib/kur-hesaplama";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface DetayliEkstreModalProps {
  musteri: Musteri;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DetayliEkstreModal({ musteri, open, onOpenChange }: DetayliEkstreModalProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Tarih state'leri
  const [baslangicTarihi, setBaslangicTarihi] = useState<Date>(() => {
    const date = new Date();
    date.setDate(1); // Ayın ilk günü
    return date;
  });
  
  const [bitisTarihi, setBitisTarihi] = useState<Date>(new Date());

  // Hızlı seçim fonksiyonları
  const handleBuAy = () => {
    const bugun = new Date();
    const ayin1i = new Date(bugun.getFullYear(), bugun.getMonth(), 1);
    setBaslangicTarihi(ayin1i);
    setBitisTarihi(bugun);
  };

  const handleSon3Ay = () => {
    const bugun = new Date();
    const ucAyOnce = new Date(bugun.getFullYear(), bugun.getMonth() - 3, bugun.getDate());
    setBaslangicTarihi(ucAyOnce);
    setBitisTarihi(bugun);
  };

  const handleBuYil = () => {
    const bugun = new Date();
    const yilBasi = new Date(bugun.getFullYear(), 0, 1);
    setBaslangicTarihi(yilBasi);
    setBitisTarihi(bugun);
  };

  const handleTumZamanlar = () => {
    // En eski işlem tarihini bul
    const hareketler = getHareketlerByMusteriId(musteri.id);
    if (hareketler.length > 0) {
      const enEski = hareketler.reduce((oldest, h) => {
        const hTarih = new Date(h.tarih);
        return hTarih < oldest ? hTarih : oldest;
      }, new Date(hareketler[0].tarih));
      setBaslangicTarihi(enEski);
    } else {
      setBaslangicTarihi(new Date(musteri.olusturmaTarihi));
    }
    setBitisTarihi(new Date());
  };

  // Önizleme verileri
  const onizlemeVerileri = useMemo(() => {
    const hareketler = getHareketlerByMusteriId(musteri.id);
    
    const donemOncesiHareketler = hareketler.filter(h => 
      new Date(h.tarih) < baslangicTarihi
    );
    
    const donemIciHareketler = hareketler.filter(h => {
      const tarih = new Date(h.tarih);
      return tarih >= baslangicTarihi && tarih <= bitisTarihi;
    });

    // Dönem başı bakiye
    let donemBasiBakiye = 0;
    donemOncesiHareketler.forEach(h => {
      const tlKarsiligi = h.tutar * getKur(h.paraBirimi);
      if (h.islemTuru === 'satis') {
        donemBasiBakiye += tlKarsiligi;
      } else {
        donemBasiBakiye -= tlKarsiligi;
      }
    });

    // Dönem içi toplamlar
    let toplamSatislar = 0;
    let toplamOdemeler = 0;
    let toplamIadeler = 0;

    donemIciHareketler.forEach(h => {
      const tlKarsiligi = h.tutar * getKur(h.paraBirimi);
      if (h.islemTuru === 'satis') {
        toplamSatislar += tlKarsiligi;
      } else if (h.islemTuru === 'odeme') {
        toplamOdemeler += tlKarsiligi;
      } else if (h.islemTuru === 'iade') {
        toplamIadeler += tlKarsiligi;
      }
    });

    const donemSonuBakiye = donemBasiBakiye + toplamSatislar - toplamOdemeler - toplamIadeler;

    return {
      islemSayisi: donemIciHareketler.length,
      satisSayisi: donemIciHareketler.filter(h => h.islemTuru === 'satis').length,
      odemeSayisi: donemIciHareketler.filter(h => h.islemTuru === 'odeme').length,
      iadeSayisi: donemIciHareketler.filter(h => h.islemTuru === 'iade').length,
      donemBasiBakiye,
      toplamSatislar,
      toplamOdemeler,
      toplamIadeler,
      donemSonuBakiye
    };
  }, [musteri.id, baslangicTarihi, bitisTarihi]);

  const handleExcelIndir = () => {
    try {
      setIsGenerating(true);
      detayliEkstreExcelOlustur(musteri, baslangicTarihi, bitisTarihi);
      toast({
        title: "Başarılı",
        description: "Detaylı ekstre Excel olarak indirildi.",
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Excel oluşturma hatası:', error);
      toast({
        title: "Hata",
        description: "Excel oluşturulurken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Detaylı Hesap Ekstresi - {musteri.adSoyad}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tarih Seçimi */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Başlangıç Tarihi</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !baslangicTarihi && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {baslangicTarihi ? (
                      format(baslangicTarihi, "d MMMM yyyy", { locale: tr })
                    ) : (
                      <span>Tarih seçin</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={baslangicTarihi}
                    onSelect={(date) => date && setBaslangicTarihi(date)}
                    locale={tr}
                    disabled={(date) => date > bitisTarihi}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Bitiş Tarihi</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !bitisTarihi && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {bitisTarihi ? (
                      format(bitisTarihi, "d MMMM yyyy", { locale: tr })
                    ) : (
                      <span>Tarih seçin</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={bitisTarihi}
                    onSelect={(date) => date && setBitisTarihi(date)}
                    locale={tr}
                    disabled={(date) => date < baslangicTarihi || date > new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Hızlı Seçim Butonları */}
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleBuAy}>
              Bu Ay
            </Button>
            <Button variant="outline" size="sm" onClick={handleSon3Ay}>
              Son 3 Ay
            </Button>
            <Button variant="outline" size="sm" onClick={handleBuYil}>
              Bu Yıl
            </Button>
            <Button variant="outline" size="sm" onClick={handleTumZamanlar}>
              Tüm Zamanlar
            </Button>
          </div>

          {/* Önizleme Özeti */}
          <div className="border rounded-lg p-4 bg-muted/50 space-y-3">
            <h3 className="font-semibold text-sm">Ekstre Özeti</h3>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Toplam İşlem</p>
                <p className="font-semibold">{onizlemeVerileri.islemSayisi} işlem</p>
              </div>
              <div>
                <p className="text-muted-foreground">Satış / Ödeme / İade</p>
                <p className="font-semibold">
                  {onizlemeVerileri.satisSayisi} / {onizlemeVerileri.odemeSayisi} / {onizlemeVerileri.iadeSayisi}
                </p>
              </div>
            </div>

            <div className="border-t pt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dönem Başı Bakiye:</span>
                <span className="font-medium">{formatCurrency(onizlemeVerileri.donemBasiBakiye, 'TRY')}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Toplam Satışlar:</span>
                <span className="font-medium">+{formatCurrency(onizlemeVerileri.toplamSatislar, 'TRY')}</span>
              </div>
              <div className="flex justify-between text-blue-600">
                <span>Toplam Tahsilatlar:</span>
                <span className="font-medium">-{formatCurrency(onizlemeVerileri.toplamOdemeler, 'TRY')}</span>
              </div>
              {onizlemeVerileri.toplamIadeler > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Toplam İadeler:</span>
                  <span className="font-medium">-{formatCurrency(onizlemeVerileri.toplamIadeler, 'TRY')}</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between font-bold text-base">
                <span>Dönem Sonu Bakiye:</span>
                <span className={onizlemeVerileri.donemSonuBakiye > 0 ? "text-red-600" : "text-green-600"}>
                  {formatCurrency(onizlemeVerileri.donemSonuBakiye, 'TRY')}
                </span>
              </div>
            </div>
          </div>

          {/* Butonlar */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button 
              onClick={handleExcelIndir} 
              disabled={isGenerating || onizlemeVerileri.islemSayisi === 0}
              className="gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Oluşturuluyor...
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  Excel İndir
                </>
              )}
            </Button>
          </div>

          {onizlemeVerileri.islemSayisi === 0 && (
            <p className="text-sm text-muted-foreground text-center">
              Seçilen tarih aralığında işlem bulunamadı.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
