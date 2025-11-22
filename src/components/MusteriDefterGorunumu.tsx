import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileDown } from "lucide-react";
import { getSatislar } from "@/lib/satis-data";
import { getHareketlerByMusteriId, getMusteriById } from "@/lib/musteri-data";
import { formatCurrency } from "@/lib/kur-hesaplama";
import { musteriDefterExcelAktar } from "@/lib/excel-export";
import { format, startOfWeek, endOfWeek, isSaturday, isMonday, parseISO, isSameDay } from "date-fns";
import { tr } from "date-fns/locale";

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
}

interface GunlukSatis {
  tarih: Date;
  gun: string;
  kalemler: GunlukKalem[];
  gunlukToplam: number;
  isCumartesi: boolean;
  isPazartesi: boolean;
  haftalikToplam?: number;
  tahsilEdilen?: number;
  kalanBorc?: number;
  acilisBakiyesi?: number;
}

interface MusteriDefterGorunumuProps {
  musteriId: string;
}

const MusteriDefterGorunumu = ({ musteriId }: MusteriDefterGorunumuProps) => {
  const [gunlukVeriler, setGunlukVeriler] = useState<GunlukSatis[]>([]);
  const musteri = getMusteriById(musteriId);

  const handleExcelExport = () => {
    if (!musteri) return;
    musteriDefterExcelAktar(musteri.adSoyad, gunlukVeriler);
  };

  useEffect(() => {
    const tumSatislar = getSatislar().filter(
      s => s.musteriId === musteriId && s.durum === 'tamamlandi'
    );
    
    const hareketler = getHareketlerByMusteriId(musteriId);

    // Tarihe göre grupla
    const tarihMap = new Map<string, GunlukKalem[]>();
    
    tumSatislar.forEach(satis => {
      const tarihStr = satis.tarih.split('T')[0];
      
      satis.kalemler.forEach(kalem => {
        if (!tarihMap.has(tarihStr)) {
          tarihMap.set(tarihStr, []);
        }
        
              tarihMap.get(tarihStr)!.push({
                satisNo: satis.satisNo,
                musteriAdi: satis.musteriAdi || 'Müşteri',
                urunAdi: kalem.urunAdi,
                adet: kalem.adet,
                paraBirimi: kalem.paraBirimi,
                orijinalBirimFiyat: kalem.orijinalBirimFiyati,
                orijinalToplam: kalem.orijinalBirimFiyati * kalem.adet,
                birimFiyat: kalem.birimFiyati,
                toplam: kalem.toplamTutar
              });
      });
    });

    // Günlük verileri oluştur
    const gunler: GunlukSatis[] = [];
    const sortedTarihler = Array.from(tarihMap.keys()).sort((a, b) => 
      new Date(b).getTime() - new Date(a).getTime()
    );

    sortedTarihler.forEach(tarihStr => {
      const tarih = parseISO(tarihStr);
      const kalemler = tarihMap.get(tarihStr) || [];
      const gunlukToplam = kalemler.reduce((sum, k) => sum + k.toplam, 0);

      const gunData: GunlukSatis = {
        tarih,
        gun: format(tarih, 'EEEE', { locale: tr }),
        kalemler,
        gunlukToplam,
        isCumartesi: isSaturday(tarih),
        isPazartesi: isMonday(tarih)
      };

      // Cumartesi için haftalık hesaplama
      if (gunData.isCumartesi) {
        const haftaBaslangic = startOfWeek(tarih, { weekStartsOn: 1 });
        const haftaBitis = endOfWeek(tarih, { weekStartsOn: 1 });
        
        // Bu haftanın tüm satışlarını topla
        const haftalikSatislar = tumSatislar.filter(s => {
          const satisTarih = parseISO(s.tarih);
          return satisTarih >= haftaBaslangic && satisTarih <= haftaBitis;
        });
        
        gunData.haftalikToplam = haftalikSatislar.reduce((sum, s) => sum + s.genelToplam, 0);
        
        // Cumartesi günü yapılan ödemeleri topla
        const cumartesiOdemeler = hareketler.filter(h => {
          const hareketTarih = parseISO(h.tarih);
          return h.islemTuru === 'odeme' && isSameDay(hareketTarih, tarih);
        });
        
        gunData.tahsilEdilen = cumartesiOdemeler.reduce((sum, h) => sum + h.tlKarsiligi, 0);
        gunData.kalanBorc = gunData.haftalikToplam - gunData.tahsilEdilen;
      }

      // Pazartesi için açılış bakiyesi
      if (gunData.isPazartesi) {
        // Önceki cumartesinin kalan borcunu bul
        const oncekiCumartesi = gunler.find(g => 
          g.isCumartesi && g.tarih < tarih
        );
        
        if (oncekiCumartesi && oncekiCumartesi.kalanBorc !== undefined) {
          gunData.acilisBakiyesi = oncekiCumartesi.kalanBorc;
        } else {
          // İlk hafta ise, o tarihe kadar olan toplam borç
          const oncekiSatislar = tumSatislar.filter(s => {
            const satisTarih = parseISO(s.tarih);
            return satisTarih < tarih;
          });
          const oncekiOdemeler = hareketler.filter(h => {
            const hareketTarih = parseISO(h.tarih);
            return h.islemTuru === 'odeme' && hareketTarih < tarih;
          });
          
          const toplamSatis = oncekiSatislar.reduce((sum, s) => sum + s.genelToplam, 0);
          const toplamOdeme = oncekiOdemeler.reduce((sum, h) => sum + h.tlKarsiligi, 0);
          gunData.acilisBakiyesi = toplamSatis - toplamOdeme;
        }
      }

      gunler.push(gunData);
    });

    setGunlukVeriler(gunler);
  }, [musteriId]);

  if (gunlukVeriler.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Bu müşteri için henüz satış kaydı bulunmuyor.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Müşteri Defteri</h3>
        <Button 
          variant="outline" 
          onClick={handleExcelExport}
          className="gap-2"
          disabled={gunlukVeriler.length === 0}
        >
          <FileDown className="w-4 h-4" />
          Excel'e Aktar
        </Button>
      </div>

      <ScrollArea className="h-[600px]">
        <div className="space-y-2 pr-4">
        {gunlukVeriler.map((gun, index) => (
          <Card 
            key={index}
            className={gun.isCumartesi ? "border-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20" : ""}
          >
            <CardHeader className="pb-2 py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm">📅</span>
                  <div>
                    <h3 className="text-sm font-semibold">
                      {format(gun.tarih, 'dd MMMM yyyy', { locale: tr })} - {gun.gun}
                    </h3>
                    {gun.isCumartesi && (
                      <Badge variant="secondary" className="mt-1">
                        ⭐ TAHSİLAT GÜNÜ
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {gun.isPazartesi && gun.acilisBakiyesi !== undefined && (
                <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">📖</span>
                    <div>
                      <p className="text-xs font-medium text-blue-900 dark:text-blue-100">
                        Açılış Bakiyesi
                      </p>
                      <p className="text-base font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(gun.acilisBakiyesi, 'TRY')}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardHeader>

            <CardContent className="space-y-2 py-2">
              {/* Günlük Satış Tablosu */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs py-2">Satış No</TableHead>
                      <TableHead className="text-xs py-2">Ürün Adı</TableHead>
                      <TableHead className="text-xs text-right py-2">Adet</TableHead>
                      <TableHead className="text-xs text-right py-2">Birim Fiyat</TableHead>
                      <TableHead className="text-xs text-right py-2">Toplam</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gun.kalemler.map((kalem, idx) => (
                      <TableRow key={idx}>
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Günlük Toplam */}
              <div className="flex justify-end">
                <div className="bg-muted px-3 py-1 rounded-lg">
                  <span className="text-xs text-muted-foreground mr-2">Günlük Toplam:</span>
                  <span className="text-sm font-bold">
                    {formatCurrency(gun.gunlukToplam, 'TRY')}
                  </span>
                </div>
              </div>

              {/* Cumartesi Özet */}
              {gun.isCumartesi && (
                <div className="mt-2 space-y-1 p-2 bg-yellow-100/50 dark:bg-yellow-900/20 rounded-lg border-2 border-yellow-300 dark:border-yellow-700">
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
            </CardContent>
          </Card>
        ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default MusteriDefterGorunumu;
