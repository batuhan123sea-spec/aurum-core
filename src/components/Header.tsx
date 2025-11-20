import { useState, useEffect } from "react";
import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Header = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [exchangeRates, setExchangeRates] = useState({
    usd: 32.50,
    eur: 35.20,
  });

  // Canlı saat güncelleme
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Döviz kurları güncelleme (5 dakikada bir)
  useEffect(() => {
    const updateExchangeRates = () => {
      // Gerçek API entegrasyonu için buraya kod eklenecek
      // Şimdilik simüle ediyoruz
      setExchangeRates({
        usd: 32.50 + (Math.random() - 0.5) * 0.5,
        eur: 35.20 + (Math.random() - 0.5) * 0.5,
      });
    };

    const timer = setInterval(updateExchangeRates, 300000); // 5 dakika
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <header className="h-[60px] bg-header border-b border-header-foreground/10 px-6 flex items-center justify-between">
      {/* Sol: Logo */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-lg">K</span>
        </div>
        <h1 className="text-header-foreground font-semibold text-lg">
          Kuyumcu Makine Malzeme
        </h1>
      </div>

      {/* Orta: Canlı Veriler */}
      <div className="flex items-center gap-6 text-header-foreground">
        <div className="flex items-center gap-2">
          <span className="text-sm opacity-70">Saat:</span>
          <span className="font-mono text-base font-semibold">
            {formatTime(currentTime)}
          </span>
        </div>
        
        <div className="h-6 w-px bg-header-foreground/20" />
        
        <div className="flex items-center gap-2">
          <span className="text-sm opacity-70">Tarih:</span>
          <span className="font-mono text-base font-semibold">
            {formatDate(currentTime)}
          </span>
        </div>
        
        <div className="h-6 w-px bg-header-foreground/20" />
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm opacity-70">USD/TRY:</span>
            <span className="font-mono text-base font-semibold text-primary">
              {exchangeRates.usd.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm opacity-70">EUR/TRY:</span>
            <span className="font-mono text-base font-semibold text-primary">
              {exchangeRates.eur.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Sağ: Kullanıcı */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-header-foreground">
          <User className="w-5 h-5" />
          <span className="text-sm font-medium">Admin Kullanıcı</span>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          className="border-header-foreground/20 text-header-foreground hover:bg-header-foreground/10"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Çıkış
        </Button>
      </div>
    </header>
  );
};
