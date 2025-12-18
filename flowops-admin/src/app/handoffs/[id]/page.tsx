// src/app/handoffs/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";

type Artifact = {
  id: string;
  type: string;
  status: "ok" | "failed";
  outputJson: string;
  updatedAt: string;
};

type Handoff = {
  id: string;
  status: string;
  priority: string;
  reason: string;
  slaDueAt?: string | null;
  slaBreachedAt?: string | null;
};

/** Artifact payloads we render nicely */
type HandoffSummaryV1 = {
  version: "handoff_summary.v1";
  generatedAt?: string;
  handoffId?: string;
  summaryText?: string;
  keyFacts?: string[];
  risks?: string[];
  recommendedHumanNextStep?: string;
};

type RiskAssessmentV1 = {
  version: "risk_assessment.v1";
  generatedAt?: string;
  handoffId?: string;
  riskLevel?: "low" | "medium" | "high";
  reasons?: string[];
  attentionFlags?: string[];
  confidence?: number;
};

type ReplyDraftV1 = {
  version: "reply_draft.v1";
  generatedAt?: string;
  handoffId?: string;
  draftText?: string;
  tone?: string;
  citations?: string[];
  disclaimers?: string[];
};

function safeParseJson<T>(s: string): T | null {
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

function prettyJson(s: string) {
  try {
    return JSON.stringify(JSON.parse(s), null, 2);
  } catch {
    return s;
  }
}

function pillTone(value: string) {
  switch (value) {
    case "resolved":
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    case "claimed":
      return "bg-blue-50 text-blue-800 border-blue-200";
    case "pending":
      return "bg-amber-50 text-amber-800 border-amber-200";
    case "high":
      return "bg-red-50 text-red-800 border-red-200";
    case "med":
      return "bg-amber-50 text-amber-800 border-amber-200";
    case "low":
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    default:
      return "bg-neutral-50 text-neutral-800 border-neutral-200";
  }
}

function riskTone(level?: string) {
  switch (level) {
    case "high":
      return "bg-red-50 text-red-800 border-red-200";
    case "medium":
      return "bg-amber-50 text-amber-800 border-amber-200";
    case "low":
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    default:
      return "bg-neutral-50 text-neutral-800 border-neutral-200";
  }
}

function formatFlag(flag: string) {
  return flag
    .split("_")
    .map((w) => w.slice(0, 1).toUpperCase() + w.slice(1))
    .join(" ");
}

export default async function HandoffDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!id) notFound();

  const handoff = await apiGet<Handoff>(`/handoffs/${id}`);
  const artifacts = await apiGet<Artifact[]>(`/debug/ai/artifacts/${id}`);

  const summary = artifacts.find((a) => a.type === "handoff_summary.v1");
  const draft = artifacts.find((a) => a.type === "reply_draft.v1");
  const risk = artifacts.find((a) => a.type === "risk_assessment.v1");

  async function action(formData: FormData) {
    "use server";
    const kind = String(formData.get("kind"));

    switch (kind) {
      case "draft":
        await apiPost(`/handoffs/${id}/ai/draft`);
        break;
      case "risk":
        await apiPost(`/handoffs/${id}/ai/risk`);
        break;
      case "claim":
        await apiPost(`/handoffs/${id}/claim`);
        break;
      case "resolve":
        await apiPost(`/handoffs/${id}/resolve`);
        break;
    }
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-8">
      <div className="mx-auto w-full max-w-5xl">
        <Link
          className="text-sm text-neutral-700 underline underline-offset-4 hover:text-black"
          href="/handoffs"
        >
          ← Back to handoffs
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">
              Handoff <span className="font-mono text-lg">{handoff.id}</span>
            </h1>

            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <span
                className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${pillTone(
                  handoff.status
                )}`}
              >
                status: {handoff.status}
              </span>

              <span
                className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${pillTone(
                  handoff.priority
                )}`}
              >
                priority: {handoff.priority}
              </span>

              <span className="inline-flex items-center rounded-full border border-neutral-200 bg-white px-2 py-1 text-xs font-medium text-neutral-800">
                reason: {handoff.reason}
              </span>

              <span className="inline-flex items-center rounded-full border border-neutral-200 bg-white px-2 py-1 text-xs font-medium text-neutral-800">
                SLA:{" "}
                {handoff.slaBreachedAt ? (
                  <span className="ml-1 text-red-700">BREACHED</span>
                ) : (
                  <span className="ml-1 text-neutral-700">
                    {handoff.slaDueAt ?? "-"}
                  </span>
                )}
              </span>
            </div>
          </div>

          <form action={action} className="flex flex-wrap gap-2">
            <button
              name="kind"
              value="draft"
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm transition hover:bg-neutral-100 hover:border-neutral-300 active:scale-[0.99]"
            >
              Draft Reply
            </button>
            <button
              name="kind"
              value="risk"
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm transition hover:bg-neutral-100 hover:border-neutral-300 active:scale-[0.99]"
            >
              Run Risk Check
            </button>
            <button
              name="kind"
              value="claim"
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm transition hover:bg-neutral-100 hover:border-neutral-300 active:scale-[0.99]"
            >
              Assign to Me
            </button>
            <button
              name="kind"
              value="resolve"
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm transition hover:bg-neutral-100 hover:border-neutral-300 active:scale-[0.99]"
            >
              Mark Resolved
            </button>
          </form>
        </div>

        <div className="mt-6 grid gap-4">
          <ArtifactBlock title="AI Summary" artifact={summary} />
          <ArtifactBlock
            title="AI Risk Assessment"
            artifact={risk}
            emptyText="Risk scoring not generated yet."
          />
          <ArtifactBlock title="AI Reply Draft" artifact={draft} />
        </div>
      </div>
    </main>
  );
}

