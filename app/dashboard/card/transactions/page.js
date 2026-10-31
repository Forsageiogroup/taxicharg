import { cookies } from "next/headers";
import { verifySessionToken, DRIVER_COOKIE } from "@/lib/auth";
import { driverForRequest as findDriverById } from "@/lib/data/request";
import { cardMoney } from "@/lib/terminal/cardMoney";
import PageHeader from "@/components/dashboard/PageHeader";
import CardPaymentsTable from "@/components/dashboard/CardPaymentsTable";
import CardOnly from "@/components/dashboard/CardOnly";

/** tc-0016: every card fare taken on his TaxiCharg terminal - fare, service charge, what is his. */
export default async function CardTransactionsPage() {
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(DRIVER_COOKIE)?.value);
  const driver = await findDriverById(session.sub);
  const m = await cardMoney(driver, { stripe: false, limit: 500 });
  if (!m.cardSide) return <CardOnly title="Card payments" />;
  return (
    <div>
      <PageHeader title="Card payments" subtitle="Every fare taken on your TaxiCharg terminal: the fare, the service charge the passenger paid, and what is yours." />
      <CardPaymentsTable rows={m.rows} />
    </div>
  );
}
