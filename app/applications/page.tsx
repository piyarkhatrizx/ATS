import { redirect } from "next/navigation";

/** The apply-form funnel is the inbox filtered to that source. */
export default function ApplicationsRedirect() {
  redirect("/leads?source=APPLY_FORM");
}
