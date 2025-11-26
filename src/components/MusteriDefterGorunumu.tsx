import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { FileDown, Edit2, Trash2 } from "lucide-react";
import { getSatislar } from "@/lib/satis-data";
import { getHareketlerByMusteriId, getMusteriById, deleteHareket } from "@/lib/musteri-data";
import { formatCurrency } from "@/lib/kur-hesaplama";
import { musteriDefterExcelAktar } from "@/lib/excel-export";
import { HareketDuzenleModal } from "@/components/HareketDuzenleModal";
import { YeniHareketModal } from "@/components/YeniHareketModal";
import { format, startOfWeek, endOfWeek, isSaturday, isMonday, parseISO, isSameDay } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";
import type { HesapHareketi } from "@/types/musteri";

interface GunlukKalem {
  satisNo: string;
  musteriAdi: string;
  urunAdi: string;
  adet: number;
  paraBirimi: 'TRY' | 'USD' | 'EUR';
  orijinalBirimFiyat: number;
  orijinalToplam: number;
  birimFiyat: number;
  toplam: number;
  hareketId?: string;
  hareket?: HesapHareketi | null;
}

interface GunlukSatis {
  tarih: Date;
  gun: string;
  kalemler: GunlukKalem[];
  odemeler: HesapHareketi[];
  iadeler: HesapHareketi[];
  gunlukToplam: number;
  isCumartesi: boolean;
  isPazartesi: boolean;
  haftalikToplam?: number;
  tahsilEdilen?: number;
  kalanBorc?: number;
  acilisBakiyesi?: number;
  kapanisBakiyesi?: number;
}

interface MusteriDefterGorunumuProps {
  musteriId: string;
  onHareketDuzenlendi?: () => void;
  onHareketSilindi?: () => void;
}

