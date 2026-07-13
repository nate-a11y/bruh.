// Admin configuration
// Only these email addresses have access to the admin interface

const ADMIN_EMAILS = [
  "nate@lakeridepros.com",
  "optimisticnate@gmail.com",
];

export function isAdmin(email: string | undefined | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}
