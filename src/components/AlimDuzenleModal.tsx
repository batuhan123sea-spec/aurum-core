import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { TedarikciAlim } from "@/types/tedarikci";
import { updateTedarikciAlim } from "@/lib/tedarikci-data";
import { getUrunler, saveUrun } from "@/lib/stok-data";
import { stokHareketKaydet } from "@/lib/stok-hareket";

const formSchema = z.object({
  tarih: z.string(),
  faturaNo: z.string().min(1, "Fatura No gerekli"),
  miktar: z.coerce.number().min(1, "Miktar en az 1 olmalı"),
  birimFiyat: z.coerce.number().min(0, "Birim fiyat 0 veya daha büyük olmalı"),
  paraBirimi: z.enum(["TRY", "USD", "EUR"]),
  odemeDurumu: z.enum(["odendi", "beklemede", "kismi"]),
  aciklama: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AlimDuzenleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alim: TedarikciAlim | null;
  urunId: string;
  onSuccess?: () => void;
}

export const AlimDuzenleModal = ({
  open,
  onOpenChange,
  alim,
  urunId,
  onSuccess,
}: AlimDuzenleModalProps) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tarih: "",
      faturaNo: "",
      miktar: 1,
      birimFiyat: 0,
      paraBirimi: "TRY",
      odemeDurumu: "beklemede",
      aciklama: "",
    },
  });

  useEffect(() => {
    if (alim && open) {
      const urunItem = alim.urunler.find((u) => u.urunId === urunId);
      if (urunItem) {
        form.reset({
          tarih: alim.tarih.split("T")[0],
          faturaNo: alim.faturaNo,
          miktar: urunItem.miktar,
          birimFiyat: urunItem.birimFiyat,
          paraBirimi: urunItem.paraBirimi,
          odemeDurumu: alim.odemeDurumu,
          aciklama: alim.aciklama || "",
        });
      }
    }
  }, [alim, urunId, open, form]);

  const onSubmit = (data: FormValues) => {
    if (!alim) return;

    const urunItem = alim.urunler.find((u) => u.urunId === urunId);
    if (!urunItem) return;

    const eskiMiktar = urunItem.miktar;
    const yeniMiktar = data.miktar;
    const miktarFarki = yeniMiktar - eskiMiktar;

    // Ürünü bul ve stoku güncelle
    const urunler = getUrunler();
    const urun = urunler.find((u) => u.id === urunId);
    if (!urun) {
      toast({
        title: "Hata",
        description: "Ürün bulunamadı",
        variant: "destructive",
      });
      return;
    }

    // Alım kaydını güncelle
    const guncellenmisUrunler = alim.urunler.map((u) => {
      if (u.urunId === urunId) {
        return {
          ...u,
          miktar: data.miktar,
          birimFiyat: data.birimFiyat,
          paraBirimi: data.paraBirimi,
          toplamTutar: data.miktar * data.birimFiyat,
        };
      }
      return u;
    });

    const guncellenmisAlim: TedarikciAlim = {
      ...alim,
      tarih: new Date(data.tarih).toISOString(),
      faturaNo: data.faturaNo,
      urunler: guncellenmisUrunler,
      genelToplam: guncellenmisUrunler.reduce((sum, u) => sum + u.toplamTutar, 0),
      odemeDurumu: data.odemeDurumu,
      aciklama: data.aciklama,
    };

    updateTedarikciAlim(guncellenmisAlim);

    // Stok değişikliği varsa güncelle
    if (miktarFarki !== 0) {
      const yeniStok = urun.stokMiktari + miktarFarki;
      saveUrun({ ...urun, stokMiktari: yeniStok });

      stokHareketKaydet(
        urunId,
        miktarFarki > 0 ? "giris" : "cikis",
        Math.abs(miktarFarki),
        `Alım düzenleme - ${alim.faturaNo}`,
        urun.stokMiktari,
        yeniStok
      );
    }

    toast({
      title: "Başarılı",
      description: "Alım kaydı güncellendi",
    });

    onOpenChange(false);
    onSuccess?.();
  };

  if (!alim) return null;

  const urunItem = alim.urunler.find((u) => u.urunId === urunId);
  if (!urunItem) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Alım Kaydını Düzenle</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tarih">Tarih</Label>
            <Input
              id="tarih"
              type="date"
              {...form.register("tarih")}
            />
            {form.formState.errors.tarih && (
              <p className="text-sm text-destructive">
                {form.formState.errors.tarih.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="faturaNo">Fatura No</Label>
            <Input
              id="faturaNo"
              {...form.register("faturaNo")}
            />
            {form.formState.errors.faturaNo && (
              <p className="text-sm text-destructive">
                {form.formState.errors.faturaNo.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="miktar">Miktar</Label>
              <Input
                id="miktar"
                type="number"
                {...form.register("miktar")}
              />
              {form.formState.errors.miktar && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.miktar.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="birimFiyat">Birim Fiyat</Label>
              <Input
                id="birimFiyat"
                type="number"
                step="0.01"
                {...form.register("birimFiyat")}
              />
              {form.formState.errors.birimFiyat && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.birimFiyat.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paraBirimi">Para Birimi</Label>
            <Select
              value={form.watch("paraBirimi")}
              onValueChange={(value) => form.setValue("paraBirimi", value as "TRY" | "USD" | "EUR")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TRY">TRY (₺)</SelectItem>
                <SelectItem value="USD">USD ($)</SelectItem>
                <SelectItem value="EUR">EUR (€)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="odemeDurumu">Ödeme Durumu</Label>
            <Select
              value={form.watch("odemeDurumu")}
              onValueChange={(value) => form.setValue("odemeDurumu", value as "odendi" | "beklemede" | "kismi")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="odendi">Ödendi</SelectItem>
                <SelectItem value="beklemede">Beklemede</SelectItem>
                <SelectItem value="kismi">Kısmi</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="aciklama">Açıklama</Label>
            <Textarea
              id="aciklama"
              {...form.register("aciklama")}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              İptal
            </Button>
            <Button type="submit">Kaydet</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
