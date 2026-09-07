import { createHash, timingSafeEqual } from "node:crypto";

/** Fixed-width digests so the compare never leaks length via a throw. */
function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

/** Basic-auth check for the inbound webhook routes. Constant time. */
export function isAuthorized(request: Request) {
  const expectedUser = process.env.POSTMARK_WEBHOOK_USERNAME;
  const expectedPassword = process.env.POSTMARK_WEBHOOK_PASSWORD;
  const header = request.headers.get("authorization");
  if (!expectedUser || !expectedPassword || !header?.startsWith("Basic ")) return false;

  const supplied = Buffer.from(header.slice(6), "base64").toString("utf8");
  return timingSafeEqual(digest(supplied), digest(`${expectedUser}:${expectedPassword}`));
}