function ArtifactBlock({
  title,
  artifact,
  emptyText = "No artifact yet."
}: {
  title: string;
  artifact?: Artifact;
  emptyText?: string;
}) {
  if (!artifact) {
    return (
      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-semibold text-neutral-900">{title}</h2>
        </div>
        <div className="mt-2 text-sm text-neutral-600">{emptyText}</div>
      </section>
    );
  }

  const updated = new Date(artifact.updatedAt).toLocaleString();
  const statusPill =
    artifact.status === "ok"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-red-200 bg-red-50 text-red-800";

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-semibold text-neutral-900">{title}</h2>
        <span
          className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${statusPill}`}
        >
          {artifact.status}
        </span>
      </div>

      <div className="mt-1 text-sm text-neutral-600">Updated: {updated}</div>

      <div className="mt-4">
        {artifact.type === "handoff_summary.v1" ? (
          <SummaryView raw={artifact.outputJson} />
        ) : artifact.type === "risk_assessment.v1" ? (
          <RiskView raw={artifact.outputJson} />
        ) : artifact.type === "reply_draft.v1" ? (
          <DraftView raw={artifact.outputJson} />
        ) : (
          <FallbackView />
        )}
      </div>

      <details className="mt-4">
        <summary className="cursor-pointer select-none text-sm text-neutral-700 underline underline-offset-4 hover:text-black">
          View raw JSON
        </summary>
        <pre className="mt-3 max-h-[420px] overflow-auto whitespace-pre-wrap break-words leading-relaxed rounded-xl border border-neutral-200 bg-neutral-950 p-4 text-xs text-neutral-100 shadow-inner">
          {prettyJson(artifact.outputJson)}
        </pre>
      </details>
    </section>
  );
}

function SummaryView({ raw }: { raw: string }) {
  const data = safeParseJson<HandoffSummaryV1>(raw);
  if (!data) return <InvalidJsonNotice />;

  return (
    <div className="space-y-4 text-sm text-neutral-900">
      {data.summaryText ? (
        <div>
          <div className="text-xs font-medium text-neutral-600">Summary</div>
          <p className="mt-1 leading-relaxed text-neutral-900">{data.summaryText}</p>
        </div>
      ) : null}

      {data.keyFacts?.length ? (
        <div>
          <div className="text-xs font-medium text-neutral-600">Key facts</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-800">
            {data.keyFacts.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {data.risks?.length ? (
        <div>
          <div className="text-xs font-medium text-neutral-600">Risks / watch-outs</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-800">
            {data.risks.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {data.recommendedHumanNextStep ? (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
          <div className="text-xs font-medium text-neutral-600">Recommended next step</div>
          <p className="mt-1 text-neutral-900">{data.recommendedHumanNextStep}</p>
        </div>
      ) : null}
    </div>
  );
}

function RiskView({ raw }: { raw: string }) {
  const data = safeParseJson<RiskAssessmentV1>(raw);
  if (!data) return <InvalidJsonNotice />;

  return (
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-neutral-600">Risk level</span>
        <span
          className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${riskTone(
            data.riskLevel
          )}`}
        >
          {data.riskLevel ?? "unknown"}
        </span>

        {typeof data.confidence === "number" ? (
          <span className="ml-1 text-xs text-neutral-600">
            confidence: <span className="font-medium text-neutral-900">{data.confidence}</span>
          </span>
        ) : null}
      </div>

      {data.reasons?.length ? (
        <div>
          <div className="text-xs font-medium text-neutral-600">Why this is risky</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-800">
            {data.reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {data.attentionFlags?.length ? (
        <div>
          <div className="text-xs font-medium text-neutral-600">Attention flags</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {data.attentionFlags.map((f, i) => (
              <span
                key={i}
                className="inline-flex items-center rounded-full border border-neutral-200 bg-white px-2 py-1 text-xs font-medium text-neutral-800"
              >
                {formatFlag(f)}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DraftView({ raw }: { raw: string }) {
  const data = safeParseJson<ReplyDraftV1>(raw);
  if (!data) return <InvalidJsonNotice />;

  return (
    <div className="space-y-4 text-sm text-neutral-900">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-neutral-600">Tone</span>
        <span className="inline-flex items-center rounded-full border border-neutral-200 bg-white px-2 py-1 text-xs font-medium text-neutral-800">
          {data.tone ?? "unspecified"}
        </span>
      </div>

      {data.draftText ? (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
          <div className="text-xs font-medium text-neutral-600">Email body (copy-ready)</div>
          <pre className="mt-2 whitespace-pre-wrap break-words leading-relaxed text-neutral-900">
            {data.draftText}
          </pre>
        </div>
      ) : null}

      {data.citations?.length ? (
        <div>
          <div className="text-xs font-medium text-neutral-600">Facts used</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-800">
            {data.citations.map((c, i) => (
              <li key={i} className="font-mono text-xs">
                {c}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <div className="text-xs font-medium text-neutral-600">Disclaimers</div>
        {data.disclaimers?.length ? (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-800">
            {data.disclaimers.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        ) : (
          <div className="mt-1 text-neutral-600">None</div>
        )}
      </div>
    </div>
  );
}

function FallbackView() {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
      <div className="text-xs font-medium text-neutral-600">Preview</div>
      <div className="mt-1">This artifact type doesn’t have a custom renderer yet.</div>
    </div>
  );
}

function InvalidJsonNotice() {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
      <div className="text-xs font-medium text-red-800">Unable to render</div>
      <div className="mt-1">Artifact JSON could not be parsed. Use “View raw JSON” below.</div>
    </div>
  );
}
