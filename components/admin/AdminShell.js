"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, ShieldCheck } from "lucide-react";
import Logo from "@/components/site/Logo";

export default function AdminShell({ adminEmail, children }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-navy-950/[0.02]">
      <header className="h-16 navy-gradient text-white flex items-center justify-between px-4 sm:px-8">
        <div className="flex items-center gap-6">
          <Link href="/admin">
            <Logo dark className="text-lg" />
          </Link>
          <span className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-white/10 text-orange-300">
            <ShieldCheck className="w-3.5 h-3.5" /> Admin
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="hidden sm:block text-white/60">{adminEmail}</span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10"
          >
            <LogOut className="w-4 h-4" /> Log out
          </button>
        </div>
      </header>
      <main className="p-4 sm:p-8">{children}</main>
    </div>
  );
}
