import Link from "next/link";
import { redirect } from "next/navigation";
import { consultationHref, whatsappConfigured } from "@/lib/consultation";

export default function ContactPage() {
  if (whatsappConfigured()) redirect(consultationHref());
  return <section className="first"><p className="label">Wachira consultations</p><h1>Let’s find your fit.</h1>
    <p>Our WhatsApp consultation service will be available soon. Please check back to discuss your preferred style, fabric and measurements.</p>
    <Link className="btn primary" href="/shop">Explore the catalogue</Link>
  </section>;
}
