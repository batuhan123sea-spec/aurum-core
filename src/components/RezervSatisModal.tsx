import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSatislar } from "@/lib/satis-data";
import { getMusteriler } from "@/lib/musteri-data";
import { MusteriSecModal } from "./MusteriSecModal";
import { rezervKismiSatisYap } from "@/lib/satis-islemleri";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { getKurYasi, getGuncelKurlar, formatKurYasi } from "@/lib/kur-hesaplama";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface UrunIslem {
  urunId: string;
  urunAdi: string;
  rezervMiktar: number;
  satilanMiktar: number;
  iadeMiktar: number;
  kalanMiktar: number;
  birimFiyati: number;
  paraBirimi: 'TRY' | 'USD' | 'EUR';
}

interface RezervSatisModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rezervId: string;
  onSuccess?: () => void;
}

export const RezervSatisModal = ({ open, onOpenChange, rezervId, onSuccess }: RezervSatisModalProps) => {
  const [odemeTuru, setOdemeTuru] = useState<'hesapli' | 'nakit' | 'kredi-karti'>('hesapli');
  const [secilenMusteriId, setSecilenMusteriId] = useState<string>('');
  const [musteriModalAcik, setMusteriModalAcik] = useState(false);
  const [urunIslemleri, setUrunIslemleri] = useState<UrunIslem[]>([]);
  const [kurUyarisi, setKurUyarisi] = useState(false);

  const rezerv = getSatislar().find(s => s.id === rezervId);
  const musteriler = getMusteriler();
  const secilenMusteri = secilenMusteriId ? musteriler.find(m => m.id === secilenMusteriId) : null;

  // Modal açıldığında kur yaşını kontrol et
  useEffect(() => {
    if (open) {
      const kurYasi = getKurYasi();
      setKurUyarisi(kurYasi > 10);
    }
  }, [open]);

  useEffect(() => {
    if (rezerv && open) {
      // Rezervde müşteri ID'si varsa otomatik seç
      if (rezerv.musteriId) {
        setSecilenMusteriId(rezerv.musteriId);
      }
      
      // Aynı ürünleri birleştir
      const urunGruplari = new Map<string, {
        urunId: string;
        urunAdi: string;
        toplamAdet: number;
        birimFiyati: number;
        paraBirimi: 'TRY' | 'USD' | 'EUR';
      }>();

      rezerv.kalemler.forEach(kalem => {
        const mevcut = urunGruplari.get(kalem.urunId);
        if (mevcut) {
          // Aynı üründen daha önce varsa adetleri topla
          mevcut.toplamAdet += kalem.adet;
        } else {
          urunGruplari.set(kalem.urunId, {
            urunId: kalem.urunId,
            urunAdi: kalem.urunAdi,
            toplamAdet: kalem.adet,
            birimFiyati: kalem.birimFiyati,
            paraBirimi: kalem.paraBirimi || 'TRY',
          });
        }
      });

      // Map'ten array'e çevir
      const baslangicIslemler: UrunIslem[] = Array.from(urunGruplari.values()).map(grup => ({
        urunId: grup.urunId,
        urunAdi: grup.urunAdi,
        rezervMiktar: grup.toplamAdet,
        satilanMiktar: grup.toplamAdet, // Varsayılan: tümünü sat
        iadeMiktar: 0,
        kalanMiktar: 0,
        birimFiyati: grup.birimFiyati,
        paraBirimi: grup.paraBirimi,
      }));
      
      setUrunIslemleri(baslangicIslemler);
    }
  }, [rezerv, open]);

  const handleSatilanChange = (urunId: string, yeniDeger: string) => {
    const girilenSayi = parseInt(yeniDeger);
    
    // Boş input veya NaN kontrolü
    if (yeniDeger === '' || isNaN(girilenSayi)) {
      setUrunIslemleri(prev => prev.map(islem => {
        if (islem.urunId === urunId) {
          return {
            ...islem,
            satilanMiktar: 0,
            iadeMiktar: islem.rezervMiktar,
            kalanMiktar: 0,
          };
        }
        return islem;
      }));
      return;
    }

    setUrunIslemleri(prev => prev.map(islem => {
      if (islem.urunId === urunId) {
        // Min 0, Max rezervMiktar kontrolü
        const guvenliSayi = Math.min(Math.max(0, girilenSayi), islem.rezervMiktar);
        const yeniIadeMiktar = islem.rezervMiktar - guvenliSayi;
        
        return {
          ...islem,
          satilanMiktar: guvenliSayi,
          iadeMiktar: yeniIadeMiktar,
          kalanMiktar: 0,
        };
      }
      return islem;
    }));
  };

  const handleIadeChange = (urunId: string, yeniDeger: string) => {
    const girilenSayi = parseInt(yeniDeger);
    
    // Boş input veya NaN kontrolü
    if (yeniDeger === '' || isNaN(girilenSayi)) {
      setUrunIslemleri(prev => prev.map(islem => {
        if (islem.urunId === urunId) {
          return {
            ...islem,
            iadeMiktar: 0,
            satilanMiktar: islem.rezervMiktar,
            kalanMiktar: 0,
          };
        }
        return islem;
      }));
      return;
    }

    setUrunIslemleri(prev => prev.map(islem => {
      if (islem.urunId === urunId) {
        // Min 0, Max rezervMiktar kontrolü
        const guvenliSayi = Math.min(Math.max(0, girilenSayi), islem.rezervMiktar);
        const yeniSatilanMiktar = islem.rezervMiktar - guvenliSayi;
        
        return {
          ...islem,
          iadeMiktar: guvenliSayi,
          satilanMiktar: yeniSatilanMiktar,
          kalanMiktar: 0,
        };
      }
      return islem;
    }));
  };

  const dogrulamaYap = (): boolean => {
    // Hesaplı satış için müşteri zorunlu
    if (odemeTuru === 'hesapli' && !secilenMusteriId) {
      toast({
        title: "Müşteri Seçimi Gerekli",
        description: "Hesaplı satış için bir müşteri seçmelisiniz.",
        variant: "destructive"
      });
      return false;
    }

    // Her ürün için doğrulama
    for (const islem of urunIslemleri) {
      const toplam = islem.satilanMiktar + islem.iadeMiktar;
      if (toplam !== islem.rezervMiktar) {
        toast({
          title: "Miktar Hatası",
          description: `${islem.urunAdi} için satılan ve iade edilen toplam rezerv miktarına eşit olmalı.`,
          variant: "destructive"
        });
        return false;
      }

      if (islem.satilanMiktar < 0 || islem.iadeMiktar < 0) {
        toast({
          title: "Geçersiz Miktar",
          description: "Negatif miktar girilemez.",
          variant: "destructive"
        });
        return false;
      }
    }

    return true;
  };

  const handleKaydet = () => {
    if (!rezerv) return;
    if (!dogrulamaYap()) return;

    try {
      rezervKismiSatisYap(
        rezervId,
        urunIslemleri,
        odemeTuru,
        odemeTuru === 'hesapli' ? secilenMusteriId : undefined
      );

      toast({
        title: "İşlem Başarılı",
        description: "Rezerv başarıyla işleme alındı.",
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Hata",
        description: "İşlem sırasında bir hata oluştu.",
        variant: "destructive"
      });
    }
  };

  if (!rezerv) return null;

  const toplamSatisTutari = urunIslemleri.reduce(
    (toplam, islem) => toplam + (islem.satilanMiktar * islem.birimFiyati),
    0
  );

  const toplamIadeTutari = urunIslemleri.reduce(
    (toplam, islem) => toplam + (islem.iadeMiktar * islem.birimFiyati),
    0
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Rezervi Satışa Dönüştür - {rezerv.satisNo}</DialogTitle>
            <DialogDescription>
              Her ürün için satılan ve iade edilen miktarları belirleyin. İade edilen ürünler stoğa otomatik eklenecektir.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Kur Uyarısı */}
            {kurUyarisi && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  ⚠️ Kurlar {formatKurYasi(getKurYasi())} güncellendi. Satışa dönüştürmeden önce güncel kurları kontrol etmeniz önerilir.
                </AlertDescription>
              </Alert>
            )}

            {/* Ödeme Türü Seçimi */}
            <div className="space-y-2">
              <Label>Ödeme Türü *</Label>
              <Select value={odemeTuru} onValueChange={(value: any) => setOdemeTuru(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hesapli">Hesaplı Satış</SelectItem>
                  <SelectItem value="nakit">Nakit</SelectItem>
                  <SelectItem value="kredi-karti">Kredi Kartı</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Müşteri Seçimi (Hesaplı Satış için) */}
            {odemeTuru === 'hesapli' && (
              <div className="space-y-2">
                <Label>Müşteri *</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setMusteriModalAcik(true)}
                  >
                    {secilenMusteri ? secilenMusteri.adSoyad : 'Müşteri Seç'}
                  </Button>
                  {secilenMusteri && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSecilenMusteriId('')}
                    >
                      Temizle
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Ürün İşlemleri Tablosu */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ürün</TableHead>
                    <TableHead className="text-center">Rezerv</TableHead>
                    <TableHead className="text-center">Satılan</TableHead>
                    <TableHead className="text-center">İade</TableHead>
                    <TableHead className="text-center">Para Birimi</TableHead>
                    <TableHead className="text-right">Birim Fiyat</TableHead>
                    <TableHead className="text-right">Satış Tutarı</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {urunIslemleri.map((islem) => {
                    const toplamKontrol = islem.satilanMiktar + islem.iadeMiktar;
                    const hataVar = toplamKontrol !== islem.rezervMiktar;
                    
                    return (
                      <TableRow key={islem.urunId} className={hataVar ? 'bg-destructive/10' : ''}>
                        <TableCell className="font-medium">{islem.urunAdi}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{islem.rezervMiktar}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            min="0"
                            max={islem.rezervMiktar}
                            value={islem.satilanMiktar}
                            onChange={(e) => handleSatilanChange(islem.urunId, e.target.value)}
                            onBlur={(e) => {
                              if (e.target.value === '') {
                                handleSatilanChange(islem.urunId, '0');
                              }
                            }}
                            className="w-20 text-center"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            min="0"
                            max={islem.rezervMiktar}
                            value={islem.iadeMiktar}
                            onChange={(e) => handleIadeChange(islem.urunId, e.target.value)}
                            onBlur={(e) => {
                              if (e.target.value === '') {
                                handleIadeChange(islem.urunId, '0');
                              }
                            }}
                            className="w-20 text-center"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{islem.paraBirimi}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{islem.birimFiyati.toFixed(2)} {islem.paraBirimi === 'TRY' ? '₺' : islem.paraBirimi === 'USD' ? '$' : '€'}</TableCell>
                        <TableCell className="text-right font-medium">
                          {(islem.satilanMiktar * islem.birimFiyati).toFixed(2)} {islem.paraBirimi === 'TRY' ? '₺' : islem.paraBirimi === 'USD' ? '$' : '€'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Özet */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Toplam Satış Tutarı:</span>
                <span className="font-bold text-success">{toplamSatisTutari.toFixed(2)} ₺</span>
              </div>
              {toplamIadeTutari > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">İade Tutarı:</span>
                  <span className="font-medium text-muted-foreground">{toplamIadeTutari.toFixed(2)} ₺</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Rezerv Toplam Tutarı:</span>
                <span>{rezerv.genelToplam.toFixed(2)} ₺</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button onClick={handleKaydet} className="bg-success hover:bg-success/90">
              Kaydet ve İşle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MusteriSecModal
        open={musteriModalAcik}
        onOpenChange={setMusteriModalAcik}
        onSelect={(musteriId) => {
          setSecilenMusteriId(musteriId);
          setMusteriModalAcik(false);
        }}
      />
    </>
  );
};
