import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import {
  Building2, DollarSign, Receipt, Package, FileText,
  Save, Settings, RefreshCw, AlertTriangle, Check
} from "lucide-react";
import { getAyarlar, saveAyarlar } from "@/lib/ayarlar-data";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Validation schemas
const firmaSchema = z.object({
  firmaAdi: z.string()
    .trim()
    .min(1, "Firma adı gereklidir")
    .max(100, "Firma adı 100 karakterden uzun olamaz"),
  vergiNo: z.string()
    .trim()
    .max(20, "Vergi numarası 20 karakterden uzun olamaz")
    .optional()
    .or(z.literal("")),
  adres: z.string()
    .trim()
    .max(500, "Adres 500 karakterden uzun olamaz")
    .optional()
    .or(z.literal("")),
  telefon: z.string()
    .trim()
    .regex(/^[\d\s\-\+\(\)]*$/, "Geçerli telefon numarası giriniz")
    .max(20, "Telefon numarası 20 karakterden uzun olamaz")
    .optional()
    .or(z.literal("")),
  email: z.string()
    .trim()
    .email("Geçerli e-posta adresi giriniz")
    .max(100, "E-posta adresi 100 karakterden uzun olamaz")
    .optional()
    .or(z.literal(""))
});

const paraBirimiSchema = z.object({
  varsayilanParaBirimi: z.enum(['TRY', 'USD', 'EUR']),
  otomatikKurGuncelleme: z.boolean(),
  kurGuncellemeSikligi: z.number().min(1).max(1440),
  usdKuru: z.number().min(0.01).max(1000),
  eurKuru: z.number().min(0.01).max(1000)
});

const kdvSchema = z.object({
  varsayilanKDVOrani: z.number().min(0).max(100),
  kdvDahilSatis: z.boolean()
});

const stokSchema = z.object({
  minStokSeviyesi: z.number().min(0).max(10000),
  kritikStokSeviyesi: z.number().min(0).max(10000),
  barkodPrefixi: z.string()
    .trim()
    .min(1, "Barkod prefixi gereklidir")
    .max(10, "Barkod prefixi 10 karakterden uzun olamaz")
    .regex(/^[A-Z0-9]*$/, "Sadece büyük harf ve rakam kullanabilirsiniz"),
  otomatikBarkod: z.boolean()
});

const fisSchema = z.object({
  baslik: z.string()
    .trim()
    .min(1, "Fiş başlığı gereklidir")
    .max(100, "Fiş başlığı 100 karakterden uzun olamaz"),
  altBilgi: z.string()
    .trim()
    .max(200, "Alt bilgi 200 karakterden uzun olamaz")
    .optional()
    .or(z.literal("")),
  reklamAlani: z.string()
    .trim()
    .max(200, "Reklam alanı 200 karakterden uzun olamaz")
    .optional()
    .or(z.literal(""))
});

type FirmaFormData = z.infer<typeof firmaSchema>;
type ParaBirimiFormData = z.infer<typeof paraBirimiSchema>;
type KdvFormData = z.infer<typeof kdvSchema>;
type StokFormData = z.infer<typeof stokSchema>;
type FisFormData = z.infer<typeof fisSchema>;

