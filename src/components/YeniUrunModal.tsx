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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { KATEGORILER, Urun } from "@/types/stok";
import { saveUrun, generateUrunKodu } from "@/lib/stok-data";
import { getTedarikciler } from "@/lib/tedarikci-data";
import { useToast } from "@/hooks/use-toast";

const urunSchema = z.object({
  ad: z.string().min(2, "Ürün adı en az 2 karakter olmalı"),
  barkod: z.string().min(1, "Barkod gerekli"),
  kategori: z.string().min(1, "Kategori seçiniz"),
  stokMiktari: z.coerce.number().min(0, "Stok miktarı 0'dan küçük olamaz"),
  birim: z.string().min(1, "Birim seçiniz"),
  alisFiyati: z.coerce.number().min(0, "Alış fiyatı 0'dan küçük olamaz"),
  paraBirimi: z.enum(['TRY', 'USD', 'EUR']),
  satisFiyati: z.coerce.number().min(0, "Satış fiyatı 0'dan küçük olamaz"),
  satisFiyatiParaBirimi: z.enum(['TRY', 'USD', 'EUR']),
  tedarikciId: z.string().min(1, "Tedarikçi seçin"),
  minStokSeviyesi: z.coerce.number().min(0),
  aciklama: z.string().optional(),
});

type UrunFormValues = z.infer<typeof urunSchema>;

interface YeniUrunModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  editMode?: boolean;
  initialData?: Urun;
}

