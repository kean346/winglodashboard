import { JobWorkspace } from "../../_components/winglo/job-workspace";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <JobWorkspace key={id} recordId={id} />;
}
