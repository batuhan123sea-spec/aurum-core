import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { getSatislar, getSatisById, saveSatis, deleteSatis } from "@/lib/satis-data";
import { createIadeHareket } from "@/lib/musteri-data";
import { formatCurrency } from "@/lib/kur-hesaplama";
import { getUrunler, saveUrun } from "@/lib/stok-data";
import { stokHareketKaydet } from "@/lib/stok-hareket";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Satis, SatisKalemi } from "@/types/satis";

interface YeniIadeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  musteriId: string;
  musteriAdi: string;
  onSuccess: () => void;
}

interface IadeKalemi {
  satisId: string;
  satisNo: string;
  kalemId: string;
  urunId: string; // Stok güncellemesi için gerekli
  urunAdi: string;
  maxAdet: number;
  iadeAdet: number;
  paraBirimi: 'TRY' | 'USD' | 'EUR';
  gercekBirimFiyat: number; // İndirim dahil gerçek satış birim fiyatı
  orijinalBirimFiyat: number; // Gösterim için liste fiyatı
  toplamTutar: number;
}

export function YeniIadeModal({ open, onOpenChange, musteriId, musteriAdi, onSuccess }: YeniIadeModalProps) {
  const [secilenSatis, setSecilenSatis] = useState<Satis | null>(null);
  const [iadeKalemleri, setIadeKalemleri] = useState<IadeKalemi[]>([]);
  const [iadeTarihi, setIadeTarihi] = useState<Date>(new Date());
  const [aciklama, setAciklama] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);

  // Müşterinin tamamlanmış ve iptal edilmemiş satışları
  const musterininSatislari = getSatislar().filter(
    s => s.musteriId === musteriId && 
         s.durum === 'tamamlandi' && 
         !s.iptalEdildi &&
         s.satisTuru === 'hesapli'
  ).sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime());

  const handleSatisSecimi = (satisId: string) => {
    const satis = musterininSatislari.find(s => s.id === satisId);
    if (!satis) return;

    setSecilenSatis(satis);
    // Tüm ürünleri iade listesine ekle (başlangıç adedi 0)
    setIadeKalemleri(
      satis.kalemler.map(kalem => ({
        satisId: satis.id,
        satisNo: satis.satisNo,
        kalemId: kalem.id,
        urunId: kalem.urunId, // Stok güncellemesi için
        urunAdi: kalem.urunAdi,
        maxAdet: kalem.adet,
        iadeAdet: 0,
        paraBirimi: kalem.paraBirimi,
        gercekBirimFiyat: kalem.toplamTutar / kalem.adet, // Gerçek net birim fiyat (indirim dahil)
        orijinalBirimFiyat: kalem.orijinalBirimFiyati,
        toplamTutar: 0
      }))
    );
  };

  const handleAdetDegisimi = (kalemId: string, yeniAdet: number) => {
    setIadeKalemleri(prev =>
      prev.map(k => {
        if (k.kalemId === kalemId) {
          const adet = Math.max(0, Math.min(yeniAdet, k.maxAdet));
          return {
            ...k,
            iadeAdet: adet,
            toplamTutar: adet * k.gercekBirimFiyat
          };
        }
        return k;
      })
    );
  };

  const handleIadeOlustur = async () => {
    // İade edilecek ürünleri filtrele
    const iadeEdilecekler = iadeKalemleri.filter(k => k.iadeAdet > 0);

    if (iadeEdilecekler.length === 0) {
      toast.error('En az bir ürün için iade adedi girmelisiniz');
      return;
    }

    if (!secilenSatis) {
      toast.error('Lütfen bir satış seçin');
      return;
    }

    setYukleniyor(true);

    try {
      console.log('🔄 İade işlemi başlatıldı:', { satisNo: secilenSatis.satisNo, iadeEdilecekler });

      // 1️⃣ Stokları geri ekle ve stok hareketi kaydet
      // ✅ RACE CONDITION FIX: Tüm ürünleri BİR KERE al
      let urunler = getUrunler();
      
      // Tüm güncellemeleri hafızada yap
      iadeEdilecekler.forEach(kalem => {
        const urunIndex = urunler.findIndex(u => u.id === kalem.urunId);
        
        if (urunIndex !== -1) {
          const urun = urunler[urunIndex];
          const oncekiMiktar = urun.stokMiktari;
          const yeniMiktar = oncekiMiktar + kalem.iadeAdet;
          
          console.log(`📦 Stok geri ekleniyor: ${urun.ad} +${kalem.iadeAdet} (${oncekiMiktar} → ${yeniMiktar})`);
          
          // Stok hareketi kaydet
          stokHareketKaydet(
            kalem.urunId,
            'giris',
            kalem.iadeAdet,
            `İade - ${secilenSatis.satisNo}`,
            oncekiMiktar,
            yeniMiktar
          );
          
          // Hafızadaki ürünü güncelle
          urunler[urunIndex] = {
            ...urun,
            stokMiktari: yeniMiktar,
            guncellemeTarihi: new Date().toISOString()
          };
        } else {
          console.warn('⚠️ Ürün bulunamadı:', kalem.urunId);
        }
      });
      
      // TÜM ÜRÜNLERİ TEK SEFERDE KAYDET
      localStorage.setItem('kuyumcu_stok_urunler', JSON.stringify(urunler));

      // 2️⃣ Satış kalemlerini güncelle
      const guncelKalemler = secilenSatis.kalemler.map(kalem => {
        const iadeKalemi = iadeEdilecekler.find(k => k.kalemId === kalem.id);
        if (iadeKalemi && iadeKalemi.iadeAdet > 0) {
          const kalanAdet = kalem.adet - iadeKalemi.iadeAdet;
          console.log(`📝 Kalem güncelleniyor: ${kalem.urunAdi} (${kalem.adet} → ${kalanAdet})`);
          
          return {
            ...kalem,
            adet: kalanAdet,
            toplamTutar: kalanAdet * (kalem.toplamTutar / kalem.adet),
            kdvTutari: kalanAdet * (kalem.kdvTutari / kalem.adet),
            indirimTL: kalanAdet * (kalem.indirimTL / kalem.adet)
          };
        }
        return kalem;
      }).filter(kalem => kalem.adet > 0); // 0 adetli kalemleri çıkar

      // 3️⃣ Satışı güncelle veya tamamen sil
      if (guncelKalemler.length === 0) {
        // Tüm ürünler iade edildi - satışı tamamen sil
        console.log('🗑️ Tüm ürünler iade edildi, satış siliniyor:', secilenSatis.satisNo);
        deleteSatis(secilenSatis.id);
      } else {
        // Kısmi iade - satış kaydını güncelle
        const yeniAraToplam = guncelKalemler.reduce((sum, k) => sum + k.toplamTutar, 0);
        const yeniToplamKDV = guncelKalemler.reduce((sum, k) => sum + k.kdvTutari, 0);
        const yeniGenelToplam = secilenSatis.kdvDahil 
          ? yeniAraToplam + yeniToplamKDV 
          : yeniAraToplam;

        console.log('📊 Satış güncelleniyor:', {
          oncekiToplam: secilenSatis.genelToplam,
          yeniToplam: yeniGenelToplam,
          kalanKalemSayisi: guncelKalemler.length
        });

        const guncelSatis = {
          ...secilenSatis,
          kalemler: guncelKalemler,
          araToplam: yeniAraToplam,
          toplamKDV: yeniToplamKDV,
          genelToplam: yeniGenelToplam
        };
        saveSatis(guncelSatis);
      }

      // 4️⃣ Her para birimi için ayrı iade hareketi oluştur
      const paraBirimiGruplari = iadeEdilecekler.reduce((acc, kalem) => {
        if (!acc[kalem.paraBirimi]) {
          acc[kalem.paraBirimi] = [];
        }
        acc[kalem.paraBirimi].push(kalem);
        return acc;
      }, {} as Record<string, IadeKalemi[]>);

      for (const [paraBirimi, kalemler] of Object.entries(paraBirimiGruplari)) {
        const toplamTutar = kalemler.reduce((sum, k) => sum + k.toplamTutar, 0);
        const urunListesi = kalemler.map(k => `${k.urunAdi} (x${k.iadeAdet})`).join(', ');
        
        const aciklamaMetni = aciklama 
          ? `İade - ${secilenSatis.satisNo} - ${urunListesi} - ${aciklama}`
          : `İade - ${secilenSatis.satisNo} - ${urunListesi}`;

        console.log(`💰 İade hareketi oluşturuluyor: ${toplamTutar} ${paraBirimi}`);

        createIadeHareket({
          musteriId,
          tarih: iadeTarihi.toISOString(),
          tutar: toplamTutar,
          paraBirimi: paraBirimi as 'TRY' | 'USD' | 'EUR',
          aciklama: aciklamaMetni
        });
      }

      console.log('✅ İade işlemi tamamlandı');
      toast.success('İade başarıyla kaydedildi');
      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setSecilenSatis(null);
      setIadeKalemleri([]);
      setAciklama('');
      setIadeTarihi(new Date());
    } catch (error) {
      console.error('İade oluşturma hatası:', error);
      toast.error('İade kaydedilirken bir hata oluştu');
    } finally {
      setYukleniyor(false);
    }
  };

  // Para birimine göre grupla
  const paraBirimiToplamlari = iadeKalemleri.reduce((acc, k) => {
    if (k.iadeAdet > 0) {
      if (!acc[k.paraBirimi]) acc[k.paraBirimi] = 0;
      acc[k.paraBirimi] += k.toplamTutar;
    }
    return acc;
  }, {} as Record<string, number>);
  
  const seciliUrunSayisi = iadeKalemleri.filter(k => k.iadeAdet > 0).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>🔄 Yeni İade Ekle - {musteriAdi}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-4">
            {/* Satış Seçimi */}
            <div className="space-y-2">
              <Label>Satış Seçin</Label>
              <Select
                value={secilenSatis?.id || ''}
                onValueChange={handleSatisSecimi}
              >
                <SelectTrigger>
                  <SelectValue placeholder="İade yapılacak satışı seçin..." />
                </SelectTrigger>
                <SelectContent>
                  {musterininSatislari.map(satis => (
                    <SelectItem key={satis.id} value={satis.id}>
                      {satis.satisNo} - {format(new Date(satis.tarih), 'dd.MM.yyyy')} - {formatCurrency(satis.genelToplam, 'TRY')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* İade Tarihi */}
            <div className="space-y-2">
              <Label>İade Tarihi</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !iadeTarihi && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {iadeTarihi ? format(iadeTarihi, "PPP", { locale: tr }) : <span>Tarih seçin</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={iadeTarihi}
                    onSelect={(date) => date && setIadeTarihi(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Ürün Listesi */}
            {secilenSatis && iadeKalemleri.length > 0 && (
              <div className="space-y-2">
                <Label>İade Edilecek Ürünler</Label>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ürün Adı</TableHead>
                        <TableHead className="text-center">Satılan Adet</TableHead>
                        <TableHead className="text-center">İade Adedi</TableHead>
                        <TableHead className="text-right">Birim Fiyat</TableHead>
                        <TableHead className="text-right">Toplam</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {iadeKalemleri.map(kalem => (
                        <TableRow key={kalem.kalemId}>
                          <TableCell className="font-medium">{kalem.urunAdi}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{kalem.maxAdet}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Input
                              type="number"
                              min={0}
                              max={kalem.maxAdet}
                              value={kalem.iadeAdet}
                              onChange={(e) => handleAdetDegisimi(kalem.kalemId, parseInt(e.target.value) || 0)}
                              className="w-20 text-center"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(kalem.gercekBirimFiyat, kalem.paraBirimi)}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(kalem.toplamTutar, kalem.paraBirimi)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Özet */}
                {seciliUrunSayisi > 0 && (
                  <div className="flex justify-end p-3 bg-muted/50 rounded-lg">
                    <div className="text-right space-y-1">
                      <p className="text-sm text-muted-foreground">
                        {seciliUrunSayisi} ürün iade edilecek
                      </p>
                      {Object.entries(paraBirimiToplamlari).map(([pb, toplam]) => (
                        <p key={pb} className="text-lg font-bold">
                          İade ({pb}): {formatCurrency(toplam, pb as 'TRY' | 'USD' | 'EUR')}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Açıklama */}
            <div className="space-y-2">
              <Label>İade Sebebi / Açıklama (Opsiyonel)</Label>
              <Textarea
                placeholder="İade sebebini yazın..."
                value={aciklama}
                onChange={(e) => setAciklama(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={yukleniyor}>
            İptal
          </Button>
          <Button 
            onClick={handleIadeOlustur} 
            disabled={yukleniyor || !secilenSatis || seciliUrunSayisi === 0}
          >
            {yukleniyor ? 'İade Kaydediliyor...' : 'İadeyi Kaydet'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
