"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { resendVerificationAction, verifyEmailAction } from "../auth-actions";

export default function VerifyEmailForm({
  email,
  next,
}: {
  email: string;
  next: string;
}) {
  const [state, formAction, isPending] = useActionState(verifyEmailAction, {});
  const [code, setCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(60);
  const [resendMsg, setResendMsg] = useState("");
  const [resendErr, setResendErr] = useState("");
  const [isResending, setIsResending] = useState(false);

  // 60-second cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  async function handleResend() {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setResendMsg("");
    setResendErr("");

    try {
      const res = await resendVerificationAction(email);
      if (res.ok) {
        setResendMsg("A new 6-digit code has been sent to your email.");
        setResendCooldown(60);
      } else {
        setResendErr(res.error ?? "Failed to resend code.");
      }
    } catch {
      setResendErr("Network error. Please try again.");
    } finally {
      setIsResending(false);
    }
  }

  return (
    <form action={formAction} className="stack" noValidate>
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="next" value={next} />

      {state?.error && (
        <div className="err" role="alert">
          {state.error}
        </div>
      )}

      {resendMsg && (
        <div className="auth-alert-success" role="status">
          ✓ {resendMsg}
        </div>
      )}

      {resendErr && (
        <div className="err" role="alert">
          {resendErr}
        </div>
      )}

      <label htmlFor="code">
        Enter 6-digit verification code
        <input
          id="code"
          name="code"
          type="text"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          autoFocus
          className="auth-code-input"
          placeholder="······"
          value={code}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, "").slice(0, 6);
            setCode(val);
          }}
          disabled={isPending}
        />
      </label>

      <div className="auth-resend-row">
        <span>Didn&apos;t get the email?</span>
        {resendCooldown > 0 ? (
          <span className="hint">Resend in {resendCooldown}s</span>
        ) : (
          <button
            type="button"
            className="linkish"
            onClick={handleResend}
            disabled={isResending}
          >
            {isResending ? "Sending…" : "Resend code"}
          </button>
        )}
      </div>

      <button
        className="btn primary"
        type="submit"
        disabled={isPending || code.length !== 6}
      >
        {isPending ? "Verifying code…" : "Verify and proceed to log in"}
      </button>

      <div className="auth-footer">
        <span>Wrong email address?</span>
        <Link href={`/signup?next=${encodeURIComponent(next)}`}>Sign up with another email</Link>
      </div>
    </form>
  );
}
