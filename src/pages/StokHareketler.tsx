import { useState, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getStokHareketler } from "@/lib/stok-hareket";
import { getUrunler } from "@/lib/stok-data";
import { useNavigate } from "react-router-dom";
import { ArrowUpCircle, ArrowDownCircle, Edit3, ClipboardCheck } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

export default function StokHareketler() {
  const navigate = useNavigate();
  const allHareketler = getStokHareketler();
  const allUrunler = getUrunler();

  const [filtreler, setFiltreler] = useState({
    baslangicTarihi: "",
    bitisTarihi: "",
    islemTuru: "hepsi",
    urunId: "hepsi",
  });

  const filtrelenmisHareketler = useMemo(() => {
    return allHareketler
      .filter((hareket) => {
        // Tarih filtresi
        if (filtreler.baslangicTarihi) {
          const hareketTarih = new Date(hareket.tarih);
          const baslangic = new Date(filtreler.baslangicTarihi);
          baslangic.setHours(0, 0, 0, 0);
          if (hareketTarih < baslangic) return false;
        }

        if (filtreler.bitisTarihi) {
          const hareketTarih = new Date(hareket.tarih);
          const bitis = new Date(filtreler.bitisTarihi);
          bitis.setHours(23, 59, 59, 999);
          if (hareketTarih > bitis) return false;
        }

        // İşlem türü filtresi
        if (filtreler.islemTuru !== "hepsi" && hareket.islemTuru !== filtreler.islemTuru) {
          return false;
        }

        // Ürün filtresi
        if (filtreler.urunId !== "hepsi" && hareket.urunId !== filtreler.urunId) {
          return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime());
  }, [allHareketler, filtreler]);

  const temizleFiltreler = () => {
    setFiltreler({
      baslangicTarihi: "",
      bitisTarihi: "",
      islemTuru: "hepsi",
      urunId: "hepsi",
    });
  };

  const getIslemTuruBadge = (islemTuru: string) => {
    switch (islemTuru) {
      case "giris":
        return (
          <Badge variant="default" className="bg-success/10 text-success border-success/20">
            <ArrowUpCircle className="w-3 h-3 mr-1" />
            Giriş
          </Badge>
        );
      case "cikis":
        return (
          <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20">
            <ArrowDownCircle className="w-3 h-3 mr-1" />
            Çıkış
          </Badge>
        );
      case "duzeltme":
        return (
          <Badge variant="secondary" className="bg-secondary/10 text-secondary-foreground border-secondary/20">
            <Edit3 className="w-3 h-3 mr-1" />
            Düzeltme
          </Badge>
        );
      case "sayim":
        return (
          <Badge variant="outline" className="bg-muted/10 text-muted-foreground">
            <ClipboardCheck className="w-3 h-3 mr-1" />
            Sayım
          </Badge>
        );
      default:
        return <Badge variant="outline">{islemTuru}</Badge>;
    }
  };

  const getUrunAdi = (urunId: string) => {
    const urun = allUrunler.find((u) => u.id === urunId);
    return urun?.ad || "Bilinmeyen Ürün";
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Stok Hareketleri</h1>
          <p className="text-muted-foreground mt-2">
            Ürün giriş/çıkış işlemlerini takip edin
          </p>
        </div>

        {/* Filtreler */}
        <Card>
          <CardHeader>
            <CardTitle>Filtreler</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <Label htmlFor="baslangicTarihi">Başlangıç Tarihi</Label>
                <Input
                  id="baslangicTarihi"
                  type="date"
                  value={filtreler.baslangicTarihi}
                  onChange={(e) =>
                    setFiltreler({ ...filtreler, baslangicTarihi: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="bitisTarihi">Bitiş Tarihi</Label>
                <Input
                  id="bitisTarihi"
                  type="date"
                  value={filtreler.bitisTarihi}
                  onChange={(e) =>
                    setFiltreler({ ...filtreler, bitisTarihi: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="islemTuru">İşlem Türü</Label>
                <Select
                  value={filtreler.islemTuru}
                  onValueChange={(value) =>
                    setFiltreler({ ...filtreler, islemTuru: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="İşlem türü seçin" />
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
                  value={filtreler.urunId}
                  onValueChange={(value) =>
                    setFiltreler({ ...filtreler, urunId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Ürün seçin" />
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

              <div className="flex items-end">
                <Button onClick={temizleFiltreler} variant="outline" className="w-full">
                  Temizle
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sonuç Özeti */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Toplam <strong className="text-foreground">{filtrelenmisHareketler.length}</strong> hareket bulundu
          </p>
        </div>

        {/* Hareketler Tablosu */}
        <Card>
          <CardContent className="p-0">
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
                        Henüz stok hareketi bulunmuyor.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtrelenmisHareketler.map((hareket) => (
                      <TableRow key={hareket.id}>
                        <TableCell className="font-medium">
                          {format(new Date(hareket.tarih), "dd MMM yyyy HH:mm", {
                            locale: tr,
                          })}
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => navigate(`/stok/urun/${hareket.urunId}`)}
                            className="text-primary hover:underline text-left"
                          >
                            {getUrunAdi(hareket.urunId)}
                          </button>
                        </TableCell>
                        <TableCell>{getIslemTuruBadge(hareket.islemTuru)}</TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              hareket.islemTuru === "giris"
                                ? "text-success font-medium"
                                : hareket.islemTuru === "cikis"
                                ? "text-destructive font-medium"
                                : "text-foreground"
                            }
                          >
                            {hareket.islemTuru === "giris" ? "+" : hareket.islemTuru === "cikis" ? "-" : ""}
                            {hareket.miktar}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {hareket.oncekiMiktar}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {hareket.yeniMiktar}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {hareket.aciklama}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {hareket.kullanici}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
