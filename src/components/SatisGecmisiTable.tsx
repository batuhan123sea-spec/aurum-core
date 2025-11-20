import { useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { ChevronDown } from "lucide-react";
import { getSatislar } from "@/lib/satis-data";
import { formatCurrency } from "@/lib/kur-hesaplama";

interface SatisGecmisiTableProps {
  musteriId: string;
}

export function SatisGecmisiTable({ musteriId }: SatisGecmisiTableProps) {
  const satislar = useMemo(() => {
    return getSatislar()
      .filter(s => s.musteriId === musteriId && s.durum === 'tamamlandi')
      .sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime());
  }, [musteriId]);

  if (satislar.length === 0) {
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
    <div className="space-y-2">
      {satislar.map((satis) => (
        <Collapsible key={satis.id}>
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="font-mono">{satis.satisNo}</Badge>
                <span className="text-sm text-muted-foreground">
                  {new Date(satis.tarih).toLocaleDateString('tr-TR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
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
  );
}
