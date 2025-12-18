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
              Generate Draft
            </button>
            <button
              name="kind"
              value="risk"
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm transition hover:bg-neutral-100 hover:border-neutral-300 active:scale-[0.99]"
            >
              Generate Risk
            </button>
            <button
              name="kind"
              value="claim"
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm transition hover:bg-neutral-100 hover:border-neutral-300 active:scale-[0.99]"
            >
              Claim
            </button>
            <button
              name="kind"
              value="resolve"
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm transition hover:bg-neutral-100 hover:border-neutral-300 active:scale-[0.99]"
            >
              Resolve
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
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-semibold text-neutral-900">{title}</h2>
        {artifact && (
          <span
            className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${
              artifact.status === "ok"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {artifact.status}
          </span>
        )}
      </div>

      <div className="mt-1 text-sm text-neutral-600">
        {artifact ? (
          <span>Updated: {new Date(artifact.updatedAt).toLocaleString()}</span>
        ) : (
          emptyText
        )}
      </div>

      {artifact && (
        <pre className="mt-3 max-h-[420px] overflow-auto whitespace-pre-wrap break-words leading-relaxed rounded-xl border border-neutral-200 bg-neutral-950 p-4 text-xs text-neutral-100 shadow-inner">
          {prettyJson(artifact.outputJson)}
        </pre>
      )}
    </section>
  );
}
