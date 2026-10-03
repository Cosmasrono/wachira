import type { Metadata } from "next";
import CheckoutForm from "@/components/CheckoutForm";
import { requireCustomer } from "@/lib/customer";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  // Shoppers sign in or create an account before ordering; the bag waits in the browser meanwhile.
  const customer = await requireCustomer("/checkout");
  return (
    <section className="first">
      <div className="sec-head"><h1>Checkout</h1></div>
      <p className="hint">Ordering as {customer.email}.</p>
      <CheckoutForm defaultName={customer.name ?? ""} />
    </section>
  );
}
