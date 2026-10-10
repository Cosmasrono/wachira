import { headers } from "next/headers";
import { allowAuthAttempt } from "./rate-limit";

/** Only trust a client IP header when the deployment proxy is configured to overwrite it. */
export async function allowAuthRequest(scope: string, email: string, limit = 10) {
  const header = process.env.AUTH_TRUSTED_IP_HEADER;
  if (header) {
    const ip = (await headers()).get(header)?.trim();
    if (!ip || !await allowAuthAttempt(`${scope}:ip`, ip, 50)) return false;
  }
  return allowAuthAttempt(scope, email, limit);
}
