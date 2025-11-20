import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { migrateOldData } from "@/lib/musteri-data";

// Uygulama başlangıcında eski verileri yeni yapıya dönüştür
migrateOldData();

createRoot(document.getElementById("root")!).render(<App />);
