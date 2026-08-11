import {
  ClipboardList,
  BellRing,
  FilePlus2,
  LayoutDashboard,
  PackageCheck,
  ShieldCheck,
  Store,
  ShoppingBag,
  UserRoundCheck,
  WalletCards
} from "lucide-react";
import type { ViewKey } from "../types/navigation";

export const navigationItems = [
  { key: "dashboard", label: "Boshqaruv", icon: LayoutDashboard },
  { key: "customer", label: "Mijoz so'rovi", icon: FilePlus2 },
  { key: "admin", label: "Admin navbati", icon: ClipboardList },
  { key: "store", label: "Do'kon takliflari", icon: Store },
  { key: "selection", label: "Mijoz tanlovi", icon: ShoppingBag },
  { key: "orders", label: "Buyurtmalar", icon: PackageCheck },
  { key: "dealer", label: "Ustalar", icon: UserRoundCheck },
  { key: "finance", label: "Moliya", icon: WalletCards },
  { key: "security", label: "Xavfsizlik", icon: ShieldCheck },
  { key: "notifications", label: "Bildirishnomalar", icon: BellRing }
] satisfies Array<{ key: ViewKey; label: string; icon: typeof LayoutDashboard }>;
