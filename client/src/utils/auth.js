
export function getAuthPayload() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;

    // JWT structure: header.payload.signature  (all base64url encoded)
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    // Base64URL → Base64 → decode
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const jsonStr = atob(base64);
    const payload = JSON.parse(jsonStr);

    // Check token expiry (exp is Unix timestamp in seconds)
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      localStorage.removeItem("token"); // clean up expired token
      return null;
    }

    return payload; // { id, role, iat, exp, ... }
  } catch {
    return null;
  }
}

/** Convenience: return just the role string, e.g. "super-admin" */
export function getUserRole() {
  return getAuthPayload()?.role ?? null;
}

/** Convenience: return just the user id string */
export function getUserId() {
  return getAuthPayload()?.id ?? null;
}

/** True if a valid, non-expired token exists in localStorage */
export function isLoggedIn() {
  return getAuthPayload() !== null;
}
