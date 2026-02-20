import { redirect } from "next/navigation";

export default async function MobileCloseoutReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;
  redirect(`/projects/${projectId}/album`);
}
