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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, Edit, DollarSign, Receipt, FileText } from "lucide-react";
import { getMusteriById, musteriBalanceGuncelle, updateMusteri } from "@/lib/musteri-data";
import { ManuelKur } from "@/types/musteri";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, getGuncelKurlar } from "@/lib/kur-hesaplama";
import HesapEkstresiTable from "@/components/HesapEkstresiTable";
import OdemeAlModal from "@/components/OdemeAlModal";
import { HaftalikTahsilatFisiModal } from "@/components/HaftalikTahsilatFisiModal";
import { DetayliEkstreModal } from "@/components/DetayliEkstreModal";
import { SatisGecmisiTable } from "@/components/SatisGecmisiTable";
import MusteriBorcTimeline from "@/components/MusteriBorcTimeline";
import MusteriDefterGorunumu from "@/components/MusteriDefterGorunumu";

const MusteriDetay = () => {
  const { musteriId } = useParams();
  const navigate = useNavigate();
  const [musteri, setMusteri] = useState(getMusteriById(musteriId || ""));
  const [odemeModalOpen, setOdemeModalOpen] = useState(false);
  const [tahsilatFisiModalOpen, setTahsilatFisiModalOpen] = useState(false);
  const [detayliEkstreModalOpen, setDetayliEkstreModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("tum");
  const [yenilemeKey, setYenilemeKey] = useState(0);
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
      musteriBalanceGuncelle(musteriId);
      setMusteri(getMusteriById(musteriId));
      setYenilemeKey(prev => prev + 1);
    }
  };

  const handleYeniHareketSuccess = () => {
    if (musteriId) {
      musteriBalanceGuncelle(musteriId);
      setMusteri(getMusteriById(musteriId));
      setYenilemeKey(prev => prev + 1);
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
              <CardHeader className="text-center relative">
                {/* Manuel Kur Butonu - Sağ Üst Köşe */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant={musteri.manuelKur?.aktif ? "default" : "ghost"}
                      size="sm"
                      className={`absolute top-3 right-3 h-7 px-2 gap-1 text-xs ${
                        musteri.manuelKur?.aktif 
                          ? 'bg-amber-500 hover:bg-amber-600 text-white' 
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      title="Manuel Kur Ayarla"
                    >
                      <span>💱</span>
                      {musteri.manuelKur?.aktif && <span>Aktif</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72" align="end">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">💱 Manuel Kur</h4>
                        {musteri.manuelKur?.aktif && (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-xs">Aktif</Badge>
                        )}
                      </div>
                      
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">USD Kuru (₺)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder={guncelKurlar.usd.toFixed(2)}
                            defaultValue={musteri.manuelKur?.USD || ''}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              const yeniManuelKur: ManuelKur = {
                                ...musteri.manuelKur,
                                USD: val || undefined,
                                aktif: musteri.manuelKur?.aktif || false
                              };
                              updateMusteri({ ...musteri, manuelKur: yeniManuelKur });
                              setMusteri({ ...musteri, manuelKur: yeniManuelKur });
                            }}
                          />
                        </div>
                        
                        <div className="space-y-1.5">
                          <Label className="text-xs">EUR Kuru (₺)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder={guncelKurlar.eur.toFixed(2)}
                            defaultValue={musteri.manuelKur?.EUR || ''}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              const yeniManuelKur: ManuelKur = {
                                ...musteri.manuelKur,
                                EUR: val || undefined,
                                aktif: musteri.manuelKur?.aktif || false
                              };
                              updateMusteri({ ...musteri, manuelKur: yeniManuelKur });
                              setMusteri({ ...musteri, manuelKur: yeniManuelKur });
                            }}
                          />
                        </div>
                        
                        <Separator />
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="manuelKurAktif"
                            checked={musteri.manuelKur?.aktif || false}
                            onCheckedChange={(checked) => {
                              const yeniManuelKur: ManuelKur = {
                                ...musteri.manuelKur,
                                aktif: !!checked
                              };
                              updateMusteri({ ...musteri, manuelKur: yeniManuelKur });
                              setMusteri({ ...musteri, manuelKur: yeniManuelKur });
                              toast({
                                title: checked ? "Manuel Kur Aktif" : "Manuel Kur Pasif",
                                description: checked 
                                  ? "Bu müşteri için manuel kur kullanılacak."
                                  : "Sistem kurları kullanılacak."
                              });
                            }}
                          />
                          <Label htmlFor="manuelKurAktif" className="text-sm cursor-pointer">
                            Bu müşteri için aktif
                          </Label>
                        </div>
                      </div>
                      
                      <div className="text-xs text-muted-foreground pt-2 border-t">
                        Sistem kurları: USD {guncelKurlar.usd.toFixed(2)} ₺ | EUR {guncelKurlar.eur.toFixed(2)} ₺
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                <Avatar className="w-20 h-20 mx-auto mb-3">
                  <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
                </Avatar>
                <CardTitle>{musteri.adSoyad}</CardTitle>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <Badge variant={musteri.konum === "ic" ? "default" : "secondary"}>
                    {musteri.konum === "ic" ? "İş Hanı İçi" : "Dışarı"}
                  </Badge>
                  {musteri.manuelKur?.aktif && (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-xs">
                      💱 Manuel Kur
                    </Badge>
                  )}
                </div>
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
                    <div className="space-y-1 p-3 bg-amber-500/10 rounded-lg">
                      <p className="text-xs text-muted-foreground">TRY Borç</p>
                      <p className="text-lg font-bold text-amber-600">
                        {formatCurrency(musteri.borclar.TRY, 'TRY')}
                      </p>
                    </div>
                    
                    <div className="space-y-1 p-3 bg-green-500/10 rounded-lg">
                      <p className="text-xs text-muted-foreground">USD Borç</p>
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(musteri.borclar.USD, 'USD')}
                      </p>
                      {musteri.borclar.USD > 0 && (
                        <p className="text-xs text-muted-foreground">
                          ≈ {formatCurrency(musteri.borclar.USD * guncelKurlar.usd, 'TRY')}
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-1 p-3 bg-blue-500/10 rounded-lg">
                      <p className="text-xs text-muted-foreground">EUR Borç</p>
                      <p className="text-lg font-bold text-blue-600">
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
                    <div className="text-3xl font-bold">
                      {musteri.toplamBorcTL > 0 ? (
                        <span className="text-destructive">
                          {formatCurrency(musteri.toplamBorcTL, "TRY")}
                        </span>
                      ) : musteri.toplamBorcTL < 0 ? (
                        <span className="text-blue-600">
                          Alacak: {formatCurrency(Math.abs(musteri.toplamBorcTL), "TRY")}
                        </span>
                      ) : (
                        <span className="text-green-600">Borçsuz</span>
                      )}
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
                <Button 
                  variant="outline" 
                  className="w-full gap-2"
                  onClick={() => setDetayliEkstreModalOpen(true)}
                >
                  <FileText className="w-4 h-4" />
                  Detaylı Ekstre (Excel)
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
                <MusteriDefterGorunumu 
                  musteriId={musteri.id} 
                  key={yenilemeKey}
                  onHareketDuzenlendi={handleYeniHareketSuccess}
                  onHareketSilindi={handleYeniHareketSuccess}
                />
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

      <DetayliEkstreModal
        musteri={musteri}
        open={detayliEkstreModalOpen}
        onOpenChange={setDetayliEkstreModalOpen}
      />
    </Layout>
  );
};

export default MusteriDetay;
