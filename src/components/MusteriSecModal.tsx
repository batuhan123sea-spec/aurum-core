import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getMusteriler } from "@/lib/musteri-data";
import { Search } from "lucide-react";

interface MusteriSecModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (musteriId: string) => void;
}

export const MusteriSecModal = ({ open, onOpenChange, onSelect }: MusteriSecModalProps) => {
  const [aramaQuery, setAramaQuery] = useState("");
  const musteriler = getMusteriler();

  const filteredMusteriler = aramaQuery
    ? musteriler.filter(m =>
        m.adSoyad.toLowerCase().includes(aramaQuery.toLowerCase()) ||
        m.telefon.includes(aramaQuery) ||
        m.kod.toLowerCase().includes(aramaQuery.toLowerCase())
      )
    : musteriler;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Müşteri Seç</DialogTitle>
          <DialogDescription>
            Hesaplı satış için bir müşteri seçin
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Arama */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Müşteri adı, telefon veya kod..."
              value={aramaQuery}
              onChange={(e) => setAramaQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Müşteri Listesi */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredMusteriler.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Müşteri bulunamadı
              </div>
            ) : (
              filteredMusteriler.map(musteri => (
                <button
                  key={musteri.id}
                  onClick={() => onSelect(musteri.id)}
                  className="w-full text-left p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{musteri.adSoyad}</p>
                      <p className="text-sm text-muted-foreground">{musteri.telefon}</p>
                      <p className="text-xs text-muted-foreground">{musteri.kod}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={musteri.konum === 'ic' ? 'default' : 'secondary'}>
                        {musteri.konum === 'ic' ? 'İç' : 'Dış'}
                      </Badge>
                      {musteri.toplamBorc > 0 && (
                        <p className="text-sm font-semibold text-destructive mt-1">
                          Borç: {musteri.toplamBorc.toFixed(2)} ₺
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
