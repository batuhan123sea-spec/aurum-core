import { useState } from "react";
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
import { Card } from "@/components/ui/card";
import { Plus, X } from "lucide-react";
import { saveTedarikciAlim } from "@/lib/tedarikci-data";
import { getUrunler, saveUrun } from "@/lib/stok-data";
import { stokHareketKaydet } from "@/lib/stok-hareket";
import { useToast } from "@/hooks/use-toast";

const alimSchema = z.object({
  faturaNo: z.string().min(1, "Fatura numarası gerekli").max(50),
  odemeDurumu: z.enum(['odendi', 'beklemede', 'kismi']),
  aciklama: z.string().max(500).optional(),
});

type AlimFormValues = z.infer<typeof alimSchema>;

interface YeniAlimModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tedarikciId: string;
  onSuccess?: () => void;
}

interface AlimUrun {
  urunId: string;
  urunAdi: string;
  miktar: number;
  birimFiyat: number;
  paraBirimi: 'TRY' | 'USD' | 'EUR';
  toplamTutar: number;
}

export const YeniAlimModal = ({ open, onOpenChange, tedarikciId, onSuccess }: YeniAlimModalProps) => {
  const { toast } = useToast();
  const [urunler, setUrunler] = useState<AlimUrun[]>([]);
  const allUrunler = getUrunler();

  const form = useForm<AlimFormValues>({
    resolver: zodResolver(alimSchema),
    defaultValues: {
      faturaNo: "",
      odemeDurumu: 'odendi',
      aciklama: "",
    },
  });

  const urunEkle = () => {
    setUrunler([...urunler, {
      urunId: '',
      urunAdi: '',
      miktar: 1,
      birimFiyat: 0,
      paraBirimi: 'TRY',
      toplamTutar: 0
    }]);
  };

  const urunCikar = (index: number) => {
    setUrunler(urunler.filter((_, i) => i !== index));
  };

  const urunGuncelle = (index: number, field: keyof AlimUrun, value: any) => {
    const yeniUrunler = [...urunler];
    yeniUrunler[index] = { ...yeniUrunler[index], [field]: value };
    
    if (field === 'urunId') {
      const secilenUrun = allUrunler.find(u => u.id === value);
      if (secilenUrun) {
        yeniUrunler[index].urunAdi = secilenUrun.ad;
        yeniUrunler[index].birimFiyat = secilenUrun.alisFiyati;
      }
    }
    
    if (field === 'miktar' || field === 'birimFiyat') {
      yeniUrunler[index].toplamTutar = yeniUrunler[index].miktar * yeniUrunler[index].birimFiyat;
    }
    
    setUrunler(yeniUrunler);
  };

  const genelToplam = urunler.reduce((sum, u) => sum + u.toplamTutar, 0);

  const onSubmit = (data: AlimFormValues) => {
    if (urunler.length === 0) {
      toast({
        title: "Hata",
        description: "En az bir ürün eklemelisiniz",
        variant: "destructive"
      });
      return;
    }

    if (urunler.some(u => !u.urunId || u.miktar <= 0 || u.birimFiyat <= 0)) {
      toast({
        title: "Hata",
        description: "Tüm ürün bilgilerini eksiksiz doldurun",
        variant: "destructive"
      });
      return;
    }

    const yeniAlim = {
      id: Date.now().toString(),
      tedarikciId,
      tarih: new Date().toISOString(),
      faturaNo: data.faturaNo,
      urunler: urunler.map(u => ({
        urunId: u.urunId,
        urunAdi: u.urunAdi,
        miktar: u.miktar,
        birimFiyat: u.birimFiyat,
        paraBirimi: u.paraBirimi,
        toplamTutar: u.toplamTutar
      })),
      genelToplam,
      odemeDurumu: data.odemeDurumu,
      aciklama: data.aciklama || undefined,
    };

    saveTedarikciAlim(yeniAlim);
    
    // Stokları arttır ve hareket kaydet
    urunler.forEach(urunItem => {
      const allUrunler = getUrunler();
      const urun = allUrunler.find(u => u.id === urunItem.urunId);
      if (urun) {
        const oncekiMiktar = urun.stokMiktari;
        const yeniMiktar = oncekiMiktar + urunItem.miktar;
        
        stokHareketKaydet(
          urunItem.urunId,
          'giris',
          urunItem.miktar,
          `Tedarikçi Alımı - ${data.faturaNo}`,
          oncekiMiktar,
          yeniMiktar
        );
        
        urun.stokMiktari = yeniMiktar;
        saveUrun(urun);
      }
    });
    
    toast({
      title: "Başarılı!",
      description: "Alım kaydı eklendi ve stoklar güncellendi.",
    });
    
    form.reset();
    setUrunler([]);
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Yeni Alım Kaydı</DialogTitle>
          <DialogDescription>
            Tedarikçiden yapılan alımı kaydedin
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="faturaNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fatura No *</FormLabel>
                    <FormControl>
                      <Input placeholder="Fatura numarası" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="odemeDurumu"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ödeme Durumu *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="odendi">Ödendi</SelectItem>
                        <SelectItem value="beklemede">Beklemede</SelectItem>
                        <SelectItem value="kismi">Kısmi Ödendi</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Ürün Listesi */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <FormLabel>Alınan Ürünler *</FormLabel>
                <Button type="button" size="sm" variant="outline" onClick={urunEkle}>
                  <Plus className="w-4 h-4 mr-2" />
                  Ürün Ekle
                </Button>
              </div>

              {urunler.map((urun, index) => (
                <Card key={index} className="p-4">
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4">
                      <FormLabel>Ürün</FormLabel>
                      <Select 
                        value={urun.urunId} 
                        onValueChange={(value) => urunGuncelle(index, 'urunId', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Ürün seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {allUrunler.map(u => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.ad}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-2">
                      <FormLabel>Miktar</FormLabel>
                      <Input
                        type="number"
                        value={urun.miktar}
                        onChange={(e) => urunGuncelle(index, 'miktar', parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <div className="col-span-2">
                      <FormLabel>Birim Fiyat</FormLabel>
                      <Input
                        type="number"
                        step="0.01"
                        value={urun.birimFiyat}
                        onChange={(e) => urunGuncelle(index, 'birimFiyat', parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <div className="col-span-2">
                      <FormLabel>Para Birimi</FormLabel>
                      <Select 
                        value={urun.paraBirimi} 
                        onValueChange={(value) => urunGuncelle(index, 'paraBirimi', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TRY">TRY</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-1">
                      <FormLabel>Toplam</FormLabel>
                      <p className="text-sm font-semibold text-primary">
                        {urun.toplamTutar.toFixed(2)}
                      </p>
                    </div>

                    <div className="col-span-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        onClick={() => urunCikar(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}

              {urunler.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <p className="text-muted-foreground mb-2">Henüz ürün eklenmedi</p>
                  <Button type="button" size="sm" variant="outline" onClick={urunEkle}>
                    <Plus className="w-4 h-4 mr-2" />
                    İlk Ürünü Ekle
                  </Button>
                </div>
              )}
            </div>

            {/* Genel Toplam */}
            {urunler.length > 0 && (
              <div className="flex justify-between items-center p-4 border rounded-lg bg-accent">
                <span className="font-semibold">Genel Toplam:</span>
                <span className="text-2xl font-bold text-primary">
                  {genelToplam.toFixed(2)} ₺
                </span>
              </div>
            )}

            <FormField
              control={form.control}
              name="aciklama"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Açıklama</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Alım açıklaması..." {...field} />
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
              <Button type="submit">
                Kaydı Tamamla
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