const MusteriDefterGorunumu = ({ 
  musteriId, 
  onHareketDuzenlendi, 
  onHareketSilindi 
}: MusteriDefterGorunumuProps) => {
  const [gunlukVeriler, setGunlukVeriler] = useState<GunlukSatis[]>([]);
  const [duzenlenecekHareket, setDuzenlenecekHareket] = useState<HesapHareketi | null>(null);
  const [silinecekHareketId, setSilinecekHareketId] = useState<string | null>(null);
  const [yenilemeKey, setYenilemeKey] = useState(0);
  const [filtre, setFiltre] = useState<'tum' | 'satis' | 'odeme'>('tum');
  const [yeniHareketModalOpen, setYeniHareketModalOpen] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(true);
  const musteri = getMusteriById(musteriId);

  // Türkiye timezone'ına göre tarih string'i döndürür (GMT+3)
  const getTarihStr = (isoTarih: string): string => {
    const date = new Date(isoTarih);
    // Türkiye saati için +3 saat ekle
    const turkiyeTarihi = new Date(date.getTime() + (3 * 60 * 60 * 1000));
    return turkiyeTarihi.toISOString().split('T')[0];
  };

  const handleExcelExport = () => {
    if (!musteri) return;
    musteriDefterExcelAktar(musteri.adSoyad, gunlukVeriler);
  };

  const handleSil = () => {
    if (!silinecekHareketId) return;
    
    deleteHareket(silinecekHareketId, musteriId);
    toast.success("Hareket başarıyla silindi");
    setSilinecekHareketId(null);
    setYenilemeKey(prev => prev + 1);
    onHareketSilindi?.();
  };

  const handleDuzenleSuccess = () => {
    setDuzenlenecekHareket(null);
    setYenilemeKey(prev => prev + 1);
    onHareketDuzenlendi?.();
  };

  useEffect(() => {
    setYukleniyor(true);
    
    const tumSatislar = getSatislar().filter(
      s => s.musteriId === musteriId && 
           s.durum === 'tamamlandi' &&
           !s.iptalEdildi // İptal edilenleri defter görünümünde gösterme
    );
    
    const hareketler = getHareketlerByMusteriId(musteriId);

    // Tarihe göre grupla
    const tarihMap = new Map<string, {
      kalemler: GunlukKalem[];
      odemeler: HesapHareketi[];
      iadeler: HesapHareketi[];
    }>();
    
    // Satışları ekle
    tumSatislar.forEach(satis => {
      const tarihStr = getTarihStr(satis.tarih);
      
      if (!tarihMap.has(tarihStr)) {
        tarihMap.set(tarihStr, { kalemler: [], odemeler: [], iadeler: [] });
      }
      
      // Bu satışa ait hareketleri bul
      const ilgiliHareketler = hareketler.filter(h => 
        h.aciklama.includes(satis.satisNo) && h.islemTuru === 'satis'
      );

      // ✅ Eğer bu satışa ait hareket yoksa (silindi), bu satışı gösterme
      if (ilgiliHareketler.length === 0) {
        return;
      }

      satis.kalemler.forEach((kalem, kalemIndex) => {
        // İlk kaleme hareket ID'sini ve hareket objesini ekle
        const hareketId = kalemIndex === 0 && ilgiliHareketler.length > 0 
          ? ilgiliHareketler[0].id 
          : undefined;
        
        const tamHareket = kalemIndex === 0 && ilgiliHareketler.length > 0
          ? ilgiliHareketler[0]
          : null;
        
        tarihMap.get(tarihStr)!.kalemler.push({
          satisNo: satis.satisNo,
          musteriAdi: satis.musteriAdi || 'Müşteri',
          urunAdi: kalem.urunAdi,
          adet: kalem.adet,
          paraBirimi: kalem.paraBirimi,
          orijinalBirimFiyat: kalem.orijinalBirimFiyati,
          orijinalToplam: kalem.orijinalBirimFiyati * kalem.adet,
          birimFiyat: kalem.birimFiyati,
          toplam: kalem.toplamTutar,
          hareketId,
          hareket: tamHareket
        });
      });
    });

    // Ödemeleri ve iadeleri ekle
    hareketler.forEach(hareket => {
      if (hareket.islemTuru === 'odeme' || hareket.islemTuru === 'iade') {
        const tarihStr = getTarihStr(hareket.tarih);
        
        if (!tarihMap.has(tarihStr)) {
          tarihMap.set(tarihStr, { kalemler: [], odemeler: [], iadeler: [] });
        }
        
        if (hareket.islemTuru === 'odeme') {
          tarihMap.get(tarihStr)!.odemeler.push(hareket);
        } else {
          tarihMap.get(tarihStr)!.iadeler.push(hareket);
        }
      }
    });

    // Günlük verileri oluştur ve kümülatif bakiye hesapla
    const gunler: GunlukSatis[] = [];
    
    // Tarihleri eskiden yeniye sırala (kümülatif hesaplama için)
    const sortedTarihler = Array.from(tarihMap.keys()).sort((a, b) => 
      new Date(a).getTime() - new Date(b).getTime()
    );

    // İlk gün için başlangıç bakiyesini hesapla (tüm önceki işlemler)
    let kumulatifBakiye = 0;
    const ilkTarih = sortedTarihler.length > 0 ? parseISO(sortedTarihler[0]) : null;
    
    if (ilkTarih) {
      const oncekiSatislar = tumSatislar.filter(s => {
        const satisTarih = parseISO(s.tarih);
        return satisTarih < ilkTarih;
      });
      const oncekiHareketler = hareketler.filter(h => {
        const hareketTarih = parseISO(h.tarih);
        return hareketTarih < ilkTarih;
      });
      
      const oncekiSatisTopla = oncekiSatislar.reduce((sum, s) => sum + s.genelToplam, 0);
      const oncekiOdemeTopla = oncekiHareketler
        .filter(h => h.islemTuru === 'odeme')
        .reduce((sum, h) => sum + h.tlKarsiligi, 0);
      const oncekiIadeTopla = oncekiHareketler
        .filter(h => h.islemTuru === 'iade')
        .reduce((sum, h) => sum + h.tlKarsiligi, 0);
      
      kumulatifBakiye = oncekiSatisTopla - oncekiOdemeTopla - oncekiIadeTopla;
      console.log('📊 Başlangıç bakiyesi:', kumulatifBakiye.toFixed(2), 'TRY');
    }

    sortedTarihler.forEach(tarihStr => {
      const tarih = parseISO(tarihStr);
      const gunData = tarihMap.get(tarihStr)!;
      
      // Günlük açılış bakiyesi = önceki günün kapanış bakiyesi
      const acilisBakiyesi = kumulatifBakiye;
      
      // Günlük işlem toplamları
      const gunlukSatisToplami = gunData.kalemler.reduce((sum, k) => sum + k.toplam, 0);
      const gunlukOdemeToplami = gunData.odemeler.reduce((sum, o) => sum + o.tlKarsiligi, 0);
      const gunlukIadeToplami = gunData.iadeler.reduce((sum, i) => sum + i.tlKarsiligi, 0);
      const gunlukNet = gunlukSatisToplami - gunlukOdemeToplami - gunlukIadeToplami;
      
      // Günlük kapanış bakiyesi = açılış + net işlemler
      const kapanisBakiyesi = acilisBakiyesi + gunlukNet;
      
      // Sonraki gün için güncelle
      kumulatifBakiye = kapanisBakiyesi;

      const gun: GunlukSatis = {
        tarih,
        gun: format(tarih, 'EEEE', { locale: tr }),
        kalemler: gunData.kalemler,
        odemeler: gunData.odemeler,
        iadeler: gunData.iadeler,
        gunlukToplam: gunlukNet,
        acilisBakiyesi,
        kapanisBakiyesi,
        isCumartesi: isSaturday(tarih),
        isPazartesi: isMonday(tarih)
      };

      // Cumartesi için haftalık hesaplama (eskisi gibi)
      if (gun.isCumartesi) {
        const haftaBaslangic = startOfWeek(tarih, { weekStartsOn: 1 });
        const haftaBitis = endOfWeek(tarih, { weekStartsOn: 1 });
        
        const haftalikSatislar = tumSatislar.filter(s => {
          const satisTarih = parseISO(s.tarih);
          return satisTarih >= haftaBaslangic && satisTarih <= haftaBitis;
        });
        
        gun.haftalikToplam = haftalikSatislar.reduce((sum, s) => sum + s.genelToplam, 0);
        
        const cumartesiOdemeler = hareketler.filter(h => {
          const hareketTarih = parseISO(h.tarih);
          return h.islemTuru === 'odeme' && isSameDay(hareketTarih, tarih);
        });
        
        gun.tahsilEdilen = cumartesiOdemeler.reduce((sum, h) => sum + h.tlKarsiligi, 0);
        gun.kalanBorc = gun.haftalikToplam - gun.tahsilEdilen;
      }

      gunler.push(gun);
    });

    // Görüntüleme için ters çevir (en yeni üstte)
    setGunlukVeriler(gunler.reverse());
    setYukleniyor(false);
  }, [musteriId, yenilemeKey]);

  const filtrelenmisVeriler = gunlukVeriler.filter(gun => {
    if (filtre === 'satis') return gun.kalemler.length > 0;
    if (filtre === 'odeme') return gun.odemeler.length > 0;
    return true; // 'tum' için hepsini göster
  });

  // Boş günleri filtrele (hiç satış, ödeme, iade olmayanlar)
  const gosterilecekGunler = filtrelenmisVeriler.filter(gun => 
    gun.kalemler.length > 0 || gun.odemeler.length > 0 || gun.iadeler.length > 0
  );

  if (yukleniyor) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground mt-4">Yükleniyor...</p>
      </div>
    );
  }

  if (gosterilecekGunler.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {filtre === 'tum' 
          ? 'Bu müşteri için henüz satış kaydı bulunmuyor.'
          : 'Seçili filtreye uygun kayıt bulunamadı.'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant={filtre === 'tum' ? 'default' : 'outline'}
            onClick={() => setFiltre('tum')}
          >
            Tümü
          </Button>
          <Button 
            size="sm" 
            variant={filtre === 'satis' ? 'default' : 'outline'}
            onClick={() => setFiltre('satis')}
          >
            Satışlar
          </Button>
          <Button 
            size="sm" 
            variant={filtre === 'odeme' ? 'default' : 'outline'}
            onClick={() => setFiltre('odeme')}
          >
            Ödemeler
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setYeniHareketModalOpen(true)}
            className="gap-2"
          >
            + Yeni Hareket Ekle
          </Button>
          <Button 
            variant="outline" 
            onClick={handleExcelExport}
            className="gap-2"
            disabled={gunlukVeriler.length === 0}
          >
            <FileDown className="w-4 h-4" />
            Excel
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[600px]">
        <div className="pr-4">
          <Accordion type="single" collapsible defaultValue={gosterilecekGunler[0]?.tarih.toISOString()}>
            {gosterilecekGunler.map((gun, index) => (
              <AccordionItem 
                key={index} 
                value={gun.tarih.toISOString()}
                className={gun.isCumartesi ? "border-yellow-500" : ""}
              >
                <AccordionTrigger className="hover:no-underline px-4 py-3">
                  <div className="flex items-center justify-between w-full mr-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm">📅</span>
                      <span className="font-semibold text-sm">
                        {format(gun.tarih, 'dd MMMM yyyy', { locale: tr })} - {gun.gun}
                      </span>
                      {gun.isCumartesi && (
                        <Badge variant="secondary" className="text-xs">⭐ TAHSİLAT</Badge>
                      )}
                    </div>
                    
                    {/* Özet Bilgiler (Kapalıyken görünür) */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {gun.kalemler.length > 0 && (
                        <span>{gun.kalemler.length} ürün</span>
                      )}
                      {gun.odemeler.length > 0 && (
                        <span className="text-green-600">{gun.odemeler.length} ödeme</span>
                      )}
                      {gun.iadeler.length > 0 && (
                        <span className="text-blue-600">{gun.iadeler.length} iade</span>
                      )}
                      <span className="font-semibold text-foreground">
                        {formatCurrency(gun.gunlukToplam, 'TRY')}
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>
                
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-3">
                    {/* Günlük Bakiye Özeti - Her gün için göster */}
                    {gun.acilisBakiyesi !== undefined && gun.kapanisBakiyesi !== undefined && (
                      <div className="p-3 bg-muted/30 rounded-lg border">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Açılış Bakiyesi</p>
                            <p className="font-semibold">{formatCurrency(gun.acilisBakiyesi, 'TRY')}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground mb-1">Kapanış Bakiyesi</p>
                            <p className="font-bold text-lg">{formatCurrency(gun.kapanisBakiyesi, 'TRY')}</p>
                          </div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-border/50 grid grid-cols-3 gap-2 text-xs">
                          {gun.kalemler.length > 0 && (
                            <div>
                              <span className="text-muted-foreground">Satışlar: </span>
                              <span className="font-medium text-green-600">
                                +{formatCurrency(gun.kalemler.reduce((sum, k) => sum + k.toplam, 0), 'TRY')}
                              </span>
                            </div>
                          )}
                          {gun.odemeler.length > 0 && (
                            <div>
                              <span className="text-muted-foreground">Ödemeler: </span>
                              <span className="font-medium text-red-600">
                                -{formatCurrency(gun.odemeler.reduce((sum, o) => sum + o.tlKarsiligi, 0), 'TRY')}
                              </span>
                            </div>
                          )}
                          {gun.iadeler.length > 0 && (
                            <div>
                              <span className="text-muted-foreground">İadeler: </span>
                              <span className="font-medium text-blue-600">
                                -{formatCurrency(gun.iadeler.reduce((sum, i) => sum + i.tlKarsiligi, 0), 'TRY')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Günlük Satış Tablosu */}
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs py-2">İşlem Türü</TableHead>
                            <TableHead className="text-xs py-2">Satış No / Açıklama</TableHead>
                            <TableHead className="text-xs py-2">Ürün / Detay</TableHead>
                            <TableHead className="text-xs text-right py-2">Adet</TableHead>
                            <TableHead className="text-xs text-right py-2">Birim Fiyat</TableHead>
                            <TableHead className="text-xs text-right py-2">Toplam</TableHead>
                            <TableHead className="text-xs text-right py-2 w-20">İşlem</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {gun.kalemler.map((kalem, idx) => (
                            <TableRow key={`${gun.tarih.getTime()}-${kalem.satisNo}-${kalem.urunAdi}-${idx}`}>
                              <TableCell className="text-xs py-1">
                                <Badge variant="outline">💰 Satış</Badge>
                              </TableCell>
                              <TableCell className="text-xs font-medium py-1">{kalem.satisNo}</TableCell>
                              <TableCell className="text-xs py-1">{kalem.urunAdi}</TableCell>
                              <TableCell className="text-xs text-right py-1">{kalem.adet}</TableCell>
                              <TableCell className="text-xs text-right py-1">
                                <div className="flex flex-col items-end">
                                  <span className="font-medium">
                                    {formatCurrency(kalem.orijinalBirimFiyat, kalem.paraBirimi)}
                                  </span>
                                  {kalem.paraBirimi !== 'TRY' && (
                                    <span className="text-[10px] text-muted-foreground/60 italic">
                                      ({formatCurrency(kalem.birimFiyat, 'TRY')})
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-xs text-right font-semibold py-1">
                                <div className="flex flex-col items-end">
                                  <span className="font-semibold">
                                    {formatCurrency(kalem.orijinalToplam, kalem.paraBirimi)}
                                  </span>
                                  {kalem.paraBirimi !== 'TRY' && (
                                    <span className="text-[10px] text-muted-foreground/60 italic">
                                      ({formatCurrency(kalem.toplam, 'TRY')})
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-xs text-right py-1">
                                {kalem.hareket && (
                                  <div className="flex gap-1 justify-end">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6"
                                      onClick={() => setDuzenlenecekHareket(kalem.hareket!)}
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6 text-destructive hover:text-destructive"
                                      onClick={() => setSilinecekHareketId(kalem.hareket!.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}

                          {/* Ödemeler */}
                          {gun.odemeler.map((odeme, idx) => (
                            <TableRow key={`odeme-${gun.tarih.getTime()}-${odeme.id}-${idx}`} className="bg-green-50/50 dark:bg-green-950/20">
                              <TableCell className="text-xs py-1">
                                <Badge variant="outline" className="text-green-600 border-green-600">
                                  💵 Ödeme
                                </Badge>
                              </TableCell>
                              <TableCell colSpan={3} className="text-xs py-1">
                                {odeme.aciklama}
                              </TableCell>
                              <TableCell className="text-xs text-right py-1">
                                {odeme.odemeTuru && (
                                  <Badge variant="secondary" className="text-[10px]">
                                    {odeme.odemeTuru}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-xs text-right font-semibold py-1 text-green-600 dark:text-green-400">
                                -{formatCurrency(odeme.tutar, odeme.paraBirimi)}
                              </TableCell>
                              <TableCell className="text-xs text-right py-1">
                                <div className="flex gap-1 justify-end">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6"
                                    onClick={() => setDuzenlenecekHareket(odeme)}
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 text-destructive hover:text-destructive"
                                    onClick={() => setSilinecekHareketId(odeme.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}

                          {/* İadeler */}
                          {gun.iadeler.map((iade, idx) => (
                            <TableRow key={`iade-${gun.tarih.getTime()}-${iade.id}-${idx}`} className="bg-blue-50/50 dark:bg-blue-950/20">
                              <TableCell className="text-xs py-1">
                                <Badge variant="outline" className="text-blue-600 border-blue-600">
                                  🔄 İade
                                </Badge>
                              </TableCell>
                              <TableCell colSpan={4} className="text-xs py-1">
                                {iade.aciklama}
                              </TableCell>
                              <TableCell className="text-xs text-right font-semibold py-1 text-blue-600 dark:text-blue-400">
                                -{formatCurrency(iade.tutar, iade.paraBirimi)}
                              </TableCell>
                              <TableCell className="text-xs text-right py-1">
                                <div className="flex gap-1 justify-end">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6"
                                    onClick={() => setDuzenlenecekHareket(iade)}
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 text-destructive hover:text-destructive"
                                    onClick={() => setSilinecekHareketId(iade.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Günlük Net Toplam */}
                    <div className="flex justify-end">
                      <div className="bg-muted px-3 py-1 rounded-lg">
                        <span className="text-xs text-muted-foreground mr-2">Günlük Net Toplam:</span>
                        <span className="text-sm font-bold">
                          {formatCurrency(gun.gunlukToplam, 'TRY')}
                        </span>
                      </div>
                    </div>

                    {/* Cumartesi Özet */}
                    {gun.isCumartesi && (
                      <div className="space-y-1 p-2 bg-yellow-100/50 dark:bg-yellow-900/20 rounded-lg border-2 border-yellow-300 dark:border-yellow-700">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 text-xs font-medium">
                            <span>📊</span> Haftalık Toplam Satış:
                          </span>
                          <span className="text-sm font-bold">
                            {formatCurrency(gun.haftalikToplam || 0, 'TRY')}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 text-xs font-medium">
                            <span>💰</span> Tahsil Edilen Tutar:
                          </span>
                          <span className="text-sm font-bold text-green-600 dark:text-green-400">
                            {formatCurrency(gun.tahsilEdilen || 0, 'TRY')}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between pt-1 border-t border-yellow-300 dark:border-yellow-700">
                          <span className="flex items-center gap-1 text-xs font-medium">
                            <span>📉</span> Kalan Borç:
                          </span>
                          <span className="text-base font-bold text-red-600 dark:text-red-400">
                            {formatCurrency(gun.kalanBorc || 0, 'TRY')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </ScrollArea>

      {duzenlenecekHareket && (
        <HareketDuzenleModal
          open={!!duzenlenecekHareket}
          onOpenChange={(open) => !open && setDuzenlenecekHareket(null)}
          hareket={duzenlenecekHareket}
          onSuccess={handleDuzenleSuccess}
        />
      )}

      <YeniHareketModal
        open={yeniHareketModalOpen}
        onOpenChange={setYeniHareketModalOpen}
        musteriId={musteriId}
        onSuccess={() => {
          setYenilemeKey(prev => prev + 1);
          onHareketDuzenlendi?.();
        }}
      />

      <AlertDialog open={!!silinecekHareketId} onOpenChange={(open) => !open && setSilinecekHareketId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hareketi Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu hareketi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve müşteri bakiyesi yeniden hesaplanacaktır.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleSil} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MusteriDefterGorunumu;
