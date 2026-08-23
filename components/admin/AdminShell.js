"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutGrid,
  Receipt,
  ClipboardCheck,
  ShieldAlert,
  Users,
  Car,
  Settings,
  LogOut,
  Menu,
  X,
  ShieldCheck,
} from "lucide-react";
import Logo from "@/components/site/Logo";

const NAV = [
  {
    section: "Operations",
    items: [
      { href: "/admin", label: "Overview", icon: LayoutGrid, exact: true },
      { href: "/admin/payments", label: "Payments", icon: Receipt },
      { href: "/admin/payment-issues", label: "Payment issues", icon: ShieldAlert },
      { href: "/admin/reconciliation", label: "Reconciliation", icon: ClipboardCheck },
    ],
  },
  {
    section: "Fleet",
    items: [
      { href: "/admin/drivers", label: "Drivers", icon: Users },
      { href: "/admin/vehicles", label: "Vehicles & terminals", icon: Car },
    ],
  },
  {
    section: "System",
    items: [{ href: "/admin/settings", label: "Settings & status", icon: Settings }],
  },
];

export default function AdminShell({ adminEmail, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const NavList = ({ onNavigate }) => (
    <nav className="flex-1 px-3 space-y-6">
      {NAV.map((group) => (
        <div key={group.section}>
          <p className="px-3 mb-1.5 text-[11px] font-bold tracking-wider text-white/35 uppercase">
            {group.section}
          </p>
          <div className="space-y-1">
            {group.items.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-white/10 text-white"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <item.icon className="w-4.5 h-4.5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  const Footer = () => (
    <div className="px-3">
      <button
        onClick={handleLogout}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/5"
      >
        <LogOut className="w-4.5 h-4.5" />
        Log out
      </button>
      <div className="mt-3 px-3 py-3 border-t border-white/10 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full brand-gradient flex items-center justify-center text-white text-xs font-bold shrink-0">
          A
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">TaxiCharg Admin</p>
          <p className="text-xs text-white/40 truncate">{adminEmail}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-navy-950/[0.02]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 navy-gradient text-white shrink-0">
        <div className="h-16 flex items-center gap-3 px-6 border-b border-white/10">
          <Link href="/admin">
            <Logo dark className="text-lg" />
          </Link>
          <span className="flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-full bg-white/10 text-orange-300">
            <ShieldCheck className="w-3.5 h-3.5" /> Admin
          </span>
        </div>
        <div className="py-6 flex flex-col flex-1 min-h-0">
          <NavList onNavigate={() => {}} />
          <div className="mt-4">
            <Footer />
          </div>
        </div>
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 navy-gradient text-white flex flex-col">
            <div className="h-16 flex items-center justify-between px-6 border-b border-white/10">
              <Logo dark className="text-lg" />
              <button onClick={() => setMobileOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="py-6 flex flex-col flex-1 min-h-0">
              <NavList onNavigate={() => setMobileOpen(false)} />
              <div className="mt-4">
                <Footer />
              </div>
            </div>
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-navy-900/5 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-30">
          <button className="lg:hidden p-2 -ml-2" onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5 text-navy-800" />
          </button>
          <div className="hidden lg:block">
            <p className="text-sm text-navy-400">Signed in as</p>
            <p className="font-semibold text-navy-900">{adminEmail}</p>
          </div>
          <div className="lg:hidden">
            <Logo className="text-lg" />
          </div>
          <div className="hidden lg:block text-xs text-navy-400">
            {new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
