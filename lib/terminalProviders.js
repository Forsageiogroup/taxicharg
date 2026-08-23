/**
 * Common EFTPOS/payment-terminal providers taxi fleets in NSW use — just a
 * pick-list for the admin "vehicle & terminal" form, so it's safe to import
 * from client components. "Other" lets any company name be entered freely.
 *
 * Zero-dependency on purpose (see lib/demoCredentials.js for the same
 * pattern): anything a client component needs that would otherwise come
 * from a server-only data module (like lib/data/vehicles.js, which imports
 * the Node-only `pg` package) belongs in its own dependency-free file.
 */
export const PROVIDERS = ["Clover", "Stripe", "Tyro", "SumUp", "Square", "Zeller", "Other"];
