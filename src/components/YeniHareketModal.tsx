import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ParaBirimi, OdemeTuru, IslemTuru } from "@/types/musteri";
import { createManualHareket } from "@/lib/musteri-data";
import { toast } from "sonner";

interface YeniHareketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  musteriId: string;
  onSuccess: () => void;
}

export const YeniHareketModal = ({ open, onOpenChange, musteriId, onSuccess }: YeniHareketModalProps) => {
  const [islemTuru, setIslemTuru] = useState<IslemTuru>('odeme');
  const [tarih, setTarih] = useState(new Date().toISOString().slice(0, 16));
  const [tutar, setTutar] = useState("");
  const [paraBirimi, setParaBirimi] = useState<ParaBirimi>("TRY");
  const [aciklama, setAciklama] = useState("");
  const [odemeTuru, setOdemeTuru] = useState<OdemeTuru>('nakit');

  const handleKaydet = () => {
    if (!tutar || parseFloat(tutar) <= 0) {
      toast.error("Geçerli bir tutar girin");
      return;
    }

    createManualHareket({
      musteriId,
      islemTuru,
      tarih: new Date(tarih).toISOString(),
      tutar: parseFloat(tutar),
      paraBirimi,
      aciklama,
      odemeTuru: islemTuru === 'odeme' ? odemeTuru : undefined,
    });

    toast.success("Hareket başarıyla eklendi");
    onSuccess();
    onOpenChange(false);
    
    // Formu temizle
    setTutar("");
    setAciklama("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Yeni Hareket Ekle</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>İşlem Türü</Label>
            <Select value={islemTuru} onValueChange={(v) => setIslemTuru(v as IslemTuru)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="satis">📝 Eski Borç Aktarımı</SelectItem>
                <SelectItem value="odeme">💵 Ödeme</SelectItem>
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
              placeholder="0.00"
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
              placeholder="Örn: Eski hesap düzeltmesi, Manuel borç ekleme, vb."
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
