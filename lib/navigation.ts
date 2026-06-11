import {
  ChartNoAxesColumn,
  Disc3,
  Grid3X3,
  History,
  ListMusic,
  Users,
} from "lucide-react";

export const clubNavItems = [
  { href: "/week", label: "My Pick", Icon: Disc3 },
  { href: "/board", label: "The Board", Icon: Grid3X3 },
  { href: "/catalog", label: "The 500", Icon: ListMusic },
  { href: "/groups", label: "Groups", Icon: Users },
  { href: "/history", label: "History", Icon: History },
  { href: "/stats", label: "Stats", Icon: ChartNoAxesColumn },
] as const;
