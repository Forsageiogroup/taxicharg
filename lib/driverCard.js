/**
 * tc-0024: the TaxiCharg Driver Card (the owner, 10 Nov 2026: "in future we are bringing the driver card. We will
 * transfer the bal on their card ... once our api comes from oxygen company we can connect to the button").
 * THE PLACE TO CONNECT THE CARD COMPANY. Until it is connected this says so and moves no money; the button on the
 * scan page shows only when the office switches the card on (368 setting + DRIVER_CARD_PAYOUTS=on on the site).
 * When connected: send amountCents to the driver's card with requestId as the card company's idempotency key and
 * return { transferId } - or { error } with words for the driver.
 */
export function driverCardOn() {
  return String(process.env.DRIVER_CARD_PAYOUTS || "").toLowerCase() === "on";
}

export async function sendToCard(driver, { amountCents, requestId }) {
  if (!driverCardOn()) return { error: "The TaxiCharg Driver Card is not switched on yet. Choose your bank." };
  return { error: "The TaxiCharg Driver Card is not connected yet. Choose your bank." };
}
