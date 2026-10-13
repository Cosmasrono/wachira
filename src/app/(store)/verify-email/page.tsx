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
  searchParams: Promise<{ email?: string; next?: string; mode?: string }>;
}) {
  const customer = await currentCustomer();
  const params = await searchParams;
  const email = params.email?.trim() || "";
  const next = safeNext(params.next);
  const mode = params.mode === "reset" ? "reset" : "verify";

  if (customer) {
    redirect(next === "/shop" ? "/account" : next);
  }

  if (!email) {
    redirect(mode === "reset" ? "/forgot-password" : "/signup");
  }

  return (
    <section className="first auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-badge-row">
            <span className="auth-step-pill">
              <ShieldCheck size={14} /> {mode === "reset" ? "Password reset" : <>Step 2 of 2 &middot; Verification</>}
            </span>
          </div>
          <h1>{mode === "reset" ? "Choose a new password" : "Verify your email"}</h1>
          <p className="lead">
            {mode === "reset" ? (
              <>If <strong>{email}</strong> has an account, we&apos;ve sent it a 6-digit code. Enter the code and choose a new password.</>
            ) : (
              <>We&apos;ve sent a 6-digit code to <strong>{email}</strong>. Enter it, add your name and choose your password to finish creating your account.</>
            )}
          </p>
        </div>

        <VerifyEmailForm email={email} next={next} mode={mode} />
      </div>
    </section>
  );
}
