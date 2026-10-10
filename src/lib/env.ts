/** Validate settings without including their values in errors. */
export function validateProductionEnv(env: NodeJS.ProcessEnv = process.env) {
  if (env.NODE_ENV !== "production") return;
  const errors: string[] = [];
  for (const key of ["AUTH_SECRET", "MPESA_CALLBACK_SECRET", "JOBS_SECRET"]) {
    if ((env[key] ?? "").length < 32) errors.push(`${key} must contain at least 32 characters`);
  }
  if (env.MPESA_MODE === "mock") errors.push("MPESA_MODE=mock is disabled in production");
  if (!['sandbox', 'production'].includes(env.MPESA_ENV ?? '')) errors.push("MPESA_ENV must be sandbox or production");
  try {
    const url = new URL(env.APP_URL ?? "");
    if (url.protocol !== "https:" || url.username || url.password) throw new Error();
  } catch { errors.push("APP_URL must be an HTTPS URL without credentials"); }
  if (!/^mongodb(\+srv)?:\/\//.test(env.DATABASE_URL ?? "")) errors.push("DATABASE_URL must use MongoDB");
  for (const key of ["MPESA_CONSUMER_KEY", "MPESA_CONSUMER_SECRET", "MPESA_SHORTCODE", "MPESA_PASSKEY", "MAIL_HOST", "MAIL_USERNAME", "MAIL_PASSWORD", "ADMIN_EMAILS"]) {
    if (!env[key]?.trim()) errors.push(`${key} is required`);
  }
  if (!['tls', 'ssl'].includes(env.MAIL_ENCRYPTION ?? '')) errors.push("MAIL_ENCRYPTION must be tls or ssl");
  if (errors.length) throw new Error(`Invalid production configuration: ${errors.join("; ")}`);
}
