import { hasServiceRole } from "@/lib/supabase/admin";

/** What is configured to receive contact messages. The public form is only offered when at least one channel works. */
export function contactChannels() {
  return {
    email: Boolean(process.env.RESEND_API_KEY && process.env.CONTACT_TO_EMAIL && process.env.CONTACT_FROM_EMAIL),
    database: hasServiceRole(),
  };
}

/** Public contact address shown on the site, only when the owner sets it. Never invented. */
export const publicContactEmail = () => process.env.NEXT_PUBLIC_CONTACT_EMAIL || null;
