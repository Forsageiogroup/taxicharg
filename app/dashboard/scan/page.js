import PageHeader from "@/components/dashboard/PageHeader";
import ScanReport from "@/components/dashboard/ScanReport";

/**
 * tc-0019: Scan shift report (takings by QR). The driver scans the QR on the shift report his terminal printed,
 * or types its number; any card payment on it that did not come in by itself is credited, once.
 */
export default function ScanPage() {
  return (
    <div>
      <PageHeader title="Scan shift report" subtitle="Scan the QR at the bottom of the shift report your terminal printed. Any card payment that did not come in by itself is added - once." />
      <ScanReport />
    </div>
  );
}
