import { useState } from "react";
import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Building2,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MenuItem {
  title: string;
  icon: React.ElementType;
  path: string;
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    path: "/",
  },
  {
    title: "Stok Yönetimi",
    icon: Package,
    path: "/stok",
    children: [
      { title: "Tüm Ürünler", icon: Package, path: "/stok/urunler" },
      { title: "Kategoriler", icon: Package, path: "/stok/kategoriler" },
      { title: "Stok Girişi", icon: Package, path: "/stok/giris" },
      { title: "Stok Sayımı", icon: Package, path: "/stok/sayim" },
      { title: "Stok Uyarıları", icon: Package, path: "/stok/uyarilar" },
    ],
  },
  {
    title: "Satış İşlemleri",
    icon: ShoppingCart,
    path: "/satis",
    children: [
      { title: "Yeni Satış", icon: ShoppingCart, path: "/satis/yeni" },
      { title: "Rezervasyonlar", icon: ShoppingCart, path: "/satis/rezervasyonlar" },
      { title: "Satış Geçmişi", icon: ShoppingCart, path: "/satis/gecmis" },
      { title: "İade İşlemleri", icon: ShoppingCart, path: "/satis/iade" },
    ],
  },
  {
    title: "Müşteri İşlemleri",
    icon: Users,
    path: "/musteri",
    children: [
      { title: "Müşteri Listesi", icon: Users, path: "/musteri/liste" },
      { title: "Borç Takibi", icon: Users, path: "/musteri/borc" },
      { title: "İç Borçlular", icon: Users, path: "/musteri/ic-borc" },
      { title: "Dış Borçlular", icon: Users, path: "/musteri/dis-borc" },
    ],
  },
  {
    title: "Tedarikçiler",
    icon: Building2,
    path: "/tedarikci",
    children: [
      { title: "Tedarikçi Listesi", icon: Building2, path: "/tedarikci/liste" },
      { title: "Alım Geçmişi", icon: Building2, path: "/tedarikci/alim" },
      { title: "Tedarikçi Ekstreleri", icon: Building2, path: "/tedarikci/ekstre" },
    ],
  },
  {
    title: "Raporlama",
    icon: BarChart3,
    path: "/rapor",
    children: [
      { title: "Günlük Satış Raporu", icon: BarChart3, path: "/rapor/gunluk" },
      { title: "Müşteri Borç Raporu", icon: BarChart3, path: "/rapor/borc" },
      { title: "Stok Durum Raporu", icon: BarChart3, path: "/rapor/stok" },
      { title: "Kar/Zarar Analizi", icon: BarChart3, path: "/rapor/kar-zarar" },
    ],
  },
  {
    title: "Ayarlar",
    icon: Settings,
    path: "/ayarlar",
    children: [
      { title: "Firma Bilgileri", icon: Settings, path: "/ayarlar/firma" },
      { title: "Fiş Ayarları", icon: Settings, path: "/ayarlar/fis" },
      { title: "Kullanıcılar", icon: Settings, path: "/ayarlar/kullanicilar" },
      { title: "Sistem Ayarları", icon: Settings, path: "/ayarlar/sistem" },
    ],
  },
];

export const Sidebar = () => {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpand = (path: string) => {
    setExpandedItems((prev) =>
      prev.includes(path)
        ? prev.filter((item) => item !== path)
        : [...prev, path]
    );
  };

  const renderMenuItem = (item: MenuItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.path);
    const Icon = item.icon;

    if (hasChildren) {
      return (
        <div key={item.path}>
          <button
            onClick={() => toggleExpand(item.path)}
            className={cn(
              "w-full flex items-center justify-between px-4 py-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors",
              level > 0 && "pl-8"
            )}
          >
            <div className="flex items-center gap-3">
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.title}</span>
            </div>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          {isExpanded && (
            <div className="bg-sidebar-accent/30">
              {item.children?.map((child) => renderMenuItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <NavLink
        key={item.path}
        to={item.path}
        end
        className={cn(
          "flex items-center gap-3 px-4 py-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors",
          level > 0 && "pl-12"
        )}
        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
      >
        <Icon className="w-5 h-5" />
        <span className="text-sm">{item.title}</span>
      </NavLink>
    );
  };

  return (
    <aside className="w-[250px] bg-sidebar border-r border-sidebar-border h-[calc(100vh-60px)] overflow-y-auto">
      <nav className="py-4">
        {menuItems.map((item) => renderMenuItem(item))}
      </nav>
    </aside>
  );
};