export const YeniUrunModal = ({ open, onOpenChange, onSuccess, editMode = false, initialData }: YeniUrunModalProps) => {
  const { toast } = useToast();
  const tedarikciler = getTedarikciler().filter(t => t.durum === 'aktif');

  const form = useForm<UrunFormValues>({
    resolver: zodResolver(urunSchema),
    defaultValues: initialData ? {
      ad: initialData.ad,
      barkod: initialData.barkod,
      kategori: initialData.kategori,
      stokMiktari: initialData.stokMiktari,
      birim: initialData.birim,
      alisFiyati: initialData.alisFiyati,
      paraBirimi: initialData.alisFiyatiParaBirimi,
      satisFiyati: initialData.satisFiyati,
      satisFiyatiParaBirimi: initialData.satisFiyatiParaBirimi || initialData.alisFiyatiParaBirimi,
      tedarikciId: initialData.tedarikciler?.[0]?.tedarikciId || "",
      minStokSeviyesi: initialData.minStokSeviyesi,
      aciklama: initialData.aciklama || "",
    } : {
      ad: "",
      barkod: "",
      kategori: "",
      stokMiktari: 0,
      birim: "Adet",
      alisFiyati: 0,
      paraBirimi: "TRY",
      satisFiyati: 0,
      satisFiyatiParaBirimi: "TRY",
      tedarikciId: "",
      minStokSeviyesi: 10,
      aciklama: "",
    },
  });

  const onSubmit = (data: UrunFormValues) => {
    const secilenTedarikci = tedarikciler.find(t => t.id === data.tedarikciId);
    
    if (!secilenTedarikci) {
      toast({
        title: "Hata",
        description: "Tedarikçi bulunamadı",
        variant: "destructive"
      });
      return;
    }

    if (editMode && initialData) {
      const guncelUrun: Urun = {
        ...initialData,
        ad: data.ad,
        barkod: data.barkod,
        kategori: data.kategori,
        stokMiktari: data.stokMiktari,
        birim: data.birim,
        alisFiyati: data.alisFiyati,
        alisFiyatiParaBirimi: data.paraBirimi,
        satisFiyati: data.satisFiyati,
        satisFiyatiParaBirimi: data.satisFiyatiParaBirimi,
        karMarji: ((data.satisFiyati - data.alisFiyati) / data.alisFiyati) * 100,
        minStokSeviyesi: data.minStokSeviyesi,
        kritikStokSeviyesi: Math.floor(data.minStokSeviyesi / 2),
        aciklama: data.aciklama || '',
        guncellemeTarihi: new Date().toISOString(),
        tedarikciler: [{
          id: initialData.tedarikciler[0]?.id || Date.now().toString(),
          tedarikciId: data.tedarikciId,
          tedarikciAdi: secilenTedarikci.firmaAdi,
          alisFiyati: data.alisFiyati,
          paraBirimi: data.paraBirimi,
          teslimatSuresi: initialData.tedarikciler[0]?.teslimatSuresi || 7,
          varsayilan: true
        }]
      };
      
      saveUrun(guncelUrun);
      toast({
        title: "Başarılı!",
        description: "Ürün başarıyla güncellendi.",
      });
    } else {
      const yeniUrun = {
        id: Date.now().toString(),
        kod: generateUrunKodu(),
        ad: data.ad,
        barkod: data.barkod,
        kategori: data.kategori,
        stokMiktari: data.stokMiktari,
        birim: data.birim,
        tedarikciler: [{
          id: Date.now().toString(),
          tedarikciId: data.tedarikciId,
          tedarikciAdi: secilenTedarikci.firmaAdi,
          alisFiyati: data.alisFiyati,
          paraBirimi: data.paraBirimi,
          teslimatSuresi: 7,
          varsayilan: true
        }],
        alisFiyati: data.alisFiyati,
        alisFiyatiParaBirimi: data.paraBirimi,
        karMarji: ((data.satisFiyati - data.alisFiyati) / data.alisFiyati) * 100,
        satisFiyati: data.satisFiyati,
        satisFiyatiParaBirimi: data.satisFiyatiParaBirimi,
        minStokSeviyesi: data.minStokSeviyesi,
        kritikStokSeviyesi: Math.floor(data.minStokSeviyesi / 2),
        aciklama: data.aciklama || '',
        olusturmaTarihi: new Date().toISOString(),
        guncellemeTarihi: new Date().toISOString(),
      };

      saveUrun(yeniUrun);
      toast({
        title: "Başarılı!",
        description: "Ürün başarıyla eklendi.",
      });
    }
    
    form.reset();
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editMode ? "Ürün Düzenle" : "Yeni Ürün Ekle"}</DialogTitle>
          <DialogDescription>
            {editMode ? "Ürün bilgilerini güncelleyin." : "Yeni bir ürün eklemek için aşağıdaki formu doldurun."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="ad"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ürün Adı *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ürün adını girin" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="barkod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Barkod *</FormLabel>
                    <FormControl>
                      <Input placeholder="Barkod numarası" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="kategori"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kategori *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Kategori seçin" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {KATEGORILER.map((kat) => (
                        <SelectItem key={kat.id} value={kat.id}>
                          {kat.emoji} {kat.ad}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="stokMiktari"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stok Miktarı *</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="birim"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Birim *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Adet">Adet</SelectItem>
                        <SelectItem value="Kg">Kg</SelectItem>
                        <SelectItem value="Gr">Gr</SelectItem>
                        <SelectItem value="Paket">Paket</SelectItem>
                        <SelectItem value="Kutu">Kutu</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="minStokSeviyesi"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min. Stok Seviyesi</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="alisFiyati"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alış Fiyatı *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="TRY">₺ TRY</SelectItem>
                        <SelectItem value="USD">$ USD</SelectItem>
                        <SelectItem value="EUR">€ EUR</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="satisFiyati"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Satış Fiyatı *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="satisFiyatiParaBirimi"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Satış Fiyatı Para Birimi *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="TRY">₺ TRY</SelectItem>
                      <SelectItem value="USD">$ USD</SelectItem>
                      <SelectItem value="EUR">€ EUR</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tedarikciId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tedarikçi *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Tedarikçi seçin" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {tedarikciler.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.firmaAdi}
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
                    <Textarea placeholder="Ürün açıklaması..." {...field} />
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
                {editMode ? "Güncelle" : "Kaydet"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
