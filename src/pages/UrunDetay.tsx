import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Package, TrendingUp, TrendingDown, History, Pencil } from "lucide-react";
import { YeniUrunModal } from "@/components/YeniUrunModal";
import { getUrunler } from "@/lib/stok-data";
import { getTedarikciAlimlari } from "@/lib/tedarikci-data";
import { getSatislar } from "@/lib/satis-data";
import { getUrunHareketleri } from "@/lib/stok-hareket";
import { formatCurrency } from "@/lib/kur-hesaplama";
export default function UrunDetay() {
  const {
    urunId
  } = useParams<{
    urunId: string;
  }>();
  const navigate = useNavigate();
  const [duzenleModalAcik, setDuzenleModalAcik] = useState(false);
  const urun = getUrunler().find(u => u.id === urunId);
  if (!urun) {
    return <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-foreground">Ürün bulunamadı</h2>
          <Button onClick={() => navigate("/stok/urunler")} className="mt-4">
            Stok Listesine Dön
          </Button>
        </div>
      </Layout>;
  }

  // Alım geçmişi - tüm alımlardan bu ürünü filtrele
  const tumAlimlar = getTedarikciAlimlari('');
  const urunAlimlari = tumAlimlar.map(alim => ({
    ...alim,
    urun: alim.urunler.find(u => u.urunId === urunId)
  })).filter(alim => alim.urun);

  // Satış geçmişi
  const tumSatislar = getSatislar();
  const urunSatislari = tumSatislar.filter(satis => satis.kalemler.some(k => k.urunId === urunId)).map(satis => ({
    ...satis,
    kalem: satis.kalemler.find(k => k.urunId === urunId)!
  }));

  // Stok hareketleri
  const stokHareketleri = getUrunHareketleri(urunId);
  const stokDurumu = urun.stokMiktari <= urun.kritikStokSeviyesi ? 'kritik' : urun.stokMiktari <= urun.minStokSeviyesi ? 'dusuk' : 'yeterli';
  return <Layout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="text-sm text-muted-foreground">
          <button onClick={() => navigate("/stok/urunler")} className="hover:text-primary">
            Dashboard &gt; Stok Yönetimi
          </button>
          {" > "}
          {urun.ad}
        </div>

        {/* Başlık */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{urun.ad}</h1>
              <p className="text-muted-foreground mt-1">{urun.kod} • {urun.barkod}</p>
            </div>
          </div>
          <Button 
            onClick={() => setDuzenleModalAcik(true)}
            className="gap-2"
          >
            <Pencil className="w-4 h-4" />
            Düzenle
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sol Panel - Ürün Bilgileri */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Ürün Bilgileri</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                  <img src="/placeholder.svg" alt={urun.ad} className="w-full h-full object-cover" />
                </div>

                <Separator />

                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Kategori</p>
                    <p className="font-medium">{urun.kategori}</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Birim</p>
                    <p className="font-medium">{urun.birim}</p>
                  </div>

                  <Separator />

                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Stok Durumu</p>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-2xl">{urun.stokMiktari}</span>
                      <Badge variant={stokDurumu === 'kritik' ? 'destructive' : stokDurumu === 'dusuk' ? 'outline' : 'default'}>
                        {stokDurumu === 'kritik' ? 'KRİTİK' : stokDurumu === 'dusuk' ? 'DÜŞÜK' : 'YETER Lİ'}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div className="flex justify-between">
                        <span>Minimum:</span>
                        <span>{urun.minStokSeviyesi}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Kritik:</span>
                        <span>{urun.kritikStokSeviyesi}</span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <p className="text-sm text-muted-foreground">Alış Fiyatı</p>
                    <p className="font-bold text-xl">
                      {formatCurrency(urun.alisFiyati, urun.alisFiyatiParaBirimi)}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Satış Fiyatı</p>
                    <p className="font-bold text-xl text-primary">
                      {formatCurrency(urun.satisFiyati, urun.alisFiyatiParaBirimi)}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Kar Marjı</p>
                    <p className="font-semibold text-success">%{urun.karMarji?.toFixed(2) || '0.00'}</p>
                  </div>

                  {urun.aciklama && <>
                      <Separator />
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Açıklama</p>
                        <p className="text-sm">{urun.aciklama}</p>
                      </div>
                    </>}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sağ Panel - Tabs */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="tedarikciler">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="tedarikciler">Tedarikçiler</TabsTrigger>
                <TabsTrigger value="alimlar">Alım Geçmişi</TabsTrigger>
                <TabsTrigger value="satislar">Satışlar</TabsTrigger>
                <TabsTrigger value="hareketler">Stok Hareketleri</TabsTrigger>
              </TabsList>

              {/* Tedarikçiler Tab */}
              <TabsContent value="tedarikciler">
                <Card>
                  <CardHeader>
                    <CardTitle>Tedarikçi Bilgileri</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!urun.tedarikciler || urun.tedarikciler.length === 0 ? <p className="text-center text-muted-foreground py-8">
                        Tedarikçi bilgisi bulunamadı
                      </p> : <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tedarikçi</TableHead>
                            <TableHead className="text-right">Alış Fiyatı</TableHead>
                            <TableHead className="text-center">Teslimat Süresi</TableHead>
                            <TableHead className="text-center">Son Alış</TableHead>
                            <TableHead className="text-center">Durum</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {urun.tedarikciler.map(tedarikci => <TableRow key={tedarikci.id}>
                              <TableCell>
                                <div className="font-medium cursor-pointer hover:text-primary" onClick={() => navigate(`/tedarikci/detay/${tedarikci.tedarikciId}`)}>
                                  {tedarikci.tedarikciAdi}
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {formatCurrency(tedarikci.alisFiyati, tedarikci.paraBirimi)}
                              </TableCell>
                              <TableCell className="text-center">
                                {tedarikci.teslimatSuresi} gün
                              </TableCell>
                              <TableCell className="text-center text-sm">
                                {tedarikci.sonAlisTarihi 
                                  ? new Date(tedarikci.sonAlisTarihi).toLocaleDateString('tr-TR')
                                  : '-'
                                }
                              </TableCell>
                              <TableCell className="text-center">
                                {tedarikci.varsayilan && <Badge variant="default">Varsayılan</Badge>}
                              </TableCell>
                            </TableRow>)}
                        </TableBody>
                      </Table>}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Alım Geçmişi Tab */}
              <TabsContent value="alimlar">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Alım Geçmişi</CardTitle>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-success" />
                        <span className="text-sm text-muted-foreground">
                          Toplam: {urunAlimlari.reduce((sum, a) => sum + (a.urun?.miktar || 0), 0)} adet
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {urunAlimlari.length === 0 ? <p className="text-center text-muted-foreground py-8">
                        Alım kaydı bulunamadı
                      </p> : <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tarih</TableHead>
                            <TableHead>Fatura No</TableHead>
                            <TableHead className="text-right">Miktar</TableHead>
                            <TableHead className="text-right">Birim Fiyat</TableHead>
                            <TableHead className="text-right">Toplam</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {urunAlimlari.map(alim => <TableRow key={alim.id}>
                              <TableCell>
                                {new Date(alim.tarih).toLocaleDateString('tr-TR')}
                              </TableCell>
                              <TableCell className="font-medium">{alim.faturaNo}</TableCell>
                              <TableCell className="text-right">
                                {alim.urun?.miktar} adet
                              </TableCell>
                              <TableCell className="text-right">
                                {alim.urun?.birimFiyat?.toFixed(2) || '0.00'} {alim.urun?.paraBirimi || 'TRY'}
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {alim.urun?.toplamTutar?.toFixed(2) || '0.00'} {alim.urun?.paraBirimi || 'TRY'}
                              </TableCell>
                            </TableRow>)}
                        </TableBody>
                      </Table>}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Satışlar Tab */}
              <TabsContent value="satislar">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Satış Geçmişi</CardTitle>
                      <div className="flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-destructive" />
                        <span className="text-sm text-muted-foreground">
                          Toplam: {urunSatislari.reduce((sum, s) => sum + s.kalem.adet, 0)} adet
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {urunSatislari.length === 0 ? <p className="text-center text-muted-foreground py-8">
                        Satış kaydı bulunamadı
                      </p> : <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tarih</TableHead>
                            <TableHead>Satış No</TableHead>
                            <TableHead>Müşteri</TableHead>
                            <TableHead className="text-right">Adet</TableHead>
                            <TableHead className="text-right">Fiyat</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {urunSatislari.map(satis => <TableRow key={satis.id}>
                              <TableCell>
                                {new Date(satis.tarih).toLocaleDateString('tr-TR')}
                              </TableCell>
                              <TableCell className="font-medium">{satis.satisNo}</TableCell>
                              <TableCell>
                                {satis.musteriAdi || 'Hızlı Satış'}
                              </TableCell>
                              <TableCell className="text-right">
                                {satis.kalem.adet} adet
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {satis.kalem.birimFiyati?.toFixed(2) || '0.00'} ₺
                              </TableCell>
                            </TableRow>)}
                        </TableBody>
                      </Table>}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Stok Hareketleri Tab */}
              <TabsContent value="hareketler">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <History className="w-5 h-5" />
                      Stok Hareketleri
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {stokHareketleri.length === 0 ? <p className="text-center text-muted-foreground py-8">
                        Stok hareketi bulunamadı
                      </p> : <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tarih</TableHead>
                            <TableHead>İşlem Türü</TableHead>
                            <TableHead className="text-right">Miktar</TableHead>
                            <TableHead className="text-right">Önceki</TableHead>
                            <TableHead className="text-right">Yeni</TableHead>
                            <TableHead>Açıklama</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stokHareketleri.map(hareket => <TableRow key={hareket.id}>
                              <TableCell>
                                {new Date(hareket.tarih).toLocaleString('tr-TR')}
                              </TableCell>
                              <TableCell>
                                <Badge variant={hareket.islemTuru === 'giris' ? 'default' : hareket.islemTuru === 'cikis' ? 'destructive' : 'outline'}>
                                  {hareket.islemTuru.toUpperCase()}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {hareket.islemTuru === 'giris' ? '+' : '-'}{hareket.miktar}
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {hareket.oncekiMiktar}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {hareket.yeniMiktar}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {hareket.aciklama}
                              </TableCell>
                            </TableRow>)}
                        </TableBody>
                      </Table>}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      <YeniUrunModal
        open={duzenleModalAcik}
        onOpenChange={setDuzenleModalAcik}
        editMode={true}
        initialData={urun}
        onSuccess={() => {
          setDuzenleModalAcik(false);
          window.location.reload();
        }}
      />
    </Layout>;
}