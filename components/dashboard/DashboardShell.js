"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutGrid,
  Receipt,
  BarChart3,
  Wallet,
  Landmark,
  UserCircle,
  HelpCircle,
  LogOut,
  Menu,
  X,
  CreditCard,
  ScanLine,
} from "lucide-react";
import Logo from "@/components/site/Logo";
import IdleTimeout from "./IdleTimeout";
import SessionWatcher from "./SessionWatcher";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutGrid, exact: true },
  {
    label: "Payments",
    icon: Receipt,
    children: [
      { href: "/dashboard/payments/transactions", label: "Transactions" },
      { href: "/dashboard/payments/settlements", label: "Settlements" },
    ],
  },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
  { href: "/dashboard/withdraw", label: "Withdraw funds", icon: Wallet },
  { href: "/dashboard/payout-account", label: "Payout account", icon: Landmark },
  { href: "/dashboard/scan", label: "Scan shift report", icon: ScanLine },   // tc-0019: takings by QR
  { href: "/dashboard/profile", label: "Profile", icon: UserCircle },
  { href: "/dashboard/help", label: "Help", icon: HelpCircle },
];

// tc-0016: the TaxiCharg card terminal (S710) side - his card fares, a report and Cash out.
const CARD_GROUP = {
  label: "Card payments",
  icon: CreditCard,
  children: [
    { href: "/dashboard/card/transactions", label: "Transactions" },
    { href: "/dashboard/card/reports", label: "Report" },
    { href: "/dashboard/card/cashout", label: "Cash out" },
  ],
};

export default function DashboardShell({ driver, cloverAvailable, cardSide = false, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const initials = driver.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // tc-0013: Payments, Reports and Withdraw funds are the Clover side - shown only
  // while a Clover terminal is his. The payout account is always there (drivers
  // open it before they are given an S710).
  const CLOVER_ONLY = new Set(["Payments", "Reports", "Withdraw funds"]);
  const clover = Boolean(driver.view?.clover);
  // tc-0016: an S710 driver (or one with money in his payout account) gets the full card menu too;
  // with both terminals both sides show, each named for its terminal
  const nav = [];
  for (const item of NAV) {
    if (CLOVER_ONLY.has(item.label) && !clover) continue;
    if (item.label === "Scan shift report" && !clover && !driver.view?.stripe) continue;   // tc-0019: a terminal user only
    if (item.label === "Payments" && cardSide) nav.push({ ...item, label: "Clover payments" });
    else if (item.label === "Reports" && cardSide) nav.push({ ...item, label: "Clover report" });
    else if (item.label === "Withdraw funds" && cardSide) nav.push({ ...item, label: "Clover withdraw" });
    else nav.push(item);
    if (item.exact && cardSide) nav.push(CARD_GROUP);   // right after Overview
  }

  const NavList = ({ onNavigate }) => (
    <nav className="flex-1 px-3 space-y-1">
      {nav.map((item) => {
        if (item.children) {
          const groupActive = item.children.some((c) => pathname.startsWith(c.href));
          return (
            <div key={item.label} className="pt-1">
              <div
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  groupActive ? "text-white" : "text-white/60"
                }`}
              >
                <item.icon className="w-4.5 h-4.5 shrink-0" />
                <span>{item.label}</span>
              </div>
              <div className="ml-6 border-l border-white/10 pl-4 space-y-1 mb-1">
                {item.children.map((c) => {
                  const active = pathname.startsWith(c.href);
                  return (
                    <Link
                      key={c.href}
                      href={c.href}
                      onClick={onNavigate}
                      className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        active
                          ? "bg-white/10 text-white"
                          : "text-white/50 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {c.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        }

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
    </nav>
  );

  return (
    <div className="min-h-screen flex bg-navy-950/[0.02]">
      <IdleTimeout />
      <SessionWatcher />
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 navy-gradient text-white shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-white/10">
          <Link href="/">
            <Logo dark className="text-lg" />
          </Link>
        </div>
        <div className="py-6 flex flex-col flex-1">
          <NavList onNavigate={() => {}} />
          <div className="px-3 mt-4">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/5"
            >
              <LogOut className="w-4.5 h-4.5" />
              Log out
            </button>
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
            <div className="py-6 flex flex-col flex-1">
              <NavList onNavigate={() => setMobileOpen(false)} />
              <div className="px-3 mt-4">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/5"
                >
                  <LogOut className="w-4.5 h-4.5" />
                  Log out
                </button>
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
            <p className="text-sm text-navy-400">Welcome back,</p>
            <p className="font-semibold text-navy-900">{driver.name}</p>
          </div>
          <div className="flex items-center gap-4">
            {/* tc-0013: the Clover balance only, and only while a Clover terminal is his */}
            {driver.view?.clover && typeof cloverAvailable === "number" && (
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs text-navy-400">Clover balance</span>
                <span className="font-bold text-navy-900">
                  {new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(cloverAvailable)}
                </span>
              </div>
            )}
            <div className="w-10 h-10 rounded-full brand-gradient flex items-center justify-center text-white text-sm font-bold">
              {initials}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
