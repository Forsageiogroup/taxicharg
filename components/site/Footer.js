import Link from "next/link";
import { FacebookIcon, InstagramIcon, LinkedinIcon, XIcon } from "./SocialIcons";
import Logo from "./Logo";

const columns = [
  {
    title: "Product",
    links: [
      { href: "/eftpos", label: "Taxi EFTPOS machine" },
      { href: "/driver-card", label: "TaxiCharg Driver Card" },
      { href: "/signup", label: "Sign up" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/support/contact", label: "Contact" },
      { href: "/support/receipt-search", label: "Receipt search" },
      { href: "/support/referral", label: "Referral program" },
      { href: "/about", label: "About" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/legal/privacy", label: "Privacy policy" },
      { href: "/legal/terms", label: "Terms & conditions" },
      { href: "/legal/pds", label: "Product Disclosure Statement" },
      { href: "/legal/fsg", label: "Financial Services Guide" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="navy-gradient text-white mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
          <div className="col-span-2">
            <Logo dark className="text-xl" />
            <p className="mt-4 text-sm text-white/60 max-w-xs">
              The driver payment solution built for NSW taxi drivers &mdash;
              fast settlement, low fees, and support that has your back.
            </p>
            <div className="flex items-center gap-3 mt-6">
              {[FacebookIcon, InstagramIcon, LinkedinIcon, XIcon].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-orange-500 flex items-center justify-center transition-colors"
                  aria-label="Social link"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-white/90 mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-white/60 hover:text-orange-400">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/50">
          <p>&copy; {new Date().getFullYear()} TaxiCharg. All rights reserved.</p>
          <p>Sydney, NSW, Australia</p>
        </div>
      </div>
    </footer>
  );
}
