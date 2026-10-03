import Link from "next/link";

export default function NotFound() {
  return (
    <main className="wrap not-found">
      <h1>We couldn&apos;t find that page</h1>
      <p>The link may be wrong, or the item is no longer available.</p>
      <Link className="btn primary" href="/shop">Back to the shop</Link>
    </main>
  );
}
