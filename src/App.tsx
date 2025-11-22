import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Index from "./pages/Index";
import StokUrunler from "./pages/StokUrunler";
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
import TestRapor from "./pages/TestRapor";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/stok/urunler" element={<ProtectedRoute><StokUrunler /></ProtectedRoute>} />
            <Route path="/stok/kategori/:kategoriId" element={<ProtectedRoute><StokKategoriDetay /></ProtectedRoute>} />
            <Route path="/stok/urun/:urunId" element={<ProtectedRoute><UrunDetay /></ProtectedRoute>} />
            <Route path="/stok/uyarilar" element={<ProtectedRoute><StokUyarilar /></ProtectedRoute>} />
            <Route path="/satis/yeni" element={<ProtectedRoute><YeniSatis /></ProtectedRoute>} />
            <Route path="/satis/rezervler" element={<ProtectedRoute><RezervListe /></ProtectedRoute>} />
            <Route path="/tedarikci/liste" element={<ProtectedRoute><TedarikciListe /></ProtectedRoute>} />
            <Route path="/tedarikci/detay/:tedarikciId" element={<ProtectedRoute><TedarikciDetay /></ProtectedRoute>} />
            <Route path="/raporlar" element={<ProtectedRoute><Raporlar /></ProtectedRoute>} />
            <Route path="/ayarlar" element={<ProtectedRoute><Ayarlar /></ProtectedRoute>} />
            <Route path="/musteri/liste" element={<ProtectedRoute><MusteriListe /></ProtectedRoute>} />
            <Route path="/musteri/detay/:musteriId" element={<ProtectedRoute><MusteriDetay /></ProtectedRoute>} />
            <Route path="/musteri/yeni" element={<ProtectedRoute><MusteriForm /></ProtectedRoute>} />
            <Route path="/musteri/duzenle/:musteriId" element={<ProtectedRoute><MusteriForm /></ProtectedRoute>} />
            <Route path="/test-rapor" element={<ProtectedRoute><TestRapor /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
