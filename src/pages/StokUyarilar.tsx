import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, ArrowLeft, TrendingDown, Package, Mail } from "lucide-react";
import { getUrunler } from "@/lib/stok-data";
import { getSatislar } from "@/lib/satis-data";
import { formatCurrency } from "@/lib/kur-hesaplama";

export default function StokUyarilar() {
  const navigate = useNavigate();
  const tumUrunler = getUrunler();
  const tumSatislar = getSatislar();

  const kritikStoklar = tumUrunler.filter(u => u.stokMiktari <= u.kritikStokSeviyesi);
  const dusukStoklar = tumUrunler.filter(u => 
    u.stokMiktari > u.kritikStokSeviyesi && u.stokMiktari <= u.minStokSeviyesi
  );

  // Son 30 günün satış verilerini hesapla
  const son30Gun = new Date();
  son30Gun.setDate(son30Gun.getDate() - 30);

  const getOrtalamaSatis = (urunId: string) => {
    const urunSatislari = tumSatislar.filter(s => 
      new Date(s.tarih) >= son30Gun &&
      s.kalemler.some(k => k.urunId === urunId)
    );
    
    const toplamSatis = urunSatislari.reduce((sum, satis) => {
      const kalem = satis.kalemler.find(k => k.urunId === urunId);
      return sum + (kalem?.adet || 0);
    }, 0);

    return toplamSatis / 30; // Günlük ortalama
  };

  const getTahminiBitisGunu = (urun: typeof tumUrunler[0]) => {
    const ortalama = getOrtalamaSatis(urun.id);
    if (ortalama === 0) return '∞';
    return Math.floor(urun.stokMiktari / ortalama);
  };

  const getOnerilenSiparisMiktari = (urun: typeof tumUrunler[0]) => {
    const ortalama = getOrtalamaSatis(urun.id);
    const ihtiyac = urun.minStokSeviyesi * 2; // 2 aylık stok hedefi
    const eksik = ihtiyac - urun.stokMiktari;
    return Math.max(eksik, Math.ceil(ortalama * 30)); // En az 1 aylık
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="text-sm text-muted-foreground">
          <button onClick={() => navigate("/")} className="hover:text-primary">
            Dashboard
          </button>
          {" > "}
          Stok Uyarıları
        </div>

        {/* Başlık */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/")}
            >
              <ArrowLeft />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Stok Uyarıları</h1>
              <p className="text-muted-foreground mt-1">
                Kritik ve düşük stok seviyesindeki ürünler
              </p>
            </div>
          </div>
        </div>

        {/* Özet Kartlar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-destructive">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Kritik Stok
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-destructive">
                  {kritikStoklar.length}
                </div>
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Acil sipariş gerekli
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-warning">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Düşük Stok
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-warning">
                  {dusukStoklar.length}
                </div>
                <TrendingDown className="w-8 h-8 text-warning" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Sipariş planlanmalı
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-success">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Yeterli Stok
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-success">
                  {tumUrunler.length - kritikStoklar.length - dusukStoklar.length}
                </div>
                <Package className="w-8 h-8 text-success" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                İşlem gerekmiyor
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Kritik Stoklar */}
        {kritikStoklar.length > 0 && (
          <Card className="border-l-4 border-l-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                Kritik Seviye - Acil Sipariş Gerekli
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ürün</TableHead>
                    <TableHead className="text-center">Mevcut / Min / Kritik</TableHead>
                    <TableHead className="text-center">Günlük Ort.</TableHead>
                    <TableHead className="text-center">Tükenme</TableHead>
                    <TableHead className="text-right">Önerilen Sipariş</TableHead>
                    <TableHead className="text-center">Tedarikçi</TableHead>
                    <TableHead className="text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kritikStoklar.map((urun) => {
                    const ortalama = getOrtalamaSatis(urun.id);
                    const bitis = getTahminiBitisGunu(urun);
                    const onerilenMiktar = getOnerilenSiparisMiktari(urun);
                    
                    return (
                      <TableRow key={urun.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <img src="/placeholder.svg" className="w-10 h-10 rounded" alt={urun.ad} />
                            <div>
                              <div 
                                className="font-medium cursor-pointer hover:text-primary"
                                onClick={() => navigate(`/stok/urun/${urun.id}`)}
                              >
                                {urun.ad}
                              </div>
                              <div className="text-xs text-muted-foreground">{urun.kod}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col">
                            <span className="font-bold text-destructive">{urun.stokMiktari}</span>
                            <span className="text-xs text-muted-foreground">
                              {urun.minStokSeviyesi} / {urun.kritikStokSeviyesi} {urun.birim}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">
                            {ortalama.toFixed(2)} {urun.birim}/gün
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="destructive">
                            {bitis} gün
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-semibold text-primary">
                            {onerilenMiktar} {urun.birim}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ≈ {formatCurrency(onerilenMiktar * urun.alisFiyati, urun.alisFiyatiParaBirimi)}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div 
                            className="text-sm cursor-pointer hover:text-primary"
                            onClick={() => navigate(`/tedarikci/detay/${urun.tedarikciler[0]?.tedarikciId}`)}
                          >
                            {urun.tedarikciler[0]?.tedarikciAdi || '-'}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="default">
                              <Package className="w-4 h-4 mr-2" />
                              Sipariş Ver
                            </Button>
                            <Button size="sm" variant="outline">
                              <Mail className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Düşük Stoklar */}
        {dusukStoklar.length > 0 && (
          <Card className="border-l-4 border-l-warning">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-warning">
                <TrendingDown className="w-5 h-5" />
                Düşük Seviye - Sipariş Planlanmalı
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ürün</TableHead>
                    <TableHead className="text-center">Mevcut / Min</TableHead>
                    <TableHead className="text-center">Günlük Ort.</TableHead>
                    <TableHead className="text-center">Tükenme</TableHead>
                    <TableHead className="text-right">Önerilen Sipariş</TableHead>
                    <TableHead className="text-center">Tedarikçi</TableHead>
                    <TableHead className="text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dusukStoklar.map((urun) => {
                    const ortalama = getOrtalamaSatis(urun.id);
                    const bitis = getTahminiBitisGunu(urun);
                    const onerilenMiktar = getOnerilenSiparisMiktari(urun);
                    
                    return (
                      <TableRow key={urun.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <img src="/placeholder.svg" className="w-10 h-10 rounded" alt={urun.ad} />
                            <div>
                              <div 
                                className="font-medium cursor-pointer hover:text-primary"
                                onClick={() => navigate(`/stok/urun/${urun.id}`)}
                              >
                                {urun.ad}
                              </div>
                              <div className="text-xs text-muted-foreground">{urun.kod}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col">
                            <span className="font-bold text-warning">{urun.stokMiktari}</span>
                            <span className="text-xs text-muted-foreground">
                              {urun.minStokSeviyesi} {urun.birim}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">
                            {ortalama.toFixed(2)} {urun.birim}/gün
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">
                            {bitis} gün
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-semibold text-primary">
                            {onerilenMiktar} {urun.birim}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ≈ {formatCurrency(onerilenMiktar * urun.alisFiyati, urun.alisFiyatiParaBirimi)}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div 
                            className="text-sm cursor-pointer hover:text-primary"
                            onClick={() => navigate(`/tedarikci/detay/${urun.tedarikciler[0]?.tedarikciId}`)}
                          >
                            {urun.tedarikciler[0]?.tedarikciAdi || '-'}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="outline">
                              <Package className="w-4 h-4 mr-2" />
                              Sipariş Ver
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {kritikStoklar.length === 0 && dusukStoklar.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Package className="w-16 h-16 mx-auto text-success mb-4" />
              <h3 className="text-xl font-semibold mb-2">Tüm Stoklar Yeterli!</h3>
              <p className="text-muted-foreground">
                Şu anda kritik veya düşük stok seviyesinde ürün bulunmuyor.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
