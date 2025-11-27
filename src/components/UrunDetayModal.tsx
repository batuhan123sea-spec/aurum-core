import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Urun } from "@/types/stok";
import { getTedarikciAlimlar } from "@/lib/tedarikci-data";

interface UrunDetayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  urun: Urun | null;
}

export const UrunDetayModal = ({ open, onOpenChange, urun }: UrunDetayModalProps) => {
  const navigate = useNavigate();

  if (!urun) return null;

  // Alım geçmişi - tüm alımlardan bu ürünü filtrele
  const tumAlimlar = getTedarikciAlimlar();
  const urunAlimlari = tumAlimlar
    .map(alim => ({
      ...alim,
      urun: alim.urunler.find(u => u.urunId === urun.id)
    }))
    .filter(alim => alim.urun);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {urun.ad} - Tedarikçiler & Alım Geçmişi
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Ürün Kodu:</span> {urun.kod} • <span className="font-medium">Barkod:</span> {urun.barkod}
          </div>

          {urunAlimlari.length === 0 && (!urun.tedarikciler || urun.tedarikciler.length === 0) ? (
            <p className="text-center text-muted-foreground py-8">
              Tedarikçi ve alım kaydı bulunamadı
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tedarikçi</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead className="text-right">Miktar</TableHead>
                  <TableHead className="text-right">Birim Fiyat</TableHead>
                  <TableHead className="text-right">Toplam</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {urunAlimlari.map(alim => {
                  const tedarikci = urun.tedarikciler?.find(t => t.tedarikciId === alim.tedarikciId);
                  return (
                    <TableRow key={alim.id}>
                      <TableCell>
                        <div 
                          className="font-medium cursor-pointer hover:text-primary" 
                          onClick={() => {
                            onOpenChange(false);
                            navigate(`/tedarikci/detay/${alim.tedarikciId}`);
                          }}
                        >
                          {tedarikci?.tedarikciAdi || 'Bilinmeyen Tedarikçi'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(alim.tarih).toLocaleDateString('tr-TR')}
                      </TableCell>
                      <TableCell className="text-right">
                        {alim.urun?.miktar} adet
                      </TableCell>
                      <TableCell className="text-right">
                        {alim.urun?.birimFiyat?.toFixed(2) || '0.00'} {alim.urun?.paraBirimi || 'TRY'}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {alim.urun?.toplamTutar?.toFixed(2) || '0.00'} {alim.urun?.paraBirimi || 'TRY'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
