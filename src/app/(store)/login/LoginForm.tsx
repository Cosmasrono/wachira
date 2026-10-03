"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
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
          ✓ Your email has been verified! You can now log in with your credentials.
        </div>
      )}

      {state?.error && (
        <div className="err" role="alert">
          {state.error}
        </div>
      )}

      {state?.needsVerification && state.email && (
        <div className="auth-alert-warn" role="alert">
          <p>Your email has not been verified yet. A verification code has been sent to your inbox.</p>
          <Link
            className="btn"
            style={{ marginTop: 8 }}
            href={`/verify-email?email=${encodeURIComponent(state.email)}&next=${encodeURIComponent(next)}`}
          >
            Enter verification code →
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
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </label>

      <button className="btn primary" type="submit" disabled={isPending}>
        {isPending ? "Signing in…" : "Log in"}
      </button>

      <div className="auth-footer">
        <span>Don&apos;t have an account?</span>
        <Link href={`/signup?next=${encodeURIComponent(next)}`}>Create an account</Link>
      </div>
    </form>
  );
}
