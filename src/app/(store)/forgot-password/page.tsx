import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentCustomer, safeNext } from "@/lib/customer";
import ForgotPasswordForm from "./ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Reset your password",
  description: "Get a code by email to choose a new Wachira password.",
  robots: { index: false },
};

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; email?: string }>;
}) {
  const customer = await currentCustomer();
  const params = await searchParams;
  const next = safeNext(params.next);

  if (customer) {
    redirect(next === "/shop" ? "/account" : next);
  }

  return (
    <section className="first auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <p className="label">Customer Portal</p>
          <h1>Forgot your password?</h1>
          <p className="lead">Enter your email and we&apos;ll send you a 6-digit code to choose a new password.</p>
        </div>

        <ForgotPasswordForm next={next} defaultEmail={params.email?.trim() ?? ""} />
      </div>
    </section>
  );
}
