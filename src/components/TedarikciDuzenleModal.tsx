import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import { saveTedarikci } from "@/lib/tedarikci-data";
import { useToast } from "@/hooks/use-toast";
import { Tedarikci } from "@/types/tedarikci";

const tedarikciSchema = z.object({
  firmaAdi: z.string().min(2, "Firma adı en az 2 karakter olmalı").max(100),
  yetkiliKisi: z.string().max(100).optional().or(z.literal("")),
  telefon: z.string().max(20).optional().or(z.literal("")),
  email: z.string().email("Geçerli bir email adresi girin").optional().or(z.literal("")),
  adres: z.string().max(250).optional().or(z.literal("")),
  vergiNo: z.string().max(20).optional(),
  notlar: z.string().max(500).optional(),
  durum: z.boolean(),
});

type TedarikciFormValues = z.infer<typeof tedarikciSchema>;

interface TedarikciDuzenleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tedarikci: Tedarikci | null;
  onSuccess?: () => void;
}

export const TedarikciDuzenleModal = ({ open, onOpenChange, tedarikci, onSuccess }: TedarikciDuzenleModalProps) => {
  const { toast } = useToast();

  const form = useForm<TedarikciFormValues>({
    resolver: zodResolver(tedarikciSchema),
    defaultValues: {
      firmaAdi: "",
      yetkiliKisi: "",
      telefon: "",
      email: "",
      adres: "",
      vergiNo: "",
      notlar: "",
      durum: true,
    },
  });

  // Tedarikçi değiştiğinde formu güncelle
  useEffect(() => {
    if (tedarikci) {
      form.reset({
        firmaAdi: tedarikci.firmaAdi,
        yetkiliKisi: tedarikci.yetkiliKisi || "",
        telefon: tedarikci.telefon || "",
        email: tedarikci.email || "",
        adres: tedarikci.adres || "",
        vergiNo: tedarikci.vergiNo || "",
        notlar: tedarikci.notlar || "",
        durum: tedarikci.durum === 'aktif',
      });
    }
  }, [tedarikci, form]);

  const onSubmit = (data: TedarikciFormValues) => {
    if (!tedarikci) return;

    const guncelTedarikci: Tedarikci = {
      ...tedarikci,
      firmaAdi: data.firmaAdi,
      yetkiliKisi: data.yetkiliKisi || "",
      telefon: data.telefon || "",
      email: data.email || undefined,
      adres: data.adres || "",
      vergiNo: data.vergiNo || undefined,
      notlar: data.notlar || undefined,
      durum: data.durum ? 'aktif' : 'pasif',
      guncellemeTarihi: new Date().toISOString(),
    };

    saveTedarikci(guncelTedarikci);
    
    toast({
      title: "Başarılı!",
      description: "Tedarikçi başarıyla güncellendi.",
    });
    
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tedarikçi Düzenle</DialogTitle>
          <DialogDescription>
            Tedarikçi bilgilerini güncellemek için formu düzenleyin.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firmaAdi"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Firma Adı *</FormLabel>
                    <FormControl>
                      <Input placeholder="Firma adını girin" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="yetkiliKisi"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Yetkili Kişi</FormLabel>
                    <FormControl>
                      <Input placeholder="Yetkili kişi adı" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="telefon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefon</FormLabel>
                    <FormControl>
                      <Input placeholder="0532 123 45 67" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="adres"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adres</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Tam adres..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="vergiNo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vergi Numarası</FormLabel>
                  <FormControl>
                    <Input placeholder="Vergi numarası" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notlar"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notlar</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Ek notlar..." {...field} />
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
                      Tedarikçi {field.value ? "aktif" : "pasif"} olacak
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
              <Button type="submit">
                Güncelle
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
