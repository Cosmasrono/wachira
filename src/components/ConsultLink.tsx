"use client";

import type { ReactNode } from "react";
import { consultationHref, whatsappConfigured } from "@/lib/consultation";

export default function ConsultLink({ name, slug, className, children, label }: {
  name?: string; slug?: string; className?: string; children: ReactNode; label?: string;
}) {
  return <a className={className} aria-label={label} href={consultationHref(name, slug)}
    target={whatsappConfigured() ? "_blank" : undefined} rel="noopener noreferrer"
    onClick={(event) => { event.currentTarget.href = consultationHref(name, slug, window.location.origin); }}>
    {children}
  </a>;
}
