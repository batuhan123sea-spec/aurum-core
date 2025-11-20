import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { getMusteriById, saveMusteri, updateMusteri, generateMusteriKodu } from "@/lib/musteri-data";
import { Musteri, ParaBirimi, Konum } from "@/types/musteri";

const MusteriForm = () => {
  const navigate = useNavigate();
  const { musteriId } = useParams();
  const isEdit = !!musteriId;

  const [formData, setFormData] = useState({
    adSoyad: "",
    telefon: "",
    email: "",
    adres: "",
    vergiNoTcKimlik: "",
    konum: "ic" as Konum,
    varsayilanParaBirimi: "TRY" as ParaBirimi,
    krediLimiti: "",
    notlar: "",
  });

  useEffect(() => {
    if (isEdit && musteriId) {
      const musteri = getMusteriById(musteriId);
      if (musteri) {
      setFormData({
        adSoyad: musteri.adSoyad,
        telefon: musteri.telefon,
        email: musteri.email || "",
        adres: musteri.adres,
        vergiNoTcKimlik: musteri.vergiNoTcKimlik || "",
        konum: musteri.konum,
        varsayilanParaBirimi: musteri.varsayilanParaBirimi,
        krediLimiti: musteri.krediLimiti?.toString() || "",
        notlar: musteri.notlar || "",
      });
      } else {
        toast({
          title: "Hata",
          description: "Müşteri bulunamadı.",
          variant: "destructive",
        });
        navigate("/musteri/liste");
      }
    }
  }, [isEdit, musteriId, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.adSoyad.trim()) {
      toast({
        title: "Hata",
        description: "Ad Soyad zorunludur.",
        variant: "destructive",
      });
      return;
    }

    const musteriData: Musteri = {
      id: isEdit && musteriId ? musteriId : Date.now().toString(),
      kod: isEdit && musteriId ? getMusteriById(musteriId)!.kod : generateMusteriKodu(),
      adSoyad: formData.adSoyad.trim(),
      telefon: formData.telefon.trim(),
      email: formData.email.trim() || undefined,
      adres: formData.adres.trim(),
      vergiNoTcKimlik: formData.vergiNoTcKimlik.trim() || undefined,
      konum: formData.konum,
      varsayilanParaBirimi: formData.varsayilanParaBirimi,
      krediLimiti: formData.krediLimiti ? parseFloat(formData.krediLimiti) : undefined,
      notlar: formData.notlar.trim() || undefined,
      toplamBorc: isEdit && musteriId ? getMusteriById(musteriId)!.toplamBorc : 0,
      durumu: 'aktif',
      olusturmaTarihi: isEdit && musteriId ? getMusteriById(musteriId)!.olusturmaTarihi : new Date().toISOString(),
      sonIslemTarihi: new Date().toISOString(),
    };

    if (isEdit) {
      updateMusteri(musteriData);
      toast({
        title: "Başarılı",
        description: "Müşteri bilgileri güncellendi.",
      });
    } else {
      saveMusteri(musteriData);
      toast({
        title: "Başarılı",
        description: "Yeni müşteri eklendi.",
      });
    }

    navigate("/musteri/liste");
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>{isEdit ? "Müşteri Düzenle" : "Yeni Müşteri Ekle"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="adSoyad">Ad Soyad *</Label>
                <Input
                  id="adSoyad"
                  value={formData.adSoyad}
                  onChange={(e) => setFormData({ ...formData, adSoyad: e.target.value })}
                  placeholder="Müşteri adı soyadı"
                  maxLength={100}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefon">Telefon</Label>
                <Input
                  id="telefon"
                  value={formData.telefon}
                  onChange={(e) => setFormData({ ...formData, telefon: e.target.value })}
                  placeholder="0532 123 45 67"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-posta</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="ornek@email.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="adres">Adres</Label>
                <Textarea
                  id="adres"
                  value={formData.adres}
                  onChange={(e) => setFormData({ ...formData, adres: e.target.value })}
                  placeholder="Müşteri adresi"
                  maxLength={200}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vergiNoTcKimlik">Vergi No / TC Kimlik</Label>
                <Input
                  id="vergiNoTcKimlik"
                  type="text"
                  value={formData.vergiNoTcKimlik}
                  onChange={(e) => setFormData({ ...formData, vergiNoTcKimlik: e.target.value })}
                  placeholder="12345678901"
                  maxLength={11}
                />
              </div>

              <div className="space-y-2">
                <Label>Konum</Label>
                <RadioGroup
                  value={formData.konum}
                  onValueChange={(value) => setFormData({ ...formData, konum: value as Konum })}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="ic" id="ic" />
                    <Label htmlFor="ic" className="font-normal cursor-pointer">İş Hanı İçi</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="dis" id="dis" />
                    <Label htmlFor="dis" className="font-normal cursor-pointer">Dışarı</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paraBirimi">Varsayılan Para Birimi</Label>
                <Select
                  value={formData.varsayilanParaBirimi}
                  onValueChange={(value) => setFormData({ ...formData, varsayilanParaBirimi: value as ParaBirimi })}
                >
                  <SelectTrigger id="paraBirimi">
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
                <Label htmlFor="krediLimiti">Kredi Limiti (TL - Opsiyonel)</Label>
                <Input
                  id="krediLimiti"
                  type="number"
                  step="0.01"
                  value={formData.krediLimiti}
                  onChange={(e) => setFormData({ ...formData, krediLimiti: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notlar">Notlar (Opsiyonel)</Label>
                <Textarea
                  id="notlar"
                  value={formData.notlar}
                  onChange={(e) => setFormData({ ...formData, notlar: e.target.value })}
                  placeholder="Müşteri hakkında notlar"
                  maxLength={500}
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button type="submit" className="flex-1">
                  {isEdit ? "Güncelle" : "Kaydet"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/musteri/liste")}
                  className="flex-1"
                >
                  İptal
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default MusteriForm;
