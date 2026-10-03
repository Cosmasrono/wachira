"use client";

import { useRouter } from "next/navigation";
import EmailCodeForm from "@/components/EmailCodeForm";
import { sendCustomerCode, verifyCustomerCode } from "./actions";

export default function AccountForm({ next }: { next: string }) {
  const router = useRouter();
  return (
    <EmailCodeForm
      send={sendCustomerCode}
      verify={verifyCustomerCode}
      onSignedIn={() => {
        router.replace(next);
        router.refresh();
      }}
    />
  );
}
