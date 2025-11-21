import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import StokUrunler from "./pages/StokUrunler";
import StokHareketler from "./pages/StokHareketler";
import StokKategoriDetay from "./pages/StokKategoriDetay";
import UrunDetay from "./pages/UrunDetay";
import StokUyarilar from "./pages/StokUyarilar";
import YeniSatis from "./pages/YeniSatis";
import RezervListe from "./pages/RezervListe";
import TedarikciListe from "./pages/TedarikciListe";
import TedarikciDetay from "./pages/TedarikciDetay";
import MusteriListe from "./pages/MusteriListe";
import MusteriDetay from "./pages/MusteriDetay";
import MusteriForm from "./components/MusteriForm";
import Raporlar from "./pages/Raporlar";
import Ayarlar from "./pages/Ayarlar";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/stok/urunler" element={<StokUrunler />} />
          <Route path="/stok/hareketler" element={<StokHareketler />} />
          <Route path="/stok/kategori/:kategoriId" element={<StokKategoriDetay />} />
          <Route path="/stok/urun/:urunId" element={<UrunDetay />} />
          <Route path="/stok/uyarilar" element={<StokUyarilar />} />
          <Route path="/satis/yeni" element={<YeniSatis />} />
          <Route path="/satis/rezervler" element={<RezervListe />} />
          <Route path="/tedarikci/liste" element={<TedarikciListe />} />
          <Route path="/tedarikci/detay/:tedarikciId" element={<TedarikciDetay />} />
          <Route path="/raporlar" element={<Raporlar />} />
          <Route path="/ayarlar" element={<Ayarlar />} />
          <Route path="/musteri/liste" element={<MusteriListe />} />
          <Route path="/musteri/detay/:musteriId" element={<MusteriDetay />} />
          <Route path="/musteri/yeni" element={<MusteriForm />} />
          <Route path="/musteri/duzenle/:musteriId" element={<MusteriForm />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
