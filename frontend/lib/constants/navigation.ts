import {
  LayoutDashboard,
  QrCode,
  Settings,
  Pill,
  Bot,
  FileText,
  Bell,
  Package,
  BarChart3,
  Boxes,
} from "lucide-react";
import { NavGroup } from "@/components/layout/sidebar-content";

export const CUSTOMER_NAV_GROUPS: NavGroup[] = [
  {
    label: "Main",
    items: [
      {
        label: "Overview",
        href: "/customer",
        icon: LayoutDashboard,
      },
      {
        label: "My Medicines",
        href: "/customer/cabinet",
        icon: Pill,
      },
      {
        label: "Prescriptions",
        href: "/customer/prescriptions",
        icon: FileText,
      },
      {
        label: "AI Agent",
        href: "/customer/agent",
        icon: Bot,
      },
      {
        label: "Verify Product",
        href: "/verify",
        icon: QrCode,
      },
    ],
  },
  {
    label: "Account",
    items: [
      {
        label: "Notifications",
        href: "/customer/notifications",
        icon: Bell,
      },
      {
        label: "Settings",
        href: "/customer/settings",
        icon: Settings,
      },
    ],
  },
];

export const MANUFACTURER_NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/manufacturer",
        icon: LayoutDashboard,
      },
      {
        label: "Analytics",
        href: "/manufacturer/analytics",
        icon: BarChart3,
      },
      {
        label: "AI Agent",
        href: "/manufacturer/agent",
        icon: Bot,
      },
      {
        label: "Verify Product",
        href: "/verify",
        icon: QrCode,
      },
    ],
  },
  {
    label: "Inventory & Production",
    items: [
      {
        label: "Products",
        href: "/manufacturer/products",
        icon: Package,
      },
      {
        label: "Batches",
        href: "/manufacturer/batches",
        icon: Boxes,
      },
    ],
  },
  {
    label: "Account",
    items: [
      {
        label: "Notifications",
        href: "/manufacturer/notifications",
        icon: Bell,
      },
      {
        label: "Settings",
        href: "/manufacturer/settings",
        icon: Settings,
      },
    ],
  },
];
