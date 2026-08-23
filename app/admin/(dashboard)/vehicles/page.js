import { listVehicles, listDriverOptions } from "@/lib/data/vehicles";
import PageHeader from "@/components/dashboard/PageHeader";
import VehiclesTable from "@/components/admin/VehiclesTable";
import NewVehicleForm from "@/components/admin/NewVehicleForm";

export default async function AdminVehiclesPage() {
  const [vehicles, driverOptions] = await Promise.all([listVehicles(), listDriverOptions()]);

  return (
    <div>
      <PageHeader
        title="Vehicles & terminals"
        subtitle="One EFTPOS terminal per vehicle — payments follow whoever is assigned here."
        action={<NewVehicleForm driverOptions={driverOptions} />}
      />
      <VehiclesTable vehicles={vehicles} driverOptions={driverOptions} />
    </div>
  );
}
