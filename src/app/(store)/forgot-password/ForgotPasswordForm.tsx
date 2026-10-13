"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { forgotPasswordAction } from "../auth-actions";

export default function ForgotPasswordForm({ next, defaultEmail }: { next: string; defaultEmail: string }) {
  const [state, formAction, isPending] = useActionState(forgotPasswordAction, {});

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
          defaultValue={state?.email ?? defaultEmail}
          placeholder="e.g. wanjiku@example.com"
          disabled={isPending}
        />
      </label>

      <button className="btn primary lg" type="submit" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="animate-spin" size={18} /> Sending code...
          </>
        ) : (
          <>
            Email me a code <ArrowRight size={16} />
          </>
        )}
      </button>

      <div className="auth-footer">
        <span>Remembered it?</span>
        <Link href={`/login?next=${encodeURIComponent(next)}`}>Back to log in</Link>
      </div>
    </form>
  );
}