export default function Ayarlar() {
  const [activeTab, setActiveTab] = useState("firma");
  const [saving, setSaving] = useState(false);
  const ayarlar = getAyarlar();

  // Firma Form
  const firmaForm = useForm<FirmaFormData>({
    resolver: zodResolver(firmaSchema),
    defaultValues: {
      firmaAdi: ayarlar.firma.firmaAdi,
      vergiNo: ayarlar.firma.vergiNo,
      adres: ayarlar.firma.adres,
      telefon: ayarlar.firma.telefon,
      email: ayarlar.firma.email
    }
  });

  // Para Birimi Form
  const paraBirimiForm = useForm<ParaBirimiFormData>({
    resolver: zodResolver(paraBirimiSchema),
    defaultValues: {
      varsayilanParaBirimi: ayarlar.paraBirimi.varsayilanParaBirimi,
      otomatikKurGuncelleme: ayarlar.paraBirimi.otomatikKurGuncelleme,
      kurGuncellemeSikligi: ayarlar.paraBirimi.kurGuncellemeSikligi,
      usdKuru: ayarlar.paraBirimi.manuelKurlar.usd,
      eurKuru: ayarlar.paraBirimi.manuelKurlar.eur
    }
  });

  // KDV Form
  const kdvForm = useForm<KdvFormData>({
    resolver: zodResolver(kdvSchema),
    defaultValues: {
      varsayilanKDVOrani: ayarlar.kdv.varsayilanKDVOrani,
      kdvDahilSatis: ayarlar.kdv.kdvDahilSatis
    }
  });

  // Stok Form
  const stokForm = useForm<StokFormData>({
    resolver: zodResolver(stokSchema),
    defaultValues: {
      minStokSeviyesi: ayarlar.stok.minStokSeviyesi,
      kritikStokSeviyesi: ayarlar.stok.kritikStokSeviyesi,
      barkodPrefixi: ayarlar.stok.barkodPrefixi,
      otomatikBarkod: ayarlar.stok.otomatikBarkod
    }
  });

  // Fiş Form
  const fisForm = useForm<FisFormData>({
    resolver: zodResolver(fisSchema),
    defaultValues: {
      baslik: ayarlar.fis.baslik,
      altBilgi: ayarlar.fis.altBilgi,
      reklamAlani: ayarlar.fis.reklamAlani
    }
  });

  const onFirmaSubmit = async (data: FirmaFormData) => {
    setSaving(true);
    try {
      const guncelAyarlar = getAyarlar();
      guncelAyarlar.firma = { ...guncelAyarlar.firma, ...data };
      saveAyarlar(guncelAyarlar);
      toast.success("Firma bilgileri kaydedildi");
    } catch (error) {
      toast.error("Kaydetme sırasında hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  const onParaBirimiSubmit = async (data: ParaBirimiFormData) => {
    setSaving(true);
    try {
      const guncelAyarlar = getAyarlar();
      guncelAyarlar.paraBirimi = {
        varsayilanParaBirimi: data.varsayilanParaBirimi,
        otomatikKurGuncelleme: data.otomatikKurGuncelleme,
        kurGuncellemeSikligi: data.kurGuncellemeSikligi,
        manuelKurlar: {
          usd: data.usdKuru,
          eur: data.eurKuru
        }
      };
      saveAyarlar(guncelAyarlar);
      toast.success("Para birimi ayarları kaydedildi");
    } catch (error) {
      toast.error("Kaydetme sırasında hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  const onKdvSubmit = async (data: KdvFormData) => {
    setSaving(true);
    try {
      const guncelAyarlar = getAyarlar();
      guncelAyarlar.kdv = {
        varsayilanKDVOrani: data.varsayilanKDVOrani,
        kdvDahilSatis: data.kdvDahilSatis
      };
      saveAyarlar(guncelAyarlar);
      toast.success("KDV ayarları kaydedildi");
    } catch (error) {
      toast.error("Kaydetme sırasında hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  const onStokSubmit = async (data: StokFormData) => {
    setSaving(true);
    try {
      if (data.kritikStokSeviyesi > data.minStokSeviyesi) {
        toast.error("Kritik stok seviyesi minimum stok seviyesinden büyük olamaz");
        setSaving(false);
        return;
      }

      const guncelAyarlar = getAyarlar();
      guncelAyarlar.stok = {
        minStokSeviyesi: data.minStokSeviyesi,
        kritikStokSeviyesi: data.kritikStokSeviyesi,
        barkodPrefixi: data.barkodPrefixi,
        otomatikBarkod: data.otomatikBarkod
      };
      saveAyarlar(guncelAyarlar);
      toast.success("Stok ayarları kaydedildi");
    } catch (error) {
      toast.error("Kaydetme sırasında hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  const onFisSubmit = async (data: FisFormData) => {
    setSaving(true);
    try {
      const guncelAyarlar = getAyarlar();
      guncelAyarlar.fis = {
        baslik: data.baslik,
        altBilgi: data.altBilgi || '',
        reklamAlani: data.reklamAlani || ''
      };
      saveAyarlar(guncelAyarlar);
      toast.success("Fiş ayarları kaydedildi");
    } catch (error) {
      toast.error("Kaydetme sırasında hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  const kurGuncelle = async () => {
    setSaving(true);
    try {
      // Simulated API call for exchange rates
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const yeniKurlar = {
        usd: 34.50 + (Math.random() - 0.5) * 2,
        eur: 37.20 + (Math.random() - 0.5) * 2
      };

      const guncelAyarlar = getAyarlar();
      guncelAyarlar.paraBirimi.manuelKurlar = yeniKurlar;
      saveAyarlar(guncelAyarlar);

      paraBirimiForm.setValue("usdKuru", yeniKurlar.usd);
      paraBirimiForm.setValue("eurKuru", yeniKurlar.eur);

      toast.success("Kurlar güncellendi");
    } catch (error) {
      toast.error("Kur güncelleme sırasında hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sistem Ayarları</h1>
          <p className="text-muted-foreground mt-1">
            Uygulama ayarlarını yapılandırın
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="firma" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Firma</span>
            </TabsTrigger>
            <TabsTrigger value="para-birimi" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              <span className="hidden sm:inline">Para Birimi</span>
            </TabsTrigger>
            <TabsTrigger value="kdv" className="flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              <span className="hidden sm:inline">KDV</span>
            </TabsTrigger>
            <TabsTrigger value="stok" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Stok</span>
            </TabsTrigger>
            <TabsTrigger value="fis" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Fiş</span>
            </TabsTrigger>
          </TabsList>

          {/* FİRMA AYARLARI */}
          <TabsContent value="firma">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Firma Bilgileri
                </CardTitle>
                <CardDescription>
                  İşletme bilgilerinizi düzenleyin
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...firmaForm}>
                  <form onSubmit={firmaForm.handleSubmit(onFirmaSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={firmaForm.control}
                        name="firmaAdi"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Firma Adı *</FormLabel>
                            <FormControl>
                              <Input placeholder="Kuyumcu İşletmesi" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={firmaForm.control}
                        name="vergiNo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Vergi Numarası</FormLabel>
                            <FormControl>
                              <Input placeholder="1234567890" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={firmaForm.control}
                        name="telefon"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefon</FormLabel>
                            <FormControl>
                              <Input placeholder="+90 (212) 123 45 67" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={firmaForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>E-posta</FormLabel>
                            <FormControl>
                              <Input placeholder="info@example.com" type="email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={firmaForm.control}
                      name="adres"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Adres</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Tam adres bilgisi..."
                              className="min-h-[100px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end">
                      <Button type="submit" disabled={saving}>
                        {saving ? (
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        Kaydet
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PARA BİRİMİ AYARLARI */}
          <TabsContent value="para-birimi">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Para Birimi Ayarları
                </CardTitle>
                <CardDescription>
                  Kur bilgilerini ve para birimi tercihlerini yönetin
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...paraBirimiForm}>
                  <form onSubmit={paraBirimiForm.handleSubmit(onParaBirimiSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={paraBirimiForm.control}
                        name="varsayilanParaBirimi"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Varsayılan Para Birimi</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-background">
                                  <SelectValue placeholder="Para birimi seçin" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-popover z-50">
                                <SelectItem value="TRY">Türk Lirası (TRY)</SelectItem>
                                <SelectItem value="USD">Amerikan Doları (USD)</SelectItem>
                                <SelectItem value="EUR">Euro (EUR)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={paraBirimiForm.control}
                        name="kurGuncellemeSikligi"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Güncelleme Sıklığı (dakika)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="1" 
                                max="1440"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={paraBirimiForm.control}
                      name="otomatikKurGuncelleme"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Otomatik Kur Güncelleme</FormLabel>
                            <p className="text-sm text-muted-foreground">
                              Kurları belirli aralıklarla otomatik güncelle
                            </p>
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

                    <Separator />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium">Manuel Kur Değerleri</h3>
                        <Button type="button" variant="outline" onClick={kurGuncelle} disabled={saving}>
                          {saving ? (
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="mr-2 h-4 w-4" />
                          )}
                          Kurları Güncelle
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={paraBirimiForm.control}
                          name="usdKuru"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>USD/TRY Kuru</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="0.01"
                                  min="0.01"
                                  max="1000"
                                  {...field}
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={paraBirimiForm.control}
                          name="eurKuru"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>EUR/TRY Kuru</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="0.01"
                                  min="0.01"
                                  max="1000"
                                  {...field}
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" disabled={saving}>
                        {saving ? (
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        Kaydet
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* KDV AYARLARI */}
          <TabsContent value="kdv">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="w-5 h-5" />
                  KDV Ayarları
                </CardTitle>
                <CardDescription>
                  Vergi hesaplama tercihlerini ayarlayın
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...kdvForm}>
                  <form onSubmit={kdvForm.handleSubmit(onKdvSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={kdvForm.control}
                        name="varsayilanKDVOrani"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Varsayılan KDV Oranı (%)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0" 
                                max="100"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={kdvForm.control}
                      name="kdvDahilSatis"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">KDV Dahil Satış</FormLabel>
                            <p className="text-sm text-muted-foreground">
                              Satış fiyatları varsayılan olarak KDV dahil görüntülensin
                            </p>
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

                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium">KDV Bilgisi</p>
                          <p className="text-muted-foreground mt-1">
                            Bu ayarlar yeni ürünler için geçerlidir. Mevcut ürünlerin KDV oranları değiştirilmez.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" disabled={saving}>
                        {saving ? (
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        Kaydet
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* STOK AYARLARI */}
          <TabsContent value="stok">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Stok Ayarları
                </CardTitle>
                <CardDescription>
                  Stok seviyeleri ve barkod ayarlarını yapılandırın
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...stokForm}>
                  <form onSubmit={stokForm.handleSubmit(onStokSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={stokForm.control}
                        name="minStokSeviyesi"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Minimum Stok Seviyesi</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0" 
                                max="10000"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={stokForm.control}
                        name="kritikStokSeviyesi"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Kritik Stok Seviyesi</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0" 
                                max="10000"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={stokForm.control}
                        name="barkodPrefixi"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Barkod Prefixi</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="URN"
                                maxLength={10}
                                {...field}
                                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={stokForm.control}
                      name="otomatikBarkod"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Otomatik Barkod Oluşturma</FormLabel>
                            <p className="text-sm text-muted-foreground">
                              Yeni ürünler için otomatik barkod oluşturulsun
                            </p>
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

                    <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                      <div className="flex items-start gap-2">
                        <Settings className="w-5 h-5 text-primary mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium">Stok Seviyesi Bilgisi</p>
                          <p className="text-muted-foreground mt-1">
                            Kritik stok seviyesi, minimum stok seviyesinden küçük veya eşit olmalıdır.
                          </p>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground pl-7">
                        Örnek: Min: 10, Kritik: 5 → Stok 5'in altına düştüğünde kritik uyarı
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" disabled={saving}>
                        {saving ? (
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        Kaydet
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FİŞ AYARLARI */}
          <TabsContent value="fis">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Fiş Şablonu Ayarları
                </CardTitle>
                <CardDescription>
                  Satış fişi görünümünü özelleştirin
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...fisForm}>
                  <form onSubmit={fisForm.handleSubmit(onFisSubmit)} className="space-y-6">
                    <FormField
                      control={fisForm.control}
                      name="baslik"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fiş Başlığı *</FormLabel>
                          <FormControl>
                            <Input placeholder="KUYUMCU İŞLETMESİ" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={fisForm.control}
                      name="altBilgi"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Alt Bilgi</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Teşekkür ederiz."
                              className="min-h-[80px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={fisForm.control}
                      name="reklamAlani"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reklam Alanı</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Kaliteli hizmet için teşekkürler!"
                              className="min-h-[80px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="bg-muted/50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Fiş Önizlemesi</h4>
                      <div className="bg-white p-4 rounded border text-sm font-mono">
                        <div className="text-center font-bold mb-2">
                          {fisForm.watch("baslik") || "KUYUMCU İŞLETMESİ"}
                        </div>
                        <div className="text-center text-xs mb-4">
                          {ayarlar.firma.adres && (
                            <div>{ayarlar.firma.adres}</div>
                          )}
                          {ayarlar.firma.telefon && (
                            <div>Tel: {ayarlar.firma.telefon}</div>
                          )}
                        </div>
                        <div className="border-t border-dashed border-gray-400 my-2"></div>
                        <div className="text-xs">
                          <div>Tarih: {new Date().toLocaleString('tr-TR')}</div>
                          <div>Fiş No: SATS-0001</div>
                        </div>
                        <div className="border-t border-dashed border-gray-400 my-2"></div>
                        <div className="text-xs">
                          <div>1x Örnek Ürün............100,00 TL</div>
                        </div>
                        <div className="border-t border-dashed border-gray-400 my-2"></div>
                        <div className="text-xs font-bold">
                          <div>TOPLAM: 100,00 TL</div>
                        </div>
                        {fisForm.watch("altBilgi") && (
                          <>
                            <div className="border-t border-dashed border-gray-400 my-2"></div>
                            <div className="text-center text-xs">
                              {fisForm.watch("altBilgi")}
                            </div>
                          </>
                        )}
                        {fisForm.watch("reklamAlani") && (
                          <div className="text-center text-xs mt-2">
                            {fisForm.watch("reklamAlani")}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" disabled={saving}>
                        {saving ? (
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        Kaydet
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}