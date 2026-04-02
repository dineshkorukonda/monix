import { redirect } from "next/navigation";

/** Redirects to Projects with the add form in view. */
export default function NewTargetRedirectPage() {
  redirect("/dashboard/sites?add=1");
}
