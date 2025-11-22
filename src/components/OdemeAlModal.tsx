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
    odemeTarihi: new Date().toISOString().split('T')[0],
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
        odemeTarihi: new Date().toISOString().split('T')[0],
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

    // Yeni ödeme işleme fonksiyonunu kullan
    const sonuc = odemeIsle(
      musteri.id,
      tutar,
      formData.odemeParaBirimi,
      formData.odemeTarihi,
      formData.odemeTuru,
      formData.aciklama || 'Ödeme alındı'
    );

    if (!sonuc.success) {
      toast({
        title: "Hata",
        description: sonuc.message,
        variant: "destructive",
      });
      return;
    }

    musteriBalanceGuncelle(musteri.id);

    toast({
      title: "Başarılı",
      description: "Ödeme kaydedildi.",
    });

    if (yazdır) {
      const guncelMusteri = getMusteriById(musteri.id);
      if (guncelMusteri && sonuc.hareketler.length > 0) {
        // İlk hareketi kullanarak fiş oluştur
        const fisIcerigi = tahsilatFisiOlustur(guncelMusteri, sonuc.hareketler[0], oncekiBorc);
        fisYazdir(fisIcerigi);
      }
    }

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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ödeme Al - {musteri.adSoyad}</DialogTitle>
          <p className="text-destructive font-semibold">
            Mevcut Borç: {formatCurrency(musteri.toplamBorcTL, 'TRY')}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="odemeTarihi">Ödeme Tarihi</Label>
            <Input
              id="odemeTarihi"
              type="date"
              value={formData.odemeTarihi}
              onChange={(e) => setFormData({ ...formData, odemeTarihi: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="odemeTutari">Ödeme Tutarı</Label>
            <Input
              id="odemeTutari"
              type="number"
              step="0.01"
              value={formData.odemeTutari}
              onChange={(e) => setFormData({ ...formData, odemeTutari: e.target.value })}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label>Ödeme Para Birimi</Label>
            <RadioGroup
              value={formData.odemeParaBirimi}
              onValueChange={(value) => setFormData({ ...formData, odemeParaBirimi: value as ParaBirimi })}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="TRY" id="pay-try" />
                <Label htmlFor="pay-try" className="font-normal cursor-pointer">TRY (₺)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="USD" id="pay-usd" />
                <Label htmlFor="pay-usd" className="font-normal cursor-pointer">USD ($)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="EUR" id="pay-eur" />
                <Label htmlFor="pay-eur" className="font-normal cursor-pointer">EUR (€)</Label>
              </div>
            </RadioGroup>
          </div>

          {formData.odemeParaBirimi !== 'TRY' && (
            <Alert>
              <AlertDescription>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Anlık Kur:</span>
                    <span className="font-semibold">{anlikKur.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TL Karşılığı:</span>
                    <span className="font-semibold">{formatCurrency(tlKarsiligi, 'TRY')}</span>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>Ödeme Yöntemi</Label>
            <RadioGroup
              value={formData.odemeTuru}
              onValueChange={(value) => setFormData({ ...formData, odemeTuru: value as OdemeTuru })}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="nakit" id="nakit" />
                <Label htmlFor="nakit" className="font-normal cursor-pointer">💵 Nakit</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="kredi-karti" id="kredi-karti" />
                <Label htmlFor="kredi-karti" className="font-normal cursor-pointer">💳 Kredi Kartı</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="eft" id="eft" />
                <Label htmlFor="eft" className="font-normal cursor-pointer">🏦 EFT</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="havale" id="havale" />
                <Label htmlFor="havale" className="font-normal cursor-pointer">📤 Havale</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="aciklama">Açıklama (Opsiyonel)</Label>
            <Textarea
              id="aciklama"
              value={formData.aciklama}
              onChange={(e) => setFormData({ ...formData, aciklama: e.target.value })}
              placeholder="Ödeme notu..."
              rows={2}
            />
          </div>

          <Alert>
            <AlertDescription>
              <div className="flex justify-between items-center">
                <span className="font-semibold">Yeni Borç:</span>
                <span className={`text-lg font-bold ${yeniBakiye > 0 ? 'text-destructive' : 'text-green-600'}`}>
                  {formatCurrency(yeniBakiye, 'TRY')}
                </span>
              </div>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button type="button" variant="outline" onClick={handleFisOnizleme}>
            <Printer className="w-4 h-4 mr-2" />
            Fiş Önizleme
          </Button>
          <Button type="button" onClick={() => handleKaydet(false)}>
            💾 Kaydet
          </Button>
          <Button type="button" variant="default" onClick={() => handleKaydet(true)}>
            🖨️ Kaydet ve Fiş Yazdır
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OdemeAlModal;
