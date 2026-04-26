import OpenAI from "openai";
import { cases, policies, toObjectId } from "@/lib/db";
import { requireUser, HttpError } from "@/lib/session";
import { retrievePolicyChunks } from "@/lib/rag";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  baseURL: process.env.OPENAI_API_BASE,
});

const MODEL = process.env.LLM ?? "gpt-5.4-mini-2026-03-17";

const SYSTEM_PROMPT = `You are Indira, a friendly and precise Indian health-insurance policy assistant.

You help the user understand their specific insurance policy and how it applies to their current claim case. You answer the user's questions using ONLY the provided POLICY CONTEXT and CLAIM CONTEXT. If the answer isn't in the context, say so clearly and suggest what document or detail would be needed.

Guidelines:
- Be conversational, warm, and concise. Aim for 2-5 short paragraphs unless the user asks for detail.
- When citing policy rules, quote the clause briefly in italics-style with quotes.
- If a claim-specific issue applies, mention it (e.g. waiting periods, sub-limits, exclusions) and how it affects this case.
- Never invent clauses, numbers, or limits that aren't in the context.
- If asked something outside the policy/claim scope, gently steer back.
- Use plain English. Avoid heavy legalese.
- Use markdown sparingly: short bullet lists are fine, no big headings.`;

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function sanitizeHistory(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  const out: ChatMessage[] = [];
  for (const m of raw) {
    if (!m || typeof m !== "object") continue;
    const role = (m as { role?: unknown }).role;
    const content = (m as { content?: unknown }).content;
    if ((role === "user" || role === "assistant") && typeof content === "string") {
      const trimmed = content.trim();
      if (trimmed.length === 0) continue;
      out.push({ role, content: trimmed.slice(0, 4000) });
    }
  }
  return out.slice(-10);
}

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/cases/[id]/chat">,
) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const oid = toObjectId(id);
    if (!oid) {
      return Response.json({ error: "Case not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    const question = typeof body?.question === "string" ? body.question.trim() : "";
    const history = sanitizeHistory(body?.history);

    if (!question) {
      return Response.json({ error: "Question is required" }, { status: 400 });
    }
    if (question.length > 1000) {
      return Response.json(
        { error: "Question is too long (max 1000 chars)" },
        { status: 400 },
      );
    }

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

    const retrievalQuery = [
      question,
      caseDoc.diagnosis ? `diagnosis: ${caseDoc.diagnosis}` : "",
    ]
      .filter(Boolean)
      .join(". ");

    let policyContext = "";
    try {
      const chunks = await retrievePolicyChunks(retrievalQuery, {
        policyId: policyIdStr,
        userId: userIdStr,
        topK: 8,
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
      claimLines.push(`\nLatest analysis:`);
      claimLines.push(`- Status: ${caseDoc.analysis.status}`);
      claimLines.push(`- Risk score: ${caseDoc.analysis.risk_score}/100`);
      if (caseDoc.analysis.summary)
        claimLines.push(`- Summary: ${caseDoc.analysis.summary}`);
      if (caseDoc.analysis.discrepancies?.length) {
        claimLines.push(`- Flagged issues:`);
        for (const d of caseDoc.analysis.discrepancies.slice(0, 8)) {
          claimLines.push(
            `  • [${d.severity}] ${d.title} — ${d.detail}`,
          );
        }
      }
    }
    const claimContext = claimLines.join("\n");

    const policyMeta = [
      `Insurer: ${policyDoc.insurer}`,
      policyDoc.policy_name ? `Policy: ${policyDoc.policy_name}` : "",
      policyDoc.sum_insured ? `Sum insured: ${policyDoc.sum_insured}` : "",
      policyDoc.valid_till ? `Valid till: ${policyDoc.valid_till}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const userTurn = `POLICY METADATA:
${policyMeta}

POLICY CONTEXT (retrieved clauses):
${policyContext || "(no clauses retrieved)"}

CLAIM CONTEXT:
${claimContext}

USER QUESTION:
${question}`;

    const completion = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: userTurn },
      ],
    });

    const answer =
      completion.choices[0]?.message?.content?.trim() ||
      "I couldn't generate a response. Please try rephrasing your question.";

    return Response.json({ answer });
  } catch (e) {
    return handleError(e);
  }
}

function handleError(e: unknown) {
  if (e instanceof HttpError) {
    return Response.json({ error: e.message }, { status: e.status });
  }
  console.error("CHAT ERROR:", e);
  const msg = e instanceof Error ? e.message : "Internal error";
  return Response.json({ error: msg }, { status: 500 });
}
