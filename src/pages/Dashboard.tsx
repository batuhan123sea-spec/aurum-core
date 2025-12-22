import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  TrendingUp,
  Package,
  Users,
  AlertTriangle,
  ShoppingCart,
  Bell,
  Plus,
  Trash2,
} from "lucide-react";
import { getUrunler } from "@/lib/stok-data";
import { getMusteriler } from "@/lib/musteri-data";
import { getSatislar } from "@/lib/satis-data";
import { getReminders, addReminder, toggleReminder, deleteReminder } from "@/lib/reminder-data";
import { Reminder } from "@/types/reminder";
import { KATEGORILER } from "@/types/stok";
import { useNavigate } from "react-router-dom";

// Basit bildirim sesi (base64 encoded beep)
const NOTIFICATION_SOUND = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleVMdAh5O97HXhU8nBwAIIUFfr+LbvqV1TjQxNTxbg6zV69bCpIFjSUI8Oj1LZ4q1z9LGqnxQKAQACB5JdKXM0cqyhVMqEBEeNl+Cq8jHxLCNaDUREBIkQGKJsb7Cva2TbUgqFQ8RJEJihJ2sr6yfiXBRNiIUDhAXLUpngJyvsLGnl31gRjMlGRQSGSdCXn2ao7W9urGjlX5oVEE0LCIYFRUWIT5YdZOjtL7BuKyfkH1sXU49MiokHxwaHSY8VW+NoquztrGomot8b2FUME4vIx8cGBoeK0Nhf5elpayso5qRg3RoXE9FOC4kHBUYHSc6WHaPo6uvraadkoR2a2BYTUQzJRkaFxgcJzlSeY2corGxr6aYiXdqYFhOQzgqHhcXFRcdJjtTfZGfqq6ppZqPgHJmXlZOQjgpHBcWFRcdJz1WgZSgrKqnopeLfW9kXFRMQTgpHRcWFRceKkBahpilqKahm5KEd2tiWlNKQDcoHRYVFRYdKEJciJqjpaKdlo+CdWphWlRLQjgpHhYVFRYdKURgjp6lpaGenJOGd2pfWVNKQTkpHhYVFRYeK0hklKKnpqGbl4+Bem9lX1lRSkE6Kh8WFRUXHC1KZpiipqSfl5KNgXZtZV5ZUko/OSofFhUVFx0uT2ubpaWin5iRi393bGRdV1BIPjgpHxYVFRcdL1Bvnqeln5qWj4l8dWtiW1ZPSD04Kh8WFRUXHi9TcqCnoZ2Yk4+He3JpYVpVTUY9OCofFhUVFx4wU3OioJ2ZlJCMhHpxaGBZU0xFPDgqHxYVFRceMVV2op+bl5ORi4N4b2dfWFNLRDw3Kh8WFRUXHjFWebCmnZmVkY2Gen9yZ15WUElDOzcpHhUVFRYeLll6sqWblpKPi4Z+c2hfV1BMQzo2KB4VFRUWHS9ae7OjmZWSj4uFfXJoXlZPSUE5NigeVRUVFhwvW3y0opqVko6JhHtyZ15VT0hBODYoHRUVFRYcL1x9taKalZKNh4J5cGZdU01HQDc1Jx0VFRUWGy5dfbenm5aRi4WAdWtjW1VMRD41NSccFRUVFRsvYIC4o5eTjoqDfXRrYVtUTkQ9NDQmHBUVFBQaLmGAuaSXko2IgXp0amBaUkxDPDI0JhsVFRQUGi5ggbqkl5KMh4F6c2lfWVFLQjsyMyYbFRUUFBotYIK7pZiTjIeAeXJoXlhQSUE6MTMlGxUVFBMaLWCDvKeZlIyHf3hxZ11XUEhAOTAzJRsVFRQTGSxfhL2nmZOMhn54cGZcVk9HQDgwMiUaFBUUExgsYIW+qJqUjIZ9d3BlXFZORkA3MDIlGhQVFBMYK2CHv6mblo2Gfnd0ZlxWTkU/Ny8yJBoUFRQSGCphhsCqm5aNhn12c2VbVU1FPjYvMiQaFBUUEhcqYIjBq5yXjYV9dXJkWlRMRD02LzEkGhQVFBIXKl+JwqyclY2FfHRxZFlTS0M9NSsvJBoUFRQSFylficKsnJWNhXx0cGNZUktDPDUtLyQaFBUUEhcpXorDrZ2WjoV8c29iWFFKQjw0LS4kGRQVFBIXKV6LxK6el46EenJuYVdQSUE7NC0uJBkUFRQSFylejcSvn5ePhHpxbWBXUEhAOjQsLiQZFBUUEhYoXo7Fr6CYkIN6cGxfVk9HQDkzLC0jGRQVFBIWKF6PxrChmJGDeW5rXlVOR0A5MywtIxkUFRQSFihekcexoZmRgnlta11VTkZAODMrLSMZFBUUEhYnXZLIsqKZkYJ4bGpcVU5GQDgzKy0jGRQVFBIWJlyTybOjmpKCd2tpW1VNRj83Myssp";

