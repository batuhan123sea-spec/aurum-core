import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardList, Eye, ShoppingCart, X, Printer } from "lucide-react";
import { getRezervler, getSatislar } from "@/lib/satis-data";
import { saveSatis } from "@/lib/satis-data";
import { RezervSatisModal } from "@/components/RezervSatisModal";
import { rezervFisiOlustur, fisYazdir } from "@/lib/fis-yazdir";
import { toast } from "@/hooks/use-toast";
import { bigParaKurCek } from "@/lib/kur-api";
import { kurlarıKaydet, getKurYasi } from "@/lib/kur-hesaplama";
import { tumMusteriBorclariniGuncelle } from "@/lib/musteri-data";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function RezervListe() {
  const [rezervler, setRezervler] = useState(getRezervler());
  const [secilenRezervId, setSecilenRezervId] = useState<string | null>(null);
  const [satisModalAcik, setSatisModalAcik] = useState(false);
  const [iptalModalAcik, setIptalModalAcik] = useState(false);
  const [detayModalAcik, setDetayModalAcik] = useState(false);
  const [iptalEdilecekRezervId, setIptalEdilecekRezervId] = useState<string | null>(null);

  // Sayfa açıldığında kurları kontrol et
  useEffect(() => {
    const kurYasi = getKurYasi();
    
    if (kurYasi > 10) {
      console.log(`Kurlar ${kurYasi} dakika önce güncellenmiş, yenileniyor...`);
      
      bigParaKurCek().then(yeniKurlar => {
        if (yeniKurlar) {
          kurlarıKaydet(yeniKurlar.usd, yeniKurlar.eur);
          tumMusteriBorclariniGuncelle();
          
          toast({
            title: "Kurlar Güncellendi",
            description: `USD: ${yeniKurlar.usd.toFixed(2)} ₺ | EUR: ${yeniKurlar.eur.toFixed(2)} ₺`,
          });
        }
      }).catch(error => {
        console.error('Kur güncelleme hatası:', error);
      });
    }
  }, []);

  const rezervYenile = () => {
    setRezervler(getRezervler());
  };

  const rezervIptalEt = () => {
    if (!iptalEdilecekRezervId) return;

    const satislar = getSatislar();
    const rezerv = satislar.find(s => s.id === iptalEdilecekRezervId);
    
    if (rezerv) {
      rezerv.rezervDurumu = 'iptal';
      rezerv.durum = 'iptal';
      saveSatis(rezerv);
      
      toast({
        title: "Rezerv İptal Edildi",
        description: `${rezerv.satisNo} nolu rezervasyon iptal edildi.`,
      });
      
      rezervYenile();
    }
    
    setIptalModalAcik(false);
    setIptalEdilecekRezervId(null);
  };

  const rezervFisiYazdir = (rezervId: string) => {
    const rezerv = getSatislar().find(s => s.id === rezervId);
    if (rezerv) {
      const fis = rezervFisiOlustur(rezerv);
      fisYazdir(fis);
    }
  };

  const secilenRezervDetay = secilenRezervId 
    ? getSatislar().find(s => s.id === secilenRezervId)
    : null;

  // Tüm rezervler (beklemede, tamamlandı, iptal)
  const tumRezervler = getSatislar().filter(s => s.satisTuru === 'rezerv');
  const bekleyenRezervler = tumRezervler.filter(r => r.rezervDurumu === 'beklemede');
  const tamamlananRezervler = tumRezervler.filter(r => r.rezervDurumu === 'tamamlandi');
  const iptalEdilenRezervler = tumRezervler.filter(r => r.rezervDurumu === 'iptal');

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Rezervasyonlar</h1>
          <p className="text-muted-foreground">Müşteri rezervasyonlarını yönetin</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Beklemede</CardTitle>
              <ClipboardList className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bekleyenRezervler.length}</div>
              <p className="text-xs text-muted-foreground">Aktif rezervasyon</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Tamamlanan</CardTitle>
              <ShoppingCart className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tamamlananRezervler.length}</div>
              <p className="text-xs text-muted-foreground">Satışa dönüştürüldü</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">İptal Edilen</CardTitle>
              <X className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{iptalEdilenRezervler.length}</div>
              <p className="text-xs text-muted-foreground">İptal edildi</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Bekleyen Rezervasyonlar</CardTitle>
          </CardHeader>
          <CardContent>
            {bekleyenRezervler.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">Bekleyen rezervasyon yok</h3>
                <p className="text-muted-foreground">Yeni satış sayfasından rezervasyon oluşturabilirsiniz.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rezerv No</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Ürün Sayısı</TableHead>
                    <TableHead className="text-right">Toplam Tutar</TableHead>
                    <TableHead>Not</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bekleyenRezervler.map((rezerv) => (
                    <TableRow key={rezerv.id}>
                      <TableCell className="font-medium">{rezerv.satisNo}</TableCell>
                      <TableCell>
                        {new Date(rezerv.tarih).toLocaleDateString('tr-TR')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {rezerv.kalemler.length} ürün
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {rezerv.genelToplam.toFixed(2)} ₺
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {rezerv.rezervNotu || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSecilenRezervId(rezerv.id);
                              setDetayModalAcik(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => rezervFisiYazdir(rezerv.id)}
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSecilenRezervId(rezerv.id);
                              setSatisModalAcik(true);
                            }}
                          >
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            Satışa Dönüştür
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setIptalEdilecekRezervId(rezerv.id);
                              setIptalModalAcik(true);
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Tamamlanan ve İptal Edilen Rezervler */}
        {(tamamlananRezervler.length > 0 || iptalEdilenRezervler.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle>Geçmiş Rezervasyonlar</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rezerv No</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Ürün Sayısı</TableHead>
                    <TableHead className="text-right">Toplam Tutar</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...tamamlananRezervler, ...iptalEdilenRezervler]
                    .sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime())
                    .map((rezerv) => (
                      <TableRow key={rezerv.id}>
                        <TableCell className="font-medium">{rezerv.satisNo}</TableCell>
                        <TableCell>
                          {new Date(rezerv.tarih).toLocaleDateString('tr-TR')}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={rezerv.rezervDurumu === 'tamamlandi' ? 'default' : 'destructive'}
                          >
                            {rezerv.rezervDurumu === 'tamamlandi' ? 'Tamamlandı' : 'İptal'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {rezerv.kalemler.length} ürün
                        </TableCell>
                        <TableCell className="text-right">
                          {rezerv.genelToplam.toFixed(2)} ₺
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSecilenRezervId(rezerv.id);
                              setDetayModalAcik(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Satışa Dönüştür Modal */}
      {secilenRezervId && (
        <RezervSatisModal
          open={satisModalAcik}
          onOpenChange={setSatisModalAcik}
          rezervId={secilenRezervId}
          onSuccess={rezervYenile}
        />
      )}

      {/* İptal Onay Dialog */}
      <AlertDialog open={iptalModalAcik} onOpenChange={setIptalModalAcik}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rezervasyonu İptal Et</AlertDialogTitle>
            <AlertDialogDescription>
              Bu rezervasyonu iptal etmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction onClick={rezervIptalEt} className="bg-destructive hover:bg-destructive/90">
              İptal Et
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Detay Modal */}
      <Dialog open={detayModalAcik} onOpenChange={setDetayModalAcik}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Rezervasyon Detayları - {secilenRezervDetay?.satisNo}</DialogTitle>
          </DialogHeader>
          {secilenRezervDetay && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Tarih</p>
                  <p className="font-medium">
                    {new Date(secilenRezervDetay.tarih).toLocaleDateString('tr-TR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Durum</p>
                  <Badge 
                    variant={
                      secilenRezervDetay.rezervDurumu === 'beklemede' ? 'secondary' :
                      secilenRezervDetay.rezervDurumu === 'tamamlandi' ? 'default' : 'destructive'
                    }
                  >
                    {secilenRezervDetay.rezervDurumu === 'beklemede' ? 'Beklemede' :
                     secilenRezervDetay.rezervDurumu === 'tamamlandi' ? 'Tamamlandı' : 'İptal'}
                  </Badge>
                </div>
              </div>

              {secilenRezervDetay.rezervNotu && (
                <div>
                  <p className="text-sm text-muted-foreground">Not</p>
                  <p className="font-medium">{secilenRezervDetay.rezervNotu}</p>
                </div>
              )}

              <div>
                <h4 className="font-semibold mb-2">Ürünler</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ürün</TableHead>
                      <TableHead className="text-center">Adet</TableHead>
                      <TableHead className="text-right">Birim Fiyat</TableHead>
                      <TableHead className="text-right">Toplam</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {secilenRezervDetay.kalemler.map((kalem) => (
                      <TableRow key={kalem.id}>
                        <TableCell>{kalem.urunAdi}</TableCell>
                        <TableCell className="text-center">{kalem.adet}</TableCell>
                        <TableCell className="text-right">{kalem.birimFiyati.toFixed(2)} ₺</TableCell>
                        <TableCell className="text-right">{kalem.toplamTutar.toFixed(2)} ₺</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ara Toplam:</span>
                  <span className="font-medium">{secilenRezervDetay.araToplam.toFixed(2)} ₺</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">KDV:</span>
                  <span className="font-medium">{secilenRezervDetay.toplamKDV.toFixed(2)} ₺</span>
                </div>
                {secilenRezervDetay.genelIndirimTL > 0 && (
                  <div className="flex justify-between text-sm text-success">
                    <span>İndirim:</span>
                    <span>-{secilenRezervDetay.genelIndirimTL.toFixed(2)} ₺</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Genel Toplam:</span>
                  <span>{secilenRezervDetay.genelToplam.toFixed(2)} ₺</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
