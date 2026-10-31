"use client";
// tc-0016: download the card report shown (totals and every card fare in it) as a file Excel opens
import { Download } from "lucide-react";
import { cardCsv } from "@/lib/money/cardReport";

export default function CardReportDownload(props) {
  function save() {
    const blob = new Blob(["﻿" + cardCsv(props)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `taxicharg-card-report-${props.from}-to-${props.to}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <button type="button" onClick={save}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold border border-navy-900/10 bg-white hover:bg-navy-950/[0.03]">
      <Download className="w-4 h-4" /> Download
    </button>
  );
}
