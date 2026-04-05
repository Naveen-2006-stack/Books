"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { BookOpenText, Boxes, ChartNoAxesCombined, ContactRound, FileText, Landmark, ReceiptText } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
};

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: ChartNoAxesCombined },
  { label: "Contacts", href: "/contacts", icon: ContactRound },
  { label: "Items", href: "/items", icon: Boxes },
  { label: "Sales", href: "/sales", icon: FileText },
  { label: "Purchases", href: "/purchases", icon: ReceiptText },
  { label: "Accounting", href: "/accounting", icon: BookOpenText },
  { label: "Reports", href: "/reports", icon: Landmark },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full rounded-[2rem] border border-white/70 bg-white/75 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl md:sticky md:top-4 md:w-72 md:self-start">
      <div className="flex h-20 items-center gap-3 border-b border-slate-200/80 bg-gradient-to-r from-slate-950 to-slate-800 px-5 text-white rounded-t-[2rem]">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-sm font-bold text-white ring-1 ring-white/20 shadow-lg shadow-teal-950/20">
          AB
        </div>
        <div>
          <p className="text-sm font-semibold tracking-wide text-white">Acme Books</p>
          <p className="text-xs text-slate-300">Command center for modern bookkeeping</p>
        </div>
      </div>
      <nav className="grid grid-cols-2 gap-2 p-3 md:grid-cols-1">
        {navItems.map(({ href, icon: Icon, label }) => (
          <Link
            key={label}
            href={href}
            className={cn(
              "group relative flex items-center gap-3 overflow-hidden rounded-2xl px-4 py-3 text-sm font-medium text-slate-600 transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-950/5 hover:text-slate-950",
              pathname === href &&
                "bg-gradient-to-r from-slate-950 to-slate-800 text-white shadow-[0_14px_30px_rgba(15,23,42,0.22)] hover:bg-gradient-to-r hover:from-slate-950 hover:to-slate-800 hover:text-white",
            )}
          >
            <span className={cn("absolute inset-y-0 left-0 w-1 rounded-r-full bg-transparent transition-colors duration-300", pathname === href && "bg-amber-400")} />
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