export default function Dashboard() {
  const navigate = useNavigate();
  const allUrunler = getUrunler();
  const allMusteriler = getMusteriler();
  const allSatislar = getSatislar();
  
  // Hatırlatıcı state'leri
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [yeniReminder, setYeniReminder] = useState("");
  const [titremeAktif, setTitremeAktif] = useState(false);
  
  // Hatırlatıcıları yükle
  useEffect(() => {
    setReminders(getReminders());
  }, []);
  
  // Saatte bir titreme + ses
  const triggerNotification = useCallback(() => {
    const tamamlanmamisVar = reminders.some(r => !r.tamamlandi);
    if (tamamlanmamisVar) {
      setTitremeAktif(true);
      try {
        const audio = new Audio(NOTIFICATION_SOUND);
        audio.volume = 0.5;
        audio.play().catch(() => {});
      } catch {}
      setTimeout(() => setTitremeAktif(false), 2000);
    }
  }, [reminders]);
  
  useEffect(() => {
    // İlk yüklemede 3 saniye sonra kontrol et (test için)
    const initialTimeout = setTimeout(triggerNotification, 3000);
    
    // Saatte bir kontrol
    const interval = setInterval(triggerNotification, 60 * 60 * 1000);
    
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [triggerNotification]);
  
  const handleReminderEkle = () => {
    if (!yeniReminder.trim()) return;
    const yeni = addReminder(yeniReminder.trim());
    setReminders([yeni, ...reminders]);
    setYeniReminder("");
  };
  
  const handleReminderToggle = (id: string) => {
    const updated = toggleReminder(id);
    setReminders(updated);
  };
  
  const handleReminderSil = (id: string) => {
    const updated = deleteReminder(id);
    setReminders(updated);
  };
  
  const tamamlanmamisSayisi = reminders.filter(r => !r.tamamlandi).length;
  
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
              {recentSales.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Bugün henüz satış yok</p>
              ) : (
                recentSales.map((sale, index) => (
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
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Hatırlatıcılar */}
        <Card className={cn(
          "transition-all duration-300",
          titremeAktif && "animate-shake border-2 border-warning shadow-lg shadow-warning/20"
        )}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className={cn("w-5 h-5", titremeAktif ? "text-warning animate-pulse" : "text-warning")} />
              Hatırlatıcılar
              {tamamlanmamisSayisi > 0 && (
                <Badge variant="destructive" className="ml-auto">{tamamlanmamisSayisi}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Yeni hatırlatıcı ekleme */}
            <div className="flex gap-2 mb-4">
              <Input 
                placeholder="Yeni hatırlatıcı ekle..." 
                value={yeniReminder}
                onChange={(e) => setYeniReminder(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleReminderEkle()}
                className="flex-1"
              />
              <Button onClick={handleReminderEkle} size="icon">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Hatırlatıcı listesi */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {reminders.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Henüz hatırlatıcı yok</p>
              ) : (
                reminders.map((reminder) => (
                  <div 
                    key={reminder.id} 
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border transition-all",
                      reminder.tamamlandi 
                        ? "bg-muted/50 opacity-60" 
                        : "bg-card hover:bg-accent/50"
                    )}
                  >
                    <Checkbox 
                      checked={reminder.tamamlandi}
                      onCheckedChange={() => handleReminderToggle(reminder.id)}
                    />
                    <span className={cn(
                      "flex-1 text-sm",
                      reminder.tamamlandi && "line-through text-muted-foreground"
                    )}>
                      {reminder.icerik}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleReminderSil(reminder.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

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
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
