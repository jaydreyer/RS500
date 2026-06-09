import {
  ChartNoAxesColumn,
  Disc3,
  Grid3X3,
  History,
  ListMusic,
} from "lucide-react";

export const clubNavItems = [
  { href: "/week", label: "My Week", Icon: Disc3 },
  { href: "/board", label: "The Board", Icon: Grid3X3 },
  { href: "/catalog", label: "The 500", Icon: ListMusic },
  { href: "/history", label: "History", Icon: History },
  { href: "/stats", label: "Stats", Icon: ChartNoAxesColumn },
] as const;
