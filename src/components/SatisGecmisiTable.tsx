import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, CalendarIcon, Filter, X } from "lucide-react";
import { getSatislar } from "@/lib/satis-data";
import { formatCurrency } from "@/lib/kur-hesaplama";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface SatisGecmisiTableProps {
  musteriId: string;
}

export function SatisGecmisiTable({ musteriId }: SatisGecmisiTableProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    baslangicTarihi: null as Date | null,
    bitisTarihi: null as Date | null,
    minTutar: '',
    maxTutar: '',
    urunArama: '',
    satisTuru: 'tumu' as 'tumu' | 'hesapli' | 'hizli' | 'rezerv',
    minUrunSayisi: '',
  });

  const satislar = useMemo(() => {
    return getSatislar()
      .filter(s => s.musteriId === musteriId && s.durum === 'tamamlandi' && !s.iptalEdildi)
      .filter(s => {
        // Tarih filtresi
        if (filters.baslangicTarihi) {
          const satisTarih = new Date(s.tarih);
          if (satisTarih < filters.baslangicTarihi) return false;
        }
        if (filters.bitisTarihi) {
          const satisTarih = new Date(s.tarih);
          const bitisTarihSon = new Date(filters.bitisTarihi);
          bitisTarihSon.setHours(23, 59, 59, 999);
          if (satisTarih > bitisTarihSon) return false;
        }
        
        // Tutar filtresi
        if (filters.minTutar && s.genelToplam < parseFloat(filters.minTutar)) return false;
        if (filters.maxTutar && s.genelToplam > parseFloat(filters.maxTutar)) return false;
        
        // Ürün arama
        if (filters.urunArama) {
          const aramaKelime = filters.urunArama.toLowerCase();
          const urunBulundu = s.kalemler.some(k => 
            k.urunAdi.toLowerCase().includes(aramaKelime)
          );
          if (!urunBulundu) return false;
        }
        
        // Satış türü
        if (filters.satisTuru !== 'tumu' && s.satisTuru !== filters.satisTuru) return false;
        
        // Ürün sayısı
        if (filters.minUrunSayisi && s.kalemler.length < parseInt(filters.minUrunSayisi)) return false;
        
        return true;
      })
      .sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime());
  }, [musteriId, filters]);

  const filtreAktifMi = 
    filters.baslangicTarihi || 
    filters.bitisTarihi || 
    filters.minTutar || 
    filters.maxTutar || 
    filters.urunArama || 
    filters.satisTuru !== 'tumu' || 
    filters.minUrunSayisi;

  const filtreleriTemizle = () => {
    setFilters({
      baslangicTarihi: null,
      bitisTarihi: null,
      minTutar: '',
      maxTutar: '',
      urunArama: '',
      satisTuru: 'tumu',
      minUrunSayisi: '',
    });
  };

  if (getSatislar().filter(s => s.musteriId === musteriId && s.durum === 'tamamlandi' && !s.iptalEdildi).length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Henüz satış kaydı bulunmamaktadır.
      </div>
    );
  }

  const getSatisTuruBadge = (satisTuru: string) => {
    switch (satisTuru) {
      case 'hesapli':
        return <Badge variant="default">Hesaplı</Badge>;
      case 'hizli':
        return <Badge variant="secondary">Hızlı</Badge>;
      case 'rezerv':
        return <Badge variant="outline">Rezerv</Badge>;
      default:
        return <Badge>{satisTuru}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Filtre Butonu ve Özet */}
      <div className="flex items-center justify-between">
        <Button
          variant={filtreAktifMi ? "default" : "outline"}
          onClick={() => setFilterOpen(!filterOpen)}
          className="gap-2"
        >
          <Filter className="w-4 h-4" />
          {filterOpen ? "Filtreleri Gizle" : "Filtrele"}
          {filtreAktifMi && (
            <Badge variant="secondary" className="ml-1">{satislar.length}</Badge>
          )}
        </Button>
        
        {filtreAktifMi && (
          <Button
            variant="ghost"
            size="sm"
            onClick={filtreleriTemizle}
            className="gap-2"
          >
            <X className="w-4 h-4" />
            Temizle
          </Button>
        )}
      </div>

      {/* Filtre Paneli */}
      {filterOpen && (
        <div className="border rounded-lg p-4 bg-muted/50 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tarih Aralığı */}
            <div className="space-y-2">
              <Label>📅 Başlangıç Tarihi</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filters.baslangicTarihi && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.baslangicTarihi ? (
                      format(filters.baslangicTarihi, "PPP", { locale: tr })
                    ) : (
                      <span>Tarih seçin</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.baslangicTarihi || undefined}
                    onSelect={(date) => setFilters(f => ({ ...f, baslangicTarihi: date || null }))}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>📅 Bitiş Tarihi</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filters.bitisTarihi && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.bitisTarihi ? (
                      format(filters.bitisTarihi, "PPP", { locale: tr })
                    ) : (
                      <span>Tarih seçin</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.bitisTarihi || undefined}
                    onSelect={(date) => setFilters(f => ({ ...f, bitisTarihi: date || null }))}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Tutar Aralığı */}
            <div className="space-y-2">
              <Label>💰 Minimum Tutar (₺)</Label>
              <Input
                type="number"
                placeholder="Örn: 1000"
                value={filters.minTutar}
                onChange={(e) => setFilters(f => ({ ...f, minTutar: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>💰 Maksimum Tutar (₺)</Label>
              <Input
                type="number"
                placeholder="Örn: 5000"
                value={filters.maxTutar}
                onChange={(e) => setFilters(f => ({ ...f, maxTutar: e.target.value }))}
              />
            </div>

            {/* Ürün Arama */}
            <div className="space-y-2">
              <Label>🔍 Ürün Ara</Label>
              <Input
                type="text"
                placeholder="Ürün adı yazın"
                value={filters.urunArama}
                onChange={(e) => setFilters(f => ({ ...f, urunArama: e.target.value }))}
              />
            </div>

            {/* Satış Türü */}
            <div className="space-y-2">
              <Label>🏷️ Satış Türü</Label>
              <Select
                value={filters.satisTuru}
                onValueChange={(value: any) => setFilters(f => ({ ...f, satisTuru: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tumu">Tümü</SelectItem>
                  <SelectItem value="hesapli">Hesaplı</SelectItem>
                  <SelectItem value="hizli">Hızlı</SelectItem>
                  <SelectItem value="rezerv">Rezerv</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Minimum Ürün Sayısı */}
            <div className="space-y-2">
              <Label>📦 Minimum Ürün Sayısı</Label>
              <Input
                type="number"
                placeholder="Örn: 2"
                value={filters.minUrunSayisi}
                onChange={(e) => setFilters(f => ({ ...f, minUrunSayisi: e.target.value }))}
              />
            </div>
          </div>
        </div>
      )}

      {/* Sonuç Sayısı */}
      <div className="text-sm text-muted-foreground">
        {satislar.length} sonuç bulundu
      </div>

      {/* Satış Listesi */}
      {satislar.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Filtre kriterlerine uygun satış bulunamadı.
        </div>
      ) : (
        <div className="space-y-2">
          {satislar.map((satis) => (
            <Collapsible key={satis.id}>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      {new Date(satis.tarih).toLocaleDateString('tr-TR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    {satis.satisTuru === 'hesapli' && satis.musteriAdi && (
                      <Badge variant="secondary" className="font-medium">
                        👤 {satis.musteriAdi}
                      </Badge>
                    )}
                    {getSatisTuruBadge(satis.satisTuru)}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      {satis.kalemler.length} ürün
                    </span>
                    <span className="font-bold text-lg">
                      {formatCurrency(satis.genelToplam, 'TRY')}
                    </span>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="p-4 border-t bg-muted/30 rounded-b-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Barkod</TableHead>
                        <TableHead>Ürün Adı</TableHead>
                        <TableHead className="text-center">Adet</TableHead>
                        <TableHead className="text-right">Birim Fiyat</TableHead>
                        <TableHead className="text-right">İndirim</TableHead>
                        <TableHead className="text-center">KDV</TableHead>
                        <TableHead className="text-right">Toplam</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {satis.kalemler.map((kalem) => (
                        <TableRow key={kalem.id}>
                          <TableCell className="font-mono text-xs">{kalem.barkod}</TableCell>
                          <TableCell className="font-medium">{kalem.urunAdi}</TableCell>
                          <TableCell className="text-center">{kalem.adet}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(kalem.birimFiyati, 'TRY')}
                          </TableCell>
                          <TableCell className="text-right">
                            {kalem.indirimYuzde > 0 && (
                              <Badge variant="secondary" className="mr-1">
                                %{kalem.indirimYuzde}
                              </Badge>
                            )}
                            {kalem.indirimTL > 0 && (
                              <span className="text-sm text-muted-foreground">
                                -{formatCurrency(kalem.indirimTL, 'TRY')}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">%{kalem.kdvOrani}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(kalem.toplamTutar, 'TRY')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <div className="mt-4 flex justify-end">
                    <div className="space-y-2 min-w-[300px]">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Ara Toplam:</span>
                        <span className="font-semibold">{formatCurrency(satis.araToplam, 'TRY')}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Toplam KDV:</span>
                        <span className="font-semibold">{formatCurrency(satis.toplamKDV, 'TRY')}</span>
                      </div>
                      {satis.genelIndirimTL > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Genel İndirim:</span>
                          <span className="font-semibold">
                            -{formatCurrency(satis.genelIndirimTL, 'TRY')}
                          </span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between text-base">
                        <span className="font-bold">Genel Toplam:</span>
                        <span className="font-bold text-lg">
                          {formatCurrency(satis.genelToplam, 'TRY')}
                        </span>
                      </div>
                      {!satis.kdvDahil && (
                        <p className="text-xs text-muted-foreground text-right">
                          (KDV Hariç)
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      )}
    </div>
  );
}