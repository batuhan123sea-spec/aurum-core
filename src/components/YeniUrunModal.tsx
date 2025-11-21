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
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { KATEGORILER, Urun } from "@/types/stok";
import { saveUrun, generateUrunKodu, generateBarkod } from "@/lib/stok-data";
import { getTedarikciler } from "@/lib/tedarikci-data";
import { useToast } from "@/hooks/use-toast";
import { Plus, X } from "lucide-react";

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

interface TedarikciItem {
  tedarikciId: string;
  alisFiyati: number;
  paraBirimi: 'TRY' | 'USD' | 'EUR';
  teslimatSuresi: number;
  varsayilan: boolean;
}

export const YeniUrunModal = ({ open, onOpenChange, onSuccess, editMode = false, initialData }: YeniUrunModalProps) => {
  const { toast } = useToast();
  const tedarikciler = getTedarikciler().filter(t => t.durum === 'aktif');

  const [tedarikcilerList, setTedarikcilerList] = useState<TedarikciItem[]>(
    initialData?.tedarikciler?.map(t => ({
      tedarikciId: t.tedarikciId,
      alisFiyati: t.alisFiyati,
      paraBirimi: t.paraBirimi,
      teslimatSuresi: t.teslimatSuresi,
      varsayilan: t.varsayilan
    })) || []
  );

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
      minStokSeviyesi: 10,
      aciklama: "",
    },
  });

  const addTedarikci = () => {
    setTedarikcilerList([
      ...tedarikcilerList,
      {
        tedarikciId: "",
        alisFiyati: 0,
        paraBirimi: "TRY",
        teslimatSuresi: 7,
        varsayilan: tedarikcilerList.length === 0
      }
    ]);
  };

  const removeTedarikci = (index: number) => {
    const newList = tedarikcilerList.filter((_, i) => i !== index);
    // Eğer varsayılan olan silindiyse, ilk tedarikciyi varsayılan yap
    if (newList.length > 0 && tedarikcilerList[index].varsayilan) {
      newList[0].varsayilan = true;
    }
    setTedarikcilerList(newList);
  };

  const updateTedarikci = (index: number, field: keyof TedarikciItem, value: any) => {
    const newList = [...tedarikcilerList];
    if (field === 'varsayilan' && value === true) {
      // Sadece bir tane varsayılan olabilir
      newList.forEach((t, i) => {
        t.varsayilan = i === index;
      });
    } else {
      newList[index] = { ...newList[index], [field]: value };
    }
    setTedarikcilerList(newList);
  };

  const onSubmit = (data: UrunFormValues) => {
    // Tedarikçi validasyonu
    if (tedarikcilerList.length === 0) {
      toast({
        title: "Hata",
        description: "En az bir tedarikçi eklemelisiniz",
        variant: "destructive"
      });
      return;
    }

    const invalidTedarikci = tedarikcilerList.find(t => !t.tedarikciId || t.alisFiyati <= 0);
    if (invalidTedarikci) {
      toast({
        title: "Hata",
        description: "Tüm tedarikçi bilgilerini eksiksiz doldurun",
        variant: "destructive"
      });
      return;
    }

    const varsayilanCount = tedarikcilerList.filter(t => t.varsayilan).length;
    if (varsayilanCount !== 1) {
      toast({
        title: "Hata",
        description: "Sadece bir tedarikçi varsayılan olarak işaretlenmelidir",
        variant: "destructive"
      });
      return;
    }

    // Tedarikçi detaylarını hazırla
    const tedarikcilerData = tedarikcilerList.map(t => {
      const tedarikci = tedarikciler.find(td => td.id === t.tedarikciId);
      return {
        id: initialData?.tedarikciler?.find(it => it.tedarikciId === t.tedarikciId)?.id || Date.now().toString() + Math.random(),
        tedarikciId: t.tedarikciId,
        tedarikciAdi: tedarikci?.firmaAdi || '',
        alisFiyati: t.alisFiyati,
        paraBirimi: t.paraBirimi,
        teslimatSuresi: t.teslimatSuresi,
        varsayilan: t.varsayilan,
        sonAlisTarihi: initialData?.tedarikciler?.find(it => it.tedarikciId === t.tedarikciId)?.sonAlisTarihi
      };
    });

    // İlk tedarikçinin fiyatını genel alış fiyatı olarak kullan
    const varsayilanTedarikci = tedarikcilerData.find(t => t.varsayilan) || tedarikcilerData[0];

    if (editMode && initialData) {
      const guncelUrun: Urun = {
        ...initialData,
        ad: data.ad,
        barkod: data.barkod,
        kategori: data.kategori,
        stokMiktari: data.stokMiktari,
        birim: data.birim,
        alisFiyati: varsayilanTedarikci.alisFiyati,
        alisFiyatiParaBirimi: varsayilanTedarikci.paraBirimi,
        satisFiyati: data.satisFiyati,
        satisFiyatiParaBirimi: data.satisFiyatiParaBirimi,
        karMarji: ((data.satisFiyati - varsayilanTedarikci.alisFiyati) / varsayilanTedarikci.alisFiyati) * 100,
        minStokSeviyesi: data.minStokSeviyesi,
        kritikStokSeviyesi: Math.floor(data.minStokSeviyesi / 2),
        aciklama: data.aciklama || '',
        guncellemeTarihi: new Date().toISOString(),
        tedarikciler: tedarikcilerData
      };
      
      saveUrun(guncelUrun);
      toast({
        title: "Başarılı!",
        description: "Ürün başarıyla güncellendi.",
      });
    } else {
      const yeniUrun: Urun = {
        id: Date.now().toString(),
        kod: generateUrunKodu(),
        ad: data.ad,
        barkod: data.barkod,
        kategori: data.kategori,
        stokMiktari: data.stokMiktari,
        birim: data.birim,
        tedarikciler: tedarikcilerData,
        alisFiyati: varsayilanTedarikci.alisFiyati,
        alisFiyatiParaBirimi: varsayilanTedarikci.paraBirimi,
        karMarji: ((data.satisFiyati - varsayilanTedarikci.alisFiyati) / varsayilanTedarikci.alisFiyati) * 100,
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
    setTedarikcilerList([]);
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

              <div className="flex gap-2">
                <FormField
                  control={form.control}
                  name="barkod"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Barkod *</FormLabel>
                      <FormControl>
                        <Input placeholder="Barkod numarası" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="mt-8"
                  onClick={() => {
                    const yeniBarkod = generateBarkod();
                    form.setValue('barkod', yeniBarkod);
                  }}
                >
                  Otomatik Oluştur
                </Button>
              </div>
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

            <div className="grid grid-cols-2 gap-4">
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
            </div>

            {/* Tedarikçiler Bölümü */}
            <div className="space-y-3 pt-2">
              <FormLabel>Tedarikçiler *</FormLabel>
              {tedarikcilerList.map((ted, idx) => (
                <Card key={idx} className="p-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground">Tedarikçi</label>
                          <Select 
                            value={ted.tedarikciId} 
                            onValueChange={(value) => updateTedarikci(idx, 'tedarikciId', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seçin" />
                            </SelectTrigger>
                            <SelectContent>
                              {tedarikciler.map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                  {t.firmaAdi}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-xs text-muted-foreground">Para Birimi</label>
                          <Select 
                            value={ted.paraBirimi}
                            onValueChange={(value: 'TRY' | 'USD' | 'EUR') => updateTedarikci(idx, 'paraBirimi', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="TRY">₺ TRY</SelectItem>
                              <SelectItem value="USD">$ USD</SelectItem>
                              <SelectItem value="EUR">€ EUR</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground">Alış Fiyatı</label>
                          <Input 
                            type="number" 
                            step="0.01"
                            value={ted.alisFiyati}
                            onChange={(e) => updateTedarikci(idx, 'alisFiyati', parseFloat(e.target.value) || 0)}
                          />
                        </div>

                        <div>
                          <label className="text-xs text-muted-foreground">Teslimat Süresi (gün)</label>
                          <Input 
                            type="number"
                            value={ted.teslimatSuresi}
                            onChange={(e) => updateTedarikci(idx, 'teslimatSuresi', parseInt(e.target.value) || 7)}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Checkbox 
                          checked={ted.varsayilan}
                          onCheckedChange={(checked) => updateTedarikci(idx, 'varsayilan', checked)}
                        />
                        <label className="text-sm">Varsayılan Tedarikçi</label>
                      </div>
                    </div>

                    <Button 
                      size="icon" 
                      variant="ghost" 
                      type="button"
                      onClick={() => removeTedarikci(idx)}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}

              <Button 
                type="button" 
                variant="outline" 
                onClick={addTedarikci}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Tedarikçi Ekle
              </Button>
            </div>

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