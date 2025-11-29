import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowUp, ArrowDown, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { getHareketlerByMusteriId } from "@/lib/musteri-data";
import { formatCurrency } from "@/lib/kur-hesaplama";
import { HesapHareketi } from "@/types/musteri";

interface MusteriBorcTimelineProps {
  musteriId: string;
}

const MusteriBorcTimeline = ({ musteriId }: MusteriBorcTimelineProps) => {
  const hareketler = getHareketlerByMusteriId(musteriId);
  
  // Kronolojik sıralama (en eski üstte)
  const sortedHareketler = [...hareketler].sort(
    (a, b) => new Date(a.tarih).getTime() - new Date(b.tarih).getTime()
  );
  
  const getIslemIcon = (islemTuru: HesapHareketi['islemTuru']) => {
    switch(islemTuru) {
      case 'satis': return <ArrowUp className="w-5 h-5 text-red-500" />;
      case 'odeme': return <ArrowDown className="w-5 h-5 text-green-500" />;
      case 'iade': return <RefreshCw className="w-5 h-5 text-slate-500" />;
    }
  };
  
  const getIslemColor = (islemTuru: HesapHareketi['islemTuru']) => {
    switch(islemTuru) {
      case 'satis': return 'border-red-300 bg-red-50';
      case 'odeme': return 'border-green-300 bg-green-50';
      case 'iade': return 'border-slate-300 bg-slate-50';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Borç Geçmişi Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sortedHareketler.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Henüz işlem kaydı bulunmuyor
          </p>
        ) : (
          <div className="relative">
            {/* Dikey çizgi */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
            
            {/* Timeline items */}
            <div className="space-y-8">
              {sortedHareketler.map((hareket, index) => {
                const tarih = new Date(hareket.tarih);
                const isBorc = hareket.islemTuru === 'satis';
                
                return (
                  <div key={hareket.id} className="relative pl-16">
                    {/* Timeline nokta */}
                    <div className="absolute left-3 top-1 w-6 h-6 rounded-full bg-background border-2 border-primary flex items-center justify-center z-10">
                      {getIslemIcon(hareket.islemTuru)}
                    </div>
                    
                    {/* İşlem kartı */}
                    <Card className={`${getIslemColor(hareket.islemTuru)} border-2`}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <Badge variant={isBorc ? 'destructive' : 'default'} className="mb-2">
                              {hareket.islemTuru === 'satis' ? 'Satış' :
                               hareket.islemTuru === 'odeme' ? 'Ödeme' : 'İade'}
                            </Badge>
                            <p className="text-sm text-muted-foreground">
                              {tarih.toLocaleDateString('tr-TR', { 
                                day: 'numeric', 
                                month: 'long', 
                                year: 'numeric' 
                              })}
                              <span className="ml-2">
                                {tarih.toLocaleTimeString('tr-TR', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </span>
                            </p>
                          </div>
                          
                          <div className="text-right">
                            <p className={`text-2xl font-bold ${isBorc ? 'text-red-600' : 'text-green-600'}`}>
                              {isBorc ? '+' : '-'}{formatCurrency(hareket.tutar, hareket.paraBirimi)}
                            </p>
                          </div>
                        </div>
                        
                        <Separator className="my-3" />
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Açıklama</p>
                            <p className="font-medium">{hareket.aciklama}</p>
                          </div>
                          
                          <div>
                            <p className="text-muted-foreground">Para Birimi</p>
                            <Badge variant="outline">{hareket.paraBirimi}</Badge>
                          </div>
                          
                          <div>
                            <p className="text-muted-foreground">İşlem Anı Kuru</p>
                            <p className="font-mono font-bold text-primary">
                              {hareket.kur.toFixed(4)} TL
                            </p>
                          </div>
                          
                          <div>
                            <p className="text-muted-foreground">TL Karşılığı</p>
                            <p className="font-semibold">
                              {formatCurrency(hareket.tlKarsiligi, 'TRY')}
                            </p>
                          </div>
                          
                          {hareket.odemeTuru && (
                            <>
                              <div>
                                <p className="text-muted-foreground">Ödeme Yöntemi</p>
                                <Badge variant="secondary" className="capitalize">
                                  {hareket.odemeTuru === 'kredi-karti' ? 'Kredi Kartı' :
                                   hareket.odemeTuru === 'eft' ? 'EFT' :
                                   hareket.odemeTuru === 'havale' ? 'Havale' : 'Nakit'}
                                </Badge>
                              </div>
                            </>
                          )}
                          
                          <div>
                            <p className="text-muted-foreground">Bakiye (İşlem Sonrası)</p>
                            <p className="text-lg font-bold">
                              {formatCurrency(hareket.bakiye, 'TRY')}
                            </p>
                          </div>
                        </div>
                        
                        {/* Kur karşılaştırma */}
                        {index < sortedHareketler.length - 1 && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {sortedHareketler[index + 1].kur > hareket.kur ? (
                                <>
                                  <TrendingUp className="w-3 h-3 text-red-500" />
                                  <span>Sonraki işlemde kur yükseldi</span>
                                </>
                              ) : sortedHareketler[index + 1].kur < hareket.kur ? (
                                <>
                                  <TrendingDown className="w-3 h-3 text-green-500" />
                                  <span>Sonraki işlemde kur düştü</span>
                                </>
                              ) : (
                                <span>Kur değişmedi</span>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MusteriBorcTimeline;
