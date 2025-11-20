import { useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { hesapEkstresiniHesapla } from "@/lib/musteri-data";
import { formatCurrency } from "@/lib/kur-hesaplama";
import { HesapHareketi } from "@/types/musteri";

interface HesapEkstresiTableProps {
  musteriId: string;
  filter?: 'tum' | 'satis' | 'odeme';
}

const HesapEkstresiTable = ({ musteriId, filter = 'tum' }: HesapEkstresiTableProps) => {
  const hareketler = useMemo(() => {
    let allHareketler = hesapEkstresiniHesapla(musteriId);
    
    if (filter !== 'tum') {
      allHareketler = allHareketler.filter(h => h.islemTuru === filter);
    }
    
    return allHareketler;
  }, [musteriId, filter]);

  const getIslemTuruBadge = (islemTuru: HesapHareketi['islemTuru']) => {
    const variants = {
      satis: { variant: 'destructive' as const, label: 'Satış' },
      odeme: { variant: 'default' as const, label: 'Ödeme' },
      iade: { variant: 'secondary' as const, label: 'İade' },
    };
    
    const config = variants[islemTuru];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getParaBirimiBadge = (paraBirimi: string) => {
    const colors: Record<string, string> = {
      TRY: 'bg-blue-100 text-blue-800',
      USD: 'bg-green-100 text-green-800',
      EUR: 'bg-purple-100 text-purple-800',
    };
    
    return (
      <Badge className={colors[paraBirimi] || ''}>
        {paraBirimi}
      </Badge>
    );
  };

  if (hareketler.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Henüz işlem kaydı bulunmuyor.
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tarih/Saat</TableHead>
            <TableHead>İşlem Türü</TableHead>
            <TableHead>Açıklama</TableHead>
            <TableHead>Para Birimi</TableHead>
            <TableHead className="text-right">Tutar</TableHead>
            <TableHead className="text-right">Kur</TableHead>
            <TableHead className="text-right">TL Karşılığı</TableHead>
            <TableHead className="text-right">Bakiye</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {hareketler.map((hareket) => {
            const tarih = new Date(hareket.tarih);
            const isBorc = hareket.islemTuru === 'satis';
            
            return (
              <TableRow key={hareket.id}>
                <TableCell className="font-mono text-sm">
                  {tarih.toLocaleDateString('tr-TR')}
                  <br />
                  <span className="text-muted-foreground text-xs">
                    {tarih.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </TableCell>
                <TableCell>{getIslemTuruBadge(hareket.islemTuru)}</TableCell>
                <TableCell className="max-w-[200px]">
                  <div className="truncate">{hareket.aciklama}</div>
                  {hareket.odemeTuru && (
                    <span className="text-xs text-muted-foreground">
                      {hareket.odemeTuru}
                    </span>
                  )}
                </TableCell>
                <TableCell>{getParaBirimiBadge(hareket.paraBirimi)}</TableCell>
                <TableCell className={`text-right font-semibold ${isBorc ? 'text-destructive' : 'text-green-600'}`}>
                  {isBorc ? '+' : '-'}{formatCurrency(hareket.tutar, hareket.paraBirimi)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {hareket.kur.toFixed(2)}
                </TableCell>
                <TableCell className={`text-right font-semibold ${isBorc ? 'text-destructive' : 'text-green-600'}`}>
                  {isBorc ? '+' : '-'}{formatCurrency(hareket.tlKarsiligi, 'TRY')}
                </TableCell>
                <TableCell className="text-right font-bold">
                  {formatCurrency(hareket.bakiye, 'TRY')}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default HesapEkstresiTable;
