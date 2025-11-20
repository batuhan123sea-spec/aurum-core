// Müşteri Listesi
import { useState, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Plus, Search, Edit, Trash2, FileDown, Printer } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getMusteriler, deleteMusteri } from "@/lib/musteri-data";
import { formatCurrency } from "@/lib/kur-hesaplama";
import { Musteri } from "@/types/musteri";
import { toast } from "@/hooks/use-toast";
import { musterileriExcelAktar } from "@/lib/excel-export";
import { TopluTahsilatFisiModal } from "@/components/TopluTahsilatFisiModal";

const ALFABETIK_FILTRE = ['TÜM', 'A', 'B', 'C', 'Ç', 'D', 'E', 'F', 'G', 'Ğ', 'H', 'I', 'İ', 'J', 'K', 'L', 'M', 'N', 'O', 'Ö', 'P', 'R', 'S', 'Ş', 'T', 'U', 'Ü', 'V', 'Y', 'Z'];

type FiltreTuru = 'tum' | 'ic-borclu' | 'dis-borclu' | 'borclu' | 'borcsuz' | 'pasif';

const MusteriListe = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [alfabetikFiltre, setAlfabetikFiltre] = useState("TÜM");
  const [aktifFiltre, setAktifFiltre] = useState<FiltreTuru>("tum");
  const [musteriler, setMusteriler] = useState<Musteri[]>(getMusteriler());
  const [selectedMusteriler, setSelectedMusteriler] = useState<string[]>([]);
  const [topluFisModalOpen, setTopluFisModalOpen] = useState(false);

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
        filtered = filtered.filter(m => m.konum === 'ic' && m.toplamBorc > 0 && m.durumu === 'aktif');
        break;
      case 'dis-borclu':
        filtered = filtered.filter(m => m.konum === 'dis' && m.toplamBorc > 0 && m.durumu === 'aktif');
        break;
      case 'borclu':
        filtered = filtered.filter(m => m.toplamBorc > 0 && m.durumu === 'aktif');
        break;
      case 'borcsuz':
        filtered = filtered.filter(m => m.toplamBorc === 0 && m.durumu === 'aktif');
        break;
      case 'pasif':
        filtered = filtered.filter(m => m.durumu === 'pasif');
        break;
    }

    return filtered.sort((a, b) => a.adSoyad.localeCompare(b.adSoyad, 'tr-TR'));
  }, [musteriler, searchQuery, alfabetikFiltre, aktifFiltre]);

  const handleExcelExport = () => {
    musterileriExcelAktar(filtreliMusteriler);
    toast({
      title: "Excel Aktarıldı",
      description: `${filtreliMusteriler.length} müşteri Excel dosyasına aktarıldı.`,
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedMusteriler(filtreliMusteriler.map(m => m.id));
    } else {
      setSelectedMusteriler([]);
    }
  };

  const handleSelectMusteri = (musteriId: string, checked: boolean) => {
    if (checked) {
      setSelectedMusteriler([...selectedMusteriler, musteriId]);
    } else {
      setSelectedMusteriler(selectedMusteriler.filter(id => id !== musteriId));
    }
  };

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
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExcelExport}>
              <FileDown className="w-4 h-4 mr-2" />
              Excel Aktar
            </Button>
            <Button onClick={() => navigate('/musteri/yeni')} className="gap-2">
              <Plus className="w-4 h-4" />
              Yeni Müşteri
            </Button>
          </div>
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
            <ToggleGroupItem value="pasif" aria-label="Pasifler">
              Pasifler
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {selectedMusteriler.length > 0 && (
          <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
            <span className="text-sm font-medium">{selectedMusteriler.length} müşteri seçildi</span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setTopluFisModalOpen(true)}
            >
              <Printer className="w-4 h-4 mr-2" />
              Haftalık Tahsilat Fişi Yazdır ({selectedMusteriler.length})
            </Button>
          </div>
        )}

        {/* Tablo */}
        <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedMusteriler.length === filtreliMusteriler.length && filtreliMusteriler.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
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
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    Müşteri bulunamadı
                  </TableCell>
                </TableRow>
              ) : (
                filtreliMusteriler.map((musteri) => (
                  <TableRow
                    key={musteri.id}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedMusteriler.includes(musteri.id)}
                        onCheckedChange={(checked) => handleSelectMusteri(musteri.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-sm" onClick={() => navigate(`/musteri/detay/${musteri.id}`)}>{musteri.kod}</TableCell>
                    <TableCell className="font-medium" onClick={() => navigate(`/musteri/detay/${musteri.id}`)}>{musteri.adSoyad}</TableCell>
                    <TableCell onClick={() => navigate(`/musteri/detay/${musteri.id}`)}>{musteri.telefon}</TableCell>
                    <TableCell className="max-w-[200px] truncate" onClick={() => navigate(`/musteri/detay/${musteri.id}`)}>{musteri.adres}</TableCell>
                    <TableCell onClick={() => navigate(`/musteri/detay/${musteri.id}`)}>
                      <Badge variant={musteri.konum === 'ic' ? 'default' : 'secondary'}>
                        {musteri.konum === 'ic' ? 'İç' : 'Dış'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={() => navigate(`/musteri/detay/${musteri.id}`)}>
                      <span className={musteri.toplamBorc > 0 ? 'text-destructive font-semibold' : 'text-success'}>
                        {formatCurrency(musteri.toplamBorc, 'TRY')}
                      </span>
                    </TableCell>
                    <TableCell onClick={() => navigate(`/musteri/detay/${musteri.id}`)}>
                      {new Date(musteri.sonIslemTarihi).toLocaleDateString('tr-TR')}
                    </TableCell>
                    <TableCell onClick={() => navigate(`/musteri/detay/${musteri.id}`)}>
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

      <TopluTahsilatFisiModal
        musteriIds={selectedMusteriler}
        open={topluFisModalOpen}
        onOpenChange={setTopluFisModalOpen}
      />
    </Layout>
  );
};

export default MusteriListe;
