/**
 * Detects if the current hostname is the admin subdomain.
 * Matches: admin.emplyoo.com, admin.localhost, or admin.*.lovable.app (for preview)
 */
export const isAdminSubdomain = (): boolean => {
  const hostname = window.location.hostname;
  
  // Check for admin subdomain patterns
  if (hostname.startsWith("admin.")) return true;
  
  // For development/preview, check URL param or path fallback
  const params = new URLSearchParams(window.location.search);
  if (params.has("admin")) return true;

  // Check if path starts with /admin
  if (window.location.pathname.startsWith("/admin")) return true;
  
  return false;
};
