import { notFound } from "next/navigation";
import { cases, policies } from "@/lib/db";
import { serializeCase } from "@/lib/serialize";
import ReportClient from "@/app/dashboard/reports/[id]/ReportClient";

export const dynamic = "force-dynamic";

export default async function PublicReportPage({
  params,
}: PageProps<"/r/[token]">) {
  const { token } = await params;
  if (!token || token.length < 16) notFound();

  const casesCol = await cases();
  const caseDoc = await casesCol.findOne({ "share.token": token });
  if (!caseDoc) notFound();

  const policiesCol = await policies();
  const policy = await policiesCol.findOne(
    { _id: caseDoc.policy_id },
    { projection: { insurer: 1, policy_name: 1 } },
  );

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        <ReportClient initial={serializeCase(caseDoc, policy)} mode="public" />
      </div>
    </main>
  );
}
