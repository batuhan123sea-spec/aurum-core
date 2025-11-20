import { Card } from "@/components/ui/card";
import { Kategori } from "@/types/stok";

interface StokKategoriKartProps {
  kategori: Kategori;
  onClick: () => void;
}

export const StokKategoriKart = ({ kategori, onClick }: StokKategoriKartProps) => {
  return (
    <Card 
      className="p-6 cursor-pointer transition-all hover:shadow-xl hover:scale-105 hover:border-primary/50"
      onClick={onClick}
    >
      <div className="text-center space-y-4">
        <div className="text-5xl mb-3">{kategori.emoji}</div>
        <h3 className="font-semibold text-lg text-foreground">{kategori.ad}</h3>
      </div>
    </Card>
  );
};
