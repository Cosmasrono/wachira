import type { Metadata } from "next";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Admin login", robots: { index: false } };

export default function AdminLogin() {
  return (
    <main className="admin-login">
      <h1>Wachira admin</h1>
      <LoginForm />
    </main>
  );
}
