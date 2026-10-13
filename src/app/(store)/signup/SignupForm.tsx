"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { signupCustomerAction } from "../auth-actions";

export default function SignupForm({ next }: { next: string }) {
  const [state, formAction, isPending] = useActionState(signupCustomerAction, {});

  return (
    <form action={formAction} className="stack" noValidate>
      <input type="hidden" name="next" value={next} />

      {state?.error && (
        <div className="auth-alert-error" role="alert">
          <AlertCircle size={18} className="flex-shrink-0" />
          <span>{state.error}</span>
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
          disabled={isPending}
        />
      </label>

      <p className="hint">
        We&apos;ll email you a 6-digit code. You&apos;ll add your name and choose your password on the next step, once your email is confirmed.
      </p>

      <button className="btn primary lg" type="submit" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="animate-spin" size={18} /> Sending code...
          </>
        ) : (
          <>
            Continue <ArrowRight size={16} />
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
