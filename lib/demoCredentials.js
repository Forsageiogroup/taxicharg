/**
 * Demo login credentials, kept in their own zero-dependency file so
 * client components (the "use demo login" autofill buttons) can import
 * them without pulling in the database client — only server code should
 * ever import `pg`.
 */

export const DEMO_DRIVER_CREDENTIALS = {
  email: "driver@taxicharg.com.au",
  password: "TaxiCharg123",
};

export const DEMO_ADMIN_CREDENTIALS = {
  email: "admin@taxicharg.com.au",
  password: "AdminTaxi123",
};
