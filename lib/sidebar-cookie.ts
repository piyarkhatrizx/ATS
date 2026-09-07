/**
 * Shared by the server layout (reads it) and the client sidebar (writes it).
 * It lives here, not in the "use client" file: non-component exports from a
 * client module become client references on the server, not the string.
 */
export const SIDEBAR_COOKIE = "ats-sidebar";
