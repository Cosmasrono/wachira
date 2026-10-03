import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentCustomer, safeNext } from "@/lib/customer";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to your Wachira account to view orders and manage measurements.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; email?: string; verified?: string }>;
}) {
  const customer = await currentCustomer();
  const params = await searchParams;
  const next = safeNext(params.next);
  const defaultEmail = params.email?.trim() || "";
  const verified = params.verified === "true" || params.verified === "1";

  if (customer) {
    redirect(next === "/shop" ? "/account" : next);
  }

  return (
    <section className="first auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <p className="label">Customer Portal</p>
          <h1>Welcome back</h1>
          <p className="lead">Log in to view your orders, saved measurements, and checkout faster.</p>
        </div>

        <LoginForm defaultEmail={defaultEmail} verified={verified} next={next} />
      </div>
    </section>
  );
}
