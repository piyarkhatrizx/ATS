import { auth } from "@/lib/auth-config";

/**
 * The only auth API the app uses.
 *
 * `auth()` is called in exactly one place — here. No page, action, component or
 * route reads the session, the cookie or the env var directly. Swapping to a
 * different provider means rewriting these two functions and lib/auth-config.ts,
 * and touching nothing else.
 */

export type KoroshaUser = {
  id: string;
  email: string | null;
  name: string | null;
};

/**
 * The signed-in user, or null.
 *
 * auth() reads headers(), which THROWS SYNCHRONOUSLY outside a request scope —
 * a .catch() on the promise never runs, so this needs try/catch. Scripts and
 * tests therefore see null rather than crashing.
 */
export async function getUser(): Promise<KoroshaUser | null> {
  try {
    const session = await auth();
    const user = session?.user;
    if (!user?.id) return null;
    return { id: user.id, email: user.email ?? null, name: user.name ?? null };
  } catch {
    return null;
  }
}

/**
 * The signed-in user, or throws.
 *
 * For server actions and routes that must not proceed anonymously. Middleware
 * already gates the recruiter routes, so reaching this and failing means either
 * a matcher gap or a direct call — both worth surfacing loudly.
 */
export async function requireUser(): Promise<KoroshaUser> {
  const user = await getUser();
  if (!user) throw new Error("Not signed in");
  return user;
}

export { signIn, signOut } from "@/lib/auth-config";
