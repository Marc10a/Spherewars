import { notFound } from "next/navigation";

// Any URL under a language that matches no page: answer 404 inside the site layout (header, footer, language) instead of the bare global page.
// (Metadata here would not reach the 404: its title comes from not-found.tsx.)
export default function Unmatched(): never {
  notFound();
}
