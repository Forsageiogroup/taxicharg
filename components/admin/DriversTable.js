"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import StatusPill from "@/components/dashboard/StatusPill";

const currency = (n) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);

export default function DriversTable({ drivers }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return drivers.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.email.toLowerCase().includes(q) ||
        d.plate.toLowerCase().includes(q)
    );
  }, [drivers, query]);

  return (
    <div className="rounded-2xl bg-white border border-navy-900/5 card-shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-navy-900/5">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search drivers..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-navy-900/10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-navy-400 border-b border-navy-900/5">
              <th className="px-6 py-3 font-medium">Driver</th>
              <th className="px-6 py-3 font-medium">Fleet</th>
              <th className="px-6 py-3 font-medium">Plate</th>
              <th className="px-6 py-3 font-medium">Balance</th>
              <th className="px-6 py-3 font-medium">Clover</th>
              <th className="px-6 py-3 font-medium">Stripe</th>
              <th className="px-6 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.id} className="border-b border-navy-900/5 last:border-0 hover:bg-navy-950/[0.015]">
                <td className="px-6 py-3.5">
                  <Link href={`/admin/drivers/${d.id}`} className="font-semibold text-navy-900 hover:text-orange-600">
                    {d.name}
                  </Link>
                  <p className="text-xs text-navy-400">{d.email}</p>
                </td>
                <td className="px-6 py-3.5 text-navy-600">{d.fleet}</td>
                <td className="px-6 py-3.5 text-navy-600">{d.plate}</td>
                <td className="px-6 py-3.5 font-semibold text-navy-900">{currency(d.balance)}</td>
                <td className="px-6 py-3.5">
                  <StatusPill status={d.connections.clover.connected ? "connected" : "disconnected"} />
                </td>
                <td className="px-6 py-3.5">
                  <StatusPill status={d.connections.stripe.connected ? "connected" : "disconnected"} />
                </td>
                <td className="px-6 py-3.5">
                  <StatusPill status={d.status} />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-navy-400">
                  No drivers match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
