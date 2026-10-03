import { SITE } from "@/lib/config";

export default function WhatsAppButton() {
  const text = encodeURIComponent("Hi Wachira, I have a question about an item.");
  return (
    <a className="wa" href={`https://wa.me/${SITE.whatsapp}?text=${text}`} target="_blank" rel="noopener noreferrer">
      Chat on WhatsApp
    </a>
  );
}
