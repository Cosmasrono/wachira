"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { CheckCircle2, AlertCircle, Loader2, RotateCw, ArrowRight, Mail } from "lucide-react";
import { resendVerificationAction, verifyEmailAction } from "../auth-actions";

export default function VerifyEmailForm({
  email,
  next,
}: {
  email: string;
  next: string;
}) {
  const [state, formAction, isPending] = useActionState(verifyEmailAction, {});
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [resendMsg, setResendMsg] = useState("");
  const [resendErr, setResendErr] = useState("");
  const [isResending, setIsResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const code = digits.join("");

  // 60-second cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  function handleDigitChange(index: number, value: string) {
    const clean = value.replace(/\D/g, "");
    if (!clean) {
      const nextDigits = [...digits];
      nextDigits[index] = "";
      setDigits(nextDigits);
      return;
    }

    if (clean.length > 1) {
      // Pasted multiple digits
      const chars = clean.slice(0, 6).split("");
      const nextDigits = [...digits];
      chars.forEach((c, i) => {
        if (index + i < 6) nextDigits[index + i] = c;
      });
      setDigits(nextDigits);
      const nextFocus = Math.min(index + chars.length, 5);
      inputRefs.current[nextFocus]?.focus();
      return;
    }

    const nextDigits = [...digits];
    nextDigits[index] = clean;
    setDigits(nextDigits);

    // Auto-advance
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const nextDigits = [...digits];
    pasted.split("").forEach((c, i) => {
      nextDigits[i] = c;
    });
    setDigits(nextDigits);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  }

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
      <input type="hidden" name="code" value={code} />

      {state?.error && (
        <div className="auth-alert-error" role="alert">
          <AlertCircle className="w-5 h-5 flex-shrink-0" size={18} />
          <span>{state.error}</span>
        </div>
      )}

      {resendMsg && (
        <div className="auth-alert-success" role="status">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" size={18} />
          <span>{resendMsg}</span>
        </div>
      )}

      {resendErr && (
        <div className="auth-alert-error" role="alert">
          <AlertCircle className="w-5 h-5 flex-shrink-0" size={18} />
          <span>{resendErr}</span>
        </div>
      )}

      <div className="otp-wrapper">
        <label className="otp-label" htmlFor="otp-0">
          Enter 6-digit verification code
        </label>
        <div className="otp-inputs" onPaste={handlePaste}>
          {digits.map((digit, i) => (
            <input
              key={i}
              id={`otp-${i}`}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              autoComplete="one-time-code"
              onChange={(e) => handleDigitChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="otp-digit"
              disabled={isPending}
            />
          ))}
        </div>
      </div>

      <div className="auth-resend-row">
        <span>Didn&apos;t receive the email?</span>
        {resendCooldown > 0 ? (
          <span className="hint flex-inline items-center gap-1">
            Resend available in <b>{resendCooldown}s</b>
          </span>
        ) : (
          <button
            type="button"
            className="linkish flex-inline items-center gap-1 font-medium"
            onClick={handleResend}
            disabled={isResending}
          >
            {isResending ? (
              <>
                <Loader2 className="animate-spin" size={14} /> Sending...
              </>
            ) : (
              <>
                <RotateCw size={14} /> Resend code
              </>
            )}
          </button>
        )}
      </div>

      <button
        className="btn primary lg"
        type="submit"
        disabled={isPending || code.length !== 6}
      >
        {isPending ? (
          <>
            <Loader2 className="animate-spin" size={18} /> Verifying code...
          </>
        ) : (
          <>
            Verify &amp; proceed to log in <ArrowRight size={16} />
          </>
        )}
      </button>

      <div className="auth-footer">
        <Mail size={16} className="text-muted" />
        <span>Wrong email address?</span>
        <Link href={`/signup?next=${encodeURIComponent(next)}`}>
          Sign up with another email
        </Link>
      </div>
    </form>
  );
}
