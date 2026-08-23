"use client";

import { PROVIDERS } from "@/lib/terminalProviders";

/**
 * Provider select + (when "Other" is chosen) a free-text company name +
 * merchant reference — shared between NewVehicleForm and EditTerminalModal
 * so the two stay in sync.
 *
 * `value` is always the actual provider name to store (e.g. "Tyro"), even
 * when it's a custom one not in PROVIDERS — the select shows "Other" in
 * that case and the text input underneath carries the real value.
 */
export default function TerminalProviderFields({ provider, merchantRef, onChange }) {
  const isKnown = PROVIDERS.slice(0, -1).includes(provider);
  const selectValue = isKnown ? provider : "Other";

  return (
    <>
      <div>
        <label className="block text-xs font-medium text-navy-500 mb-1">Terminal provider</label>
        <select
          value={selectValue}
          onChange={(e) => onChange({ provider: e.target.value === "Other" ? "" : e.target.value, merchantRef })}
          className="w-full px-3 py-2 rounded-lg border border-navy-900/10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        >
          {PROVIDERS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {selectValue === "Other" && (
        <div>
          <label className="block text-xs font-medium text-navy-500 mb-1">Company name</label>
          <input
            required
            placeholder="e.g. Ingenico, Verifone..."
            value={isKnown ? "" : provider}
            onChange={(e) => onChange({ provider: e.target.value, merchantRef })}
            className="w-full px-3 py-2 rounded-lg border border-navy-900/10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-navy-500 mb-1">
          Merchant ID / account reference <span className="text-navy-300">(optional)</span>
        </label>
        <input
          placeholder="So you can find it in their portal"
          value={merchantRef}
          onChange={(e) => onChange({ provider, merchantRef: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-navy-900/10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
      </div>
    </>
  );
}
