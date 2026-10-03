import CartDrawer from "@/components/CartDrawer";
import { CartProvider } from "@/components/CartProvider";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import WhatsAppButton from "@/components/WhatsAppButton";
import { FREE_NAIROBI_OVER } from "@/lib/config";
import { ksh } from "@/lib/format";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <div className="announce">
        Free delivery in Nairobi from {ksh(FREE_NAIROBI_OVER)} · Pay with M-Pesa
      </div>
      <Header />
      <main className="wrap">{children}</main>
      <Footer />
      <CartDrawer />
      <WhatsAppButton />
    </CartProvider>
  );
}
