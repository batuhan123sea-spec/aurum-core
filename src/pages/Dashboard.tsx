import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Package,
  Users,
  AlertTriangle,
  DollarSign,
  ShoppingCart,
} from "lucide-react";
import { getUrunler } from "@/lib/stok-data";
import { getMusteriler } from "@/lib/musteri-data";
import { getSatislar } from "@/lib/satis-data";
import { KATEGORILER } from "@/types/stok";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const allUrunler = getUrunler();
  const allMusteriler = getMusteriler();
  const allSatislar = getSatislar();
  
  // Müşteri hesaplamaları
  const aktifMusteriler = allMusteriler.filter(m => m.durumu === 'aktif');
  const borcluMusteriler = allMusteriler.filter(m => m.toplamBorcTL > 0);
  
  // Bugünkü satışlar
  const bugunBaslangic = new Date();
  bugunBaslangic.setHours(0, 0, 0, 0);
  
  const bugunkuSatislar = allSatislar
    .filter(s => {
      const satisTarih = new Date(s.tarih);
      return satisTarih >= bugunBaslangic && s.durum === 'tamamlandi' && !s.iptalEdildi;
    })
    .sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime());
  
  const bugunkuToplamSatis = bugunkuSatislar.reduce((toplam, satis) => 
    toplam + satis.genelToplam, 0
  );
  
  const kritikStoklar = allUrunler.filter(u => u.stokMiktari <= u.kritikStokSeviyesi);
  const dusukStoklar = allUrunler.filter(u => 
    u.stokMiktari > u.kritikStokSeviyesi && u.stokMiktari <= u.minStokSeviyesi
  );
  
  const stats = [
    {
      title: "Bugünkü Satışlar",
      value: `₺${bugunkuToplamSatis.toLocaleString('tr-TR')}`,
      change: `${bugunkuSatislar.length} işlem`,
      icon: ShoppingCart,
      color: "text-success",
    },
    {
      title: "Toplam Ürün",
      value: allUrunler.length.toString(),
      change: `${KATEGORILER.length} kategori`,
      icon: Package,
      color: "text-primary",
    },
    {
      title: "Aktif Müşteriler",
      value: aktifMusteriler.length.toString(),
      change: `${borcluMusteriler.length} borçlu`,
      icon: Users,
      color: "text-secondary",
    },
    {
      title: "Kritik Stok Uyarısı",
      value: kritikStoklar.length.toString(),
      change: dusukStoklar.length > 0 ? `+${dusukStoklar.length} düşük stok` : "Dikkat gerekli",
      icon: AlertTriangle,
      color: "text-destructive",
    },
  ];

  const recentSales = bugunkuSatislar.slice(0, 4).map(satis => {
    const musteri = allMusteriler.find(m => m.id === satis.musteriId);
    const urunler = satis.kalemler.map(k => k.urunAdi).join(', ');
    const zamanFarki = new Date().getTime() - new Date(satis.tarih).getTime();
    const dakika = Math.floor(zamanFarki / 60000);
    const saat = Math.floor(dakika / 60);
    
    let timeStr = '';
    if (saat > 0) {
      timeStr = `${saat} saat önce`;
    } else if (dakika > 0) {
      timeStr = `${dakika} dk önce`;
    } else {
      timeStr = 'Az önce';
    }
    
    return {
      customer: musteri?.adSoyad || 'Bilinmeyen Müşteri',
      product: urunler,
      amount: `₺${satis.genelToplam.toLocaleString('tr-TR')}`,
      time: timeStr
    };
  });

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Kuyumcu makine ve malzeme yönetim sisteminize hoş geldiniz</p>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={cn("w-5 h-5", stat.color)} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Son Satışlar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-success" />
              Bugünkü Satışlar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentSales.map((sale, index) => (
                <div key={index} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium text-foreground">{sale.customer}</p>
                    <p className="text-sm text-muted-foreground">{sale.product}</p>
                    <p className="text-xs text-muted-foreground mt-1">{sale.time}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-success">{sale.amount}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Kritik Stok Uyarıları */}
        <Card className={kritikStoklar.length > 0 ? "border-l-4 border-l-destructive" : ""}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className={kritikStoklar.length > 0 ? "w-5 h-5 text-destructive" : "w-5 h-5 text-warning"} />
                Stok Uyarıları
              </CardTitle>
              {(kritikStoklar.length > 0 || dusukStoklar.length > 0) && (
                <Button size="sm" onClick={() => navigate('/stok/uyarilar')}>
                  Tümünü Gör
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {kritikStoklar.length === 0 && dusukStoklar.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Tüm stoklar yeterli seviyede</p>
              </div>
            ) : (
              <div className="space-y-3">
                {kritikStoklar.slice(0, 3).map((urun) => (
                  <div key={urun.id} className="flex items-center justify-between border-b border-border pb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">{urun.ad}</p>
                        <Badge variant="destructive" className="text-xs">KRİTİK</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Min: {urun.minStokSeviyesi} {urun.birim} | Kritik: {urun.kritikStokSeviyesi} {urun.birim}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-destructive">{urun.stokMiktari} {urun.birim}</p>
                      <p className="text-xs text-muted-foreground">Mevcut</p>
                    </div>
                  </div>
                ))}
                {dusukStoklar.slice(0, 2).map((urun) => (
                  <div key={urun.id} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">{urun.ad}</p>
                        <Badge variant="outline" className="text-xs">DÜŞÜK</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Min: {urun.minStokSeviyesi} {urun.birim}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-warning">{urun.stokMiktari} {urun.birim}</p>
                      <p className="text-xs text-muted-foreground">Mevcut</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Hızlı İşlemler */}
      <Card>
        <CardHeader>
          <CardTitle>Hızlı İşlemler</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="p-4 border border-border rounded-lg hover:bg-accent hover:border-primary transition-all text-center group">
              <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium text-foreground">Yeni Satış</p>
            </button>
            <button className="p-4 border border-border rounded-lg hover:bg-accent hover:border-primary transition-all text-center group">
              <Package className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium text-foreground">Stok Giriş</p>
            </button>
            <button className="p-4 border border-border rounded-lg hover:bg-accent hover:border-primary transition-all text-center group">
              <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium text-foreground">Yeni Müşteri</p>
            </button>
            <button className="p-4 border border-border rounded-lg hover:bg-accent hover:border-primary transition-all text-center group">
              <DollarSign className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium text-foreground">Tahsilat</p>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}
