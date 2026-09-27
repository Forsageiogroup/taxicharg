import Link from "next/link";
import Logo from "./Logo";
import Facets from "./art/Facets";

export default function AuthCard({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 text-navy-deep p-14 flex-col justify-between relative overflow-hidden">
        <Facets seed={43} cols={9} rows={9} className="absolute inset-0 w-full h-full" />
        <div className="tc-facet-veil absolute inset-0" />
        <Link href="/" className="relative">
          <Logo className="text-2xl" />
        </Link>
        <div className="relative">
          <p className="text-3xl font-extrabold leading-snug max-w-md">
            More fares in your pocket, faster than ever.
          </p>
          <p className="mt-4 text-navy-deep/80 font-medium max-w-sm">
            Manage your payments, connect your terminal and bank payouts,
            and track every fare from one dashboard.
          </p>
        </div>
        <p className="relative text-xs text-navy-deep/70">
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
