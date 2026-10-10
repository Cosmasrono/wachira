import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentCustomer, safeNext } from "@/lib/customer";
import { ShieldCheck } from "lucide-react";
import VerifyEmailForm from "./VerifyEmailForm";

export const metadata: Metadata = {
  title: "Verify your email",
  description: "Enter your 6-digit verification code to activate your Wachira account.",
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; next?: string }>;
}) {
  const customer = await currentCustomer();
  const params = await searchParams;
  const email = params.email?.trim() || "";
  const next = safeNext(params.next);

  if (customer) {
    redirect(next === "/shop" ? "/account" : next);
  }

  if (!email) {
    redirect("/signup");
  }

  return (
    <section className="first auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-badge-row">
            <span className="auth-step-pill">
              <ShieldCheck size={14} /> Step 2 of 2 &middot; Verification
            </span>
          </div>
          <h1>Verify your email</h1>
          <p className="lead">
            We sent a 6-digit verification code to <strong>{email}</strong>. Enter it below to activate your account.
          </p>
        </div>

        <VerifyEmailForm email={email} next={next} />
      </div>
    </section>
  );
}
