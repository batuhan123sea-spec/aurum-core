import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { KATEGORILER, Urun } from "@/types/stok";
import { getUrunByKategori } from "@/lib/stok-data";
import { formatCurrency } from "@/lib/kur-hesaplama";
import { YeniUrunModal } from "@/components/YeniUrunModal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";
import { useState } from "react";

export default function StokKategoriDetay() {
  const { kategoriId } = useParams<{ kategoriId: string }>();
  const navigate = useNavigate();
  const [urunler, setUrunler] = useState(() => getUrunByKategori(kategoriId || ""));
  const [duzenlenecekUrun, setDuzenlenecekUrun] = useState<Urun | null>(null);
  const [modalAcik, setModalAcik] = useState(false);

  const kategori = KATEGORILER.find((k) => k.id === kategoriId);

  if (!kategori) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-foreground">Kategori bulunamadı</h2>
          <Button onClick={() => navigate("/stok/urunler")} className="mt-4">
            Stok Sayfasına Dön
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="text-sm text-muted-foreground">
          <button onClick={() => navigate("/stok/urunler")} className="hover:text-primary">
            Dashboard &gt; Stok Yönetimi
          </button>
          {" > "}
          {kategori.ad}
        </div>

        {/* Başlık */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/stok/urunler")}
            >
              <ArrowLeft />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <span className="text-4xl">{kategori.emoji}</span>
                {kategori.ad}
              </h1>
              <p className="text-muted-foreground mt-1">
                {urunler.length} ürün bulundu
              </p>
            </div>
          </div>
        </div>

        {/* Ürün Tablosu */}
        <div className="border rounded-lg">
          {urunler.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                Bu kategoride henüz ürün bulunmuyor
              </p>
              <Button onClick={() => navigate("/stok/urunler")}>
                Ürün Ekle
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ürün Kodu</TableHead>
                  <TableHead>Ürün Adı</TableHead>
                  <TableHead className="text-right">Stok</TableHead>
                  <TableHead>Birim</TableHead>
                  <TableHead className="text-right">Alış Fiyatı</TableHead>
                  <TableHead className="text-right">Satış Fiyatı</TableHead>
                  <TableHead>Tedarikçi</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {urunler.map((urun) => (
                  <TableRow key={urun.id}>
                    <TableCell className="font-medium">{urun.kod}</TableCell>
                    <TableCell>{urun.ad}</TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          urun.stokMiktari <= urun.minStokSeviyesi
                            ? "text-destructive font-semibold"
                            : ""
                        }
                      >
                        {urun.stokMiktari}
                      </span>
                    </TableCell>
                    <TableCell>{urun.birim}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(urun.alisFiyati, urun.alisFiyatiParaBirimi)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(urun.satisFiyati, urun.alisFiyatiParaBirimi)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {urun.tedarikciler?.[0]?.tedarikciAdi || 'Belirtilmemiş'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={() => {
                            setDuzenlenecekUrun(urun);
                            setModalAcik(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <YeniUrunModal
        open={modalAcik}
        onOpenChange={(open) => {
          setModalAcik(open);
          if (!open) setDuzenlenecekUrun(null);
        }}
        onSuccess={() => {
          setUrunler(getUrunByKategori(kategoriId || ""));
        }}
        editMode={!!duzenlenecekUrun}
        initialData={duzenlenecekUrun || undefined}
      />
    </Layout>
  );
}
