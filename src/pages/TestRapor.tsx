import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { tumTestleriCalistir } from '@/lib/test-runner';
import { PlayCircle, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export default function TestRapor() {
  const [testleriyor, setTestleriyor] = useState(false);
  const [sonuclar, setSonuclar] = useState<any[]>([]);

  const testleriBaslat = async () => {
    setTestleriyor(true);
    setSonuclar([]);
    
    const results = await tumTestleriCalistir();
    setSonuclar(results);
    setTestleriyor(false);
  };

  const basariliSayisi = sonuclar.filter(s => s.durum === 'BAŞARILI').length;
  const basarisizSayisi = sonuclar.filter(s => s.durum === 'BAŞARISIZ').length;
  const uyariSayisi = sonuclar.filter(s => s.durum === 'UYARI').length;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Test Raporu</h1>
            <p className="text-muted-foreground">
              Finansal işlemler için otomatik test sistemi
            </p>
          </div>
          <Button onClick={testleriBaslat} disabled={testleriyor} size="lg">
            <PlayCircle className="mr-2 h-5 w-5" />
            {testleriyor ? 'Testler Çalışıyor...' : 'Testleri Başlat'}
          </Button>
        </div>

        {sonuclar.length > 0 && (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Toplam Test</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{sonuclar.length}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Başarılı</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{basariliSayisi}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Başarısız</CardTitle>
                  <XCircle className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{basarisizSayisi}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Uyarı</CardTitle>
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{uyariSayisi}</div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              {sonuclar.map((sonuc) => (
                <Card key={sonuc.testNo}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        TEST {sonuc.testNo}: {sonuc.testAdi}
                      </CardTitle>
                      <Badge variant={
                        sonuc.durum === 'BAŞARILI' ? 'default' : 
                        sonuc.durum === 'UYARI' ? 'secondary' : 
                        'destructive'
                      }>
                        {sonuc.durum === 'BAŞARILI' && <CheckCircle2 className="mr-1 h-3 w-3" />}
                        {sonuc.durum === 'BAŞARISIZ' && <XCircle className="mr-1 h-3 w-3" />}
                        {sonuc.durum === 'UYARI' && <AlertCircle className="mr-1 h-3 w-3" />}
                        {sonuc.durum}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-4">{sonuc.detay}</p>
                    
                    {sonuc.hatalar.length > 0 && (
                      <div className="mb-4 p-3 bg-destructive/10 rounded-md">
                        <h4 className="font-semibold text-sm mb-2">Hatalar:</h4>
                        {sonuc.hatalar.map((hata: string, i: number) => (
                          <p key={i} className="text-xs text-destructive">{hata}</p>
                        ))}
                      </div>
                    )}
                    
                    <Separator className="my-3" />
                    
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Konsol Çıktısı:</h4>
                      <ScrollArea className="h-[200px] w-full rounded-md border p-3">
                        <div className="space-y-1">
                          {sonuc.konsol.map((log: string, i: number) => (
                            <p key={i} className="text-xs font-mono">{log}</p>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {sonuclar.length === 0 && !testleriyor && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <PlayCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Testleri başlatmak için yukarıdaki butona tıklayın
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
