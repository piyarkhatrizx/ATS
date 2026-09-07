import { redirect } from "next/navigation";

/**
 * The candidate LIST is now the inbox. /candidates/[id] stays — it is the
 * person's record and holds the activity timeline.
 *
 * Note this redirect changes the unit of the view: /candidates listed one row
 * per PERSON, /leads lists one row per APPLICATION. The +N chip on a row is
 * what carries the "this person is already in the pipeline" signal across.
 */
export default function CandidatesRedirect() {
  redirect("/leads");
}
