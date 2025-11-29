import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, Trash2 } from "lucide-react";
import { Urun } from "@/types/stok";
import { getTedarikciAlimlar, deleteTedarikciAlim } from "@/lib/tedarikci-data";
import { getUrunler, saveUrun } from "@/lib/stok-data";
import { stokHareketKaydet } from "@/lib/stok-hareket";
import { AlimDuzenleModal } from "@/components/AlimDuzenleModal";
import { toast } from "@/hooks/use-toast";
import { TedarikciAlim } from "@/types/tedarikci";

interface UrunDetayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  urun: Urun | null;
}

export const UrunDetayModal = ({ open, onOpenChange, urun }: UrunDetayModalProps) => {
  const navigate = useNavigate();
  const [alimDuzenleModalAcik, setAlimDuzenleModalAcik] = useState(false);
  const [secilenAlim, setSecilenAlim] = useState<TedarikciAlim | null>(null);
  const [silinecekAlimId, setSilinecekAlimId] = useState<string | null>(null);
  const [yenilemeKey, setYenilemeKey] = useState(0);

  if (!urun) return null;

  // Alım geçmişi - tüm alımlardan bu ürünü filtrele
  const tumAlimlar = getTedarikciAlimlar();
  const urunAlimlari = tumAlimlar
    .map(alim => ({
      ...alim,
      urun: alim.urunler.find(u => u.urunId === urun.id)
    }))
    .filter(alim => alim.urun);

  const handleAlimDuzenle = (alim: TedarikciAlim) => {
    setSecilenAlim(alim);
    setAlimDuzenleModalAcik(true);
  };

  const handleAlimSil = () => {
    if (!silinecekAlimId) return;

    const alim = tumAlimlar.find(a => a.id === silinecekAlimId);
    if (!alim) return;

    const urunItem = alim.urunler.find(u => u.urunId === urun.id);
    if (!urunItem) return;

    // Stoktan düş
    const urunler = getUrunler();
    const simdikiUrun = urunler.find(u => u.id === urun.id);
    if (!simdikiUrun) return;

    const yeniStok = simdikiUrun.stokMiktari - urunItem.miktar;
    saveUrun({ ...simdikiUrun, stokMiktari: yeniStok });

    // Stok hareketi kaydet
    stokHareketKaydet(
      urun.id,
      'cikis',
      urunItem.miktar,
      `Alım kaydı silindi - ${alim.faturaNo}`,
      simdikiUrun.stokMiktari,
      yeniStok
    );

    // Alımı sil
    deleteTedarikciAlim(silinecekAlimId);

    toast({
      title: "Başarılı",
      description: "Alım kaydı silindi ve stok güncellendi",
    });

    setSilinecekAlimId(null);
    setYenilemeKey(prev => prev + 1);
  };

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
            <Table key={yenilemeKey}>
              <TableHeader>
                <TableRow>
                  <TableHead>Tedarikçi</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead className="text-right">Miktar</TableHead>
                  <TableHead className="text-right">Birim Fiyat</TableHead>
                  <TableHead className="text-right">Toplam</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
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
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleAlimDuzenle(alim)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSilinecekAlimId(alim.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>

      <AlimDuzenleModal
        open={alimDuzenleModalAcik}
        onOpenChange={setAlimDuzenleModalAcik}
        alim={secilenAlim}
        urunId={urun.id}
        onSuccess={() => setYenilemeKey(prev => prev + 1)}
      />

      <AlertDialog open={!!silinecekAlimId} onOpenChange={(open) => !open && setSilinecekAlimId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alım Kaydını Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu alım kaydını silmek istediğinize emin misiniz? Stok miktarı otomatik olarak azaltılacaktır. Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleAlimSil}>Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};
