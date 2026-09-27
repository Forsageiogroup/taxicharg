"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * The sticky sub-menu (27 Sept): a slim white bar that slides in under the
 * header once the hero has scrolled away, with the page's sections and a
 * Sign up button that is always in reach - as on payadvantage.com.au.
 *
 *   <SubNav title="Taxi EFTPOS machine" items={[{ href: "#why", label: "Why TaxiCharg" }]} />
 *
 * On the home page the current section is underlined as you pass it.
 */
export default function SubNav({ title, items = [], cta = { href: "/signup", label: "Sign up" } }) {
  const [shown, setShown] = useState(false);
  const [active, setActive] = useState("");

  useEffect(() => {
    const onScroll = () => setShown(window.scrollY > 420);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const ids = items.map((i) => i.href).filter((h) => h.startsWith("#")).map((h) => h.slice(1));
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean);
    if (!els.length || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (hit) setActive("#" + hit.target.id);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0, 0.2, 0.5] }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [items]);

  return (
    <div
      className={`tc-subnav sticky top-[68px] z-40 bg-white/95 backdrop-blur border-b border-navy-900/8 ${shown ? "tc-subnav-in" : ""}`}
      aria-hidden={!shown}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6 min-w-0 overflow-x-auto">
          {title && <span className="text-sm font-bold text-navy-900 whitespace-nowrap">{title}</span>}
          {items.map((i) => (
            <a
              key={i.href}
              href={i.href}
              className={`hidden sm:inline-block text-sm font-medium whitespace-nowrap border-b-2 py-3 transition-colors ${
                active === i.href ? "border-green-500 text-navy-900" : "border-transparent text-navy-600 hover:text-navy-900"
              }`}
            >
              {i.label}
            </a>
          ))}
        </div>
        <Link
          href={cta.href}
          tabIndex={shown ? 0 : -1}
          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold text-navy-deep brand-gradient"
        >
          {cta.label} <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
