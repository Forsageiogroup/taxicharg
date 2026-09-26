"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, ChevronDown } from "lucide-react";
import Logo from "./Logo";

const supportLinks = [
  { href: "/support/contact", label: "Contact" },
  { href: "/support/receipt-search", label: "Receipt search" },
  { href: "/support/referral", label: "Referral program" },
  { href: "/about", label: "About" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-navy-950/95 backdrop-blur border-b border-white/10 text-white">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="shrink-0">
          <Logo dark className="text-lg sm:text-xl" />
        </Link>

        <div className="hidden lg:flex items-center gap-8 text-sm font-medium text-white/85">
          <Link href="/eftpos" className="hover:text-green-400 transition-colors">
            Taxi EFTPOS machine
          </Link>
          <Link href="/driver-card" className="hover:text-green-400 transition-colors">
            TaxiCharg Driver Card
          </Link>
          <div
            className="relative"
            onMouseEnter={() => setSupportOpen(true)}
            onMouseLeave={() => setSupportOpen(false)}
          >
            <button className="flex items-center gap-1 hover:text-green-400 transition-colors">
              Services &amp; support <ChevronDown className="w-4 h-4" />
            </button>
            {supportOpen && (
              <div className="absolute left-0 top-full pt-2 w-56">
                <div className="rounded-xl bg-white card-shadow border border-navy-900/5 py-2">
                  {supportLinks.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      className="block px-4 py-2 text-navy-700 hover:bg-green-50 hover:text-green-600"
                    >
                      {l.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-semibold text-white/90 hover:text-green-400 transition-colors"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="px-5 py-2.5 rounded-full text-sm font-semibold text-white brand-gradient hover:opacity-90 transition-opacity"
          >
            Sign up
          </Link>
        </div>

        <button
          className="lg:hidden p-2 text-white"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {open && (
        <div className="lg:hidden border-t border-white/10 bg-navy-950 px-4 pb-4 pt-2 space-y-1">
          <Link href="/eftpos" className="block py-2 text-white/90 font-medium">
            Taxi EFTPOS machine
          </Link>
          <Link href="/driver-card" className="block py-2 text-white/90 font-medium">
            TaxiCharg Driver Card
          </Link>
          {supportLinks.map((l) => (
            <Link key={l.href} href={l.href} className="block py-2 pl-3 text-white/70">
              {l.label}
            </Link>
          ))}
          <div className="flex gap-3 pt-3">
            <Link
              href="/login"
              className="flex-1 text-center px-4 py-2 rounded-full border border-white/20 font-semibold text-white"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="flex-1 text-center px-4 py-2 rounded-full font-semibold text-white brand-gradient"
            >
              Sign up
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
