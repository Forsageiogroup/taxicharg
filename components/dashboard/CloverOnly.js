import Link from "next/link";

/** tc-0013: shown on a Clover page when no Clover terminal is assigned to him. */
export default function CloverOnly({ title }) {
  return (
    <div>
      <h1 className="text-2xl font-extrabold text-navy-900">{title}</h1>
      <div className="mt-6 rounded-2xl bg-white border border-navy-900/5 card-shadow p-6">
        <p className="text-sm text-navy-600 max-w-prose">
          This page is for fares taken on a Clover terminal. You don&apos;t have a Clover terminal assigned,
          so there is nothing to show here.
        </p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm font-semibold text-green-700 underline">Back to overview</Link>
      </div>
    </div>
  );
}
