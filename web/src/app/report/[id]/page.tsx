import { redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

/** Legacy URL: `/report/:id` → in-dashboard report view. */
export default async function LegacyReportRedirect({ params }: Props) {
  const { id } = await params;
  redirect(`/dashboard/report/${id}`);
}
