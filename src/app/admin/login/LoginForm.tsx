"use client";

import { useRouter } from "next/navigation";
import EmailCodeForm from "@/components/EmailCodeForm";
import { sendAdminCode, verifyAdminCode } from "../actions";

export default function LoginForm() {
  const router = useRouter();
  return <EmailCodeForm send={sendAdminCode} verify={verifyAdminCode} onSignedIn={() => router.replace("/admin/orders")} />;
}
