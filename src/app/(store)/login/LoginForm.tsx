"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, ArrowRight, ShieldAlert } from "lucide-react";
import { loginCustomerAction } from "../auth-actions";

export default function LoginForm({
  defaultEmail = "",
  verified = false,
  next = "/account",
}: {
  defaultEmail?: string;
  verified?: boolean;
  next?: string;
}) {
  const [state, formAction, isPending] = useActionState(loginCustomerAction, {});
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState(defaultEmail);

  return (
    <form action={formAction} className="stack" noValidate>
      <input type="hidden" name="next" value={next} />

      {verified && (
        <div className="auth-alert-success" role="status">
          <CheckCircle2 size={18} className="flex-shrink-0" />
          <span>Your email has been verified! You can now log in with your credentials.</span>
        </div>
      )}

      {state?.error && (
        <div className="auth-alert-error" role="alert">
          <AlertCircle size={18} className="flex-shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      {state?.needsVerification && state.email && (
        <div className="auth-alert-warn" role="alert">
          <div className="flex items-center gap-2 font-medium">
            <ShieldAlert size={18} />
            <span>Verification required</span>
          </div>
          <p style={{ margin: "4px 0 10px", fontSize: "14px" }}>
            Your email has not been verified yet. A verification code has been sent to your inbox.
          </p>
          <Link
            className="btn primary sm"
            href={`/verify-email?email=${encodeURIComponent(state.email)}&next=${encodeURIComponent(next)}`}
          >
            Enter verification code &rarr;
          </Link>
        </div>
      )}

      <label htmlFor="email">
        Email address
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="e.g. wanjiku@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isPending}
        />
      </label>

      <label htmlFor="password">
        Password
        <div className="auth-password-wrap">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="Enter your password"
            disabled={isPending}
          />
          <button
            type="button"
            className="auth-password-toggle"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </label>

      <button className="btn primary lg" type="submit" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="animate-spin" size={18} /> Signing in...
          </>
        ) : (
          <>
            Log in <ArrowRight size={16} />
          </>
        )}
      </button>

      <div className="auth-footer">
        <span>Don&apos;t have an account?</span>
        <Link href={`/signup?next=${encodeURIComponent(next)}`}>Create an account</Link>
      </div>
    </form>
  );
}
