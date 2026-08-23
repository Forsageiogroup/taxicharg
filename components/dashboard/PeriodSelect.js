"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";

const OPTIONS = [
  { value: "30d", label: "Last 30 days" },
  { value: "month", label: "This month" },
  { value: "year", label: "This year" },
];

export default function PeriodSelect({ value }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const ref = useRef(null);

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const current = OPTIONS.find((o) => o.value === value) || OPTIONS[1];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white brand-gradient hover:opacity-90"
      >
        {current.label} <ChevronDown className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-44 rounded-xl bg-white card-shadow border border-navy-900/5 py-1.5 z-20">
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => {
                setOpen(false);
                router.push(`${pathname}?period=${o.value}`);
              }}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-orange-50 hover:text-orange-600 ${
                o.value === value ? "text-orange-600 font-semibold" : "text-navy-700"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
