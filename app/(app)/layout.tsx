import type { ReactNode } from "react";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardTopbar } from "@/components/dashboard/topbar";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1680px] flex-col gap-4 p-3 md:flex-row md:p-4 lg:gap-5">
        <DashboardSidebar />
        <div className="flex min-h-screen flex-1 flex-col overflow-hidden rounded-[2rem] border border-white/70 bg-white/75 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <DashboardTopbar />
          <main className="flex-1 p-4 sm:p-5 lg:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
