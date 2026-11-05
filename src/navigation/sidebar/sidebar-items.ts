import {
  BriefcaseBusiness,
  CalendarDays,
  FileText,
  LayoutDashboard,
  type LucideIcon,
  MessageCircle,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";

export type NavBadge = "new" | "updated" | "soon";

export interface NavSubItem {
  id: string;
  title: string;
  url: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

interface NavItemBase {
  id: string;
  title: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

export interface NavMainLinkItem extends NavItemBase {
  url: string;
  subItems?: never;
}

export interface NavMainParentItem extends NavItemBase {
  subItems: NavSubItem[];
}

export type NavMainItem = NavMainLinkItem | NavMainParentItem;

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Winglo workspace",
    items: [
      { id: "default", title: "Overview", url: "/dashboard/default", icon: LayoutDashboard },
      { id: "demo", title: "Interactive Demo", url: "/dashboard/demo", icon: Sparkles },
      { id: "jobs", title: "Jobs", url: "/dashboard/jobs", icon: BriefcaseBusiness },
      { id: "enquiries", title: "Enquiries / Inbox", url: "/dashboard/enquiries", icon: MessageCircle },
      { id: "quotations", title: "Quotations", url: "/dashboard/quotations", icon: FileText },
      { id: "bookings", title: "Bookings", url: "/dashboard/bookings", icon: CalendarDays },
      { id: "customers", title: "Customers", url: "/dashboard/customers", icon: Users },
      { id: "settings", title: "Settings", url: "/dashboard/settings", icon: Settings },
    ],
  },
];
