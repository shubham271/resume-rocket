/**
 * Detects if the current hostname is the admin subdomain.
 * Matches: admin.emplyoo.com, admin.localhost, or admin.*.lovable.app (for preview)
 */
export const isAdminSubdomain = (): boolean => {
  const hostname = window.location.hostname;
  
  // Check for admin subdomain patterns
  if (hostname.startsWith("admin.")) return true;
  
  // For local development, check URL param fallback
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return new URLSearchParams(window.location.search).has("admin");
  }
  
  return false;
};
