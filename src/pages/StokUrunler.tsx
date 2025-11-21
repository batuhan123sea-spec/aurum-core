import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StokKategoriKart } from "@/components/StokKategoriKart";
import { YeniUrunModal } from "@/components/YeniUrunModal";
import { KATEGORILER } from "@/types/stok";
import { 
  Plus, 
  Package, 
  Upload, 
  ClipboardCheck, 
  Search 
} from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export default function StokUrunler() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("tumunu");
  const [yeniUrunModalOpen, setYeniUrunModalOpen] = useState(false);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="text-sm text-muted-foreground">
          Dashboard &gt; Stok Yönetimi &gt; Tüm Ürünler
        </div>

        {/* Başlık */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Stok Yönetimi</h1>
          <p className="text-muted-foreground mt-1">
            Tüm ürünleri görüntüleyin, düzenleyin ve yönetin
          </p>
        </div>

        {/* Araç Çubuğu */}
        <div className="space-y-4">
          {/* Üst Butonlar */}
          <div className="flex flex-wrap gap-3">
            <Button 
              className="bg-success hover:bg-success/90"
              size="lg"
              onClick={() => setYeniUrunModalOpen(true)}
            >
              <Plus className="mr-2" />
              Yeni Ürün Ekle
            </Button>
            <Button variant="outline" size="lg">
              <Package className="mr-2" />
              Hızlı Stok Girişi
            </Button>
            <Button variant="outline" size="lg">
              <Upload className="mr-2" />
              Excel'den İçe Aktar
            </Button>
            <Button variant="outline" size="lg">
              <ClipboardCheck className="mr-2" />
              Stok Sayımı Başlat
            </Button>
          </div>

          {/* Arama ve Filtreler */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Ürün adı, barkod veya tedarikçi ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <ToggleGroup 
              type="single" 
              value={activeFilter} 
              onValueChange={(value) => value && setActiveFilter(value)}
              className="justify-start"
            >
              <ToggleGroupItem value="tumunu" variant="outline">
                Tümü
              </ToggleGroupItem>
              <ToggleGroupItem value="azalan" variant="outline">
                Stokta Azalan
              </ToggleGroupItem>
              <ToggleGroupItem value="biten" variant="outline">
                Stokta Olmayan
              </ToggleGroupItem>
              <ToggleGroupItem value="aktif" variant="outline">
                Aktif
              </ToggleGroupItem>
              <ToggleGroupItem value="pasif" variant="outline">
                Pasif
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {/* Kategori Grid */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Ürün Kategorileri
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {KATEGORILER.map((kategori) => (
              <StokKategoriKart
                key={kategori.id}
                kategori={kategori}
                onClick={() => navigate(`/stok/kategori/${kategori.id}`)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Yeni Ürün Modal */}
      <YeniUrunModal
        open={yeniUrunModalOpen}
        onOpenChange={setYeniUrunModalOpen}
        onSuccess={() => {
          // Refresh data if needed
        }}
      />
    </Layout>
  );
}
