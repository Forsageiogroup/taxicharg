"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Check, X } from "lucide-react";

export default function EditableField({ label, value, fieldKey }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/driver/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [fieldKey]: draft }),
      });
      if (res.ok) {
        setEditing(false);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <p className="text-xs text-navy-400">{label}</p>
      {editing ? (
        <div className="flex items-center gap-1.5 mt-0.5">
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="text-sm font-semibold text-navy-900 border border-navy-900/10 rounded-md px-2 py-1 w-32 focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          <button onClick={save} disabled={saving} className="text-green-600 hover:text-green-700">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          </button>
          <button
            onClick={() => {
              setDraft(value);
              setEditing(false);
            }}
            className="text-navy-400 hover:text-navy-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 mt-0.5">
          <p className="font-semibold text-navy-900">{value}</p>
          <button onClick={() => setEditing(true)} className="text-navy-300 hover:text-green-500" aria-label={`Edit ${label}`}>
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
