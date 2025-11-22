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
import { ArrowLeft, Edit, DollarSign, Receipt, TestTube2 } from "lucide-react";
import { getMusteriById } from "@/lib/musteri-data";
import { useToast } from "@/hooks/use-toast";
import { yukle5HaftalikTestVerisi } from "@/lib/test-veri-yukleyici";
import { formatCurrency, getGuncelKurlar } from "@/lib/kur-hesaplama";
import HesapEkstresiTable from "@/components/HesapEkstresiTable";
import OdemeAlModal from "@/components/OdemeAlModal";
import { HaftalikTahsilatFisiModal } from "@/components/HaftalikTahsilatFisiModal";
import { SatisGecmisiTable } from "@/components/SatisGecmisiTable";
import MusteriBorcTimeline from "@/components/MusteriBorcTimeline";
import MusteriDefterGorunumu from "@/components/MusteriDefterGorunumu";

const MusteriDetay = () => {
  const { musteriId } = useParams();
  const navigate = useNavigate();
  const [musteri, setMusteri] = useState(getMusteriById(musteriId || ""));
  const [odemeModalOpen, setOdemeModalOpen] = useState(false);
  const [tahsilatFisiModalOpen, setTahsilatFisiModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("tum");
  const { toast } = useToast();

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
    ? (musteri.toplamBorcTL / musteri.krediLimiti) * 100
    : 0;

  const guncelKurlar = getGuncelKurlar();

  const handleOdemeSuccess = () => {
    if (musteriId) {
      setMusteri(getMusteriById(musteriId));
    }
  };

  const handleTestVeriYukle = () => {
    if (!musteriId) return;
    
    const sonuc = yukle5HaftalikTestVerisi(musteriId);
    toast({
      title: sonuc.yuklendiMi ? "✅ Başarılı!" : "❌ Hata",
      description: sonuc.mesaj,
      duration: 5000,
    });
    
    if (sonuc.yuklendiMi) {
      setTimeout(() => {
        window.location.reload();
      }, 1500);
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
              
              {musteri.email && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">📧 E-posta:</span>
                  <span>{musteri.email}</span>
                </div>
              )}
              
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground">📍 Adres:</span>
                <span className="flex-1">{musteri.adres}</span>
              </div>
              
              {musteri.vergiNoTcKimlik && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">🆔 Vergi/TC:</span>
                  <span>{musteri.vergiNoTcKimlik}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">💳 Para Birimi:</span>
                <span>{musteri.varsayilanParaBirimi}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">📅 Kayıt Tarihi:</span>
                <span>{new Date(musteri.olusturmaTarihi).toLocaleDateString('tr-TR')}</span>
              </div>
            </div>

                <Separator />

                <div className="space-y-4">
                  <div className="text-sm font-medium text-muted-foreground">Borç Detayları</div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1 p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">TRY Borç</p>
                      <p className="text-lg font-bold">
                        {formatCurrency(musteri.borclar.TRY, 'TRY')}
                      </p>
                    </div>
                    
                    <div className="space-y-1 p-3 bg-blue-500/10 rounded-lg">
                      <p className="text-xs text-muted-foreground">USD Borç</p>
                      <p className="text-lg font-bold text-blue-600">
                        {formatCurrency(musteri.borclar.USD, 'USD')}
                      </p>
                      {musteri.borclar.USD > 0 && (
                        <p className="text-xs text-muted-foreground">
                          ≈ {formatCurrency(musteri.borclar.USD * guncelKurlar.usd, 'TRY')}
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-1 p-3 bg-green-500/10 rounded-lg">
                      <p className="text-xs text-muted-foreground">EUR Borç</p>
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(musteri.borclar.EUR, 'EUR')}
                      </p>
                      {musteri.borclar.EUR > 0 && (
                        <p className="text-xs text-muted-foreground">
                          ≈ {formatCurrency(musteri.borclar.EUR * guncelKurlar.eur, 'TRY')}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground mb-1">Toplam Borç (TL Karşılığı)</div>
                    <div
                      className={`text-3xl font-bold ${
                        musteri.toplamBorcTL > 0 ? "text-destructive" : "text-green-600"
                      }`}
                    >
                      {formatCurrency(musteri.toplamBorcTL, "TRY")}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Güncel kurlarla hesaplanmış toplam
                    </p>
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
                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={() => setTahsilatFisiModalOpen(true)}
                  >
                    <Receipt className="w-4 h-4" />
                    Haftalık Tahsilat Fişi
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sağ Panel - Hesap Ekstresi ve Satış Geçmişi */}
          <div className="lg:col-span-2">
            <Card>
              <Tabs defaultValue="defter" className="w-full">
                <CardHeader>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="defter">📖 Defter Görünümü</TabsTrigger>
              <TabsTrigger value="satis-gecmisi">📊 Satış Geçmişi</TabsTrigger>
            </TabsList>
                </CardHeader>

            <CardContent>
              <TabsContent value="defter" className="mt-4 space-y-4">
                <div className="flex justify-end">
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={handleTestVeriYukle}
                    className="gap-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 hover:from-purple-500/30 hover:to-blue-500/30 border-purple-500/50"
                  >
                    <TestTube2 className="w-4 h-4" />
                    🧪 Test Verisi Yükle (5 Hafta)
                  </Button>
                </div>
                <MusteriDefterGorunumu musteriId={musteri.id} />
              </TabsContent>

              <TabsContent value="satis-gecmisi" className="mt-4">
                <SatisGecmisiTable musteriId={musteri.id} />
              </TabsContent>
            </CardContent>
              </Tabs>
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

      <HaftalikTahsilatFisiModal
        musteri={musteri}
        open={tahsilatFisiModalOpen}
        onOpenChange={setTahsilatFisiModalOpen}
      />
    </Layout>
  );
};

export default MusteriDetay;
