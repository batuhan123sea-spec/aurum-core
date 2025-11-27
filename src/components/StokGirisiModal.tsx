import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getUrunler, saveUrun } from "@/lib/stok-data";
import { getTedarikciler, saveTedarikciAlim } from "@/lib/tedarikci-data";
import { TedarikciAlim } from "@/types/tedarikci";
import { stokHareketKaydet } from "@/lib/stok-hareket";
import { useToast } from "@/hooks/use-toast";

const stokGirisiSchema = z.object({
  urunId: z.string().min(1, "Ürün seçimi zorunludur"),
  miktar: z.number().positive("Miktar pozitif olmalıdır"),
  alisFiyati: z.number().positive("Alış fiyatı pozitif olmalıdır"),
  paraBirimi: z.enum(['TRY', 'USD', 'EUR']),
  tedarikciId: z.string().optional(),
  aciklama: z.string().max(500).optional(),
});

type StokGirisiFormValues = z.infer<typeof stokGirisiSchema>;

interface StokGirisiModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const StokGirisiModal = ({ open, onOpenChange, onSuccess }: StokGirisiModalProps) => {
  const { toast } = useToast();
  const allUrunler = getUrunler();
  const allTedarikciler = getTedarikciler();
  
  const form = useForm<StokGirisiFormValues>({
    resolver: zodResolver(stokGirisiSchema),
    defaultValues: {
      urunId: "",
      miktar: 1,
      alisFiyati: 0,
      paraBirimi: 'TRY',
      tedarikciId: "",
      aciklama: "",
    },
  });

  const secilenUrunId = form.watch("urunId");
  const secilenTedarikciId = form.watch("tedarikciId");

  // Ürün seçildiğinde alış fiyatı ve para birimini otomatik doldur
  useEffect(() => {
    if (secilenUrunId) {
      const urun = allUrunler.find(u => u.id === secilenUrunId);
      if (urun) {
        form.setValue("alisFiyati", urun.alisFiyati);
        form.setValue("paraBirimi", urun.alisFiyatiParaBirimi);
      }
    }
  }, [secilenUrunId, allUrunler]);

  // Tedarikçi seçildiğinde, o tedarikçinin mevcut fiyatını doldur
  useEffect(() => {
    if (secilenUrunId && secilenTedarikciId) {
      const urun = allUrunler.find(u => u.id === secilenUrunId);
      if (urun?.tedarikciler) {
        const mevcutTedarikci = urun.tedarikciler.find(t => t.tedarikciId === secilenTedarikciId);
        if (mevcutTedarikci) {
          // Tedarikçinin mevcut fiyatını doldur
          form.setValue("alisFiyati", mevcutTedarikci.alisFiyati);
          form.setValue("paraBirimi", mevcutTedarikci.paraBirimi);
        }
      }
    }
  }, [secilenTedarikciId, secilenUrunId, allUrunler]);

  const onSubmit = (data: StokGirisiFormValues) => {
    const urun = allUrunler.find(u => u.id === data.urunId);
    if (!urun) {
      toast({
        title: "Hata",
        description: "Ürün bulunamadı",
        variant: "destructive"
      });
      return;
    }

    const oncekiMiktar = urun.stokMiktari;
    const yeniMiktar = oncekiMiktar + data.miktar;
    
    // Stok hareketi kaydet
    const aciklamaMetni = data.tedarikciId 
      ? `Tedarikçi Alımı${data.aciklama ? ` - ${data.aciklama}` : ''}`
      : `Stok Girişi${data.aciklama ? ` - ${data.aciklama}` : ''}`;
    
    stokHareketKaydet(
      data.urunId,
      'giris',
      data.miktar,
      aciklamaMetni,
      oncekiMiktar,
      yeniMiktar
    );
    
    // Stok miktarını güncelle
    urun.stokMiktari = yeniMiktar;
    
    // Tedarikçi seçildiyse, ürünün tedarikçi listesine ekle/güncelle
    if (data.tedarikciId) {
      const tedarikci = allTedarikciler.find(t => t.id === data.tedarikciId);
      
      if (!urun.tedarikciler) {
        urun.tedarikciler = [];
      }
      
      const mevcutTedarikciIndex = urun.tedarikciler.findIndex(
        t => t.tedarikciId === data.tedarikciId
      );
      
      if (mevcutTedarikciIndex >= 0) {
        // Mevcut tedarikçi bilgisini güncelle
        urun.tedarikciler[mevcutTedarikciIndex] = {
          ...urun.tedarikciler[mevcutTedarikciIndex],
          alisFiyati: data.alisFiyati,
          paraBirimi: data.paraBirimi,
          sonAlisTarihi: new Date().toISOString(),
        };
      } else {
        // Yeni tedarikçi ekle
        urun.tedarikciler.push({
          id: Date.now().toString() + Math.random(),
          tedarikciId: data.tedarikciId,
          tedarikciAdi: tedarikci?.firmaAdi || 'Bilinmeyen Tedarikçi',
          alisFiyati: data.alisFiyati,
          paraBirimi: data.paraBirimi,
          sonAlisTarihi: new Date().toISOString(),
          varsayilan: urun.tedarikciler.length === 0,
        });
      }
      
      // Tedarikçi alım kaydı oluştur
      const alimKaydi: TedarikciAlim = {
        id: Date.now().toString(),
        tedarikciId: data.tedarikciId,
        tarih: new Date().toISOString(),
        faturaNo: `ALM-${Date.now().toString().slice(-6)}`,
        urunler: [{
          urunId: data.urunId,
          urunAdi: urun.ad,
          miktar: data.miktar,
          birimFiyat: data.alisFiyati,
          paraBirimi: data.paraBirimi,
          toplamTutar: data.alisFiyati * data.miktar
        }],
        genelToplam: data.alisFiyati * data.miktar,
        odemeDurumu: 'odendi',
        aciklama: data.aciklama || undefined
      };
      
      saveTedarikciAlim(alimKaydi);
    }
    
    saveUrun(urun);
    
    toast({
      title: "Başarılı!",
      description: "Stok girişi tamamlandı.",
    });
    
    form.reset();
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Stok Girişi</DialogTitle>
          <DialogDescription>
            Ürün stok miktarını artırın
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="urunId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ürün *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Ürün seçin" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {allUrunler.map(u => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.ad} ({u.kod})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="miktar"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Miktar *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="1"
                      placeholder="Miktar"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="alisFiyati"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alış Fiyatı *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Alış fiyatı"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paraBirimi"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Para Birimi *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="TRY">TRY</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="tedarikciId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tedarikçi (isteğe bağlı)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Tedarikçi seçin (isteğe bağlı)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {allTedarikciler
                        .filter(t => t.durum === 'aktif')
                        .map(t => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.firmaAdi} ({t.kod})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="aciklama"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Açıklama</FormLabel>
                  <FormControl>
                    <Textarea placeholder="İsteğe bağlı açıklama..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                İptal
              </Button>
              <Button type="submit" className="bg-success hover:bg-success/90">
                Stok Ekle
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};