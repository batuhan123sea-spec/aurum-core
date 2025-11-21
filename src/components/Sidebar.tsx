import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Building2,
  BarChart3,
  Settings,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MenuItem {
  title: string;
  icon: React.ElementType;
  path: string;
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
    path: "/stok/urunler",
  },
  {
    title: "Yeni Satış",
    icon: ShoppingCart,
    path: "/satis/yeni",
  },
  {
    title: "Rezervasyonlar",
    icon: ClipboardList,
    path: "/satis/rezervler",
  },
  {
    title: "Müşteri İşlemleri",
    icon: Users,
    path: "/musteri/liste",
  },
  {
    title: "Tedarikçiler",
    icon: Building2,
    path: "/tedarikci/liste",
  },
  {
    title: "Raporlama",
    icon: BarChart3,
    path: "/raporlar",
  },
  {
    title: "Ayarlar",
    icon: Settings,
    path: "/ayarlar",
  },
];

export const Sidebar = () => {
  return (
    <aside className="w-[250px] bg-sidebar border-r border-sidebar-border h-[calc(100vh-60px)] overflow-y-auto">
      <nav className="py-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end
              className="flex items-center gap-3 px-4 py-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
              activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm">{item.title}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
};
