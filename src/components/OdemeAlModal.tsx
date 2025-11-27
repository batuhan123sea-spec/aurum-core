import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { Musteri, HesapHareketi, ParaBirimi, OdemeTuru } from "@/types/musteri";
import { getKur, formatCurrency, paraBirimiTLyeCevir } from "@/lib/kur-hesaplama";
import { odemeIsle, musteriBalanceGuncelle, getMusteriById } from "@/lib/musteri-data";
import { tahsilatFisiOlustur, fisYazdir } from "@/lib/fis-yazdir";
import { Printer } from "lucide-react";

interface OdemeAlModalProps {
  musteri: Musteri | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const OdemeAlModal = ({ musteri, open, onOpenChange, onSuccess }: OdemeAlModalProps) => {
  const [formData, setFormData] = useState({
    odemeTarihi: new Date().toISOString().slice(0, 16),
    odemeTutari: "",
    odemeParaBirimi: "TRY" as ParaBirimi,
    odemeTuru: "nakit" as OdemeTuru,
    aciklama: "",
  });

  const [anlikKur, setAnlikKur] = useState(1);
  const [tlKarsiligi, setTlKarsiligi] = useState(0);

  useEffect(() => {
    if (open && musteri) {
      setFormData({
        odemeTarihi: new Date().toISOString().slice(0, 16),
        odemeTutari: "",
        odemeParaBirimi: musteri.varsayilanParaBirimi,
        odemeTuru: "nakit",
        aciklama: "",
      });
    }
  }, [open, musteri]);

  useEffect(() => {
    const kur = getKur(formData.odemeParaBirimi);
    setAnlikKur(kur);
    
    const tutar = parseFloat(formData.odemeTutari) || 0;
    const tlTutar = paraBirimiTLyeCevir(tutar, formData.odemeParaBirimi, kur);
    setTlKarsiligi(tlTutar);
  }, [formData.odemeTutari, formData.odemeParaBirimi]);

  const yeniBakiye = musteri ? musteri.toplamBorcTL - tlKarsiligi : 0;

  const handleKaydet = (yazdır: boolean = false) => {
    if (!musteri) return;

    const tutar = parseFloat(formData.odemeTutari);
    if (!tutar || tutar <= 0) {
      toast({
        title: "Hata",
        description: "Geçerli bir ödeme tutarı giriniz.",
        variant: "destructive",
      });
      return;
    }

    if (tlKarsiligi > musteri.toplamBorcTL) {
      toast({
        title: "❌ Fazla Ödeme",
        description: `Ödeme tutarı (${formatCurrency(tlKarsiligi, 'TRY')}) mevcut borçtan (${formatCurrency(musteri.toplamBorcTL, 'TRY')}) fazla! Lütfen tutarı azaltın.`,
        variant: "destructive",
      });
      return;
    }

    const oncekiBorc = musteri.toplamBorcTL;

    // 🆕 DEBUG LOG - Ödeme öncesi
    console.log('💳 Ödeme başlatılıyor:', {
      musteriId: musteri.id,
      musteriAdi: musteri.adSoyad,
      tutar,
      paraBirimi: formData.odemeParaBirimi,
      oncekiBorc,
      musteriBorclar: {
        USD: musteri.borclar.USD,
        EUR: musteri.borclar.EUR,
        TRY: musteri.borclar.TRY
      }
    });

    // Yeni ödeme işleme fonksiyonunu kullan
    const sonuc = odemeIsle(
      musteri.id,
      tutar,
      formData.odemeParaBirimi,
      formData.odemeTarihi,
      formData.odemeTuru,
      formData.aciklama || 'Ödeme alındı'
    );

    // 🆕 DEBUG LOG - Ödeme sonrası
    console.log('💳 Ödeme sonucu:', {
      success: sonuc.success,
      message: sonuc.message,
      hareketSayisi: sonuc.hareketler?.length
    });

    if (!sonuc.success) {
      toast({
        title: "Hata",
        description: sonuc.message,
        variant: "destructive",
      });
      return;
    }

    musteriBalanceGuncelle(musteri.id);

    if (yazdır) {
      const guncelMusteri = getMusteriById(musteri.id);
      if (guncelMusteri && sonuc.hareketler.length > 0) {
        const fisIcerigi = tahsilatFisiOlustur(guncelMusteri, sonuc.hareketler[0], oncekiBorc);
        fisYazdir(fisIcerigi);
      }
    }

    toast({
      title: "✅ Başarılı",
      description: "Ödeme kaydedildi",
    });

    onSuccess();
    onOpenChange(false);
  };

  const handleFisOnizleme = () => {
    if (!musteri) return;
    
    const tutar = parseFloat(formData.odemeTutari);
    if (!tutar || tutar <= 0) {
      toast({
        title: "Hata",
        description: "Geçerli bir ödeme tutarı giriniz.",
        variant: "destructive",
      });
      return;
    }
    
    const tempHareket: HesapHareketi = {
      id: 'preview',
      musteriId: musteri.id,
      tarih: new Date(formData.odemeTarihi).toISOString(),
      islemTuru: 'odeme',
      aciklama: formData.aciklama || 'Ödeme alındı',
      paraBirimi: formData.odemeParaBirimi,
      tutar,
      kur: anlikKur,
      tlKarsiligi,
      bakiye: yeniBakiye,
      odemeTuru: formData.odemeTuru,
    };
    
    const fisIcerigi = tahsilatFisiOlustur(musteri, tempHareket, musteri.toplamBorcTL);
    fisYazdir(fisIcerigi);
  };

  if (!musteri) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-xl">💰 Ödeme Al - {musteri.adSoyad}</DialogTitle>
          
          <div className="space-y-1">
            {/* Toplam Borç */}
            <div className="flex items-center justify-between px-2 py-1.5 bg-destructive/5 rounded border border-destructive/20">
              <span className="text-xs text-muted-foreground">Toplam Borç:</span>
              <span className="text-sm font-semibold text-destructive">
                {formatCurrency(musteri.toplamBorcTL, 'TRY')}
              </span>
            </div>
            
            {/* Döviz Detayları - Sadece 0'dan farklı olanlar */}
            {(musteri.borclar.USD !== 0 || musteri.borclar.EUR !== 0 || musteri.borclar.TRY !== 0) && (
              <div className="flex gap-3 justify-end text-[10px] text-muted-foreground/70 px-1 font-mono">
                {musteri.borclar.USD !== 0 && (
                  <span>$ {musteri.borclar.USD.toFixed(2)}</span>
                )}
                {musteri.borclar.EUR !== 0 && (
                  <span>€ {musteri.borclar.EUR.toFixed(2)}</span>
                )}
                {musteri.borclar.TRY !== 0 && (
                  <span>₺ {musteri.borclar.TRY.toFixed(2)}</span>
                )}
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="odemeTarihi" className="text-xs">Ödeme Tarihi</Label>
              <Input
                id="odemeTarihi"
                type="datetime-local"
                value={formData.odemeTarihi}
                onChange={(e) => setFormData({ ...formData, odemeTarihi: e.target.value })}
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="odemeTutari" className="text-xs">Ödeme Tutarı</Label>
              <Input
                id="odemeTutari"
                type="number"
                step="0.01"
                value={formData.odemeTutari}
                onChange={(e) => setFormData({ ...formData, odemeTutari: e.target.value })}
                placeholder="0.00"
                className="h-9 text-lg font-semibold"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Para Birimi</Label>
            <RadioGroup
              value={formData.odemeParaBirimi}
              onValueChange={(value) => setFormData({ ...formData, odemeParaBirimi: value as ParaBirimi })}
              className="flex gap-2"
            >
              <div className="flex items-center space-x-1.5 flex-1 p-2 border rounded-lg cursor-pointer hover:bg-accent" onClick={() => setFormData({ ...formData, odemeParaBirimi: 'TRY' })}>
                <RadioGroupItem value="TRY" id="pay-try" />
                <Label htmlFor="pay-try" className="font-normal cursor-pointer text-sm">₺ TRY</Label>
              </div>
              <div className="flex items-center space-x-1.5 flex-1 p-2 border rounded-lg cursor-pointer hover:bg-accent" onClick={() => setFormData({ ...formData, odemeParaBirimi: 'USD' })}>
                <RadioGroupItem value="USD" id="pay-usd" />
                <Label htmlFor="pay-usd" className="font-normal cursor-pointer text-sm">$ USD</Label>
              </div>
              <div className="flex items-center space-x-1.5 flex-1 p-2 border rounded-lg cursor-pointer hover:bg-accent" onClick={() => setFormData({ ...formData, odemeParaBirimi: 'EUR' })}>
                <RadioGroupItem value="EUR" id="pay-eur" />
                <Label htmlFor="pay-eur" className="font-normal cursor-pointer text-sm">€ EUR</Label>
              </div>
            </RadioGroup>
          </div>

          {formData.odemeParaBirimi !== 'TRY' && (
            <div className="p-2.5 bg-muted/50 rounded-lg border">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Kur:</span>
                  <span className="font-semibold">{anlikKur.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">TL:</span>
                  <span className="font-semibold">{formatCurrency(tlKarsiligi, 'TRY')}</span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Ödeme Yöntemi</Label>
            <RadioGroup
              value={formData.odemeTuru}
              onValueChange={(value) => setFormData({ ...formData, odemeTuru: value as OdemeTuru })}
              className="grid grid-cols-2 gap-2"
            >
              <div className="flex items-center space-x-1.5 p-2 border rounded-lg cursor-pointer hover:bg-accent" onClick={() => setFormData({ ...formData, odemeTuru: 'nakit' })}>
                <RadioGroupItem value="nakit" id="nakit" />
                <Label htmlFor="nakit" className="font-normal cursor-pointer text-sm">💵 Nakit</Label>
              </div>
              <div className="flex items-center space-x-1.5 p-2 border rounded-lg cursor-pointer hover:bg-accent" onClick={() => setFormData({ ...formData, odemeTuru: 'kredi-karti' })}>
                <RadioGroupItem value="kredi-karti" id="kredi-karti" />
                <Label htmlFor="kredi-karti" className="font-normal cursor-pointer text-sm">💳 Kart</Label>
              </div>
              <div className="flex items-center space-x-1.5 p-2 border rounded-lg cursor-pointer hover:bg-accent" onClick={() => setFormData({ ...formData, odemeTuru: 'eft' })}>
                <RadioGroupItem value="eft" id="eft" />
                <Label htmlFor="eft" className="font-normal cursor-pointer text-sm">🏦 EFT</Label>
              </div>
              <div className="flex items-center space-x-1.5 p-2 border rounded-lg cursor-pointer hover:bg-accent" onClick={() => setFormData({ ...formData, odemeTuru: 'havale' })}>
                <RadioGroupItem value="havale" id="havale" />
                <Label htmlFor="havale" className="font-normal cursor-pointer text-sm">📤 Havale</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="aciklama" className="text-xs">Açıklama</Label>
            <Textarea
              id="aciklama"
              value={formData.aciklama}
              onChange={(e) => setFormData({ ...formData, aciklama: e.target.value })}
              placeholder="Ödeme notu..."
              rows={2}
              className="text-sm resize-none"
            />
          </div>

          <div className="p-3 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950/30 dark:to-green-950/30 rounded-lg border-2 border-dashed">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-sm">Yeni Borç:</span>
              <span className={`text-2xl font-bold ${yeniBakiye > 0 ? 'text-destructive' : 'text-green-600'}`}>
                {formatCurrency(yeniBakiye, 'TRY')}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={handleFisOnizleme} className="flex-1">
            <Printer className="w-4 h-4 mr-1" />
            Önizle
          </Button>
          <Button type="button" onClick={() => handleKaydet(false)} className="flex-1">
            💾 Kaydet
          </Button>
          <Button type="button" variant="default" onClick={() => handleKaydet(true)} className="flex-1">
            🖨️ Kaydet + Yazdır
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OdemeAlModal;
