import { BarChart3, ClipboardList, HardHat, History, LayoutDashboard, Network, Search, Settings2, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { UserRole } from "@/lib/api/types";

/** Groups keep the administrator's nine entries readable instead of one long list. */
export type NavGroup = "Workspace" | "Oversight" | "Administration";

const GROUP_ORDER: NavGroup[] = ["Workspace", "Oversight", "Administration"];

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  group: NavGroup;
  roles: UserRole[];
}

export interface NavSection {
  group: NavGroup;
  items: NavItem[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    group: "Workspace",
    roles: ["TECHNICIAN", "SUPERVISOR", "ADMIN"],
  },
  {
    href: "/search",
    label: "Search",
    icon: Search,
    group: "Workspace",
    roles: ["TECHNICIAN", "SUPERVISOR", "ADMIN"],
  },
  {
    href: "/surveys",
    label: "Surveys",
    icon: ClipboardList,
    group: "Workspace",
    roles: ["TECHNICIAN", "SUPERVISOR", "ADMIN"],
  },
  {
    href: "/technicians",
    label: "Technicians",
    icon: HardHat,
    group: "Oversight",
    roles: ["SUPERVISOR", "ADMIN"],
  },
  {
    href: "/reports",
    label: "Reports",
    icon: BarChart3,
    group: "Oversight",
    roles: ["SUPERVISOR", "ADMIN"],
  },
  {
    href: "/admin/network",
    label: "Network",
    icon: Network,
    group: "Administration",
    roles: ["ADMIN"],
  },
  {
    href: "/admin/users",
    label: "Users",
    icon: Users,
    group: "Administration",
    roles: ["ADMIN"],
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: Settings2,
    group: "Administration",
    roles: ["ADMIN"],
  },
  {
    href: "/admin/activity",
    label: "Activity log",
    icon: History,
    group: "Administration",
    roles: ["ADMIN"],
  },
];

export function navItemsForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

/** Only groups that have at least one entry for this role, in a stable order. */
export function navSectionsForRole(role: UserRole): NavSection[] {
  const visible = navItemsForRole(role);

  return GROUP_ORDER.map((group) => ({
    group,
    items: visible.filter((item) => item.group === group),
  })).filter((section) => section.items.length > 0);
}