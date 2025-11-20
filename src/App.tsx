import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import StokUrunler from "./pages/StokUrunler";
import StokKategoriDetay from "./pages/StokKategoriDetay";
import YeniSatis from "./pages/YeniSatis";
import TedarikciListe from "./pages/TedarikciListe";
import TedarikciDetay from "./pages/TedarikciDetay";
import MusteriListe from "./pages/MusteriListe";
import MusteriDetay from "./pages/MusteriDetay";
import MusteriForm from "./components/MusteriForm";
import Raporlar from "./pages/Raporlar";
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
          <Route path="/stok/kategori/:kategoriId" element={<StokKategoriDetay />} />
          <Route path="/satis/yeni" element={<YeniSatis />} />
          <Route path="/tedarikci/liste" element={<TedarikciListe />} />
          <Route path="/tedarikci/detay/:tedarikciId" element={<TedarikciDetay />} />
          <Route path="/raporlar" element={<Raporlar />} />
          <Route path="/ayarlar" element={<div>Ayarlar sayfası yakında...</div>} />
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
