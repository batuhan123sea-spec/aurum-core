import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Phone, Mail, MapPin, FileText, Plus, Package } from "lucide-react";
import { getTedarikciById, getTedarikciAlimlari } from "@/lib/tedarikci-data";
import { getUrunler } from "@/lib/stok-data";
import { formatCurrency } from "@/lib/kur-hesaplama";
import { YeniAlimModal } from "@/components/YeniAlimModal";

export default function TedarikciDetay() {
  const { tedarikciId } = useParams<{ tedarikciId: string }>();
  const navigate = useNavigate();
  const [yeniAlimModalOpen, setYeniAlimModalOpen] = useState(false);

  const tedarikci = tedarikciId ? getTedarikciById(tedarikciId) : null;
  const alimlar = tedarikciId ? getTedarikciAlimlari(tedarikciId) : [];
  const tedarikciUrunleri = tedarikciId 
    ? getUrunler().filter(u => u.tedarikciler.some(t => t.tedarikciId === tedarikciId))
    : [];

  if (!tedarikci) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-foreground">Tedarikçi bulunamadı</h2>
          <Button onClick={() => navigate("/tedarikci/liste")} className="mt-4">
            Tedarikçi Listesine Dön
          </Button>
        </div>
      </Layout>
    );
  }

  const toplamAlim = alimlar.reduce((sum, a) => sum + a.genelToplam, 0);
  const sonAlim = alimlar.length > 0 ? new Date(alimlar[0].tarih) : null;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="text-sm text-muted-foreground">
          <button onClick={() => navigate("/tedarikci/liste")} className="hover:text-primary">
            Dashboard &gt; Tedarikçi Yönetimi
          </button>
          {" > "}
          {tedarikci.firmaAdi}
        </div>

        {/* Başlık */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/tedarikci/liste")}
            >
              <ArrowLeft />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {tedarikci.firmaAdi}
              </h1>
              <p className="text-muted-foreground mt-1">{tedarikci.kod}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setYeniAlimModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Yeni Alım Kaydı
            </Button>
            <Button variant="outline">
              Düzenle
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sol Panel - Tedarikçi Bilgileri */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>İletişim Bilgileri</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Package className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">Yetkili:</span>
                    <span>{tedarikci.yetkiliKisi}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">Telefon:</span>
                    <span>{tedarikci.telefon}</span>
                  </div>
                  
                  {tedarikci.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">Email:</span>
                      <span className="text-primary">{tedarikci.email}</span>
                    </div>
                  )}
                  
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <span className="font-medium">Adres:</span>
                      <p className="text-muted-foreground">{tedarikci.adres}</p>
                    </div>
                  </div>
                  
                  {tedarikci.vergiNo && (
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">Vergi No:</span>
                      <span>{tedarikci.vergiNo}</span>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Durum:</span>
                  <Badge variant={tedarikci.durum === 'aktif' ? 'default' : 'secondary'}>
                    {tedarikci.durum}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* İstatistikler */}
            <Card>
              <CardHeader>
                <CardTitle>İstatistikler</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Toplam Alım Tutarı</p>
                  <p className="text-2xl font-bold text-primary">
                    {toplamAlim.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                  </p>
                </div>
                
                <Separator />
                
                <div>
                  <p className="text-sm text-muted-foreground">Toplam Alım Sayısı</p>
                  <p className="text-xl font-semibold">{alimlar.length} işlem</p>
                </div>
                
                {sonAlim && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground">Son Alım Tarihi</p>
                      <p className="font-medium">
                        {sonAlim.toLocaleDateString('tr-TR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Notlar */}
            {tedarikci.notlar && (
              <Card>
                <CardHeader>
                  <CardTitle>Notlar</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{tedarikci.notlar}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sağ Panel - Tabs */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="alimlar">
              <TabsList>
                <TabsTrigger value="alimlar">Alım Geçmişi</TabsTrigger>
                <TabsTrigger value="urunler">Ürünler ({tedarikciUrunleri.length})</TabsTrigger>
              </TabsList>

              {/* Alım Geçmişi Tab */}
              <TabsContent value="alimlar">
                <Card>
                  <CardHeader>
                    <CardTitle>Alım Geçmişi</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {alimlar.length === 0 ? (
                      <div className="text-center py-12">
                        <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground mb-4">
                          Henüz alım kaydı bulunmuyor
                        </p>
                        <Button onClick={() => setYeniAlimModalOpen(true)}>
                          <Plus className="w-4 h-4 mr-2" />
                          İlk Alımı Kaydet
                        </Button>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tarih</TableHead>
                            <TableHead>Fatura No</TableHead>
                            <TableHead>Ürünler</TableHead>
                            <TableHead className="text-right">Tutar</TableHead>
                            <TableHead>Ödeme</TableHead>
                            <TableHead>Açıklama</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {alimlar.map((alim) => (
                            <TableRow key={alim.id}>
                              <TableCell>
                                {new Date(alim.tarih).toLocaleDateString('tr-TR')}
                              </TableCell>
                              <TableCell className="font-medium">{alim.faturaNo}</TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {alim.urunler.map((u, idx) => (
                                    <div key={idx} className="text-muted-foreground">
                                      {u.urunAdi} ({u.miktar} adet)
                                    </div>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {alim.genelToplam.toFixed(2)} ₺
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={
                                    alim.odemeDurumu === 'odendi' ? 'default' :
                                    alim.odemeDurumu === 'beklemede' ? 'secondary' :
                                    'outline'
                                  }
                                >
                                  {alim.odemeDurumu === 'odendi' ? 'Ödendi' :
                                   alim.odemeDurumu === 'beklemede' ? 'Beklemede' :
                                   'Kısmi'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {alim.aciklama || '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Ürünler Tab */}
              <TabsContent value="urunler">
                <Card>
                  <CardHeader>
                    <CardTitle>Bu Tedarikçiden Alınan Ürünler</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {tedarikciUrunleri.length === 0 ? (
                      <div className="text-center py-12">
                        <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">
                          Bu tedarikçiden henüz ürün kaydı bulunmuyor
                        </p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Ürün</TableHead>
                            <TableHead className="text-right">Alış Fiyatı</TableHead>
                            <TableHead className="text-right">Satış Fiyatı</TableHead>
                            <TableHead className="text-right">Stok</TableHead>
                            <TableHead className="text-right">İşlem</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tedarikciUrunleri.map((urun) => {
                            const tedarikciInfo = urun.tedarikciler.find(t => t.tedarikciId === tedarikciId);
                            return (
                              <TableRow key={urun.id}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <img src="/placeholder.svg" className="w-8 h-8 rounded" alt={urun.ad} />
                                    <div>
                                      <div className="font-medium">{urun.ad}</div>
                                      <div className="text-sm text-muted-foreground">{urun.kod}</div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  {tedarikciInfo && formatCurrency(tedarikciInfo.alisFiyati, tedarikciInfo.paraBirimi)}
                                </TableCell>
                                <TableCell className="text-right font-semibold">
                                  {formatCurrency(urun.satisFiyati, urun.alisFiyatiParaBirimi)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {urun.stokMiktari} {urun.birim}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => navigate(`/stok/urun/${urun.id}`)}
                                  >
                                    Detay
                                  </Button>
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

      <YeniAlimModal
        open={yeniAlimModalOpen}
        onOpenChange={setYeniAlimModalOpen}
        tedarikciId={tedarikci.id}
        onSuccess={() => {
          setYeniAlimModalOpen(false);
        }}
      />
    </Layout>
  );
}
