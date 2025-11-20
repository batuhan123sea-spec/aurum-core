import { useState, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getMusteriler, deleteMusteri } from "@/lib/musteri-data";
import { formatCurrency } from "@/lib/kur-hesaplama";
import { Musteri } from "@/types/musteri";
import { toast } from "@/hooks/use-toast";

const ALFABETIK_FILTRE = ['TÜM', 'A', 'B', 'C', 'Ç', 'D', 'E', 'F', 'G', 'Ğ', 'H', 'I', 'İ', 'J', 'K', 'L', 'M', 'N', 'O', 'Ö', 'P', 'R', 'S', 'Ş', 'T', 'U', 'Ü', 'V', 'Y', 'Z'];

type FiltreTuru = 'tum' | 'ic-borclu' | 'dis-borclu' | 'borclu' | 'borcsuz';

const MusteriListe = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [alfabetikFiltre, setAlfabetikFiltre] = useState("TÜM");
  const [aktifFiltre, setAktifFiltre] = useState<FiltreTuru>("tum");
  const [musteriler, setMusteriler] = useState<Musteri[]>(getMusteriler());

  const filtreliMusteriler = useMemo(() => {
    let filtered = [...musteriler];

    // Arama filtresi
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.adSoyad.toLowerCase().includes(query) ||
        m.telefon.toLowerCase().includes(query) ||
        m.adres.toLowerCase().includes(query) ||
        m.kod.toLowerCase().includes(query)
      );
    }

    // Alfabetik filtre
    if (alfabetikFiltre !== 'TÜM') {
      filtered = filtered.filter(m =>
        m.adSoyad.charAt(0).toLocaleUpperCase('tr-TR') === alfabetikFiltre
      );
    }

    // Borç/Konum filtresi
    switch (aktifFiltre) {
      case 'ic-borclu':
        filtered = filtered.filter(m => m.konum === 'ic' && m.toplamBorc > 0);
        break;
      case 'dis-borclu':
        filtered = filtered.filter(m => m.konum === 'dis' && m.toplamBorc > 0);
        break;
      case 'borclu':
        filtered = filtered.filter(m => m.toplamBorc > 0);
        break;
      case 'borcsuz':
        filtered = filtered.filter(m => m.toplamBorc === 0);
        break;
    }

    return filtered.sort((a, b) => a.adSoyad.localeCompare(b.adSoyad, 'tr-TR'));
  }, [musteriler, searchQuery, alfabetikFiltre, aktifFiltre]);

  const handleDelete = (id: string, adSoyad: string) => {
    if (confirm(`${adSoyad} müşterisini silmek istediğinize emin misiniz?`)) {
      deleteMusteri(id);
      setMusteriler(getMusteriler());
      toast({
        title: "Müşteri silindi",
        description: `${adSoyad} başarıyla silindi.`,
      });
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Başlık */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Müşteri İşlemleri</h1>
            <p className="text-muted-foreground mt-1">Toplam {filtreliMusteriler.length} müşteri</p>
          </div>
          <Button onClick={() => navigate('/musteri/yeni')} className="gap-2">
            <Plus className="w-4 h-4" />
            Yeni Müşteri
          </Button>
        </div>

        {/* Alfabetik Filtre */}
        <div className="flex flex-wrap gap-2">
          {ALFABETIK_FILTRE.map(harf => (
            <Button
              key={harf}
              variant={alfabetikFiltre === harf ? "default" : "outline"}
              size="sm"
              onClick={() => setAlfabetikFiltre(harf)}
              className="w-10 h-10 p-0"
            >
              {harf}
            </Button>
          ))}
        </div>

        {/* Arama ve Filtreler */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Müşteri adı, telefon veya adres ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <ToggleGroup type="single" value={aktifFiltre} onValueChange={(value) => value && setAktifFiltre(value as FiltreTuru)}>
            <ToggleGroupItem value="tum" aria-label="Tümü">
              Tümü
            </ToggleGroupItem>
            <ToggleGroupItem value="ic-borclu" aria-label="İç Borçlular">
              İç Borçlular
            </ToggleGroupItem>
            <ToggleGroupItem value="dis-borclu" aria-label="Dış Borçlular">
              Dış Borçlular
            </ToggleGroupItem>
            <ToggleGroupItem value="borclu" aria-label="Borçlu">
              Borçlu
            </ToggleGroupItem>
            <ToggleGroupItem value="borcsuz" aria-label="Borçsuz">
              Borçsuz
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Tablo */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Müşteri Kodu</TableHead>
                <TableHead>Ad Soyad</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>Adres</TableHead>
                <TableHead>Konum</TableHead>
                <TableHead className="text-right">Toplam Borç</TableHead>
                <TableHead>Son İşlem</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtreliMusteriler.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Müşteri bulunamadı
                  </TableCell>
                </TableRow>
              ) : (
                filtreliMusteriler.map((musteri) => (
                  <TableRow
                    key={musteri.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/musteri/detay/${musteri.id}`)}
                  >
                    <TableCell className="font-mono text-sm">{musteri.kod}</TableCell>
                    <TableCell className="font-medium">{musteri.adSoyad}</TableCell>
                    <TableCell>{musteri.telefon}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{musteri.adres}</TableCell>
                    <TableCell>
                      <Badge variant={musteri.konum === 'ic' ? 'default' : 'secondary'}>
                        {musteri.konum === 'ic' ? 'İç' : 'Dış'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={musteri.toplamBorc > 0 ? 'text-destructive font-semibold' : 'text-success'}>
                        {formatCurrency(musteri.toplamBorc, 'TRY')}
                      </span>
                    </TableCell>
                    <TableCell>
                      {new Date(musteri.sonIslemTarihi).toLocaleDateString('tr-TR')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={musteri.durumu === 'aktif' ? 'default' : 'secondary'}>
                        {musteri.durumu}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/musteri/duzenle/${musteri.id}`)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(musteri.id, musteri.adSoyad)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </Layout>
  );
};

export default MusteriListe;
