import { redirect } from "next/navigation";

export default async function CloseoutReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;
  redirect(`/projects/${projectId}/album`);
}
