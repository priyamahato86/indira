import { cases, policies } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { serializeCase } from "@/lib/serialize";
import ReportsListClient from "./ReportsListClient";
//
export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const user = await requireUser();

  const casesCol = await cases();
  const list = await casesCol
    .find({ user_id: user._id, analysis: { $ne: null } })
    .sort({ "analysis.analyzed_at": -1 })
    .toArray();

  const policiesCol = await policies();
  const policyIds = Array.from(
    new Set(list.map((c) => c.policy_id.toHexString())),
  );
  const policyDocs = policyIds.length
    ? await policiesCol
      .find(
        {
          _id: {
            $in: list.map((c) => c.policy_id),
          },
        },
        { projection: { insurer: 1, policy_name: 1 } },
      )
      .toArray()
    : [];
  const byId = new Map(policyDocs.map((p) => [p._id.toHexString(), p]));

  const initial = list
    .filter((c) => c.analysis)
    .map((c) =>
      serializeCase(c, byId.get(c.policy_id.toHexString()) ?? null),
    );

  return <ReportsListClient initial={initial} />;
}
