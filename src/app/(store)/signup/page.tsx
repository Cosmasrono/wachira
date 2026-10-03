import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentCustomer, safeNext } from "@/lib/customer";
import SignupForm from "./SignupForm";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Sign up for a Wachira account to shop and track your orders.",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const customer = await currentCustomer();
  const next = safeNext((await searchParams).next);

  if (customer) {
    redirect(next === "/shop" ? "/account" : next);
  }

  return (
    <section className="first auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <p className="label">Join Wachira</p>
          <h1>Create an account</h1>
          <p className="lead">
            Sign up to track your bespoke orders, save your measurements, and checkout faster.
          </p>
        </div>

        <SignupForm next={next} />
      </div>
    </section>
  );
}
