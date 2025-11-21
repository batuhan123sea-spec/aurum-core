import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Minus, Trash2, ShoppingCart, DollarSign } from "lucide-react";
import { getUrunler } from "@/lib/stok-data";
import { getMusteriler } from "@/lib/musteri-data";
import { hesapliSatisYap, rezervYap, hizliSatisYap } from "@/lib/satis-islemleri";
import { getGuncelKurlar, paraBirimiTLyeCevir, formatCurrency, getKurYasi } from "@/lib/kur-hesaplama";
import { getAyarlar } from "@/lib/ayarlar-data";
import { getSatislar } from "@/lib/satis-data";
import { rezervFisiOlustur, fisYazdir } from "@/lib/fis-yazdir";
import { SatisKalemi } from "@/types/satis";
import { Urun } from "@/types/stok";
import { MusteriSecModal } from "@/components/MusteriSecModal";
import { useToast } from "@/hooks/use-toast";
import { bigParaKurCek } from "@/lib/kur-api";
import { kurlarıKaydet } from "@/lib/kur-hesaplama";
import { tumMusteriBorclariniGuncelle } from "@/lib/musteri-data";

export default function YeniSatis() {
  const { toast } = useToast();
  const barkodInputRef = useRef<HTMLInputElement>(null);
  
  const [satisTuru, setSatisTuru] = useState<'hesapli' | 'rezerv' | 'hizli'>('hesapli');
  const [sepet, setSepet] = useState<SatisKalemi[]>([]);
  const [kdvDahil, setKdvDahil] = useState(false);
  const [genelIndirimTL, setGenelIndirimTL] = useState(0);
  const [genelIndirimYuzde, setGenelIndirimYuzde] = useState(0);
  const [barkodInput, setBarkodInput] = useState("");
  const [aramaQuery, setAramaQuery] = useState("");
  const [seciliMusteri, setSeciliMusteri] = useState<string | null>(null);
  const [musteriModalOpen, setMusteriModalOpen] = useState(false);
  const [rezervNotu, setRezervNotu] = useState("");
  
  const kurlar = getGuncelKurlar();
  const urunler = getUrunler();
  const musteriler = getMusteriler();
  const ayarlar = getAyarlar();

  // Sayfa açıldığında kurları kontrol et ve gerekirse güncelle
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

  // Barkod input'a otomatik focus
  useEffect(() => {
    barkodInputRef.current?.focus();
  }, []);

  // Barkod ile ürün ekle
  const barkodIleUrunEkle = (barkod: string) => {
    const urun = urunler.find(u => u.barkod === barkod);
    if (urun) {
      sepeteEkle(urun);
      setBarkodInput("");
      toast({
        title: "Ürün Eklendi",
        description: `${urun.ad} sepete eklendi.`,
      });
    } else {
      toast({
        title: "Ürün Bulunamadı",
        description: "Bu barkoda ait ürün bulunamadı.",
        variant: "destructive"
      });
    }
  };

  // Sepete ürün ekle
  const sepeteEkle = (urun: Urun) => {
    const mevcutKalem = sepet.find(k => k.urunId === urun.id);
    
    // Satış fiyatının para birimini belirle (satisFiyatiParaBirimi varsa onu kullan, yoksa alisFiyatiParaBirimi)
    const urunParaBirimi = urun.satisFiyatiParaBirimi || urun.alisFiyatiParaBirimi;
    
    // Satış fiyatını TL'ye çevir
    const birimFiyatiTL = paraBirimiTLyeCevir(
      urun.satisFiyati,
      urunParaBirimi
    );
    
    if (mevcutKalem) {
      // Mevcut ürünün adedini artır
      setSepet(sepet.map(k => 
        k.urunId === urun.id 
          ? { ...k, adet: k.adet + 1, toplamTutar: hesaplaKalemToplam(k.adet + 1, k.birimFiyati, k.kdvOrani, k.indirimTL, k.indirimYuzde) }
          : k
      ));
    } else {
      // Yeni ürün ekle
      const yeniKalem: SatisKalemi = {
        id: Date.now().toString(),
        urunId: urun.id,
        urunAdi: urun.ad,
        barkod: urun.barkod,
        adet: 1,
        birimFiyati: birimFiyatiTL,
        paraBirimi: urunParaBirimi,
        orijinalBirimFiyati: urun.satisFiyati,
        kdvOrani: ayarlar.kdv.varsayilanKDVOrani,
        kdvTutari: 0,
        indirimTL: 0,
        indirimYuzde: 0,
        toplamTutar: birimFiyatiTL
      };
      
      yeniKalem.toplamTutar = hesaplaKalemToplam(
        yeniKalem.adet,
        yeniKalem.birimFiyati,
        yeniKalem.kdvOrani,
        yeniKalem.indirimTL,
        yeniKalem.indirimYuzde
      );
      
      setSepet([...sepet, yeniKalem]);
    }
  };

  // Kalem toplam hesaplama
  const hesaplaKalemToplam = (
    adet: number,
    birimFiyati: number,
    kdvOrani: number,
    indirimTL: number,
    indirimYuzde: number
  ): number => {
    let toplam = birimFiyati * adet;
    
    // İndirim uygula
    if (indirimYuzde > 0) {
      toplam -= toplam * (indirimYuzde / 100);
    }
    if (indirimTL > 0) {
      toplam -= indirimTL;
    }
    
    // KDV ekle (eğer dahilse)
    if (kdvDahil) {
      toplam += toplam * (kdvOrani / 100);
    }
    
    return Math.max(0, toplam);
  };

  // Adet değiştir
  const adetDegistir = (kalemId: string, yeniAdet: number) => {
    if (yeniAdet <= 0) {
      sepettenCikar(kalemId);
      return;
    }
    
    setSepet(sepet.map(k => 
      k.id === kalemId
        ? { ...k, adet: yeniAdet, toplamTutar: hesaplaKalemToplam(yeniAdet, k.birimFiyati, k.kdvOrani, k.indirimTL, k.indirimYuzde) }
        : k
    ));
  };

  // İndirim uygula
  const indirimUygula = (kalemId: string, deger: string) => {
    const kalem = sepet.find(k => k.id === kalemId);
    if (!kalem) return;

    let indirimTL = 0;
    let indirimYuzde = 0;

    if (deger.includes('%')) {
      indirimYuzde = Math.min(100, Math.max(0, parseFloat(deger.replace('%', '')) || 0));
    } else {
      indirimTL = Math.max(0, parseFloat(deger) || 0);
    }

    setSepet(sepet.map(k =>
      k.id === kalemId
        ? {
            ...k,
            indirimTL,
            indirimYuzde,
            toplamTutar: hesaplaKalemToplam(k.adet, k.birimFiyati, k.kdvOrani, indirimTL, indirimYuzde)
          }
        : k
    ));
  };

  // Sepetten çıkar
  const sepettenCikar = (kalemId: string) => {
    setSepet(sepet.filter(k => k.id !== kalemId));
  };

  // Sepeti temizle
  const sepetiTemizle = () => {
    setSepet([]);
    setGenelIndirimTL(0);
    setGenelIndirimYuzde(0);
    setSeciliMusteri(null);
    setRezervNotu("");
  };

  // Fiyat hesaplamaları
  const araToplam = sepet.reduce((sum, k) => sum + (k.birimFiyati * k.adet), 0);
  const kalemIndirimleri = sepet.reduce((sum, k) => {
    let indirim = 0;
    if (k.indirimYuzde > 0) {
      indirim = (k.birimFiyati * k.adet) * (k.indirimYuzde / 100);
    }
    return sum + indirim + k.indirimTL;
  }, 0);
  
  const toplamKDV = sepet.reduce((sum, k) => {
    const kalemAraTop = (k.birimFiyati * k.adet) - (k.indirimTL + (k.birimFiyati * k.adet * k.indirimYuzde / 100));
    return sum + (kalemAraTop * k.kdvOrani / 100);
  }, 0);

  let genelToplam = araToplam - kalemIndirimleri;
  
  if (genelIndirimYuzde > 0) {
    genelToplam -= genelToplam * (genelIndirimYuzde / 100);
  }
  if (genelIndirimTL > 0) {
    genelToplam -= genelIndirimTL;
  }
  
  if (kdvDahil) {
    genelToplam += toplamKDV;
  }

  const genelToplamIndirim = kalemIndirimleri + (genelIndirimYuzde > 0 ? (araToplam - kalemIndirimleri) * (genelIndirimYuzde / 100) : 0) + genelIndirimTL;

  // Satış işlemleri
  const satisYap = () => {
    if (sepet.length === 0) {
      toast({
        title: "Hata",
        description: "Sepet boş!",
        variant: "destructive"
      });
      return;
    }

    if (satisTuru === 'hesapli') {
      if (!seciliMusteri) {
        setMusteriModalOpen(true);
        return;
      }
      
      hesapliSatisYap(
        seciliMusteri,
        sepet,
        araToplam,
        toplamKDV,
        genelToplamIndirim,
        genelIndirimYuzde,
        genelToplam,
        kdvDahil
      );
    } else if (satisTuru === 'rezerv') {
      rezervYap(
        sepet,
        araToplam,
        toplamKDV,
        genelToplamIndirim,
        genelIndirimYuzde,
        genelToplam,
        kdvDahil,
        rezervNotu
      );
      
      // Rezerv fişini yazdır
      setTimeout(() => {
        const rezervler = getSatislar().filter(s => s.satisTuru === 'rezerv');
        const sonRezerv = rezervler[rezervler.length - 1];
        if (sonRezerv) {
          const fis = rezervFisiOlustur(sonRezerv);
          fisYazdir(fis);
        }
      }, 100);
    }
    
    sepetiTemizle();
  };

  const hizliSatis = (odemeTuru: 'nakit' | 'kredi-karti') => {
    if (sepet.length === 0) {
      toast({
        title: "Hata",
        description: "Sepet boş!",
        variant: "destructive"
      });
      return;
    }

    hizliSatisYap(
      sepet,
      araToplam,
      toplamKDV,
      genelToplamIndirim,
      genelIndirimYuzde,
      genelToplam,
      kdvDahil,
      odemeTuru
    );
    
    sepetiTemizle();
  };

  const seciliMusteriData = seciliMusteri ? musteriler.find(m => m.id === seciliMusteri) : null;
  const filteredUrunler = aramaQuery 
    ? urunler.filter(u => 
        u.ad.toLowerCase().includes(aramaQuery.toLowerCase()) ||
        u.barkod.includes(aramaQuery) ||
        u.kod.toLowerCase().includes(aramaQuery.toLowerCase())
      )
    : urunler;

  return (
    <Layout>
      <div className="space-y-4">
        {/* Üst Bar - Döviz Kurları */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium">USD/TRY:</span>
                  <span className="text-lg font-bold text-green-600">{kurlar.usd.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium">EUR/TRY:</span>
                  <span className="text-lg font-bold text-blue-600">{kurlar.eur.toFixed(2)}</span>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {new Date().toLocaleString('tr-TR', { 
                  day: '2-digit', 
                  month: 'long', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ana İçerik */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Sol Panel - Ürün Arama */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Ürün Seçimi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Barkod Okuma */}
              <div className="space-y-2">
                <Label>Barkod Okuyucu (Enter ile ekle)</Label>
                <Input
                  ref={barkodInputRef}
                  placeholder="Barkod okutun veya girin..."
                  value={barkodInput}
                  onChange={(e) => setBarkodInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && barkodInput.trim()) {
                      barkodIleUrunEkle(barkodInput.trim());
                    }
                  }}
                  className="text-lg font-mono"
                />
              </div>

              <Separator />

              {/* Manuel Arama */}
              <div className="space-y-2">
                <Label>Manuel Ürün Ara</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Ürün adı, kodu veya barkod..."
                    value={aramaQuery}
                    onChange={(e) => setAramaQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Ürün Listesi */}
              <div className="border rounded-lg max-h-96 overflow-y-auto">
                {filteredUrunler.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    Aktif ürün bulunamadı
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ürün</TableHead>
                        <TableHead>Stok</TableHead>
                        <TableHead className="text-right">Fiyat</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUrunler.map(urun => (
                        <TableRow key={urun.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{urun.ad}</p>
                              <p className="text-xs text-muted-foreground">{urun.kod}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={urun.stokMiktari <= urun.kritikStokSeviyesi ? "destructive" : "default"}>
                              {urun.stokMiktari} {urun.birim}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(urun.satisFiyati, urun.alisFiyatiParaBirimi)}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => sepeteEkle(urun)}
                              disabled={urun.stokMiktari === 0}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sağ Panel - Sepet */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Sepet ({sepet.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Sepet İçeriği */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {sepet.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Sepet boş
                  </div>
                ) : (
                  sepet.map(kalem => (
                    <Card key={kalem.id} className="p-3">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">{kalem.urunAdi}</p>
                              {kalem.paraBirimi !== 'TRY' && (
                                <Badge variant="outline" className="text-xs">
                                  {kalem.paraBirimi}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {kalem.paraBirimi !== 'TRY' ? (
                                <>
                                  {formatCurrency(kalem.orijinalBirimFiyati, kalem.paraBirimi)} ≈ {formatCurrency(kalem.birimFiyati)}
                                </>
                              ) : (
                                formatCurrency(kalem.birimFiyati)
                              )}
                            </p>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => sepettenCikar(kalem.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7"
                            onClick={() => adetDegistir(kalem.id, kalem.adet - 1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <Input
                            type="number"
                            value={kalem.adet}
                            onChange={(e) => adetDegistir(kalem.id, parseInt(e.target.value) || 1)}
                            className="h-7 w-16 text-center"
                          />
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7"
                            onClick={() => adetDegistir(kalem.id, kalem.adet + 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>

                        <Input
                          placeholder="İndirim (₺ veya %)"
                          className="h-7 text-xs"
                          onChange={(e) => indirimUygula(kalem.id, e.target.value)}
                        />

                        <div className="text-right">
                          <span className="font-bold text-primary">
                            {kalem.toplamTutar.toFixed(2)} ₺
                          </span>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>

              <Separator />

              {/* KDV Dahil/Hariç */}
              <div className="flex items-center justify-between">
                <Label>KDV Dahil</Label>
                <Switch checked={kdvDahil} onCheckedChange={setKdvDahil} />
              </div>

              {/* Genel İndirim */}
              <div className="space-y-2">
                <Label>Genel İndirim</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    placeholder="TL"
                    value={genelIndirimTL || ''}
                    onChange={(e) => {
                      setGenelIndirimTL(parseFloat(e.target.value) || 0);
                      setGenelIndirimYuzde(0);
                    }}
                  />
                  <Input
                    type="number"
                    placeholder="%"
                    value={genelIndirimYuzde || ''}
                    onChange={(e) => {
                      setGenelIndirimYuzde(Math.min(100, parseFloat(e.target.value) || 0));
                      setGenelIndirimTL(0);
                    }}
                  />
                </div>
              </div>

              <Separator />

              {/* Fiyat Özeti */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Ara Toplam:</span>
                  <span>{araToplam.toFixed(2)} ₺</span>
                </div>
                {genelToplamIndirim > 0 && (
                  <div className="flex justify-between text-sm text-destructive">
                    <span>İndirim:</span>
                    <span>-{genelToplamIndirim.toFixed(2)} ₺</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>KDV:</span>
                  <span>{toplamKDV.toFixed(2)} ₺</span>
                </div>
                <Separator />
                <div className="flex justify-between text-xl font-bold">
                  <span>TOPLAM:</span>
                  <span className="text-primary">{genelToplam.toFixed(2)} ₺</span>
                </div>
              </div>

              <Separator />

              {/* Satış Türü ve İşlem Butonları */}
              <Tabs value={satisTuru} onValueChange={(v) => setSatisTuru(v as any)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="hesapli">Hesaplı</TabsTrigger>
                  <TabsTrigger value="rezerv">Rezerv</TabsTrigger>
                  <TabsTrigger value="hizli">Hızlı</TabsTrigger>
                </TabsList>

                <TabsContent value="hesapli" className="space-y-2">
                  {seciliMusteriData ? (
                    <Card className="p-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{seciliMusteriData.adSoyad}</p>
                          <p className="text-xs text-muted-foreground">
                            Borç: {seciliMusteriData.toplamBorcTL.toFixed(2)} ₺
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSeciliMusteri(null)}
                        >
                          Değiştir
                        </Button>
                      </div>
                    </Card>
                  ) : (
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => setMusteriModalOpen(true)}
                    >
                      Müşteri Seç
                    </Button>
                  )}
                  <Button className="w-full" size="lg" onClick={satisYap}>
                    Hesaba Kaydet
                  </Button>
                </TabsContent>

                <TabsContent value="rezerv" className="space-y-2">
                  <Input
                    placeholder="Rezerv notu (opsiyonel)"
                    value={rezervNotu}
                    onChange={(e) => setRezervNotu(e.target.value)}
                  />
                  <Button className="w-full" size="lg" variant="outline" onClick={satisYap}>
                    📦 Rezerve Et
                  </Button>
                </TabsContent>

                <TabsContent value="hizli" className="space-y-2">
                  <Button className="w-full" size="lg" onClick={() => hizliSatis('nakit')}>
                    💵 Nakit Tahsil Et
                  </Button>
                  <Button className="w-full" size="lg" variant="outline" onClick={() => hizliSatis('kredi-karti')}>
                    💳 Kredi Kartı
                  </Button>
                </TabsContent>
              </Tabs>

              <Button
                className="w-full"
                variant="destructive"
                onClick={sepetiTemizle}
              >
                Sepeti Temizle
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <MusteriSecModal
        open={musteriModalOpen}
        onOpenChange={setMusteriModalOpen}
        onSelect={(musteriId) => {
          setSeciliMusteri(musteriId);
          setMusteriModalOpen(false);
        }}
      />
    </Layout>
  );
}
