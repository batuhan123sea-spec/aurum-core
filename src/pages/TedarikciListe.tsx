import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Plus, Eye, Edit, Trash2, Building2 } from "lucide-react";
import { getTedarikciler, getTedarikciAlimlari } from "@/lib/tedarikci-data";
import { YeniTedarikciModal } from "@/components/YeniTedarikciModal";
import { useNavigate } from "react-router-dom";

const ALFABE = ['A', 'B', 'C', 'Ç', 'D', 'E', 'F', 'G', 'H', 'İ', 'J', 'K', 'L', 'M', 'N', 'O', 'Ö', 'P', 'R', 'S', 'Ş', 'T', 'U', 'Ü', 'V', 'Y', 'Z'];

export default function TedarikciListe() {
  const navigate = useNavigate();
  const [aramaQuery, setAramaQuery] = useState("");
  const [secilenHarf, setSecilenHarf] = useState<string | null>(null);
  const [yeniTedarikciModalOpen, setYeniTedarikciModalOpen] = useState(false);
  
  const tedarikciler = getTedarikciler();

  // Filtreleme
  const filteredTedarikciler = tedarikciler.filter(t => {
    const aramaMatch = aramaQuery 
      ? t.firmaAdi.toLowerCase().includes(aramaQuery.toLowerCase()) ||
        t.yetkiliKisi.toLowerCase().includes(aramaQuery.toLowerCase()) ||
        t.telefon.includes(aramaQuery) ||
        t.kod.toLowerCase().includes(aramaQuery.toLowerCase())
      : true;

    const harfMatch = secilenHarf
      ? t.firmaAdi.charAt(0).toLocaleUpperCase('tr-TR') === secilenHarf
      : true;

    return aramaMatch && harfMatch && t.durum === 'aktif';
  });

  return (
    <Layout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="text-sm text-muted-foreground">
          Dashboard &gt; Tedarikçi Yönetimi
        </div>

        {/* Başlık ve Eylemler */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Building2 className="w-8 h-8 text-primary" />
              Tedarikçi Yönetimi
            </h1>
            <p className="text-muted-foreground mt-1">
              {filteredTedarikciler.length} tedarikçi bulundu
            </p>
          </div>
          <Button onClick={() => setYeniTedarikciModalOpen(true)} size="lg">
            <Plus className="w-4 h-4 mr-2" />
            Yeni Tedarikçi
          </Button>
        </div>

        {/* Arama ve Filtreler */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Arama */}
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tedarikçi ara (firma, yetkili, telefon)..."
                  value={aramaQuery}
                  onChange={(e) => setAramaQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Alfabetik Filtre */}
              <div className="flex flex-wrap gap-1">
                <Button
                  size="sm"
                  variant={secilenHarf === null ? "default" : "outline"}
                  onClick={() => setSecilenHarf(null)}
                >
                  TÜM
                </Button>
                {ALFABE.map(harf => (
                  <Button
                    key={harf}
                    size="sm"
                    variant={secilenHarf === harf ? "default" : "outline"}
                    onClick={() => setSecilenHarf(harf)}
                    className="w-10"
                  >
                    {harf}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tedarikçi Tablosu */}
        <Card>
          <CardHeader>
            <CardTitle>Tedarikçiler</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredTedarikciler.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  {aramaQuery || secilenHarf 
                    ? "Arama kriterlerine uygun tedarikçi bulunamadı"
                    : "Henüz tedarikçi eklenmemiş"}
                </p>
                <Button onClick={() => setYeniTedarikciModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  İlk Tedarikçiyi Ekle
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tedarikçi Kodu</TableHead>
                    <TableHead>Firma Adı</TableHead>
                    <TableHead>Yetkili Kişi</TableHead>
                    <TableHead>Telefon</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Toplam Alım</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTedarikciler.map((tedarikci) => {
                    const alimlar = getTedarikciAlimlari(tedarikci.id);
                    console.log('📊 TedarikciListe - Alımlar:', { 
                      tedarikciId: tedarikci.id, 
                      firmaAdi: tedarikci.firmaAdi,
                      alimSayisi: alimlar.length 
                    });
                    const toplamAlim = alimlar.reduce((sum, a) => sum + a.genelToplam, 0);

                    return (
                      <TableRow key={tedarikci.id}>
                        <TableCell className="font-medium">{tedarikci.kod}</TableCell>
                        <TableCell className="font-semibold">{tedarikci.firmaAdi}</TableCell>
                        <TableCell>{tedarikci.yetkiliKisi}</TableCell>
                        <TableCell>{tedarikci.telefon}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {tedarikci.email || '-'}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {toplamAlim.toFixed(2)} ₺
                        </TableCell>
                        <TableCell>
                          <Badge variant={tedarikci.durum === 'aktif' ? 'default' : 'secondary'}>
                            {tedarikci.durum}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => navigate(`/tedarikci/detay/${tedarikci.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <YeniTedarikciModal
        open={yeniTedarikciModalOpen}
        onOpenChange={setYeniTedarikciModalOpen}
        onSuccess={() => {
          setYeniTedarikciModalOpen(false);
        }}
      />
    </Layout>
  );
}
