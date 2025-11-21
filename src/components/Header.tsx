import { useState, useEffect } from "react";
import { LogOut, User, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { bigParaKurCek } from "@/lib/kur-api";
import { kurlarıKaydet, getGuncelKurlar, getKurYasi, formatKurYasi, getKurDurumu } from "@/lib/kur-hesaplama";
import { tumMusteriBorclariniGuncelle } from "@/lib/musteri-data";
import { getAyarlar } from "@/lib/ayarlar-data";
export const Header = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [exchangeRates, setExchangeRates] = useState({
    usd: 32.50,
    eur: 35.20
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
      console.log('BigPara\'dan gerçek piyasa kurları çekiliyor...');
      const kurlar = await bigParaKurCek();
      if (kurlar) {
        setExchangeRates({
          usd: kurlar.usd,
          eur: kurlar.eur
        });
        kurlarıKaydet(kurlar.usd, kurlar.eur);
        tumMusteriBorclariniGuncelle();
        setSonGuncelleme(new Date());
        toast.success('Piyasa kurları güncellendi', {
          description: `USD: ${kurlar.usd.toFixed(2)} ₺ | EUR: ${kurlar.eur.toFixed(2)} ₺ (BigPara)`
        });
      } else {
        throw new Error('BigPara\'dan kur alınamadı');
      }
    } catch (error) {
      console.error('Kur güncelleme hatası:', error);
      const ayarlar = getAyarlar();
      const manuelKurlar = ayarlar.paraBirimi.manuelKurlar;
      setExchangeRates({
        usd: manuelKurlar.usd,
        eur: manuelKurlar.eur
      });
      kurlarıKaydet(manuelKurlar.usd, manuelKurlar.eur);
      toast.warning('BigPara\'dan kur alınamadı', {
        description: 'Ayarlardaki manuel kurlar kullanılıyor'
      });
    } finally {
      setKurGuncelleniyor(false);
    }
  };

  // İlk yüklemede kurları yükle
  useEffect(() => {
    const storedKurlar = getGuncelKurlar();
    setExchangeRates({
      usd: storedKurlar.usd,
      eur: storedKurlar.eur
    });
    setSonGuncelleme(new Date(storedKurlar.guncellemeTarihi));
    kurGuncelle();
  }, []);

  // Otomatik kur güncelleme (ayarlara göre)
  useEffect(() => {
    const ayarlar = getAyarlar();
    if (ayarlar.paraBirimi.otomatikKurGuncelleme) {
      const intervalMs = ayarlar.paraBirimi.kurGuncellemeSikligi * 60 * 1000;
      const interval = setInterval(() => {
        console.log('Otomatik kur güncelleme çalışıyor...');
        kurGuncelle();
      }, intervalMs);
      return () => clearInterval(interval);
    }
  }, []);
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  };
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  };
  return <header className="h-[60px] bg-header border-b border-header-foreground/10 px-6 flex items-center justify-between">
      {/* Sol: Logo */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-lg">K</span>
        </div>
        <h1 className="text-header-foreground text-left font-serif text-base font-medium">Suphi Ticaret </h1>
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
          
          <Button variant="ghost" size="sm" onClick={kurGuncelle} disabled={kurGuncelleniyor} className="h-8 w-8 p-0 hover:bg-header-foreground/10" title="Kurları Güncelle">
            <RefreshCw className={`w-4 h-4 ${kurGuncelleniyor ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        {sonGuncelleme && <KurYasiGosterge sonGuncelleme={sonGuncelleme} />}
      </div>

      {/* Sağ: Kullanıcı */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-header-foreground">
          <User className="w-5 h-5" />
          <span className="text-sm font-medium">Admin Kullanıcı</span>
        </div>
        <Button variant="outline" size="sm" className="border-header-foreground/20 text-header-foreground hover:bg-header-foreground/10">
          <LogOut className="w-4 h-4 mr-2" />
          Çıkış
        </Button>
      </div>
    </header>;
};

// Kur yaşı gösterge komponenti
const KurYasiGosterge = ({
  sonGuncelleme
}: {
  sonGuncelleme: Date;
}) => {
  const [kurYasi, setKurYasi] = useState(0);
  useEffect(() => {
    const updateYas = () => {
      setKurYasi(getKurYasi());
    };
    updateYas();
    const interval = setInterval(updateYas, 30000); // 30 saniyede bir güncelle

    return () => clearInterval(interval);
  }, [sonGuncelleme]);
  const durum = getKurDurumu(kurYasi);
  const emoji = durum === 'yeni' ? '🟢' : durum === 'eski' ? '🟡' : '🔴';
  const uyari = durum === 'eski' ? ' (ESKİ)' : durum === 'cok-eski' ? ' (ÇOK ESKİ!)' : '';
  return <div className={`text-xs ${durum === 'yeni' ? 'opacity-50' : 'opacity-100 font-medium'}`}>
      {emoji} {formatKurYasi(kurYasi)}{uyari}
    </div>;
};