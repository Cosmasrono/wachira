"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { db, Prisma } from "@/lib/db";
import { slugify } from "@/lib/format";
import { allowCodeSend } from "@/lib/auth";
import { checkLoginCode, normalizeEmail, sendLoginCode } from "@/lib/login-code";
import { isStatus, nextActions } from "@/lib/order-status";
import { ADMIN_COOKIE, SESSION_DAYS, createSession, isAdminEmail, sessionsConfigured } from "@/lib/session";
import { productInput } from "@/lib/validation";
import { processOrderMailJobs, queueOrderPaidEmails } from "@/lib/order-mail";

export type FormState = { error: string };

/**
 * Emails a sign-in code, but only to addresses on the staff list. Other addresses get the same
 * reply (and use up the same send limits), so the form can't be used to find out who is staff.
 */
export async function sendAdminCode(email: string): Promise<FormState> {
  if (!sessionsConfigured()) return { error: "Set AUTH_SECRET (32+ characters) in the .env file first." };
  if (!isAdminEmail(email.trim())) {
    const allowed = await allowCodeSend("code-send:admin", normalizeEmail(email));
    return { error: allowed.ok ? "" : allowed.error };
  }
  const sent = await sendLoginCode("admin", email);
  return { error: sent.ok ? "" : sent.error };
}

/** Swaps a correct emailed code for an admin session cookie. */
export async function verifyAdminCode(email: string, code: string): Promise<FormState> {
  if (!sessionsConfigured()) return { error: "Set AUTH_SECRET (32+ characters) in the .env file first." };
  const user = await checkLoginCode("admin", email, code);
  if (!user || !isAdminEmail(user.email)) return { error: "That code is wrong or has expired. Check it, or send a new one." };

  (await cookies()).set(ADMIN_COOKIE, await createSession("admin", user, SESSION_DAYS), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return { error: "" };
}

export async function logout() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin/login");
}

export async function updateOrderStatus(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 300);

  const order = await db.order.findUnique({ where: { id } });
  if (!order || !isStatus(status) || !nextActions(order).includes(status)) return;

  await db.$transaction(async (tx) => {
    const changed = await tx.order.updateMany({
      where: { id, status: order.status },
      data: {
        status,
        ...(status === "PAID" && !order.paidAt ? { paidAt: new Date(), paymentNote: null } : {}),
      },
    });
    if (!changed.count) return;
    await tx.orderEvent.create({
      data: { orderId: id, status, note: note || (status === "PAID" ? "Payment confirmed by admin" : "") },
    });
    if (status === "PAID") await queueOrderPaidEmails(tx, id);
  });
  if (status === "PAID") after(() => processOrderMailJobs(id));
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
}

export async function saveProduct(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const raw = Object.fromEntries(formData);
  const parsed = productInput.safeParse({
    ...raw,
    id: raw.id || undefined,
    allowCustom: raw.allowCustom === "on",
    featured: raw.featured === "on",
    active: raw.active === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };

  const { id, ...v } = parsed.data;
  const data = {
    ...v,
    slug: slugify(v.slug || v.name),
    image: v.image || null,
    image2: v.image2 || null,
    badge: v.badge || null,
  };

  try {
    if (id) await db.product.update({ where: { id }, data });
    else await db.product.create({ data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Another product already uses that link name. Change the name or link name." };
    }
    throw e;
  }

  revalidatePath("/", "layout");
  redirect("/admin/products");
}
