import { useState, useEffect } from "react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  Building2, DollarSign, Receipt, Package, FileText, Users,
  Save, Settings, RefreshCw, AlertTriangle, Check, Trash2, UserPlus
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { getAyarlar, saveAyarlar } from "@/lib/ayarlar-data";
import { getMusteriler, updateMusteri } from "@/lib/musteri-data";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

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

interface UserProfile {
  id: string;
  username: string;
  created_at: string;
  isAdmin: boolean;
}

export default function Ayarlar() {
  const [activeTab, setActiveTab] = useState("firma");
  const [saving, setSaving] = useState(false);
  const ayarlar = getAyarlar();
  const { isAdmin } = useAuth();
  
  // User Management State
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newUserIsAdmin, setNewUserIsAdmin] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [veriTemizlemeTeyit, setVeriTemizlemeTeyit] = useState(false);

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

  // User Management Functions
  const fetchUsers = async () => {
    if (!isAdmin) return;
    
    setLoadingUsers(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Oturum bulunamadı');
        return;
      }

      const response = await supabase.functions.invoke('list-users', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (response.error) {
        console.error('User fetch error:', response.error);
        toast.error('Kullanıcılar yüklenemedi');
        return;
      }

      if (response.data?.users) {
        setUsers(response.data.users);
      }
    } catch (error) {
      console.error('Fetch users error:', error);
      toast.error('Kullanıcılar yüklenirken hata oluştu');
    } finally {
      setLoadingUsers(false);
    }
  };

  const createUser = async () => {
    if (!newUsername || !newPassword) {
      toast.error('Kullanıcı adı ve şifre gerekli');
      return;
    }
    
    // Username validation
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (newUsername.length < 3) {
      toast.error('Kullanıcı adı en az 3 karakter olmalı');
      return;
    }
    if (newUsername.length > 30) {
      toast.error('Kullanıcı adı en fazla 30 karakter olabilir');
      return;
    }
    if (!usernameRegex.test(newUsername)) {
      toast.error('Kullanıcı adı sadece harf, rakam, tire ve alt çizgi içerebilir');
      return;
    }
    
    // Password validation
    if (newPassword.length < 12) {
      toast.error('Şifre en az 12 karakter olmalı');
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      toast.error('Şifre en az bir büyük harf içermelidir');
      return;
    }
    if (!/[a-z]/.test(newPassword)) {
      toast.error('Şifre en az bir küçük harf içermelidir');
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      toast.error('Şifre en az bir rakam içermelidir');
      return;
    }
    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      toast.error('Şifre en az bir özel karakter içermelidir');
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Oturum bulunamadı');
        return;
      }

      const response = await supabase.functions.invoke('create-user', {
        body: {
          username: newUsername,
          password: newPassword,
          isAdmin: newUserIsAdmin
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (response.error) {
        console.error('User creation error:', response.error);
        toast.error(response.error.message || 'Kullanıcı oluşturulamadı');
        return;
      }

      toast.success('Kullanıcı başarıyla oluşturuldu');
      setNewUsername('');
      setNewPassword('');
      setNewUserIsAdmin(false);
      fetchUsers();
    } catch (error) {
      console.error('Create user error:', error);
      toast.error('Kullanıcı oluşturulurken hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (userId: string) => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Oturum bulunamadı');
        return;
      }

      const response = await supabase.functions.invoke('delete-user', {
        body: { userId },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (response.error) {
        console.error('User deletion error:', response.error);
        toast.error(response.error.message || 'Kullanıcı silinemedi');
        return;
      }

      toast.success('Kullanıcı silindi');
      fetchUsers();
    } catch (error) {
      console.error('Delete user error:', error);
      toast.error('Kullanıcı silinirken hata oluştu');
    } finally {
      setSaving(false);
      setUserToDelete(null);
    }
  };

  useEffect(() => {
    if (activeTab === 'users' && isAdmin) {
      fetchUsers();
    }
  }, [activeTab, isAdmin]);

  const kurGuncelle = async () => {
    setSaving(true);
    try {
      console.log('BigPara\'dan kurlar çekiliyor...');
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      const response = await fetch(`${supabaseUrl}/functions/v1/bigpara-kurlar`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        const yeniKurlar = {
          usd: result.data.usd,
          eur: result.data.eur
        };

        const guncelAyarlar = getAyarlar();
        guncelAyarlar.paraBirimi.manuelKurlar = yeniKurlar;
        saveAyarlar(guncelAyarlar);

        paraBirimiForm.setValue("usdKuru", yeniKurlar.usd);
        paraBirimiForm.setValue("eurKuru", yeniKurlar.eur);

        toast.success("BigPara kurları getirildi", {
          description: `USD: ${yeniKurlar.usd.toFixed(2)} ₺ | EUR: ${yeniKurlar.eur.toFixed(2)} ₺`
        });
      } else {
        throw new Error('BigPara verisi alınamadı');
      }
    } catch (error) {
      console.error('Kur güncelleme hatası:', error);
      toast.error("BigPara'dan kur alınamadı", {
        description: 'Manuel olarak girebilirsiniz'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleVeriTemizle = () => {
    if (!veriTemizlemeTeyit) {
      toast.error("⚠️ Uyarı", {
        description: "Lütfen önce onay kutusunu işaretleyin"
      });
      return;
    }

    // localStorage'daki tüm verileri temizle
    localStorage.removeItem('kuyumcu_satislar');
    localStorage.removeItem('kuyumcu_hareketler');
    
    // Tüm müşterilerin borçlarını sıfırla
    const musteriler = getMusteriler();
    musteriler.forEach(musteri => {
      updateMusteri({
        ...musteri,
        borclar: { TRY: 0, USD: 0, EUR: 0 },
        toplamBorcTL: 0
      });
    });

    toast.success("✅ Başarılı", {
      description: "Tüm satış ve rapor verileri temizlendi. Sayfa yenileniyor..."
    });

    setTimeout(() => {
      window.location.reload();
    }, 1500);
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
          <TabsList className="grid w-full grid-cols-6">
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
            {isAdmin && (
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Kullanıcılar</span>
              </TabsTrigger>
            )}
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

          {/* KULLANICI YÖNETİMİ */}
          {isAdmin && (
            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Kullanıcı Yönetimi
                  </CardTitle>
                  <CardDescription>
                    Sisteme erişebilecek kullanıcıları yönetin
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Yeni Kullanıcı Oluşturma */}
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                    <h3 className="font-semibold flex items-center gap-2">
                      <UserPlus className="w-4 h-4" />
                      Yeni Kullanıcı Ekle
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="newUsername">Kullanıcı Adı</Label>
                        <Input
                          id="newUsername"
                          placeholder="admin"
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          disabled={saving}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">Şifre (min 6 karakter)</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          placeholder="••••••••"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          disabled={saving}
                        />
                      </div>
                      <div className="space-y-2 flex items-end">
                        <div className="flex items-center space-x-2 h-10">
                          <Switch
                            id="newUserIsAdmin"
                            checked={newUserIsAdmin}
                            onCheckedChange={setNewUserIsAdmin}
                            disabled={saving}
                          />
                          <Label htmlFor="newUserIsAdmin" className="cursor-pointer">
                            Admin Yetkisi
                          </Label>
                        </div>
                      </div>
                    </div>
                    <Button onClick={createUser} disabled={saving || !newUsername || !newPassword}>
                      {saving ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <UserPlus className="mr-2 h-4 w-4" />
                      )}
                      Kullanıcı Oluştur
                    </Button>
                  </div>

                  {/* Kullanıcı Listesi */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Mevcut Kullanıcılar</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchUsers}
                        disabled={loadingUsers}
                      >
                        {loadingUsers ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    {loadingUsers ? (
                      <div className="flex justify-center py-8">
                        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : users.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Henüz kullanıcı bulunmuyor
                      </div>
                    ) : (
                      <div className="border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Kullanıcı Adı</TableHead>
                              <TableHead>Rol</TableHead>
                              <TableHead>Oluşturulma Tarihi</TableHead>
                              <TableHead className="text-right">İşlemler</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {users.map((user) => (
                              <TableRow key={user.id}>
                                <TableCell className="font-medium">{user.username}</TableCell>
                                <TableCell>
                                  {user.isAdmin ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                                      <Check className="w-3 h-3" />
                                      Admin
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-muted text-muted-foreground text-xs font-medium">
                                      Kullanıcı
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {new Date(user.created_at).toLocaleDateString('tr-TR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => setUserToDelete(user.id)}
                                    disabled={saving}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {/* Veri Temizleme Bölümü */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Tehlikeli Alan - Veri Temizleme
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Dikkat!</AlertTitle>
              <AlertDescription>
                Bu işlem geri alınamaz. Tüm satış kayıtları, hesap hareketleri ve müşteri borçları silinecektir.
              </AlertDescription>
            </Alert>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="veri-temizle-onay" 
                checked={veriTemizlemeTeyit}
                onCheckedChange={(checked) => setVeriTemizlemeTeyit(checked as boolean)}
              />
              <label
                htmlFor="veri-temizle-onay"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Tüm verilerin kalıcı olarak silineceğini anlıyorum ve onaylıyorum
              </label>
            </div>

            <Button 
              variant="destructive" 
              onClick={handleVeriTemizle}
              className="w-full"
              disabled={!veriTemizlemeTeyit}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Tüm Satış ve Rapor Verilerini Temizle
            </Button>
          </CardContent>
        </Card>

        {/* Silme Onay Dialogu */}
        <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Kullanıcıyı Sil</AlertDialogTitle>
              <AlertDialogDescription>
                Bu kullanıcıyı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>İptal</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => userToDelete && deleteUser(userToDelete)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Sil
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}