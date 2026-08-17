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
  WalletCards,
  FileBarChart2
} from "lucide-react";
import type { ViewKey } from "../types/navigation";
import type { UserRole } from "@smeta/shared";

export const navigationItems = [
  { key: "dashboard", label: "Boshqaruv", icon: LayoutDashboard, roles: ["admin", "finance", "superadmin"] },
  { key: "customer", label: "Mijoz so'rovi", icon: FilePlus2, roles: ["customer", "dealer", "admin", "superadmin"] },
  { key: "admin", label: "Admin navbati", icon: ClipboardList, roles: ["admin", "superadmin"] },
  { key: "store", label: "Do'kon takliflari", icon: Store, roles: ["store", "admin", "superadmin"] },
  { key: "selection", label: "Mijoz tanlovi", icon: ShoppingBag, roles: ["customer", "admin", "superadmin"] },
  { key: "orders", label: "Buyurtmalar", icon: PackageCheck, roles: ["customer", "dealer", "store", "admin", "finance", "superadmin"] },
  { key: "dealer", label: "Ustalar", icon: UserRoundCheck, roles: ["dealer", "admin", "superadmin"] },
  { key: "finance", label: "Moliya", icon: WalletCards, roles: ["finance", "admin", "superadmin"] },
  { key: "reports", label: "Hisobotlar", icon: FileBarChart2, roles: ["admin", "finance", "superadmin"] },
  { key: "security", label: "Xavfsizlik", icon: ShieldCheck, roles: ["superadmin"] },
  { key: "notifications", label: "Bildirishnomalar", icon: BellRing, roles: ["dealer", "store", "admin", "finance", "superadmin"] }
] satisfies Array<{ key: ViewKey; label: string; icon: typeof LayoutDashboard; roles: UserRole[] }>;
