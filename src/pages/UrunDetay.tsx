import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { ArrowLeft, Pencil, Download, Printer, Edit, Trash2 } from "lucide-react";
import Barcode from 'react-barcode';
import { YeniUrunModal } from "@/components/YeniUrunModal";
import { AlimDuzenleModal } from "@/components/AlimDuzenleModal";
import { getUrunler, saveUrun, generateBarkod } from "@/lib/stok-data";
import { getTedarikciAlimlar, deleteTedarikciAlim } from "@/lib/tedarikci-data";
import { formatCurrency } from "@/lib/kur-hesaplama";
import { stokHareketKaydet } from "@/lib/stok-hareket";
import { toast } from "@/hooks/use-toast";
import { TedarikciAlim } from "@/types/tedarikci";

export default function UrunDetay() {
  const { urunId } = useParams<{ urunId: string }>();
  const navigate = useNavigate();
  const [duzenleModalAcik, setDuzenleModalAcik] = useState(false);
  const [alimDuzenleModalAcik, setAlimDuzenleModalAcik] = useState(false);
  const [secilenAlim, setSecilenAlim] = useState<TedarikciAlim | null>(null);
  const [silinecekAlimId, setSilinecekAlimId] = useState<string | null>(null);
  const [yenilemeKey, setYenilemeKey] = useState(0);
  
  const urun = getUrunler().find(u => u.id === urunId);
  
  if (!urun) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-foreground">Ürün bulunamadı</h2>
          <Button onClick={() => navigate("/stok/urunler")} className="mt-4">
            Stok Listesine Dön
          </Button>
        </div>
      </Layout>
    );
  }

  // Alım geçmişi - tüm alımlardan bu ürünü filtrele
  const tumAlimlar = getTedarikciAlimlar();
  const urunAlimlari = tumAlimlar
    .map(alim => ({
      ...alim,
      urun: alim.urunler.find(u => u.urunId === urunId)
    }))
    .filter(alim => alim.urun);

  const handleAlimDuzenle = (alim: TedarikciAlim) => {
    setSecilenAlim(alim);
    setAlimDuzenleModalAcik(true);
  };

  const handleAlimSil = () => {
    if (!silinecekAlimId || !urunId) return;

    const alim = tumAlimlar.find(a => a.id === silinecekAlimId);
    if (!alim) return;

    const urunItem = alim.urunler.find(u => u.urunId === urunId);
    if (!urunItem) return;

    // Stoktan düş
    const urunler = getUrunler();
    const simdikiUrun = urunler.find(u => u.id === urunId);
    if (!simdikiUrun) return;

    const yeniStok = simdikiUrun.stokMiktari - urunItem.miktar;
    saveUrun({ ...simdikiUrun, stokMiktari: yeniStok });

    // Stok hareketi kaydet
    stokHareketKaydet(
      urunId,
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

  const stokDurumu = 
    urun.stokMiktari <= urun.kritikStokSeviyesi 
      ? 'kritik' 
      : urun.stokMiktari <= urun.minStokSeviyesi 
      ? 'dusuk' 
      : 'yeterli';

  return (
    <Layout>
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

                {/* Barkod Bölümü */}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Barkod</p>
                  
                  {!urun.barkod || urun.barkod.length !== 13 ? (
                    <div className="text-center py-8 border rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground mb-4">Barkod bulunamadı</p>
                      <Button
                        onClick={() => {
                          const yeniBarkod = generateBarkod();
                          const guncellenmisUrun = { ...urun, barkod: yeniBarkod };
                          saveUrun(guncellenmisUrun);
                          window.location.reload();
                        }}
                      >
                        Barkod Oluştur
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="bg-white p-4 rounded-lg border barcode-print-area">
                        <Barcode 
                          value={urun.barkod} 
                          format="EAN13"
                          width={2}
                          height={60}
                          displayValue={true}
                          fontSize={14}
                        />
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => window.print()}
                          className="flex-1"
                        >
                          <Printer className="w-4 h-4 mr-2" />
                          Yazdır
                        </Button>
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const svg = document.querySelector('.barcode-print-area svg');
                            if (!svg) return;
                            const svgData = new XMLSerializer().serializeToString(svg);
                            const canvas = document.createElement("canvas");
                            const ctx = canvas.getContext("2d");
                            const img = new Image();
                            img.onload = () => {
                              canvas.width = img.width;
                              canvas.height = img.height;
                              ctx?.drawImage(img, 0, 0);
                              const pngFile = canvas.toDataURL("image/png");
                              const downloadLink = document.createElement("a");
                              downloadLink.download = `barkod-${urun.kod}.png`;
                              downloadLink.href = pngFile;
                              downloadLink.click();
                            };
                            img.src = "data:image/svg+xml;base64," + btoa(svgData);
                          }}
                          className="flex-1"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          İndir
                        </Button>
                      </div>
                    </>
                  )}
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

                  {urun.aciklama && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Açıklama</p>
                        <p className="text-sm">{urun.aciklama}</p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sağ Panel - Tabs */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="tedarikciler-alimlar">
              <TabsList>
                <TabsTrigger value="tedarikciler-alimlar">Tedarikçiler & Alımlar</TabsTrigger>
              </TabsList>

              {/* Tedarikçiler & Alımlar Tab - Birleştirilmiş */}
              <TabsContent value="tedarikciler-alimlar">
                <Card>
                  <CardHeader>
                    <CardTitle>Tedarikçiler & Alım Geçmişi</CardTitle>
                  </CardHeader>
                  <CardContent>
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
                                    onClick={() => navigate(`/tedarikci/detay/${alim.tedarikciId}`)}
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

      {urunId && (
        <AlimDuzenleModal
          open={alimDuzenleModalAcik}
          onOpenChange={setAlimDuzenleModalAcik}
          alim={secilenAlim}
          urunId={urunId}
          onSuccess={() => setYenilemeKey(prev => prev + 1)}
        />
      )}

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
    </Layout>
  );
}
