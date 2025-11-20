import { useState, useEffect } from "react";
import { LogOut, User, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { tcmbKurCek, marjEkle } from "@/lib/kur-api";
import { kurlarıKaydet, getGuncelKurlar } from "@/lib/kur-hesaplama";

export const Header = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [exchangeRates, setExchangeRates] = useState({
    usd: 32.50,
    eur: 35.20,
  });
  const [kurGuncelleniyor, setKurGuncelleniyor] = useState(false);
  const [sonGuncelleme, setSonGuncelleme] = useState<Date | null>(null);

  // Canlı saat güncelleme
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Kurları güncelleme fonksiyonu
  const kurGuncelle = async () => {
    setKurGuncelleniyor(true);
    
    try {
      console.log('Kurlar güncelleniyor...');
      
      // TCMB'den kur çek
      const tcmbKurlar = await tcmbKurCek();
      
      if (tcmbKurlar) {
        // %1.5 marj ekle (piyasa satış kurlarına daha yakın)
        const marjliKurlar = marjEkle(tcmbKurlar, 1.5);
        
        // State'i güncelle
        setExchangeRates({
          usd: marjliKurlar.usd,
          eur: marjliKurlar.eur
        });
        
        // localStorage'a kaydet (tüm sistemde kullanılmak üzere)
        kurlarıKaydet(marjliKurlar.usd, marjliKurlar.eur);
        
        setSonGuncelleme(new Date());
        
        toast.success('Döviz kurları güncellendi', {
          description: `USD: ${marjliKurlar.usd.toFixed(2)} ₺ | EUR: ${marjliKurlar.eur.toFixed(2)} ₺`
        });
        
        console.log('Kurlar başarıyla güncellendi:', marjliKurlar);
      } else {
        throw new Error('Kur bilgisi alınamadı');
      }
    } catch (error) {
      console.error('Kur güncelleme hatası:', error);
      
      // Hata durumunda localStorage'dan son kurları kullan
      const storedKurlar = getGuncelKurlar();
      setExchangeRates({
        usd: storedKurlar.usd,
        eur: storedKurlar.eur
      });
      
      toast.error('Kur güncellenemedi', {
        description: 'Son kaydedilen kurlar kullanılıyor'
      });
    } finally {
      setKurGuncelleniyor(false);
    }
  };

  // İlk yüklemede ve 5 dakikada bir otomatik güncelleme
  useEffect(() => {
    // İlk yüklemede localStorage'dan kurları al
    const storedKurlar = getGuncelKurlar();
    setExchangeRates({
      usd: storedKurlar.usd,
      eur: storedKurlar.eur
    });
    
    // İlk yüklemede güncel kurları çek
    kurGuncelle();

    // 5 dakikada bir otomatik güncelle
    const timer = setInterval(kurGuncelle, 300000); // 5 dakika
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
          
          <Button
            variant="ghost"
            size="sm"
            onClick={kurGuncelle}
            disabled={kurGuncelleniyor}
            className="h-8 w-8 p-0 hover:bg-header-foreground/10"
            title="Kurları Güncelle"
          >
            <RefreshCw className={`w-4 h-4 ${kurGuncelleniyor ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        {sonGuncelleme && (
          <div className="text-xs opacity-50">
            Son güncelleme: {formatTime(sonGuncelleme)}
          </div>
        )}
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
