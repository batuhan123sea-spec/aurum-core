import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StokKategoriKart } from "@/components/StokKategoriKart";
import { YeniUrunModal } from "@/components/YeniUrunModal";
import { HizliStokGirisiModal } from "@/components/HizliStokGirisiModal";
import { StokSayimModal } from "@/components/StokSayimModal";
import { BarkodYazdirModal } from "@/components/BarkodYazdirModal";
import { KATEGORILER } from "@/types/stok";
import { getUrunler, searchUrunler } from "@/lib/stok-data";
import { getStokHareketler } from "@/lib/stok-hareket";
import { 
  Plus, 
  Package, 
  ClipboardCheck, 
  Search,
  AlertTriangle,
  ArrowUpCircle,
  ArrowDownCircle,
  Edit3,
  Printer
} from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

export default function StokUrunler() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("tumunu");
  const [yeniUrunModalOpen, setYeniUrunModalOpen] = useState(false);
  const [hizliStokModalOpen, setHizliStokModalOpen] = useState(false);
  const [stokSayimModalOpen, setStokSayimModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [barkodModalOpen, setBarkodModalOpen] = useState(false);

  // Stok Hareketleri filtreleri
  const [hareketFiltreler, setHareketFiltreler] = useState({
    baslangicTarihi: "",
    bitisTarihi: "",
    islemTuru: "hepsi",
    urunId: "hepsi",
  });

  const allUrunler = getUrunler();
  const allHareketler = getStokHareketler();

  // Ürün filtreleme
  const filtrelenmisUrunler = useMemo(() => {
    let sonuc = allUrunler;

    // Arama filtresi
    if (searchQuery.trim()) {
      sonuc = searchUrunler(searchQuery);
    }

    // Durum filtreleri
    if (activeFilter === "azalan") {
      sonuc = sonuc.filter(u => 
        u.stokMiktari <= u.minStokSeviyesi && 
        u.stokMiktari > u.kritikStokSeviyesi
      );
  } else if (activeFilter === "biten") {
    sonuc = sonuc.filter(u => u.stokMiktari <= u.kritikStokSeviyesi);
  }

    return sonuc;
  }, [searchQuery, activeFilter, allUrunler, refreshKey]);

  // Hareket filtreleme
  const filtrelenmisHareketler = useMemo(() => {
    let sonuc = [...allHareketler];

    if (hareketFiltreler.baslangicTarihi) {
      sonuc = sonuc.filter(h => h.tarih >= hareketFiltreler.baslangicTarihi);
    }

    if (hareketFiltreler.bitisTarihi) {
      sonuc = sonuc.filter(h => h.tarih <= hareketFiltreler.bitisTarihi);
    }

    if (hareketFiltreler.islemTuru !== "hepsi") {
      sonuc = sonuc.filter(h => h.islemTuru === hareketFiltreler.islemTuru);
    }

    if (hareketFiltreler.urunId !== "hepsi") {
      sonuc = sonuc.filter(h => h.urunId === hareketFiltreler.urunId);
    }

    return sonuc.sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime());
  }, [hareketFiltreler, allHareketler, refreshKey]);

  const getIslemTuruBadge = (tur: string) => {
    const variants = {
      giris: { icon: ArrowUpCircle, variant: "default" as const, className: "bg-success hover:bg-success/90", label: "Giriş" },
      cikis: { icon: ArrowDownCircle, variant: "destructive" as const, className: "", label: "Çıkış" },
      duzeltme: { icon: Edit3, variant: "secondary" as const, className: "", label: "Düzeltme" },
      sayim: { icon: ClipboardCheck, variant: "outline" as const, className: "", label: "Sayım" },
    };

    const config = variants[tur as keyof typeof variants] || variants.duzeltme;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={`gap-1 ${config.className}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getUrunAdi = (urunId: string) => {
    const urun = allUrunler.find(u => u.id === urunId);
    return urun ? urun.ad : "Bilinmeyen Ürün";
  };

  const temizleHareketFiltreler = () => {
    setHareketFiltreler({
      baslangicTarihi: "",
      bitisTarihi: "",
      islemTuru: "hepsi",
      urunId: "hepsi",
    });
  };

  const handleSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="text-sm text-muted-foreground">
          Dashboard &gt; Stok Yönetimi
        </div>

        {/* Başlık */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Stok Yönetimi</h1>
          <p className="text-muted-foreground mt-1">
            Tüm ürünleri görüntüleyin, düzenleyin ve yönetin
          </p>
        </div>

        <Tabs defaultValue="urunler" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="urunler">Tüm Ürünler</TabsTrigger>
            <TabsTrigger value="hareketler">Stok Hareketleri</TabsTrigger>
          </TabsList>

          <TabsContent value="urunler" className="space-y-6">
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
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={() => setHizliStokModalOpen(true)}
                >
                  <Package className="mr-2" />
                  Hızlı Stok Girişi
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={() => setStokSayimModalOpen(true)}
                >
                  <ClipboardCheck className="mr-2" />
                  Stok Sayımı Başlat
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={() => setBarkodModalOpen(true)}
                >
                  <Printer className="mr-2" />
                  Barkod Yazdır ({filtrelenmisUrunler.length})
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
                </ToggleGroup>
              </div>
            </div>

            {/* Filtrelenmiş Ürün Listesi */}
            {(searchQuery || activeFilter !== "tumunu") && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Filtrelenmiş Ürünler 
                    <Badge variant="secondary">
                      {filtrelenmisUrunler.length} ürün
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ürün Kodu</TableHead>
                          <TableHead>Ürün Adı</TableHead>
                          <TableHead>Kategori</TableHead>
                          <TableHead className="text-right">Stok</TableHead>
                          <TableHead className="text-right">Min Seviye</TableHead>
                          <TableHead>Durum</TableHead>
                          <TableHead className="text-right">Alış Fiyatı</TableHead>
                          <TableHead className="text-right">Satış Fiyatı</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtrelenmisUrunler.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                              Arama kriterlerine uygun ürün bulunamadı.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filtrelenmisUrunler.map((urun) => (
                            <TableRow 
                              key={urun.id}
                              className="hover:bg-muted/50 cursor-pointer"
                              onClick={() => navigate(`/stok/urun/${urun.id}`)}
                            >
                              <TableCell className="font-medium">
                                {urun.kod}
                              </TableCell>
                              <TableCell>
                                {urun.ad}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {KATEGORILER.find(k => k.id === urun.kategori)?.ad}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {urun.stokMiktari} {urun.birim}
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {urun.minStokSeviyesi}
                              </TableCell>
                              <TableCell>
                                {urun.stokMiktari <= urun.kritikStokSeviyesi ? (
                                  <Badge variant="destructive" className="gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    Kritik
                                  </Badge>
                                ) : urun.stokMiktari <= urun.minStokSeviyesi ? (
                                  <Badge variant="secondary" className="gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    Azalıyor
                                  </Badge>
                                ) : (
                                  <Badge variant="default" className="bg-success/10 text-success hover:bg-success/20">
                                    Normal
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {urun.alisFiyati.toFixed(2)} {urun.alisFiyatiParaBirimi}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {urun.satisFiyati.toFixed(2)} {urun.satisFiyatiParaBirimi || urun.alisFiyatiParaBirimi}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

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

          <TabsContent value="hareketler" className="space-y-6">
            {/* Filtreler */}
            <Card>
              <CardHeader>
                <CardTitle>Filtreleme</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="baslangicTarihi">Başlangıç Tarihi</Label>
                    <Input
                      id="baslangicTarihi"
                      type="date"
                      value={hareketFiltreler.baslangicTarihi}
                      onChange={(e) =>
                        setHareketFiltreler({ ...hareketFiltreler, baslangicTarihi: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="bitisTarihi">Bitiş Tarihi</Label>
                    <Input
                      id="bitisTarihi"
                      type="date"
                      value={hareketFiltreler.bitisTarihi}
                      onChange={(e) =>
                        setHareketFiltreler({ ...hareketFiltreler, bitisTarihi: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="islemTuru">İşlem Türü</Label>
                    <Select
                      value={hareketFiltreler.islemTuru}
                      onValueChange={(value) =>
                        setHareketFiltreler({ ...hareketFiltreler, islemTuru: value })
                      }
                    >
                      <SelectTrigger id="islemTuru">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hepsi">Tümü</SelectItem>
                        <SelectItem value="giris">Giriş</SelectItem>
                        <SelectItem value="cikis">Çıkış</SelectItem>
                        <SelectItem value="duzeltme">Düzeltme</SelectItem>
                        <SelectItem value="sayim">Sayım</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="urun">Ürün</Label>
                    <Select
                      value={hareketFiltreler.urunId}
                      onValueChange={(value) =>
                        setHareketFiltreler({ ...hareketFiltreler, urunId: value })
                      }
                    >
                      <SelectTrigger id="urun">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hepsi">Tüm Ürünler</SelectItem>
                        {allUrunler.map((urun) => (
                          <SelectItem key={urun.id} value={urun.id}>
                            {urun.ad}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="mt-4">
                  <Button variant="outline" onClick={temizleHareketFiltreler}>
                    Filtreleri Temizle
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Sonuç Özeti */}
            <div className="text-sm text-muted-foreground">
              Toplam {filtrelenmisHareketler.length} hareket bulundu
            </div>

            {/* Hareketler Tablosu */}
            <Card>
              <CardHeader>
                <CardTitle>Stok Hareketleri</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tarih & Saat</TableHead>
                        <TableHead>Ürün</TableHead>
                        <TableHead>İşlem Türü</TableHead>
                        <TableHead className="text-right">Miktar</TableHead>
                        <TableHead className="text-right">Önceki</TableHead>
                        <TableHead className="text-right">Yeni</TableHead>
                        <TableHead>Açıklama</TableHead>
                        <TableHead>Kullanıcı</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtrelenmisHareketler.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            Henüz stok hareketi bulunmamaktadır.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filtrelenmisHareketler.map((hareket) => (
                          <TableRow key={hareket.id}>
                            <TableCell className="whitespace-nowrap">
                              {format(new Date(hareket.tarih), "dd MMM yyyy HH:mm", { locale: tr })}
                            </TableCell>
                            <TableCell>
                              <button
                                onClick={() => {
                                  const urun = allUrunler.find(u => u.id === hareket.urunId);
                                  if (urun) navigate(`/stok/urun/${urun.id}`);
                                }}
                                className="text-primary hover:underline font-medium"
                              >
                                {getUrunAdi(hareket.urunId)}
                              </button>
                            </TableCell>
                            <TableCell>{getIslemTuruBadge(hareket.islemTuru)}</TableCell>
                            <TableCell className="text-right font-semibold">
                              <span className={hareket.islemTuru === 'giris' ? 'text-success' : hareket.islemTuru === 'cikis' ? 'text-destructive' : ''}>
                                {hareket.islemTuru === 'giris' ? '+' : hareket.islemTuru === 'cikis' ? '-' : ''}
                                {hareket.miktar}
                              </span>
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {hareket.oncekiMiktar}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {hareket.yeniMiktar}
                            </TableCell>
                            <TableCell className="max-w-xs truncate" title={hareket.aciklama}>
                              {hareket.aciklama}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{hareket.kullanici}</Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <YeniUrunModal
        open={yeniUrunModalOpen}
        onOpenChange={setYeniUrunModalOpen}
        onSuccess={handleSuccess}
      />
      <HizliStokGirisiModal
        open={hizliStokModalOpen}
        onOpenChange={setHizliStokModalOpen}
        onSuccess={handleSuccess}
      />
      <StokSayimModal
        open={stokSayimModalOpen}
        onOpenChange={setStokSayimModalOpen}
        onSuccess={handleSuccess}
      />
      <BarkodYazdirModal
        open={barkodModalOpen}
        onOpenChange={setBarkodModalOpen}
        urunler={filtrelenmisUrunler}
      />
    </Layout>
  );
}
