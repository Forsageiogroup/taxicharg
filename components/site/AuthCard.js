import Link from "next/link";
import Logo from "./Logo";

export default function AuthCard({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 navy-gradient text-white p-14 flex-col justify-between relative overflow-hidden">
        <div className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full brand-gradient opacity-20 blur-3xl" />
        <Link href="/" className="relative">
          <Logo dark className="text-2xl" />
        </Link>
        <div className="relative">
          <p className="text-3xl font-extrabold leading-snug max-w-md">
            More fares in your pocket, faster than ever.
          </p>
          <p className="mt-4 text-white/60 max-w-sm">
            Manage your payments, connect your terminal and bank payouts,
            and track every fare from one dashboard.
          </p>
        </div>
        <p className="relative text-xs text-white/40">
          &copy; {new Date().getFullYear()} TaxiCharg &middot; NSW, Australia
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-white">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8">
            <Link href="/">
              <Logo className="text-xl" />
            </Link>
          </div>
          <h1 className="text-2xl font-extrabold text-navy-900">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-navy-500">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-sm text-navy-500">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
