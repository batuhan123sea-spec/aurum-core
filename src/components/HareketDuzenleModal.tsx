import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HesapHareketi, ParaBirimi, IslemTuru, OdemeTuru } from "@/types/musteri";
import { updateHareket } from "@/lib/musteri-data";
import { getKur } from "@/lib/kur-hesaplama";
import { utcToLocalDateTimeString } from "@/lib/utils";
import { toast } from "sonner";

interface HareketDuzenleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hareket: HesapHareketi;
  onSuccess: () => void;
}

export const HareketDuzenleModal = ({ open, onOpenChange, hareket, onSuccess }: HareketDuzenleModalProps) => {
  const [tarih, setTarih] = useState("");
  const [tutar, setTutar] = useState("");
  const [paraBirimi, setParaBirimi] = useState<ParaBirimi>("TRY");
  const [aciklama, setAciklama] = useState("");
  const [islemTuru, setIslemTuru] = useState<IslemTuru>('satis');
  const [odemeTuru, setOdemeTuru] = useState<OdemeTuru>('nakit');

  useEffect(() => {
    if (open && hareket) {
      const tarihStr = utcToLocalDateTimeString(hareket.tarih);
      setTarih(tarihStr);
      setTutar(hareket.tutar.toString());
      setParaBirimi(hareket.paraBirimi);
      setAciklama(hareket.aciklama);
      setIslemTuru(hareket.islemTuru);
      if (hareket.odemeTuru) {
        setOdemeTuru(hareket.odemeTuru);
      }
    }
  }, [open, hareket]);

  const handleKaydet = () => {
    if (!tutar || parseFloat(tutar) <= 0) {
      toast.error("Geçerli bir tutar girin");
      return;
    }

    if (!tarih) {
      toast.error("Tarih seçin");
      return;
    }

    const tutarNumber = parseFloat(tutar);
    const kur = getKur(paraBirimi);
    const tlKarsiligi = tutarNumber * kur;

    const guncelHareket: HesapHareketi = {
      ...hareket,
      tarih: new Date(tarih).toISOString(),
      tutar: tutarNumber,
      paraBirimi,
      aciklama,
      kur,
      tlKarsiligi,
      islemTuru,
      odemeTuru: islemTuru === 'odeme' ? odemeTuru : undefined,
    };

    updateHareket(guncelHareket);
    toast.success("Hareket başarıyla güncellendi");
    onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Hareket Düzenle</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>İşlem Türü</Label>
            <Select value={islemTuru} onValueChange={(v) => setIslemTuru(v as IslemTuru)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="satis">💰 Satış</SelectItem>
                <SelectItem value="odeme">💵 Ödeme</SelectItem>
                <SelectItem value="iade">🔄 İade</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="tarih">Tarih</Label>
            <Input
              id="tarih"
              type="datetime-local"
              value={tarih}
              onChange={(e) => setTarih(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="tutar">Tutar</Label>
            <Input
              id="tutar"
              type="number"
              step="0.01"
              value={tutar}
              onChange={(e) => setTutar(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="paraBirimi">Para Birimi</Label>
            <Select value={paraBirimi} onValueChange={(v) => setParaBirimi(v as ParaBirimi)}>
              <SelectTrigger id="paraBirimi">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TRY">TRY (₺)</SelectItem>
                <SelectItem value="USD">USD ($)</SelectItem>
                <SelectItem value="EUR">EUR (€)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {islemTuru === 'odeme' && (
            <div>
              <Label>Ödeme Türü</Label>
              <Select value={odemeTuru} onValueChange={(v) => setOdemeTuru(v as OdemeTuru)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nakit">💵 Nakit</SelectItem>
                  <SelectItem value="kredi-karti">💳 Kredi Kartı</SelectItem>
                  <SelectItem value="eft">🏦 EFT</SelectItem>
                  <SelectItem value="havale">📤 Havale</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="aciklama">Açıklama</Label>
            <Textarea
              id="aciklama"
              value={aciklama}
              onChange={(e) => setAciklama(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          <Button onClick={handleKaydet}>
            Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
