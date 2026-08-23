"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Calendar, ChevronDown } from "lucide-react";

export default function DateRangePicker({ from, to }) {
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(from);
  const [draftTo, setDraftTo] = useState(to);
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

  function apply() {
    setOpen(false);
    router.push(`${pathname}?from=${draftFrom}&to=${draftTo}`);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white brand-gradient hover:opacity-90"
      >
        <Calendar className="w-4 h-4" />
        {from} &mdash; {to}
        <ChevronDown className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white card-shadow border border-navy-900/5 p-4 z-20 space-y-3">
          <div>
            <label className="block text-xs font-medium text-navy-500 mb-1">From</label>
            <input
              type="date"
              value={draftFrom}
              onChange={(e) => setDraftFrom(e.target.value)}
              className="w-full rounded-lg border border-navy-900/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-navy-500 mb-1">To</label>
            <input
              type="date"
              value={draftTo}
              onChange={(e) => setDraftTo(e.target.value)}
              className="w-full rounded-lg border border-navy-900/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <button
            onClick={apply}
            className="w-full px-4 py-2 rounded-full text-sm font-semibold text-white brand-gradient hover:opacity-90"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
