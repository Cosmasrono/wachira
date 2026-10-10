"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { AlertCircle, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { signupCustomerAction } from "../auth-actions";

export default function SignupForm({ next }: { next: string }) {
  const [state, formAction, isPending] = useActionState(signupCustomerAction, {});
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="stack" noValidate>
      <input type="hidden" name="next" value={next} />

      {state?.error && (
        <div className="auth-alert-error" role="alert">
          <AlertCircle size={18} className="flex-shrink-0" />
          <span>{state.error}</span>
        </div>
      )}
      {state?.needsVerification && state.email && (
        <Link href={`/verify-email?email=${encodeURIComponent(state.email)}&next=${encodeURIComponent(state.next ?? next)}`}>
          Continue email verification
        </Link>
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
            placeholder="At least 12 characters"
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

      <button className="btn primary lg" type="submit" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="animate-spin" size={18} /> Creating account &amp; sending code...
          </>
        ) : (
          <>
            Create account <ArrowRight size={16} />
          </>
        )}
      </button>

      <div className="auth-footer">
        <span>Already have an account?</span>
        <Link href={`/login?next=${encodeURIComponent(next)}`}>Log in</Link>
      </div>
    </form>
  );
}
