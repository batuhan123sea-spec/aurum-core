import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  Package,
  Users,
  AlertTriangle,
  DollarSign,
  ShoppingCart,
} from "lucide-react";

export default function Dashboard() {
  const stats = [
    {
      title: "Bugünkü Satışlar",
      value: "₺45,230",
      change: "+12.5%",
      icon: ShoppingCart,
      color: "text-success",
    },
    {
      title: "Toplam Ürün",
      value: "1,234",
      change: "+5 yeni",
      icon: Package,
      color: "text-primary",
    },
    {
      title: "Aktif Müşteriler",
      value: "892",
      change: "+23 bu ay",
      icon: Users,
      color: "text-secondary",
    },
    {
      title: "Düşük Stok Uyarısı",
      value: "12",
      change: "Dikkat gerekli",
      icon: AlertTriangle,
      color: "text-destructive",
    },
  ];

  const recentSales = [
    { customer: "Ahmet Yılmaz", product: "Cila Makinesi XL-200", amount: "₺8,500", time: "10 dk önce" },
    { customer: "Zeynep Demir", product: "Parlatma Tozu (5kg)", amount: "₺1,200", time: "25 dk önce" },
    { customer: "Mehmet Kaya", product: "Döküm Kalıbı Set", amount: "₺3,800", time: "1 saat önce" },
    { customer: "Ayşe Şahin", product: "Ölçüm Terazisi Digital", amount: "₺2,100", time: "2 saat önce" },
  ];

  const lowStockItems = [
    { name: "Parlatma Tozu Beyaz", stock: "2 kg", minStock: "10 kg" },
    { name: "Döküm Silikon", stock: "5 adet", minStock: "20 adet" },
    { name: "Cila Diski 200mm", stock: "8 adet", minStock: "25 adet" },
    { name: "Ölçüm Kalibratörü", stock: "1 adet", minStock: "5 adet" },
  ];

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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Kritik Stok Uyarıları
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lowStockItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium text-foreground">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Minimum: {item.minStock}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-destructive">{item.stock}</p>
                    <p className="text-xs text-muted-foreground">Mevcut Stok</p>
                  </div>
                </div>
              ))}
            </div>
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
