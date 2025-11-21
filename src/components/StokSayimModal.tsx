import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getUrunler, saveUrun } from "@/lib/stok-data";
import { stokHareketKaydet } from "@/lib/stok-hareket";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

interface StokSayimModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function StokSayimModal({ open, onOpenChange, onSuccess }: StokSayimModalProps) {
  const allUrunler = getUrunler();
  const [sayimlar, setSayimlar] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");

  const filteredUrunler = useMemo(() => {
    if (!searchQuery.trim()) return allUrunler;
    
    const query = searchQuery.toLowerCase();
    return allUrunler.filter(u => 
      u.ad.toLowerCase().includes(query) || 
      u.kod.toLowerCase().includes(query) ||
      u.barkod.toLowerCase().includes(query)
    );
  }, [searchQuery, allUrunler]);

  const farklar = useMemo(() => {
    return Object.entries(sayimlar)
      .map(([urunId, sayilanStr]) => {
        const urun = allUrunler.find(u => u.id === urunId);
        if (!urun) return null;
        
        const sayilanMiktar = parseInt(sayilanStr) || 0;
        const fark = sayilanMiktar - urun.stokMiktari;
        return { urun, sayilanMiktar, fark };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [sayimlar, allUrunler]);

  const handleSayimGuncelle = (urunId: string, value: string) => {
    setSayimlar(prev => ({ ...prev, [urunId]: value }));
  };

  const handleKaydet = () => {
    let degisiklikSayisi = 0;

    farklar.forEach(({ urun, sayilanMiktar, fark }) => {
      if (fark === 0) return;

      // Stok güncelle
      saveUrun({
        ...urun,
        stokMiktari: sayilanMiktar,
        guncellemeTarihi: new Date().toISOString()
      });

      // Hareket kaydet
      stokHareketKaydet(
        urun.id,
        'sayim',
        Math.abs(fark),
        `Stok sayımı: ${fark > 0 ? '+' : ''}${fark} fark`,
        urun.stokMiktari,
        sayilanMiktar
      );

      degisiklikSayisi++;
    });

    toast.success(`${degisiklikSayisi} üründe stok sayımı kaydedildi`);
    onOpenChange(false);
    setSayimlar({});
    setSearchQuery("");
    onSuccess?.();
  };

  const degisiklikSayisi = farklar.filter(f => f.fark !== 0).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Stok Sayımı</DialogTitle>
        </DialogHeader>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Ürün ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="overflow-y-auto flex-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ürün Kodu</TableHead>
                <TableHead>Ürün Adı</TableHead>
                <TableHead className="text-right">Sistemdeki Stok</TableHead>
                <TableHead className="text-center">Sayılan Miktar</TableHead>
                <TableHead className="text-right">Fark</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUrunler.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Ürün bulunamadı
                  </TableCell>
                </TableRow>
              ) : (
                filteredUrunler.map(urun => {
                  const sayilanStr = sayimlar[urun.id] || "";
                  const sayilan = parseInt(sayilanStr) || 0;
                  const fark = sayilanStr ? sayilan - urun.stokMiktari : 0;
                  
                  return (
                    <TableRow key={urun.id}>
                      <TableCell className="font-medium">{urun.kod}</TableCell>
                      <TableCell>{urun.ad}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {urun.stokMiktari} {urun.birim}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={sayimlar[urun.id] || ""}
                          onChange={(e) => handleSayimGuncelle(urun.id, e.target.value)}
                          placeholder={urun.stokMiktari.toString()}
                          className="w-28 mx-auto text-center"
                          min="0"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        {fark !== 0 && sayilanStr && (
                          <Badge 
                            variant={fark > 0 ? "default" : "destructive"}
                            className={fark > 0 ? "bg-success hover:bg-success/90" : ""}
                          >
                            {fark > 0 ? '+' : ''}{fark}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex gap-2 pt-4 border-t mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            İptal
          </Button>
          <Button 
            onClick={handleKaydet} 
            disabled={degisiklikSayisi === 0}
            className="flex-1 bg-primary hover:bg-primary/90"
          >
            Sayımı Kaydet {degisiklikSayisi > 0 && `(${degisiklikSayisi} değişiklik)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
