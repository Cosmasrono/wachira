"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signupCustomerAction, type AuthState } from "../auth-actions";

export default function SignupForm({ next }: { next: string }) {
  const [state, formAction, isPending] = useActionState(signupCustomerAction, {});
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="stack" noValidate>
      <input type="hidden" name="next" value={next} />

      {state?.error && (
        <div className="err" role="alert">
          {state.error}
        </div>
      )}

      <label htmlFor="name">
        Full name
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          placeholder="e.g. Wanjiku Kamau"
          disabled={isPending}
        />
      </label>

      <label htmlFor="email">
        Email address
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="e.g. wanjiku@example.com"
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
            autoComplete="new-password"
            required
            placeholder="At least 6 characters"
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

      <label htmlFor="confirmPassword">
        Confirm password
        <div className="auth-password-wrap">
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            placeholder="Re-enter your password"
            disabled={isPending}
          />
        </div>
      </label>

      <button className="btn primary" type="submit" disabled={isPending}>
        {isPending ? "Creating account & sending code…" : "Sign up"}
      </button>

      <div className="auth-footer">
        <span>Already have an account?</span>
        <Link href={`/login?next=${encodeURIComponent(next)}`}>Log in</Link>
      </div>
    </form>
  );
}
