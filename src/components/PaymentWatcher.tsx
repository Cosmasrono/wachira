"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  number: string;
  status: string;
  paymentNote: string | null;
  mpesaPhone: string; // 0712 345 678 format
};

const POLL_MS = 3000;
const GIVE_UP_MS = 2 * 60_000;

/** Waits for the M-Pesa result, and lets the customer retry the prompt. */
export default function PaymentWatcher({ number, status, paymentNote, mpesaPhone }: Props) {
  const router = useRouter();
  const [phone, setPhone] = useState(mpesaPhone);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [waitedTooLong, setWaitedTooLong] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (status !== "PENDING_PAYMENT" && status !== "PAYMENT_FAILED") return;
    setWaitedTooLong(false);
    const started = Date.now();
    let inFlight = false;
    const controller = new AbortController();
    const timer = setInterval(async () => {
      if (inFlight) return;
      if (Date.now() - started > GIVE_UP_MS) {
        setWaitedTooLong(true);
        clearInterval(timer);
        return;
      }
      inFlight = true;
      const res = await fetch(`/api/orders/${number}`, { cache: "no-store", signal: controller.signal }).catch(() => null);
      const data = await res?.json().catch(() => null);
      inFlight = false;
      if (controller.signal.aborted) return;
      if (data?.status && data.status !== status) {
        clearInterval(timer);
        router.refresh();
      }
    }, POLL_MS);
    return () => { clearInterval(timer); controller.abort(); };
  }, [number, status, router, attempt]);

  async function retry(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await fetch(`/api/orders/${number}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(false);
    if (!res?.ok) return setError(data?.error ?? "Couldn't send the prompt. Try again.");
    setWaitedTooLong(false);
    setAttempt((value) => value + 1);
    router.refresh();
  }

  const retryForm = (
    <form className="retry" onSubmit={retry} noValidate>
      <label htmlFor="retryPhone">M-Pesa number
        <input id="retryPhone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </label>
      <button className="mpesa" type="submit" disabled={busy}>
        {busy ? "Sending…" : "Send the M-Pesa prompt again"}
      </button>
      <p className="err" role="alert">{error}</p>
    </form>
  );

  if (status === "PENDING_PAYMENT") {
    return (
      <div className="pay-box waiting" role="status">
        <b>Check your phone</b>
        <p>We&apos;ve sent an M-Pesa prompt to {mpesaPhone}. Enter your PIN to pay. This page updates by itself.</p>
        {waitedTooLong && (
          <>
            <p className="hint">No payment yet. If the prompt didn&apos;t appear or expired, send it again.</p>
            {retryForm}
          </>
        )}
      </div>
    );
  }

  if (status === "PAYMENT_FAILED") {
    return (
      <div className="pay-box failed" role="alert">
        <b>Payment not completed</b>
        <p>{paymentNote ?? "The payment didn't go through."} Your order is saved, so you can try again.</p>
        {retryForm}
      </div>
    );
  }

  return null;
}
