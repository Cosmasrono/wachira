import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CUSTOMER_COOKIE, readSession, type SessionUser } from "./session";

export type Customer = SessionUser;

/** The signed-in shopper, or null. A session is only ever issued for a verified email. */
export async function currentCustomer(): Promise<Customer | null> {
  return readSession("customer", (await cookies()).get(CUSTOMER_COOKIE)?.value);
}

/** Sends shoppers who aren't signed in to /account, then back to `next`. */
export async function requireCustomer(next: string) {
  const customer = await currentCustomer();
  if (!customer) redirect(`/login?next=${encodeURIComponent(next)}`);
  return customer;
}

/** Only same-site paths, so a crafted link can't send shoppers elsewhere after sign-in. */
export function safeNext(next: string | undefined) {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/shop";
}
