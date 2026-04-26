import OpenAI from "openai";
import { cases, policies, toObjectId } from "@/lib/db";
import { requireUser, HttpError } from "@/lib/session";
import { retrievePolicyChunks } from "@/lib/rag";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  baseURL: process.env.OPENAI_API_BASE,
});

const MODEL = process.env.LLM ?? "gpt-5.4-mini-2026-03-17";

const SYSTEM_PROMPT = `You draft short, professional emails from a policyholder to their Indian health-insurance company.

Goal: a clear, polite, firm email that requests resolution of a specific issue with a claim or policy.

Rules:
- Keep the email concise: 4-7 short sentences in the body, no fluff.
- Subject line should be specific (mention the policy number or claim and the issue type).
- Body must reference the specific facts from the CLAIM CONTEXT and any discrepancies provided.
- When citing policy clauses, paraphrase briefly — do not invent clause numbers or amounts not in context.
- Use placeholders like [Your Name], [Policy Number], [Claim Reference], [Phone] only if those details are not provided.
- End with a clear ask (e.g., "Please review and confirm coverage" / "Please share the rejection reason in writing" / "Please advise on documents needed").
- Sign-off: "Regards," then "[Your Name]".
- Tone: respectful, factual, no threats.

OUTPUT MUST BE VALID JSON ONLY:
{
  "subject": string,
  "body": string,
  "to_hint": string
}

"to_hint" is the recommended recipient (e.g. "claims@<insurer>.com or the insurer's grievance officer"). If unsure, suggest the insurer's claims/grievance email pattern.`;

function safeJSONParse(text: string): unknown {
  try {
    const cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .replace(/^[^{]*/, "")
      .trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/cases/[id]/draft-email">,
) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const oid = toObjectId(id);
    if (!oid) {
      return Response.json({ error: "Case not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const userInstruction =
      typeof body?.instruction === "string"
        ? body.instruction.trim().slice(0, 600)
        : "";

    const casesCol = await cases();
    const caseDoc = await casesCol.findOne({ _id: oid, user_id: user._id });
    if (!caseDoc) {
      return Response.json({ error: "Case not found" }, { status: 404 });
    }

    const policiesCol = await policies();
    const policyDoc = await policiesCol.findOne({
      _id: caseDoc.policy_id,
      user_id: user._id,
    });
    if (!policyDoc) {
      return Response.json(
        { error: "Linked policy not found" },
        { status: 404 },
      );
    }

    const userIdStr = user._id.toHexString();
    const policyIdStr = policyDoc._id.toHexString();

    const seedQuery =
      userInstruction ||
      caseDoc.analysis?.discrepancies?.[0]?.title ||
      caseDoc.diagnosis ||
      "claim coverage and exclusions";

    let policyContext = "";
    try {
      const chunks = await retrievePolicyChunks(seedQuery, {
        policyId: policyIdStr,
        userId: userIdStr,
        topK: 5,
      });
      policyContext = chunks
        .map((c, i) => `[Clause ${i + 1}] ${c.text}`)
        .join("\n\n");
    } catch (err) {
      console.error("Policy retrieval failed:", err);
    }

    const claimLines: string[] = [];
    claimLines.push(`Patient: ${caseDoc.patient_name}`);
    if (caseDoc.diagnosis) claimLines.push(`Diagnosis: ${caseDoc.diagnosis}`);
    if (caseDoc.hospital) claimLines.push(`Hospital: ${caseDoc.hospital}`);
    if (caseDoc.admission_date)
      claimLines.push(`Admission date: ${caseDoc.admission_date}`);
    if (caseDoc.analysis) {
      claimLines.push(`\nAnalysis status: ${caseDoc.analysis.status}`);
      if (caseDoc.analysis.summary)
        claimLines.push(`Summary: ${caseDoc.analysis.summary}`);
      if (caseDoc.analysis.discrepancies?.length) {
        claimLines.push(`Flagged issues:`);
        for (const d of caseDoc.analysis.discrepancies.slice(0, 6)) {
          claimLines.push(`- [${d.severity}] ${d.title}: ${d.detail}`);
        }
      }
    }
    const claimContext = claimLines.join("\n");

    const policyMeta = [
      `Insurer: ${policyDoc.insurer}`,
      policyDoc.policy_name ? `Policy: ${policyDoc.policy_name}` : "",
      policyDoc.policy_number
        ? `Policy number: ${policyDoc.policy_number}`
        : "",
      policyDoc.sum_insured ? `Sum insured: ${policyDoc.sum_insured}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const userTurn = `INSURER & POLICY:
${policyMeta}

CLAIM CONTEXT:
${claimContext}

POLICY CLAUSES (retrieved):
${policyContext || "(none)"}

USER INSTRUCTION (optional, may be empty):
${userInstruction || "(no specific instruction — write the most useful email based on the analysis)"}

Draft the email now.`;

    const completion = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userTurn },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = safeJSONParse(raw) as Record<string, unknown> | null;

    if (!parsed) {
      return Response.json(
        { error: "Could not draft email. Please try again." },
        { status: 502 },
      );
    }

    const subject =
      typeof parsed.subject === "string" && parsed.subject.trim()
        ? parsed.subject.trim()
        : `Regarding claim for ${caseDoc.patient_name}`;
    const draftBody =
      typeof parsed.body === "string" && parsed.body.trim()
        ? parsed.body.trim()
        : "";
    const toHint =
      typeof parsed.to_hint === "string" ? parsed.to_hint.trim() : "";

    if (!draftBody) {
      return Response.json(
        { error: "Empty draft returned. Please try again." },
        { status: 502 },
      );
    }

    return Response.json({
      draft: {
        subject,
        body: draftBody,
        to_hint: toHint,
        insurer: policyDoc.insurer,
      },
    });
  } catch (e) {
    return handleError(e);
  }
}

function handleError(e: unknown) {
  if (e instanceof HttpError) {
    return Response.json({ error: e.message }, { status: e.status });
  }
  console.error("DRAFT EMAIL ERROR:", e);
  const msg = e instanceof Error ? e.message : "Internal error";
  return Response.json({ error: msg }, { status: 500 });
}
