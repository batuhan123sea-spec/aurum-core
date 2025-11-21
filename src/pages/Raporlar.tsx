import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  ShoppingCart, Users, Package, TrendingUp, Download, Calendar as CalendarIcon,
  DollarSign, Package2, AlertTriangle, BarChart3
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { 
  getGunlukSatisRaporu, 
  getMusteriBorcRaporu, 
  getStokDurumRaporu,
  getKarZararAnalizi 
} from "@/lib/rapor-olustur";
import { 
  satislariExcelAktar, 
  musteriBorcExcelAktar, 
  stokDurumuExcelAktar,
  karZararExcelAktar 
} from "@/lib/excel-export";
import { formatCurrency } from "@/lib/kur-hesaplama";
import { toast } from "sonner";
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent 
} from "@/components/ui/chart";
import { 
  BarChart, Bar, PieChart, Pie, LineChart, Line, 
  XAxis, YAxis, CartesianGrid, Cell, ResponsiveContainer 
} from "recharts";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export default function Raporlar() {
  const [gunlukTarih, setGunlukTarih] = useState<Date>(new Date());
  const [karZararBaslangic, setKarZararBaslangic] = useState<Date>(new Date(new Date().setDate(1)));
  const [karZararBitis, setKarZararBitis] = useState<Date>(new Date());
  const [konumFiltre, setKonumFiltre] = useState<string>("hepsi");

  // Günlük Satış Raporu
  const gunlukRapor = getGunlukSatisRaporu(gunlukTarih);

  // Müşteri Borç Raporu
  const musteriBorcRapor = getMusteriBorcRaporu().filter(m => {
    if (konumFiltre === "hepsi") return true;
    return m.konum === konumFiltre;
  });

  // Stok Durum Raporu
  const stokRapor = getStokDurumRaporu();

  // Kar/Zarar Analizi
  const karZararRapor = getKarZararAnalizi(karZararBaslangic, karZararBitis);

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Raporlama Paneli</h1>
          <p className="text-muted-foreground mt-1">
            Detaylı raporlar ve analizler
          </p>
        </div>

        <Tabs defaultValue="gunluk-satis" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="gunluk-satis" className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">Günlük Satış</span>
            </TabsTrigger>
            <TabsTrigger value="musteri-borc" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Müşteri Borç</span>
            </TabsTrigger>
            <TabsTrigger value="stok-durum" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Stok Durum</span>
            </TabsTrigger>
            <TabsTrigger value="kar-zarar" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Kar/Zarar</span>
            </TabsTrigger>
          </TabsList>

          {/* GÜNLÜK SATIŞ RAPORU */}
          <TabsContent value="gunluk-satis" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle>Günlük Satış Raporu</CardTitle>
                    <CardDescription>Seçilen tarihe ait satış detayları</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("justify-start text-left font-normal")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(gunlukTarih, "PPP", { locale: tr })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                          mode="single"
                          selected={gunlukTarih}
                          onSelect={(date) => date && setGunlukTarih(date)}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <Button 
                      onClick={() => {
                        satislariExcelAktar(gunlukRapor);
                        toast.success("Rapor Excel olarak indirildi");
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Excel İndir
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Özet Kartlar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Toplam Satış
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(gunlukRapor.toplamSatis, 'TRY')}</div>
                      <p className="text-xs text-muted-foreground mt-1">{gunlukRapor.satislar.length} satış</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Package2 className="w-4 h-4" />
                        Toplam Ürün
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{gunlukRapor.toplamAdet}</div>
                      <p className="text-xs text-muted-foreground mt-1">adet satıldı</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4" />
                        Ortalama Sepet
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(gunlukRapor.ortalamaSepet, 'TRY')}</div>
                      <p className="text-xs text-muted-foreground mt-1">satış başına</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        Satış Sayısı
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{gunlukRapor.satislar.length}</div>
                      <p className="text-xs text-muted-foreground mt-1">işlem tamamlandı</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Satış Tablosu */}
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Satış No</TableHead>
                        <TableHead>Tarih</TableHead>
                        <TableHead>Tür</TableHead>
                        <TableHead>Müşteri</TableHead>
                        <TableHead className="text-right">Tutar</TableHead>
                        <TableHead>Durum</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gunlukRapor.satislar.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            Bu tarihte satış kaydı bulunmuyor
                          </TableCell>
                        </TableRow>
                      ) : (
                        gunlukRapor.satislar.map((satis) => (
                          <TableRow key={satis.id}>
                            <TableCell className="font-medium">{satis.satisNo}</TableCell>
                            <TableCell>{new Date(satis.tarih).toLocaleString('tr-TR')}</TableCell>
                            <TableCell>
                              {satis.satisTuru === 'hesapli' ? 'Hesaplı' : 
                               satis.satisTuru === 'rezerv' ? 'Rezerv' : 'Hızlı'}
                            </TableCell>
                            <TableCell>{satis.musteriAdi || '-'}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(satis.genelToplam, 'TRY')}
                            </TableCell>
                            <TableCell>
                              <span className={cn(
                                "px-2 py-1 rounded-full text-xs",
                                satis.durum === 'tamamlandi' && "bg-green-100 text-green-800",
                                satis.durum === 'rezerv' && "bg-blue-100 text-blue-800",
                                satis.durum === 'iptal' && "bg-red-100 text-red-800"
                              )}>
                                {satis.durum === 'tamamlandi' ? 'Tamamlandı' : 
                                 satis.durum === 'rezerv' ? 'Rezerv' : 'İptal'}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MÜŞTERİ BORÇ RAPORU */}
          <TabsContent value="musteri-borc" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle>Müşteri Borç Raporu</CardTitle>
                    <CardDescription>Borçlu müşteri listesi ve detayları</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Select value={konumFiltre} onValueChange={setKonumFiltre}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Konum" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hepsi">Hepsi</SelectItem>
                        <SelectItem value="ic">İş Hanı İçi</SelectItem>
                        <SelectItem value="dis">Dışarı</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      onClick={() => {
                        musteriBorcExcelAktar(musteriBorcRapor);
                        toast.success("Rapor Excel olarak indirildi");
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Excel İndir
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Özet Kartlar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Toplam Borç
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatCurrency(
                          musteriBorcRapor.reduce((sum, m) => sum + m.borcTL, 0), 
                          'TRY'
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {musteriBorcRapor.length} müşteri
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        İç Müşteri Borcu
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatCurrency(
                          musteriBorcRapor
                            .filter(m => m.konum === 'ic')
                            .reduce((sum, m) => sum + m.borcTL, 0), 
                          'TRY'
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {musteriBorcRapor.filter(m => m.konum === 'ic').length} müşteri
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Dış Müşteri Borcu
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatCurrency(
                          musteriBorcRapor
                            .filter(m => m.konum === 'dis')
                            .reduce((sum, m) => sum + m.borcTL, 0), 
                          'TRY'
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {musteriBorcRapor.filter(m => m.konum === 'dis').length} müşteri
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Grafik */}
                <Card className="p-4">
                  <h3 className="text-sm font-medium mb-4">Konum Bazlı Borç Dağılımı</h3>
                  <ChartContainer
                    config={{
                      ic: {
                        label: "İç Müşteri",
                        color: "hsl(var(--primary))",
                      },
                      dis: {
                        label: "Dış Müşteri",
                        color: "hsl(var(--secondary))",
                      },
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            {
                              name: 'İç Müşteri',
                              value: musteriBorcRapor.filter(m => m.konum === 'ic').reduce((sum, m) => sum + m.borcTL, 0)
                            },
                            {
                              name: 'Dış Müşteri',
                              value: musteriBorcRapor.filter(m => m.konum === 'dis').reduce((sum, m) => sum + m.borcTL, 0)
                            }
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.name}: ${formatCurrency(entry.value, 'TRY')}`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {[0, 1].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </Card>

                {/* Borç Tablosu */}
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Müşteri</TableHead>
                        <TableHead>Konum</TableHead>
                        <TableHead>Para Birimi</TableHead>
                        <TableHead className="text-right">Borç (Orijinal)</TableHead>
                        <TableHead className="text-right">Borç (TL)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {musteriBorcRapor.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            Borçlu müşteri bulunmuyor
                          </TableCell>
                        </TableRow>
                      ) : (
                        musteriBorcRapor.map((musteri) => (
                          <TableRow key={musteri.musteriId}>
                            <TableCell className="font-medium">{musteri.musteriAdi}</TableCell>
                            <TableCell>
                              {musteri.konum === 'ic' ? 'İş Hanı İçi' : 'Dışarı'}
                            </TableCell>
                            <TableCell>{musteri.paraBirimi}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(musteri.borcOrijinal, musteri.paraBirimi as any)}
                            </TableCell>
                            <TableCell className="text-right font-medium text-red-600">
                              {formatCurrency(musteri.borcTL, 'TRY')}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* STOK DURUM RAPORU */}
          <TabsContent value="stok-durum" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle>Stok Durum Raporu</CardTitle>
                    <CardDescription>Kategori bazlı stok analizi</CardDescription>
                  </div>
                  <Button 
                    onClick={() => {
                      stokDurumuExcelAktar(stokRapor);
                      toast.success("Rapor Excel olarak indirildi");
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Excel İndir
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Özet Kartlar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Toplam Ürün
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {stokRapor.reduce((sum, k) => sum + k.toplamUrun, 0)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">farklı ürün</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Stok Değeri
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatCurrency(
                          stokRapor.reduce((sum, k) => sum + k.toplamStokDegeri, 0),
                          'TRY'
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">toplam değer</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                        Kritik Stok
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-orange-600">
                        {stokRapor.reduce((sum, k) => sum + k.kritikStokUrunler, 0)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">ürün kritik seviyede</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Kategori Sayısı
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stokRapor.length}</div>
                      <p className="text-xs text-muted-foreground mt-1">farklı kategori</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Grafik */}
                <Card className="p-4">
                  <h3 className="text-sm font-medium mb-4">Kategori Bazlı Stok Değeri</h3>
                  <ChartContainer
                    config={{
                      deger: {
                        label: "Stok Değeri",
                        color: "hsl(var(--primary))",
                      },
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stokRapor}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="kategori" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar 
                          dataKey="toplamStokDegeri" 
                          fill="hsl(var(--primary))" 
                          radius={[8, 8, 0, 0]} 
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </Card>

                {/* Stok Tablosu */}
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kategori</TableHead>
                        <TableHead className="text-right">Ürün Sayısı</TableHead>
                        <TableHead className="text-right">Stok Değeri</TableHead>
                        <TableHead className="text-right">Kritik Stok</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stokRapor.map((kategori) => (
                        <TableRow key={kategori.kategori}>
                          <TableCell className="font-medium">{kategori.kategori}</TableCell>
                          <TableCell className="text-right">{kategori.toplamUrun}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(kategori.toplamStokDegeri, 'TRY')}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={cn(
                              "px-2 py-1 rounded-full text-xs",
                              kategori.kritikStokUrunler > 0 
                                ? "bg-orange-100 text-orange-800" 
                                : "bg-green-100 text-green-800"
                            )}>
                              {kategori.kritikStokUrunler}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* KAR/ZARAR ANALİZİ */}
          <TabsContent value="kar-zarar" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle>Kar/Zarar Analizi</CardTitle>
                    <CardDescription>Dönemsel karlılık raporu</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          Başlangıç
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                          mode="single"
                          selected={karZararBaslangic}
                          onSelect={(date) => date && setKarZararBaslangic(date)}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          Bitiş
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                          mode="single"
                          selected={karZararBitis}
                          onSelect={(date) => date && setKarZararBitis(date)}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <Button 
                      onClick={() => {
                        karZararExcelAktar(karZararRapor, karZararBaslangic, karZararBitis);
                        toast.success("Rapor Excel olarak indirildi");
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Excel İndir
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Özet Kartlar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                        Toplam Satış
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-yellow-600">
                        {formatCurrency(karZararRapor.toplamSatis, 'TRY')}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">gelir</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-red-500"></span>
                        Toplam Maliyet
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">
                        {formatCurrency(karZararRapor.toplamMaliyet, 'TRY')}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">gider</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                        Alınan Tahsilat
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">
                        {formatCurrency(karZararRapor.toplamTahsilat, 'TRY')}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">müşteri ödemeleri</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Brüt Kar
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={cn(
                        "text-2xl font-bold",
                        karZararRapor.brutKar >= 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {formatCurrency(karZararRapor.brutKar, 'TRY')}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">net kazanç</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Kar Marjı
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={cn(
                        "text-2xl font-bold",
                        karZararRapor.karMarji >= 0 ? "text-green-600" : "text-red-600"
                      )}>
                        %{karZararRapor.karMarji.toFixed(2)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">karlılık oranı</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Grafik */}
                <Card className="p-4">
                  <h3 className="text-sm font-medium mb-4">Satış vs Tahsilat vs Maliyet</h3>
                  <ChartContainer
                    config={{
                      satis: {
                        label: "Satış",
                        color: "hsl(48 96% 53%)",
                      },
                      tahsilat: {
                        label: "Tahsilat",
                        color: "hsl(217 91% 60%)",
                      },
                      maliyet: {
                        label: "Maliyet",
                        color: "hsl(0 84% 60%)",
                      },
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { 
                            name: 'Dönem Analizi', 
                            satis: karZararRapor.toplamSatis,
                            tahsilat: karZararRapor.toplamTahsilat,
                            maliyet: karZararRapor.toplamMaliyet 
                          }
                        ]}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Bar dataKey="satis" fill="hsl(48 96% 53%)" radius={[8, 8, 0, 0]} />
                        <Bar dataKey="tahsilat" fill="hsl(217 91% 60%)" radius={[8, 8, 0, 0]} />
                        <Bar dataKey="maliyet" fill="hsl(0 84% 60%)" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </Card>

                {/* Özet Bilgi */}
                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Dönem</p>
                        <p className="font-medium">
                          {format(karZararBaslangic, "PPP", { locale: tr })} - {format(karZararBitis, "PPP", { locale: tr })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Durum</p>
                        <p className={cn(
                          "font-semibold",
                          karZararRapor.brutKar >= 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {karZararRapor.brutKar >= 0 ? '✓ Karlı Dönem' : '✗ Zararlı Dönem'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
