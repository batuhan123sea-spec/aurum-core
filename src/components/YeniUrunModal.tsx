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
import { KATEGORILER } from "@/types/stok";
import { saveUrun, generateUrunKodu } from "@/lib/stok-data";
import { useToast } from "@/hooks/use-toast";

const urunSchema = z.object({
  ad: z.string().min(2, "Ürün adı en az 2 karakter olmalı"),
  barkod: z.string().min(1, "Barkod gerekli"),
  kategori: z.string().min(1, "Kategori seçiniz"),
  altKategori: z.string().min(1, "Alt kategori seçiniz"),
  stokMiktari: z.coerce.number().min(0, "Stok miktarı 0'dan küçük olamaz"),
  birim: z.string().min(1, "Birim seçiniz"),
  alisFiyati: z.coerce.number().min(0, "Alış fiyatı 0'dan küçük olamaz"),
  satisFiyati: z.coerce.number().min(0, "Satış fiyatı 0'dan küçük olamaz"),
  kdvOrani: z.coerce.number(),
  tedarikci: z.string().min(1, "Tedarikçi gerekli"),
  minStokSeviyesi: z.coerce.number().min(0),
  aciklama: z.string().optional(),
  durum: z.boolean(),
});

type UrunFormValues = z.infer<typeof urunSchema>;

interface YeniUrunModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const YeniUrunModal = ({ open, onOpenChange, onSuccess }: YeniUrunModalProps) => {
  const { toast } = useToast();
  const [selectedKategori, setSelectedKategori] = useState<string>("");

  const form = useForm<UrunFormValues>({
    resolver: zodResolver(urunSchema),
    defaultValues: {
      ad: "",
      barkod: "",
      kategori: "",
      altKategori: "",
      stokMiktari: 0,
      birim: "Adet",
      alisFiyati: 0,
      satisFiyati: 0,
      kdvOrani: 20,
      tedarikci: "",
      minStokSeviyesi: 10,
      aciklama: "",
      durum: true,
    },
  });

  const selectedKategoriData = KATEGORILER.find(k => k.id === selectedKategori);

  const onSubmit = (data: UrunFormValues) => {
    const yeniUrun = {
      id: Date.now().toString(),
      kod: generateUrunKodu(),
      ad: data.ad,
      barkod: data.barkod,
      kategori: data.kategori,
      altKategori: data.altKategori,
      stokMiktari: data.stokMiktari,
      birim: data.birim,
      tedarikciler: [{
        id: Date.now().toString(),
        tedarikciId: 'temp',
        tedarikciAdi: data.tedarikci,
        alisFiyati: data.alisFiyati,
        paraBirimi: 'TRY' as const,
        teslimatSuresi: 7,
        varsayilan: true
      }],
      alisFiyati: data.alisFiyati,
      alisFiyatiParaBirimi: 'TRY' as const,
      karMarji: ((data.satisFiyati - data.alisFiyati) / data.alisFiyati) * 100,
      satisFiyati: data.satisFiyati,
      kdvOrani: data.kdvOrani,
      minStokSeviyesi: data.minStokSeviyesi,
      kritikStokSeviyesi: Math.floor(data.minStokSeviyesi / 2),
      aciklama: data.aciklama || '',
      durum: data.durum ? 'aktif' as const : 'pasif' as const,
      olusturmaTarihi: new Date().toISOString(),
      guncellemeTarihi: new Date().toISOString(),
    };

    saveUrun(yeniUrun);
    
    toast({
      title: "Başarılı!",
      description: "Ürün başarıyla eklendi.",
    });
    
    form.reset();
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Yeni Ürün Ekle</DialogTitle>
          <DialogDescription>
            Yeni bir ürün eklemek için aşağıdaki formu doldurun.
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="kategori"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategori *</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedKategori(value);
                        form.setValue("altKategori", "");
                      }} 
                      defaultValue={field.value}
                    >
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

              <FormField
                control={form.control}
                name="altKategori"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alt Kategori *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Alt kategori seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {selectedKategoriData?.altKategoriler.map((alt) => (
                          <SelectItem key={alt} value={alt}>
                            {alt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                    <FormLabel>Alış Fiyatı (TL) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="satisFiyati"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Satış Fiyatı (TL) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="kdvOrani"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>KDV Oranı (%)</FormLabel>
                    <Select onValueChange={(value) => field.onChange(Number(value))} defaultValue={String(field.value)}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0">%0</SelectItem>
                        <SelectItem value="1">%1</SelectItem>
                        <SelectItem value="8">%8</SelectItem>
                        <SelectItem value="10">%10</SelectItem>
                        <SelectItem value="20">%20</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="tedarikci"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tedarikçi *</FormLabel>
                  <FormControl>
                    <Input placeholder="Tedarikçi adı" {...field} />
                  </FormControl>
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

            <FormField
              control={form.control}
              name="durum"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Durum</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Ürün {field.value ? "aktif" : "pasif"} olacak
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
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
                Kaydet
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
