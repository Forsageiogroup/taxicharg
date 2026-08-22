import { Mail, Phone, MessageCircle } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";

const FAQS = [
  {
    q: "When do my fares settle?",
    a: "Most EFTPOS and card fares settle within 24 hours. You'll see them move from \"Pending\" to \"Settled\" on your Payments tab.",
  },
  {
    q: "How do I connect my Clover terminal?",
    a: "Go to the Connect tab and click \"Connect Clover\". You'll be sent to Clover to authorise TaxiCharg — once approved you're brought straight back to your dashboard.",
  },
  {
    q: "Why do I need to connect Stripe?",
    a: "Stripe is how TaxiCharg sends your settled earnings to your own bank account. Without it, withdrawals run in demo mode only.",
  },
  {
    q: "Is there a fee to withdraw funds?",
    a: "No — TaxiCharg doesn't charge withdrawal fees. Standard payment processing fees still apply per transaction (shown on each payment in your Payments tab).",
  },
  {
    q: "What if my account gets suspended?",
    a: "Contact support straight away using the details below and a specialist will help sort it out.",
  },
];

export default function HelpPage() {
  return (
    <div>
      <PageHeader title="Help" subtitle="Answers to common questions, and how to reach us." />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl bg-white border border-navy-900/5 card-shadow divide-y divide-navy-900/5">
          {FAQS.map((item) => (
            <details key={item.q} className="group p-6">
              <summary className="flex items-center justify-between cursor-pointer font-semibold text-navy-900 list-none">
                {item.q}
                <span className="text-orange-500 group-open:rotate-45 transition-transform text-xl leading-none">+</span>
              </summary>
              <p className="mt-3 text-sm text-navy-600 leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>

        <div className="rounded-2xl navy-gradient text-white p-6 h-fit">
          <h3 className="font-bold">Talk to a specialist</h3>
          <p className="mt-2 text-sm text-white/60">
            Our support team knows the taxi industry and is here every day.
          </p>
          <div className="mt-5 space-y-4 text-sm">
            <a href="tel:1300000000" className="flex items-center gap-3 hover:text-orange-400">
              <Phone className="w-4 h-4" /> 1300 000 000
            </a>
            <a href="mailto:support@taxicharg.com.au" className="flex items-center gap-3 hover:text-orange-400">
              <Mail className="w-4 h-4" /> support@taxicharg.com.au
            </a>
            <a href="/support/contact" className="flex items-center gap-3 hover:text-orange-400">
              <MessageCircle className="w-4 h-4" /> Send us a message
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
