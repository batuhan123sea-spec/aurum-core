import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Urun, KATEGORILER } from "@/types/stok";
import Barcode from "react-barcode";
import { Printer, X } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  urunler: Urun[];
}

export const BarkodYazdirModal = ({ open, onOpenChange, urunler }: Props) => {
  // Ürünleri kategoriye göre grupla
  const kategoriGruplari = urunler.reduce((acc, urun) => {
    if (!acc[urun.kategori]) {
      acc[urun.kategori] = [];
    }
    acc[urun.kategori].push(urun);
    return acc;
  }, {} as Record<string, Urun[]>);

  const handleYazdir = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-auto">
        <DialogHeader className="print:hidden">
          <DialogTitle>Barkod Yazdırma Önizleme</DialogTitle>
          <div className="flex gap-2">
            <Button onClick={handleYazdir}>
              <Printer className="mr-2 h-4 w-4" />
              Yazdır
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X className="mr-2 h-4 w-4" />
              İptal
            </Button>
          </div>
        </DialogHeader>

        {/* A4 Sayfa Önizleme */}
        <div className="barkod-yazdirma-alani space-y-8">
          {Object.entries(kategoriGruplari).map(([kategoriId, kategoriUrunler]) => {
            const kategori = KATEGORILER.find(k => k.id === kategoriId);
            
            return (
              <div key={kategoriId} className="kategori-grubu">
                {/* Kategori Başlığı */}
                <h2 className="text-xl font-bold mb-4 text-center border-b-2 border-primary pb-2">
                  {kategori?.emoji} {kategori?.ad}
                </h2>

                {/* Barkod Grid (2x4 = 8 etiket) */}
                <div className="barkod-grid">
                  {kategoriUrunler.map((urun) => (
                    <div key={urun.id} className="barkod-etiket">
                      <div className="flex flex-col items-center justify-center h-full p-2">
                        <p className="text-xs font-semibold text-center mb-1 truncate w-full">
                          {urun.ad}
                        </p>
                        <div className="bg-white">
                          <Barcode
                            value={urun.barkod}
                            format="EAN13"
                            width={1.5}
                            height={50}
                            displayValue={true}
                            fontSize={12}
                            margin={0}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {urun.kod}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};
