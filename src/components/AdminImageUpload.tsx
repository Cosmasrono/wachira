"use client";

import { useState } from "react";

export default function AdminImageUpload({ label, onUpload, onBusy }: {
  label: string; onUpload: (url: string) => void; onBusy: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return <div>
    <label>{label}
      <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={async (event) => {
        const input = event.currentTarget;
        const file = input.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { setMessage("Choose an image smaller than 5 MB."); input.value = ""; return; }
        setBusy(true); onBusy(true); setMessage("");
        try {
          const response = await fetch("/api/admin/images", { method: "POST", headers: { "Content-Type": file.type }, body: file });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "Upload failed.");
          onUpload(result.url);
          setMessage("Image uploaded. Save the product to publish it.");
        } catch (error) { setMessage(error instanceof Error ? error.message : "Upload failed. Please try again."); }
        finally { setBusy(false); onBusy(false); input.value = ""; }
      }} />
    </label>
    <p className="hint" role="status">{busy ? "Uploading image…" : message || "JPEG, PNG or WebP, up to 5 MB."}</p>
  </div>;
}
