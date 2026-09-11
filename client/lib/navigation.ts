import { BarChart3, ClipboardList, HardHat, LayoutDashboard, Search, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { UserRole } from "@/lib/api/types";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: UserRole[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["TECHNICIAN", "SUPERVISOR", "ADMIN"],
  },
  {
    href: "/search",
    label: "Search",
    icon: Search,
    roles: ["TECHNICIAN", "SUPERVISOR", "ADMIN"],
  },
  {
    href: "/surveys",
    label: "Surveys",
    icon: ClipboardList,
    roles: ["TECHNICIAN", "SUPERVISOR", "ADMIN"],
  },
  {
    href: "/technicians",
    label: "Technicians",
    icon: HardHat,
    roles: ["SUPERVISOR", "ADMIN"],
  },
  {
    href: "/reports",
    label: "Reports",
    icon: BarChart3,
    roles: ["SUPERVISOR", "ADMIN"],
  },
  {
    href: "/admin/users",
    label: "Users",
    icon: Users,
    roles: ["ADMIN"],
  },
];

export function navItemsForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}