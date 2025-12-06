import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Musteri, HesapHareketi, ParaBirimi, OdemeTuru } from "@/types/musteri";
import { getKur, formatCurrency, paraBirimiTLyeCevir } from "@/lib/kur-hesaplama";
import { odemeIsle, musteriBalanceGuncelle, getMusteriById } from "@/lib/musteri-data";
import { tahsilatFisiOlustur, fisYazdir } from "@/lib/fis-yazdir";
import { getLocalDateTimeString } from "@/lib/utils";
import { Printer } from "lucide-react";

interface OdemeAlModalProps {
  musteri: Musteri | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const OdemeAlModal = ({ musteri, open, onOpenChange, onSuccess }: OdemeAlModalProps) => {
  const [formData, setFormData] = useState({
    odemeTarihi: getLocalDateTimeString(),
    odemeTutari: "",
    odemeParaBirimi: "TRY" as ParaBirimi,
    odemeTuru: "nakit" as OdemeTuru,
    aciklama: "",
  });

  const [anlikKur, setAnlikKur] = useState(1);
  const [tlKarsiligi, setTlKarsiligi] = useState(0);
  
  // Tahsilat kuru state'leri
  const [tahsilatKurAktif, setTahsilatKurAktif] = useState(false);
  const [tahsilatKurInput, setTahsilatKurInput] = useState("");
  
  // Hesaplanan düşülecek borç
  const [dusulecekBorc, setDusulecekBorc] = useState(0);

  useEffect(() => {
    if (open && musteri) {
      setFormData({
        odemeTarihi: getLocalDateTimeString(),
        odemeTutari: "",
        odemeParaBirimi: musteri.varsayilanParaBirimi,
        odemeTuru: "nakit",
        aciklama: "",
      });
      setTahsilatKurAktif(false);
      setTahsilatKurInput("");
    }
  }, [open, musteri]);

  // Sistem kuru
  const sistemKuru = getKur(formData.odemeParaBirimi);

  useEffect(() => {
    const tutar = parseFloat(formData.odemeTutari) || 0;
    
    // Anlık kur = tahsilat kuru aktifse tahsilat kuru, yoksa sistem kuru
    const tahsilatKuru = tahsilatKurAktif && tahsilatKurInput 
      ? parseFloat(tahsilatKurInput) 
      : sistemKuru;
    
    setAnlikKur(tahsilatKuru);
    
    // TL karşılığı = alınan tutar × tahsilat kuru
    const tlTutar = paraBirimiTLyeCevir(tutar, formData.odemeParaBirimi, tahsilatKuru);
    setTlKarsiligi(tlTutar);
    
    // Düşülecek borç hesaplama
    // Formül: alınan tutar × (sistem kuru / tahsilat kuru)
    if (formData.odemeParaBirimi === 'TRY') {
      setDusulecekBorc(tutar);
    } else if (tahsilatKurAktif && tahsilatKurInput) {
      const parsedTahsilatKur = parseFloat(tahsilatKurInput);
      if (parsedTahsilatKur > 0) {
        setDusulecekBorc(tutar * (sistemKuru / parsedTahsilatKur));
      } else {
        setDusulecekBorc(tutar);
      }
    } else {
      setDusulecekBorc(tutar);
    }
  }, [formData.odemeTutari, formData.odemeParaBirimi, tahsilatKurAktif, tahsilatKurInput, sistemKuru]);

  // Yeni bakiye hesaplama - düşülecek borç üzerinden
  const dusulecekTL = paraBirimiTLyeCevir(dusulecekBorc, formData.odemeParaBirimi, sistemKuru);
  const yeniBakiye = musteri ? musteri.toplamBorcTL - dusulecekTL : 0;

  const handleKaydet = (yazdır: boolean = false) => {
    if (!musteri) return;

    const alinanTutar = parseFloat(formData.odemeTutari);
    if (!alinanTutar || alinanTutar <= 0) {
      toast({
        title: "Hata",
        description: "Geçerli bir ödeme tutarı giriniz.",
        variant: "destructive",
      });
      return;
    }

    // Fazla ödeme kontrolü - düşülecek borç üzerinden
    if (dusulecekTL > musteri.toplamBorcTL) {
      toast({
        title: "❌ Fazla Ödeme",
        description: `Düşülecek borç (${formatCurrency(dusulecekTL, 'TRY')}) mevcut borçtan (${formatCurrency(musteri.toplamBorcTL, 'TRY')}) fazla! Lütfen tutarı azaltın.`,
        variant: "destructive",
      });
      return;
    }

    const oncekiBorc = musteri.toplamBorcTL;

    // Açıklama oluştur
    let aciklama = formData.aciklama || 'Ödeme alındı';
    if (tahsilatKurAktif && formData.odemeParaBirimi !== 'TRY' && tahsilatKurInput) {
      // Tahsilat kuru aktifse, açıklamaya gerçek alınan tutarı yaz
      const tahsilatKuru = parseFloat(tahsilatKurInput);
      aciklama = `${alinanTutar.toFixed(2)} ${formData.odemeParaBirimi} alındı @ ${tahsilatKuru.toFixed(2)} kur`;
    }

    // 🆕 DEBUG LOG - Ödeme öncesi
    console.log('💳 Ödeme başlatılıyor:', {
      musteriId: musteri.id,
      musteriAdi: musteri.adSoyad,
      alinanTutar,
      dusulecekBorc,
      paraBirimi: formData.odemeParaBirimi,
      tahsilatKurAktif,
      tahsilatKuru: tahsilatKurInput,
      sistemKuru,
      oncekiBorc,
      musteriBorclar: {
        USD: musteri.borclar.USD,
        EUR: musteri.borclar.EUR,
        TRY: musteri.borclar.TRY
      }
    });

    // Ödeme işle - düşülecek borç miktarıyla
    const sonuc = odemeIsle(
      musteri.id,
      dusulecekBorc, // Alınan tutar değil, düşülecek borç
      formData.odemeParaBirimi,
      formData.odemeTarihi,
      formData.odemeTuru,
      aciklama
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
            <div className="space-y-2">
              {/* Tahsilat Kuru Checkbox + Input */}
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2 mb-2">
                  <Checkbox
                    id="tahsilatKur"
                    checked={tahsilatKurAktif}
                    onCheckedChange={(checked) => {
                      setTahsilatKurAktif(!!checked);
                      if (!checked) {
                        setTahsilatKurInput("");
                      } else {
                        setTahsilatKurInput(sistemKuru.toFixed(2));
                      }
                    }}
                  />
                  <Label htmlFor="tahsilatKur" className="text-sm font-medium cursor-pointer">
                    📊 Tahsilat Kuru Kullan
                  </Label>
                </div>
                
                {tahsilatKurAktif && (
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">
                      {formData.odemeParaBirimi} Kuru:
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={tahsilatKurInput}
                      onChange={(e) => setTahsilatKurInput(e.target.value)}
                      className="w-24 h-8 text-sm"
                    />
                    <span className="text-xs text-muted-foreground">₺</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      (Sistem: {sistemKuru.toFixed(2)})
                    </span>
                  </div>
                )}
              </div>
              
              {/* Kur Bilgisi */}
              <div className="p-2.5 bg-muted/50 rounded-lg border">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sistem Kuru:</span>
                    <span className="font-semibold">{sistemKuru.toFixed(2)} ₺</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">TL Karşılığı:</span>
                    <span className="font-semibold">{formatCurrency(tlKarsiligi, 'TRY')}</span>
                  </div>
                </div>
              </div>
              
              {/* Tahsilat kuru aktifse hesaplama göster */}
              {tahsilatKurAktif && tahsilatKurInput && (
                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="text-xs text-muted-foreground mb-1">📊 Tahsilat Hesabı</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Alınan:</span>
                      <span className="font-semibold">{formData.odemeTutari} {formData.odemeParaBirimi}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tahsilat Kuru:</span>
                      <span>{parseFloat(tahsilatKurInput).toFixed(2)} ₺</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sistem Kuru:</span>
                      <span>{sistemKuru.toFixed(2)} ₺</span>
                    </div>
                    <div className="border-t pt-1 flex justify-between font-semibold text-blue-600">
                      <span>Düşülecek Borç:</span>
                      <span>{dusulecekBorc.toFixed(2)} {formData.odemeParaBirimi}</span>
                    </div>
                  </div>
                </div>
              )}
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
