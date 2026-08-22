import { listDrivers } from "@/lib/data/drivers";
import PageHeader from "@/components/dashboard/PageHeader";
import StatCard from "@/components/dashboard/StatCard";
import { Users, UserCheck, UserX, Wallet } from "lucide-react";
import DriversTable from "@/components/admin/DriversTable";

const currency = (n) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);

export default async function AdminDriversPage() {
  const drivers = await listDrivers();
  const active = drivers.filter((d) => d.status === "active").length;
  const suspended = drivers.filter((d) => d.status === "suspended").length;
  const totalBalance = drivers.reduce((acc, d) => acc + d.balance, 0);

  return (
    <div>
      <PageHeader title="Drivers" subtitle="All drivers registered on TaxiCharg." />

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <StatCard label="Total drivers" value={drivers.length} icon={Users} accent />
        <StatCard label="Active" value={active} icon={UserCheck} />
        <StatCard label="Suspended" value={suspended} icon={UserX} />
        <StatCard label="Total balance" value={currency(totalBalance)} icon={Wallet} />
      </div>

      <DriversTable drivers={drivers} />
    </div>
  );
}
