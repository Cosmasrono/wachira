"use client";

import { useState } from "react";

type Result = { error: string };

/** Two steps: enter your email, then type the 6-digit code we email you. */
export default function EmailCodeForm({
  send, verify, onSignedIn,
}: {
  send: (email: string) => Promise<Result>;
  verify: (email: string, code: string) => Promise<Result>;
  onSignedIn: () => void;
}) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [pending, setPending] = useState(false);

  async function run(action: () => Promise<void>) {
    setError("");
    setInfo("");
    setPending(true);
    try {
      await action();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  const sendCode = (e?: React.FormEvent) => {
    e?.preventDefault();
    run(async () => {
      const res = await send(email);
      if (res.error) return setError(res.error);
      setStep("code");
      setCode("");
      setInfo(`We sent a 6-digit code to ${email.trim()}. It works for 10 minutes.`);
    });
  };

  const checkCode = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      const res = await verify(email, code);
      if (res.error) return setError(res.error);
      onSignedIn();
    });
  };

  if (step === "email") {
    return (
      <form onSubmit={sendCode} className="stack">
        <label htmlFor="email">Email
          <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <p className="err" role="alert">{error}</p>
        <button className="btn primary" disabled={pending}>{pending ? "Sending…" : "Email me a code"}</button>
      </form>
    );
  }

  return (
    <form onSubmit={checkCode} className="stack">
      {info && <p className="note" role="status">{info}</p>}
      <label htmlFor="code">Sign-in code
        <input
          id="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required autoFocus
          value={code} onChange={(e) => setCode(e.target.value)}
        />
      </label>
      <p className="err" role="alert">{error}</p>
      <button className="btn primary" disabled={pending}>{pending ? "Checking…" : "Sign in"}</button>
      <button type="button" className="linkish" onClick={() => sendCode()} disabled={pending}>Send a new code</button>
      <button type="button" className="linkish" onClick={() => { setStep("email"); setError(""); setInfo(""); }} disabled={pending}>
        Use a different email
      </button>
    </form>
  );
}
