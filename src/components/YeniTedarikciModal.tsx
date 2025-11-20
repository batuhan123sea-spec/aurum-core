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
import { Switch } from "@/components/ui/switch";
import { saveTedarikci, generateTedarikciKodu } from "@/lib/tedarikci-data";
import { useToast } from "@/hooks/use-toast";

const tedarikciSchema = z.object({
  firmaAdi: z.string().min(2, "Firma adı en az 2 karakter olmalı").max(100),
  yetkiliKisi: z.string().min(2, "Yetkili kişi adı en az 2 karakter olmalı").max(100),
  telefon: z.string().min(10, "Geçerli bir telefon numarası girin").max(20),
  email: z.string().email("Geçerli bir email adresi girin").optional().or(z.literal("")),
  adres: z.string().min(5, "Adres en az 5 karakter olmalı").max(250),
  vergiNo: z.string().max(20).optional(),
  notlar: z.string().max(500).optional(),
  durum: z.boolean(),
});

type TedarikciFormValues = z.infer<typeof tedarikciSchema>;

interface YeniTedarikciModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const YeniTedarikciModal = ({ open, onOpenChange, onSuccess }: YeniTedarikciModalProps) => {
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

  const onSubmit = (data: TedarikciFormValues) => {
    const yeniTedarikci = {
      id: Date.now().toString(),
      kod: generateTedarikciKodu(),
      firmaAdi: data.firmaAdi,
      yetkiliKisi: data.yetkiliKisi,
      telefon: data.telefon,
      email: data.email || undefined,
      adres: data.adres,
      vergiNo: data.vergiNo || undefined,
      notlar: data.notlar || undefined,
      durum: data.durum ? 'aktif' as const : 'pasif' as const,
      olusturmaTarihi: new Date().toISOString(),
      guncellemeTarihi: new Date().toISOString(),
    };

    saveTedarikci(yeniTedarikci);
    
    toast({
      title: "Başarılı!",
      description: "Tedarikçi başarıyla eklendi.",
    });
    
    form.reset();
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Yeni Tedarikçi Ekle</DialogTitle>
          <DialogDescription>
            Yeni bir tedarikçi eklemek için aşağıdaki formu doldurun.
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
                    <FormLabel>Yetkili Kişi *</FormLabel>
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
                    <FormLabel>Telefon *</FormLabel>
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
                  <FormLabel>Adres *</FormLabel>
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
                Kaydet
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
