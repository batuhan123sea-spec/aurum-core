import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getUrunler, saveUrun } from "@/lib/stok-data";
import { stokHareketKaydet } from "@/lib/stok-hareket";
import { toast } from "sonner";

interface HizliStokGirisiModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function HizliStokGirisiModal({ open, onOpenChange, onSuccess }: HizliStokGirisiModalProps) {
  const [urunId, setUrunId] = useState("");
  const [miktar, setMiktar] = useState("");
  const [aciklama, setAciklama] = useState("");
  
  const allUrunler = getUrunler();

  const handleSubmit = () => {
    if (!urunId || !miktar) {
      toast.error("Ürün ve miktar zorunludur");
      return;
    }

    const urun = allUrunler.find(u => u.id === urunId);
    if (!urun) return;

    const yeniMiktar = parseInt(miktar);
    if (yeniMiktar <= 0) {
      toast.error("Miktar 0'dan büyük olmalıdır");
      return;
    }

    const oncekiMiktar = urun.stokMiktari;
    
    // Stok güncelle
    saveUrun({
      ...urun,
      stokMiktari: oncekiMiktar + yeniMiktar,
      guncellemeTarihi: new Date().toISOString()
    });

    // Hareket kaydet
    stokHareketKaydet(
      urunId,
      'giris',
      yeniMiktar,
      aciklama || 'Hızlı stok girişi',
      oncekiMiktar,
      oncekiMiktar + yeniMiktar
    );

    toast.success(`${urun.ad} - ${yeniMiktar} adet stok eklendi`);
    onOpenChange(false);
    setUrunId("");
    setMiktar("");
    setAciklama("");
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Hızlı Stok Girişi</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Ürün *</Label>
            <Select value={urunId} onValueChange={setUrunId}>
              <SelectTrigger>
                <SelectValue placeholder="Ürün seçin" />
              </SelectTrigger>
              <SelectContent>
                {allUrunler.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.ad} (Mevcut: {u.stokMiktari} {u.birim})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Miktar *</Label>
            <Input 
              type="number" 
              value={miktar}
              onChange={(e) => setMiktar(e.target.value)}
              placeholder="Eklenecek miktar"
              min="1"
            />
          </div>

          <div>
            <Label>Açıklama</Label>
            <Textarea 
              value={aciklama}
              onChange={(e) => setAciklama(e.target.value)}
              placeholder="İsteğe bağlı açıklama"
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              İptal
            </Button>
            <Button onClick={handleSubmit} className="flex-1 bg-success hover:bg-success/90">
              Stok Ekle
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
