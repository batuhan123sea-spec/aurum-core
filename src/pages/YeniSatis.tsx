import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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
import { getUrunLotlari } from "@/lib/stok-lot-data";

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
  const [indirimInputs, setIndirimInputs] = useState<Record<string, string>>({});
  const [genelIndirimInputTL, setGenelIndirimInputTL] = useState<string>("");
  const [genelIndirimInputYuzde, setGenelIndirimInputYuzde] = useState<string>("");
  
  // Manuel kur state'leri (bu satış için)
  const [satisManuelKurUSD, setSatisManuelKurUSD] = useState<string>("");
  const [satisManuelKurEUR, setSatisManuelKurEUR] = useState<string>("");
  const [satisManuelKurAktif, setSatisManuelKurAktif] = useState(false);
  
  const kurlar = getGuncelKurlar();
  const urunler = getUrunler();
  const musteriler = getMusteriler();
  const ayarlar = getAyarlar();

  // Helper: Aktif kuru al (manuel veya sistem)
  const getAktifKur = (paraBirimi: 'TRY' | 'USD' | 'EUR'): number => {
    if (paraBirimi === 'TRY') return 1;
    
    if (satisManuelKurAktif) {
      if (paraBirimi === 'USD' && satisManuelKurUSD) {
        const kur = parseFloat(satisManuelKurUSD);
        if (!isNaN(kur) && kur > 0) return kur;
      }
      if (paraBirimi === 'EUR' && satisManuelKurEUR) {
        const kur = parseFloat(satisManuelKurEUR);
        if (!isNaN(kur) && kur > 0) return kur;
      }
    }
    
    return paraBirimi === 'USD' ? kurlar.usd : kurlar.eur;
  };

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

  // KDV dahil/hariç değiştiğinde sepetteki ürünleri güncelle
  useEffect(() => {
    if (kdvDahil) {
      setGenelIndirimTL(0);
      setGenelIndirimYuzde(0);
      setGenelIndirimInputTL("");
      setGenelIndirimInputYuzde("");
    }
    
    if (sepet.length > 0) {
      setSepet(sepet.map(kalem => ({
        ...kalem,
        // KDV dahil yapıldığında indirimleri temizle
        indirimTL: kdvDahil ? 0 : kalem.indirimTL,
        indirimYuzde: kdvDahil ? 0 : kalem.indirimYuzde,
        toplamTutar: hesaplaKalemToplam(
          kalem.adet,
          kalem.birimFiyati,
          kalem.kdvOrani,
          kdvDahil ? 0 : kalem.indirimTL,
          kdvDahil ? 0 : kalem.indirimYuzde
        )
      })));
    }
  }, [kdvDahil]);

  // Sepet değiştiğinde lokal indirim input state'lerini temizle
  useEffect(() => {
    const mevcutKalemIds = sepet.map(k => k.id);
    const yeniIndirimInputs = Object.keys(indirimInputs)
      .filter(id => mevcutKalemIds.includes(id))
      .reduce((acc, id) => ({ ...acc, [id]: indirimInputs[id] }), {});
    
    if (Object.keys(yeniIndirimInputs).length !== Object.keys(indirimInputs).length) {
      setIndirimInputs(yeniIndirimInputs);
    }
  }, [sepet.map(k => k.id).join(',')]);

  // Manuel kur değiştiğinde sepeti güncelle
  useEffect(() => {
    if (sepet.length === 0) return;
    
    setSepet(prevSepet => prevSepet.map(kalem => {
      // Satış fiyatını güncel kurla hesapla
      const yeniBirimFiyati = paraBirimiTLyeCevir(
        kalem.orijinalBirimFiyati,
        kalem.paraBirimi,
        getAktifKur(kalem.paraBirimi)
      );
      
      // Alış fiyatını güncel kurla hesapla (lot para birimi)
      const yeniAlisFiyati = paraBirimiTLyeCevir(
        kalem.lotAlisFiyati || kalem.alisFiyati,
        kalem.lotParaBirimi || kalem.paraBirimi,
        getAktifKur(kalem.lotParaBirimi || kalem.paraBirimi)
      );
      
      const yeniToplamTutar = hesaplaKalemToplam(
        kalem.adet,
        yeniBirimFiyati,
        kalem.kdvOrani,
        kalem.indirimTL,
        kalem.indirimYuzde
      );
      
      return {
        ...kalem,
        birimFiyati: yeniBirimFiyati,
        alisFiyati: yeniAlisFiyati,
        toplamTutar: yeniToplamTutar
      };
    }));
  }, [satisManuelKurAktif, satisManuelKurUSD, satisManuelKurEUR]);

  // Barkod ile ürün ekle - Otomatik ilk lotu seç
  const barkodIleUrunEkle = (barkod: string) => {
    const urun = urunler.find(u => u.barkod === barkod);
    if (urun) {
      // İlk kullanılabilir lotu seç (FIFO)
      const lotlar = getUrunLotlari(urun.id);
      const ilkLot = lotlar.find(l => l.stokMiktari > 0);
      
      if (!ilkLot) {
        toast({
          title: "Stokta Yok",
          description: `${urun.ad} stokta bulunmuyor.`,
          variant: "destructive"
        });
        return;
      }
      
      sepeteEkle(urun, ilkLot);
      setBarkodInput("");
      toast({
        title: "Ürün Eklendi",
        description: `${urun.ad} sepete eklendi (${ilkLot.tedarikciAdi}).`,
      });
    } else {
      toast({
        title: "Ürün Bulunamadı",
        description: "Bu barkoda ait ürün bulunamadı.",
        variant: "destructive"
      });
    }
  };

  // Sepete ürün ekle - LOT parametresi ile
  const sepeteEkle = (urun: Urun, seciliLot?: any) => {
    const mevcutKalem = sepet.find(k => k.urunId === urun.id && k.lotId === seciliLot?.id);
    
    // STOK KONTROLÜ
    if (mevcutKalem) {
      // Sepette zaten var, 1 adet daha ekleyebilir miyiz?
      const mevcutLotStok = seciliLot?.stokMiktari || urun.stokMiktari;
      if (mevcutKalem.adet >= mevcutLotStok) {
        toast({
          title: "Yetersiz Stok",
          description: `${urun.ad} için bu lottan sadece ${mevcutLotStok} adet var. Sepetinizde zaten ${mevcutKalem.adet} adet bulunuyor.`,
          variant: "destructive"
        });
        return;
      }
    } else {
      // Yeni ürün eklenecek, stok var mı?
      if (!seciliLot || seciliLot.stokMiktari === 0) {
        toast({
          title: "Stokta Yok",
          description: `${urun.ad} bu lottan stokta bulunmuyor.`,
          variant: "destructive"
        });
        return;
      }
    }
    
    // 🆕 LOT BAZLI SİSTEM - Seçili lot bilgilerini al
    const lotAlisFiyati = seciliLot ? seciliLot.alisFiyati : urun.alisFiyati;
    const lotParaBirimi = seciliLot ? seciliLot.paraBirimi : urun.alisFiyatiParaBirimi;
    
    // Satış fiyatının para birimini belirle (satisFiyatiParaBirimi varsa onu kullan, yoksa alisFiyatiParaBirimi)
    const urunParaBirimi = urun.satisFiyatiParaBirimi || urun.alisFiyatiParaBirimi;
    
    // Satış fiyatını TL'ye çevir - MANUEL KUR KULLAN
    const birimFiyatiTL = paraBirimiTLyeCevir(
      urun.satisFiyati,
      urunParaBirimi,
      getAktifKur(urunParaBirimi)
    );
    
    // Alış fiyatını TL'ye çevir - LOT'tan al - MANUEL KUR KULLAN
    const alisFiyatiTL = paraBirimiTLyeCevir(
      lotAlisFiyati,
      lotParaBirimi,
      getAktifKur(lotParaBirimi)
    );
    
    if (mevcutKalem) {
      // Mevcut ürünün adedini artır (aynı lot)
      setSepet(sepet.map(k => 
        k.urunId === urun.id && k.lotId === seciliLot?.id
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
        alisFiyati: alisFiyatiTL,
        paraBirimi: urunParaBirimi,
        orijinalBirimFiyati: urun.satisFiyati,
        kdvOrani: ayarlar.kdv.varsayilanKDVOrani,
        kdvTutari: 0,
        indirimTL: 0,
        indirimYuzde: 0,
        toplamTutar: birimFiyatiTL,
        // 🆕 LOT bilgileri
        lotId: seciliLot?.id,
        lotAlisFiyati: lotAlisFiyati,
        lotParaBirimi: lotParaBirimi
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

  // Kalem kar marjı hesaplama
  const hesaplaKalemKarMarji = (kalem: SatisKalemi) => {
    // İndirimli satış fiyatı (birim başına)
    let netSatisFiyati = kalem.toplamTutar / kalem.adet;
    
    // KDV dahilse, KDV'yi çıkar
    if (kdvDahil) {
      netSatisFiyati = netSatisFiyati / (1 + (kalem.kdvOrani / 100));
    }
    
    // Kar (₺)
    const karTL = netSatisFiyati - kalem.alisFiyati;
    
    // Kar marjı (%)
    const karMarjiYuzde = kalem.alisFiyati > 0 
      ? ((karTL / kalem.alisFiyati) * 100)
      : 0;
      
    return { karTL, karMarjiYuzde };
  };

  // Adet değiştir
  const adetDegistir = (kalemId: string, yeniAdet: number) => {
    if (yeniAdet <= 0) {
      sepettenCikar(kalemId);
      return;
    }
    
    const kalem = sepet.find(k => k.id === kalemId);
    if (!kalem) return;
    
    const urun = urunler.find(u => u.id === kalem.urunId);
    if (!urun) return;
    
    // STOK KONTROLÜ
    if (yeniAdet > urun.stokMiktari) {
      toast({
        title: "Yetersiz Stok",
        description: `${urun.ad} için stokta sadece ${urun.stokMiktari} adet var.`,
        variant: "destructive"
      });
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
    setIndirimInputs({});
    setGenelIndirimInputTL("");
    setGenelIndirimInputYuzde("");
    setSatisManuelKurUSD("");
    setSatisManuelKurEUR("");
    setSatisManuelKurAktif(false);
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

  // Toplam kar hesaplama
  const toplamMaliyet = sepet.reduce((sum, kalem) => 
    sum + (kalem.alisFiyati * kalem.adet), 0
  );

  const kalemBazliKar = sepet.reduce((sum, kalem) => {
    const { karTL } = hesaplaKalemKarMarji(kalem);
    return sum + (karTL * kalem.adet);
  }, 0);

  // Genel indirim tutarını hesapla
  const genelIndirimTutari = (genelIndirimYuzde > 0 ? (araToplam - kalemIndirimleri) * (genelIndirimYuzde / 100) : 0) + genelIndirimTL;
  
  // Toplam kar = Kalem bazlı kar - Genel indirim
  const toplamKar = kalemBazliKar - genelIndirimTutari;

  const genelKarMarjiYuzde = toplamMaliyet > 0
    ? ((toplamKar / toplamMaliyet) * 100)
    : 0;

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
      
      // Manuel kur varsa hazırla
      const manuelKur = satisManuelKurAktif ? {
        USD: parseFloat(satisManuelKurUSD) || undefined,
        EUR: parseFloat(satisManuelKurEUR) || undefined,
        aktif: true
      } : (seciliMusteriData?.manuelKur?.aktif ? seciliMusteriData.manuelKur : undefined);
      
      hesapliSatisYap(
        seciliMusteri,
        sepet,
        araToplam,
        toplamKDV,
        genelToplamIndirim,
        genelIndirimYuzde,
        genelToplam,
        kdvDahil,
        manuelKur
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
        {/* Üst Bar - Döviz Kurları + Manuel Kur */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Sistem Kurları */}
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
              
              {/* Manuel Kur Girişi */}
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="satisManuelKur"
                    checked={satisManuelKurAktif}
                    onCheckedChange={(checked) => {
                      setSatisManuelKurAktif(!!checked);
                      if (!checked) {
                        setSatisManuelKurUSD("");
                        setSatisManuelKurEUR("");
                      }
                    }}
                  />
                  <Label htmlFor="satisManuelKur" className="text-sm font-medium cursor-pointer whitespace-nowrap">
                    💱 Bu Satışta Manuel Kur
                  </Label>
                </div>
                
                {satisManuelKurAktif && (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs text-muted-foreground">USD:</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder={kurlar.usd.toFixed(2)}
                        value={satisManuelKurUSD}
                        onChange={(e) => setSatisManuelKurUSD(e.target.value)}
                        className="w-20 h-8 text-sm"
                      />
                      <span className="text-xs text-muted-foreground">₺</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs text-muted-foreground">EUR:</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder={kurlar.eur.toFixed(2)}
                        value={satisManuelKurEUR}
                        onChange={(e) => setSatisManuelKurEUR(e.target.value)}
                        className="w-20 h-8 text-sm"
                      />
                      <span className="text-xs text-muted-foreground">₺</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Müşteri Manuel Kuru Bilgisi */}
            {seciliMusteriData?.manuelKur?.aktif && !satisManuelKurAktif && (
              <div className="mt-3 pt-3 border-t border-dashed">
                <div className="flex items-center gap-4 text-sm">
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                    ⚡ Müşteri Manuel Kuru Aktif
                  </Badge>
                  <span className="text-muted-foreground">
                    USD: <span className="font-semibold text-green-600">{seciliMusteriData.manuelKur.USD?.toFixed(2) || kurlar.usd.toFixed(2)} ₺</span>
                    {' | '}
                    EUR: <span className="font-semibold text-blue-600">{seciliMusteriData.manuelKur.EUR?.toFixed(2) || kurlar.eur.toFixed(2)} ₺</span>
                  </span>
                </div>
              </div>
            )}
            
            {/* Satış Manuel Kur Aktifse Bilgi */}
            {satisManuelKurAktif && (
              <div className="mt-3 pt-3 border-t border-dashed">
                <div className="flex items-center gap-2 text-sm text-amber-700">
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                    ⚡ Satış Manuel Kuru Aktif
                  </Badge>
                  <span>
                    Bu satışta kullanılacak kur: USD {satisManuelKurUSD || kurlar.usd.toFixed(2)} ₺ | EUR {satisManuelKurEUR || kurlar.eur.toFixed(2)} ₺
                  </span>
                </div>
              </div>
            )}
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
                      {filteredUrunler.map(urun => {
                        const urunLotlari = getUrunLotlari(urun.id).filter(l => l.stokMiktari > 0);
                        
                        return (
                          <>
                            <TableRow key={urun.id} className="border-b-0">
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
                              <TableCell className="text-right">
                                {urunLotlari.length > 0 ? (
                                  <Badge variant="secondary" className="text-xs">
                                    {urunLotlari.length} lot
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive" className="text-xs">
                                    Stok Yok
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                            
                            {/* 🆕 LOT SATIRLARI - Manuel Seçim */}
                            {urunLotlari.map((lot) => (
                              <TableRow 
                                key={lot.id} 
                                className="bg-muted/30 hover:bg-muted/50"
                              >
                                <TableCell className="pl-8">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs font-mono">
                                      {lot.batchNo}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {lot.tedarikciAdi === 'Başlangıç Stoku' 
                                        ? (urun.tedarikciler?.[0]?.tedarikciAdi || 'Tedarikçi Belirtilmemiş')
                                        : lot.tedarikciAdi}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary" className="text-xs">
                                    {lot.stokMiktari} adet
                                  </Badge>
                                </TableCell>
                      <TableCell className="text-right">
                        <span className="text-[10px] text-muted-foreground mr-1">Alım:</span>
                        <span className="text-xs font-medium">
                          {lot.alisFiyati.toFixed(2)} {lot.paraBirimi}
                        </span>
                      </TableCell>
                                <TableCell className="text-right">
                                  {(() => {
                                    const sepettekiMiktar = sepet.find(k => k.urunId === urun.id && k.lotId === lot.id)?.adet || 0;
                                    const stokDoldu = sepettekiMiktar >= lot.stokMiktari;
                                    return (
                                      <Button
                                        size="sm"
                                        onClick={() => sepeteEkle(urun, lot)}
                                        disabled={stokDoldu}
                                        variant={stokDoldu ? "ghost" : "default"}
                                        className="h-7"
                                      >
                                        <Plus className="w-3 h-3 mr-1" />
                                        Ekle
                                      </Button>
                                    );
                                  })()}
                                </TableCell>
                              </TableRow>
                            ))}
                          </>
                        );
                      })}
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
                  sepet.map(kalem => {
                    const { karTL, karMarjiYuzde } = hesaplaKalemKarMarji(kalem);
                    return (
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
                            {/* 🆕 LOT BİLGİSİ - Sepette göster */}
                            {kalem.lotId && (
                              <p className="text-xs text-muted-foreground italic">
                                {(() => {
                                  const lotlar = getUrunLotlari(kalem.urunId);
                                  const lot = lotlar.find(l => l.id === kalem.lotId);
                                  return lot ? `(${lot.tedarikciAdi} - ${lot.alisFiyati.toFixed(2)} ${lot.paraBirimi})` : '';
                                })()}
                              </p>
                            )}
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

                        {/* Kar Marjı Göstergesi */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Kar Marjı:</span>
                          <div className="flex items-center gap-2">
                            <span className={karTL >= 0 ? "font-semibold text-success" : "font-semibold text-destructive"}>
                              {karTL.toFixed(2)} ₺
                            </span>
                            <Badge 
                              variant={karMarjiYuzde >= 20 ? "default" : karMarjiYuzde >= 0 ? "secondary" : "destructive"}
                              className="text-xs"
                            >
                              %{karMarjiYuzde.toFixed(1)}
                            </Badge>
                          </div>
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
                          placeholder={kdvDahil ? "KDV dahil satışlarda indirim yapılamaz" : "İndirim (₺ veya %)"}
                          className="h-7 text-xs"
                          disabled={kdvDahil}
                          value={indirimInputs[kalem.id] ?? (
                            kalem.indirimYuzde > 0
                              ? `${kalem.indirimYuzde}%`
                              : kalem.indirimTL > 0
                              ? kalem.indirimTL.toFixed(2)
                              : ""
                          )}
                          onChange={(e) => {
                            if (kdvDahil) return;
                            setIndirimInputs({ ...indirimInputs, [kalem.id]: e.target.value });
                            indirimUygula(kalem.id, e.target.value);
                          }}
                          onBlur={() => {
                            if (indirimInputs[kalem.id] !== undefined) {
                              const { [kalem.id]: removed, ...rest } = indirimInputs;
                              setIndirimInputs(rest);
                            }
                          }}
                        />

                        <div className="text-right">
                          <span className="font-bold text-primary">
                            {kalem.toplamTutar.toFixed(2)} ₺
                          </span>
                        </div>
                      </div>
                    </Card>
                    );
                  })
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
                        type="text"
                        placeholder={kdvDahil ? "KDV dahilde yapılamaz" : "TL"}
                        disabled={kdvDahil}
                        value={genelIndirimInputTL !== "" ? genelIndirimInputTL : (genelIndirimTL > 0 ? genelIndirimTL.toFixed(2) : "")}
                        onChange={(e) => {
                          if (kdvDahil) return;
                          setGenelIndirimInputTL(e.target.value);
                          setGenelIndirimTL(parseFloat(e.target.value) || 0);
                          setGenelIndirimYuzde(0);
                        }}
                        onBlur={() => setGenelIndirimInputTL("")}
                      />
                      <Input
                        type="text"
                        placeholder={kdvDahil ? "KDV dahilde yapılamaz" : "%"}
                        disabled={kdvDahil}
                        value={genelIndirimInputYuzde !== "" ? genelIndirimInputYuzde : (genelIndirimYuzde > 0 ? genelIndirimYuzde.toFixed(1) : "")}
                        onChange={(e) => {
                          if (kdvDahil) return;
                          setGenelIndirimInputYuzde(e.target.value);
                          setGenelIndirimYuzde(Math.min(100, parseFloat(e.target.value) || 0));
                          setGenelIndirimTL(0);
                        }}
                        onBlur={() => setGenelIndirimInputYuzde("")}
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
                {kdvDahil && toplamKDV > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>KDV:</span>
                    <span>{toplamKDV.toFixed(2)} ₺</span>
                  </div>
                )}
                
                {sepet.length > 0 && (
                  <>
                    <Separator />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Toplam Maliyet:</span>
                      <span>{toplamMaliyet.toFixed(2)} ₺</span>
                    </div>
                    <div className="flex justify-between font-semibold text-success">
                      <span>Kar:</span>
                      <div className="flex items-center gap-2">
                        <span>{toplamKar.toFixed(2)} ₺</span>
                        <Badge variant={genelKarMarjiYuzde >= 20 ? "default" : genelKarMarjiYuzde >= 0 ? "secondary" : "destructive"}>
                          %{genelKarMarjiYuzde.toFixed(1)}
                        </Badge>
                      </div>
                    </div>
                  </>
                )}
                
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
