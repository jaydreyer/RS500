import {
  ChartNoAxesColumn,
  Disc3,
  Grid3X3,
  Lightbulb,
  ListMusic,
  MessageSquareText,
  Users,
} from "lucide-react";

export const clubNavItems = [
  { href: "/pick", label: "My Pick", Icon: Disc3 },
  { href: "/board", label: "The Board", Icon: Grid3X3 },
  { href: "/feed", label: "The Feed", Icon: MessageSquareText },
  { href: "/catalog", label: "The 500", Icon: ListMusic },
  { href: "/groups", label: "Groups", Icon: Users },
  { href: "/history", label: "Reviews", Icon: MessageSquareText },
  { href: "/stats", label: "Stats", Icon: ChartNoAxesColumn },
  { href: "/feedback", label: "Ideas", Icon: Lightbulb },
] as const;

export type ClubNavItem = (typeof clubNavItems)[number];
