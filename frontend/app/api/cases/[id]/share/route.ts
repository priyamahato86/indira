import { randomBytes } from "crypto";
import { cases, policies, toObjectId, type ShareInfo } from "@/lib/db";
import { requireUser, HttpError } from "@/lib/session";
import { serializeCase } from "@/lib/serialize";

export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/cases/[id]/share">,
) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const oid = toObjectId(id);
    if (!oid) {
      return Response.json({ error: "Case not found" }, { status: 404 });
    }

    const casesCol = await cases();
    const caseDoc = await casesCol.findOne({ _id: oid, user_id: user._id });
    if (!caseDoc) {
      return Response.json({ error: "Case not found" }, { status: 404 });
    }

    let share: ShareInfo;
    if (caseDoc.share?.token) {
      share = caseDoc.share;
    } else {
      share = {
        token: randomBytes(24).toString("base64url"),
        created_at: new Date(),
      };
      await casesCol.updateOne(
        { _id: oid, user_id: user._id },
        { $set: { share } },
      );
      caseDoc.share = share;
    }

    const policiesCol = await policies();
    const policy = await policiesCol.findOne(
      { _id: caseDoc.policy_id },
      { projection: { insurer: 1, policy_name: 1 } },
    );

    return Response.json({ case: serializeCase(caseDoc, policy) });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/cases/[id]/share">,
) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const oid = toObjectId(id);
    if (!oid) {
      return Response.json({ error: "Case not found" }, { status: 404 });
    }

    const casesCol = await cases();
    const result = await casesCol.findOneAndUpdate(
      { _id: oid, user_id: user._id },
      { $unset: { share: "" } },
      { returnDocument: "after" },
    );
    if (!result) {
      return Response.json({ error: "Case not found" }, { status: 404 });
    }

    const policiesCol = await policies();
    const policy = await policiesCol.findOne(
      { _id: result.policy_id },
      { projection: { insurer: 1, policy_name: 1 } },
    );

    return Response.json({ case: serializeCase(result, policy) });
  } catch (e) {
    return handleError(e);
  }
}

function handleError(e: unknown) {
  if (e instanceof HttpError) {
    return Response.json({ error: e.message }, { status: e.status });
  }
  console.error("SHARE ERROR:", e);
  const msg = e instanceof Error ? e.message : "Internal error";
  return Response.json({ error: msg }, { status: 500 });
}
