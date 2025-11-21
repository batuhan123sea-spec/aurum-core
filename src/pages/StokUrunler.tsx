import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StokKategoriKart } from "@/components/StokKategoriKart";
import { YeniUrunModal } from "@/components/YeniUrunModal";
import { KATEGORILER } from "@/types/stok";
import { getUrunler } from "@/lib/stok-data";
import { 
  Plus, 
  Package, 
  Upload, 
  ClipboardCheck, 
  Search,
  Edit,
  Trash2
} from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function StokUrunler() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("tumunu");
  const [yeniUrunModalOpen, setYeniUrunModalOpen] = useState(false);
  const [urunler] = useState(() => getUrunler());

  // Filtreleme fonksiyonu
  const filteredUrunler = urunler.filter((urun) => {
    // Arama filtresi
    const searchMatch = searchQuery === "" || 
      urun.ad.toLowerCase().includes(searchQuery.toLowerCase()) ||
      urun.barkod.toLowerCase().includes(searchQuery.toLowerCase()) ||
      urun.kod.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (urun.tedarikciler && urun.tedarikciler.some(t => t.tedarikciAdi.toLowerCase().includes(searchQuery.toLowerCase())));

    if (!searchMatch) return false;

    // Durum filtresi
    switch (activeFilter) {
      case "azalan":
        return urun.stokMiktari <= urun.minStokSeviyesi && urun.stokMiktari > 0;
      case "biten":
        return urun.stokMiktari === 0;
      case "aktif":
        return urun.durum === "aktif";
      case "pasif":
        return urun.durum === "pasif";
      default:
        return true;
    }
  });

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

        {/* Tabs: Kategoriler ve Tüm Ürünler */}
        <Tabs defaultValue="urunler" className="w-full">
          <TabsList>
            <TabsTrigger value="urunler">Tüm Ürünler ({filteredUrunler.length})</TabsTrigger>
            <TabsTrigger value="kategoriler">Kategoriler</TabsTrigger>
          </TabsList>

          <TabsContent value="urunler" className="space-y-4">
            {/* Ürün Listesi Tablosu */}
            <div className="border rounded-lg">
              {filteredUrunler.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">
                    {searchQuery || activeFilter !== "tumunu" 
                      ? "Filtrelere uygun ürün bulunamadı" 
                      : "Henüz ürün eklenmemiş"}
                  </p>
                  <Button 
                    onClick={() => setYeniUrunModalOpen(true)}
                    className="bg-success hover:bg-success/90"
                  >
                    <Plus className="mr-2" />
                    İlk Ürünü Ekle
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ürün Kodu</TableHead>
                      <TableHead>Ürün Adı</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead className="text-right">Stok</TableHead>
                      <TableHead>Birim</TableHead>
                      <TableHead className="text-right">Alış Fiyatı</TableHead>
                      <TableHead className="text-right">Satış Fiyatı</TableHead>
                      <TableHead>Tedarikçi</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead className="text-right">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUrunler.map((urun) => {
                      const kategori = KATEGORILER.find(k => k.id === urun.kategori);
                      return (
                        <TableRow key={urun.id}>
                          <TableCell className="font-medium">{urun.kod}</TableCell>
                          <TableCell>{urun.ad}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span>{kategori?.emoji}</span>
                              <span className="text-sm text-muted-foreground">{kategori?.ad}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={
                                urun.stokMiktari <= urun.minStokSeviyesi
                                  ? "text-destructive font-semibold"
                                  : urun.stokMiktari === 0
                                  ? "text-destructive font-bold"
                                  : ""
                              }
                            >
                              {urun.stokMiktari}
                            </span>
                          </TableCell>
                          <TableCell>{urun.birim}</TableCell>
                          <TableCell className="text-right">
                            {urun.alisFiyati.toFixed(2)} ₺
                          </TableCell>
                          <TableCell className="text-right">
                            {urun.satisFiyati.toFixed(2)} ₺
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {urun.tedarikciler[0]?.tedarikciAdi || 'Belirtilmemiş'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={urun.durum === "aktif" ? "default" : "secondary"}>
                              {urun.durum}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button size="icon" variant="ghost">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost">
                                <Trash2 className="h-4 w-4" />
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
          </TabsContent>

          <TabsContent value="kategoriler">
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
          </TabsContent>
        </Tabs>
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
