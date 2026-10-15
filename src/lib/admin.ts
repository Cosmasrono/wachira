import { customerFromSession } from "./customer";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, isAdminEmail, readSession } from "./session";

export type Admin = { email: string; name?: string };

/** The signed-in staff member, or null. Checks the session cookie and that they're still on the staff list. */
export async function currentAdmin(): Promise<Admin | null> {
  const user = await readSession("admin", (await cookies()).get(ADMIN_COOKIE)?.value);
  if (!user || !isAdminEmail(user.email)) return null;
  // Password-based admin sessions must still belong to a verified account and current password.
  if (/^[a-f\d]{24}$/i.test(user.uid)) {
    const account = await customerFromSession(user);
    if (!account || account.email !== user.email || !isAdminEmail(account.email)) return null;
  }
  return { email: user.email, name: user.name };
}

/** Call at the top of every admin page and server action. */
export async function requireAdmin() {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
