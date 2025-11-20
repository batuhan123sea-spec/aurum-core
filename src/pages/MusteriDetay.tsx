import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Edit, Printer, DollarSign } from "lucide-react";
import { getMusteriById } from "@/lib/musteri-data";
import { formatCurrency } from "@/lib/kur-hesaplama";
import HesapEkstresiTable from "@/components/HesapEkstresiTable";
import OdemeAlModal from "@/components/OdemeAlModal";

const MusteriDetay = () => {
  const { musteriId } = useParams();
  const navigate = useNavigate();
  const [musteri, setMusteri] = useState(getMusteriById(musteriId || ""));
  const [odemeModalOpen, setOdemeModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("tum");

  useEffect(() => {
    if (musteriId) {
      setMusteri(getMusteriById(musteriId));
    }
  }, [musteriId]);

  if (!musteri) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground mb-4">Müşteri bulunamadı.</p>
          <Button onClick={() => navigate("/musteri/liste")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Müşteri Listesine Dön
          </Button>
        </div>
      </Layout>
    );
  }

  const initials = musteri.adSoyad
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const borcOrani = musteri.krediLimiti
    ? (musteri.toplamBorc / musteri.krediLimiti) * 100
    : 0;

  const handleOdemeSuccess = () => {
    if (musteriId) {
      setMusteri(getMusteriById(musteriId));
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Başlık */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/musteri/liste")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Müşteri Detayı</h1>
            <p className="text-muted-foreground">#{musteri.kod}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Sol Panel - Müşteri Bilgileri */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader className="text-center">
                <Avatar className="w-20 h-20 mx-auto mb-3">
                  <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
                </Avatar>
                <CardTitle>{musteri.adSoyad}</CardTitle>
                <Badge variant={musteri.konum === "ic" ? "default" : "secondary"}>
                  {musteri.konum === "ic" ? "İş Hanı İçi" : "Dışarı"}
                </Badge>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">📞 Telefon:</span>
                    <span>{musteri.telefon}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground">📍 Adres:</span>
                    <span className="flex-1">{musteri.adres}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">💳 Para Birimi:</span>
                    <span>{musteri.varsayilanParaBirimi}</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground mb-1">Toplam Borç</div>
                    <div
                      className={`text-3xl font-bold ${
                        musteri.toplamBorc > 0 ? "text-destructive" : "text-green-600"
                      }`}
                    >
                      {formatCurrency(musteri.toplamBorc, "TRY")}
                    </div>
                  </div>

                  {musteri.krediLimiti && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Kredi Limiti:</span>
                        <span className="font-semibold">
                          {formatCurrency(musteri.krediLimiti, "TRY")}
                        </span>
                      </div>
                      <Progress value={borcOrani} className="h-2" />
                      <p className="text-xs text-muted-foreground text-center">
                        Limit kullanımı: %{borcOrani.toFixed(1)}
                      </p>
                    </div>
                  )}
                </div>

                <Separator />

                {musteri.notlar && (
                  <>
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Notlar:</div>
                      <p className="text-sm text-muted-foreground">{musteri.notlar}</p>
                    </div>
                    <Separator />
                  </>
                )}

                <div className="space-y-2">
                  <Button className="w-full gap-2" onClick={() => setOdemeModalOpen(true)}>
                    <DollarSign className="w-4 h-4" />
                    Ödeme Al
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => navigate(`/musteri/duzenle/${musteri.id}`)}
                  >
                    <Edit className="w-4 h-4" />
                    Düzenle
                  </Button>
                  <Button variant="outline" className="w-full gap-2">
                    <Printer className="w-4 h-4" />
                    Fiş Yazdır
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sağ Panel - Hesap Ekstresi */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Hesap Ekstresi</CardTitle>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList>
                    <TabsTrigger value="tum">Tümü</TabsTrigger>
                    <TabsTrigger value="satis">Satışlar</TabsTrigger>
                    <TabsTrigger value="odeme">Ödemeler</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>

              <CardContent>
                <TabsContent value="tum" className="mt-0">
                  <HesapEkstresiTable musteriId={musteri.id} filter="tum" />
                </TabsContent>
                <TabsContent value="satis" className="mt-0">
                  <HesapEkstresiTable musteriId={musteri.id} filter="satis" />
                </TabsContent>
                <TabsContent value="odeme" className="mt-0">
                  <HesapEkstresiTable musteriId={musteri.id} filter="odeme" />
                </TabsContent>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <OdemeAlModal
        musteri={musteri}
        open={odemeModalOpen}
        onOpenChange={setOdemeModalOpen}
        onSuccess={handleOdemeSuccess}
      />
    </Layout>
  );
};

export default MusteriDetay;
