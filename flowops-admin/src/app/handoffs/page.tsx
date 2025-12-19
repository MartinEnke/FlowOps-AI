// src/app/handoffs/page.tsx
import Link from "next/link";
import { apiGet } from "@/lib/api";

type RiskLevel = "low" | "medium" | "high" | null;

type Signals = {
  latestRiskLevel: RiskLevel;
  riskStatus: "assessed" | "not_assessed";
  slaRemainingSeconds: number | null;
  hasDraft: boolean;
  hasSummary: boolean;
  lastArtifactAt: string | null;
};

type HandoffWithSignals = {
  id: string;
  status: "pending" | "claimed" | "resolved";
  priority: "low" | "med" | "high";
  reason: string;
  customerId: string;
  ticketId: string | null;
  claimedBy: string | null;
  claimedAt: string | null;
  resolvedAt: string | null;
  slaDueAt?: string | null;
  slaBreachedAt?: string | null;
  createdAt: string;
  signals: Signals;
};

const SELECT_CLASS =
  "mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 " +
  "placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-200";

function badgeTone(value: string) {
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

function riskLabel(level: RiskLevel) {
  return level ?? "not assessed";
}

function riskTone(level: RiskLevel) {
  switch (level) {
    case "high":
      return "bg-red-50 text-red-800 border-red-200";
    case "medium":
      return "bg-amber-50 text-amber-800 border-amber-200";
    case "low":
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    default:
      return "bg-neutral-50 text-neutral-700 border-neutral-200";
  }
}

function riskRank(level: RiskLevel) {
  switch (level) {
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
    default:
      return 0;
  }
}

function toUnixMs(iso?: string | null) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : null;
}

export default async function HandoffsPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const getParam = (key: string) => {
    const v = sp[key];
    return Array.isArray(v) ? v[0] : v;
  };

  const status = getParam("status") ?? "all";
  const priority = getParam("priority") ?? "all";
  const risk = getParam("risk") ?? "all"; // low|medium|high|none|all
  const hasDraft = getParam("hasDraft") ?? "all"; // yes|no|all
  const hasSummary = getParam("hasSummary") ?? "all"; // yes|no|all
  const sort = getParam("sort") ?? "risk"; // risk|sla|newest

  // ✅ 5B: single call with computed signals
  const cases = await apiGet<HandoffWithSignals[]>("/handoffs?includeSignals=1");

  const filtered = cases.filter((r) => {
    if (status !== "all" && r.status !== status) return false;
    if (priority !== "all" && r.priority !== priority) return false;

    if (risk !== "all") {
      if (risk === "none") {
        if (r.signals.latestRiskLevel !== null) return false;
      } else {
        if (r.signals.latestRiskLevel !== risk) return false;
      }
    }

    if (hasDraft !== "all") {
      if (hasDraft === "yes" && !r.signals.hasDraft) return false;
      if (hasDraft === "no" && r.signals.hasDraft) return false;
    }

    if (hasSummary !== "all") {
      if (hasSummary === "yes" && !r.signals.hasSummary) return false;
      if (hasSummary === "no" && r.signals.hasSummary) return false;
    }

    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "sla") {
      const aBreached = a.slaBreachedAt || (a.signals.slaRemainingSeconds ?? 1) <= 0 ? 1 : 0;
      const bBreached = b.slaBreachedAt || (b.signals.slaRemainingSeconds ?? 1) <= 0 ? 1 : 0;
      if (aBreached !== bBreached) return bBreached - aBreached;

      // soonest due first
      const aDue = toUnixMs(a.slaDueAt) ?? Number.POSITIVE_INFINITY;
      const bDue = toUnixMs(b.slaDueAt) ?? Number.POSITIVE_INFINITY;
      if (aDue !== bDue) return aDue - bDue;

      return (toUnixMs(b.createdAt) ?? 0) - (toUnixMs(a.createdAt) ?? 0);
    }

    if (sort === "newest") {
      return (toUnixMs(b.createdAt) ?? 0) - (toUnixMs(a.createdAt) ?? 0);
    }

    // default: risk desc, then SLA soonest, then newest
    const ar = riskRank(a.signals.latestRiskLevel);
    const br = riskRank(b.signals.latestRiskLevel);
    if (ar !== br) return br - ar;

    const aDue = toUnixMs(a.slaDueAt) ?? Number.POSITIVE_INFINITY;
    const bDue = toUnixMs(b.slaDueAt) ?? Number.POSITIVE_INFINITY;
    if (aDue !== bDue) return aDue - bDue;

    return (toUnixMs(b.createdAt) ?? 0) - (toUnixMs(a.createdAt) ?? 0);
  });

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">
              AI-Assisted Operations Console
            </h1>
            <p className="mt-1 text-sm text-neutral-600">
              Review cases, inspect AI artifacts, and take accountable actions.
            </p>
          </div>
          <div className="text-xs text-neutral-500">
            {sorted.length} case{sorted.length === 1 ? "" : "s"}
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div className="min-w-[160px]">
              <label className="text-xs font-medium text-neutral-700">Status</label>
              <select name="status" defaultValue={status} className={SELECT_CLASS}>
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="claimed">Claimed</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>

            <div className="min-w-[160px]">
              <label className="text-xs font-medium text-neutral-700">Priority</label>
              <select name="priority" defaultValue={priority} className={SELECT_CLASS}>
                <option value="all">All</option>
                <option value="high">High</option>
                <option value="med">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div className="min-w-[160px]">
              <label className="text-xs font-medium text-neutral-700">Risk (AI)</label>
              <select name="risk" defaultValue={risk} className={SELECT_CLASS}>
                <option value="all">All</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
                <option value="none">Not assessed</option>
              </select>
            </div>

            <div className="min-w-[160px]">
              <label className="text-xs font-medium text-neutral-700">Has draft</label>
              <select name="hasDraft" defaultValue={hasDraft} className={SELECT_CLASS}>
                <option value="all">All</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>

            <div className="min-w-[160px]">
              <label className="text-xs font-medium text-neutral-700">Has summary</label>
              <select name="hasSummary" defaultValue={hasSummary} className={SELECT_CLASS}>
                <option value="all">All</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>

            {/* Sort dropdown (filters row) */}
<div className="min-w-[180px]">
  <label className="flex items-center gap-1 text-xs font-medium text-neutral-700">
    Sort
    <span className="relative group">
      <span className="cursor-help text-neutral-400">?</span>

      {/* Tooltip */}
      <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-64 -translate-x-1/2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-700 shadow-lg opacity-0 transition-opacity group-hover:opacity-100">
        Cases are sorted by AI risk first, then by SLA deadline.
        Use SLA-only sorting to prioritize time-critical cases.
      </span>
    </span>
  </label>

  <select name="sort" defaultValue={sort} className={SELECT_CLASS}>
    <option value="risk">Risk, then SLA</option>
    <option value="sla">SLA (soonest / breached)</option>
    <option value="newest">Newest</option>
  </select>
</div>

            <button className="rounded-xl border border-neutral-200 bg-neutral-900 px-4 py-2 text-sm text-white shadow-sm transition hover:bg-black">
              Apply
            </button>

            <Link
              href="/handoffs"
              className="text-sm text-neutral-700 underline underline-offset-4 hover:text-black"
            >
              Reset
            </Link>
          </form>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-neutral-100 text-neutral-700">
              <tr className="text-left">
                <th className="p-3">Case ID</th>
                <th className="p-3">Status</th>
                <th className="p-3">Priority</th>
                <th className="p-3">Risk (AI)</th>
                <th className="p-3">AI</th>
                <th className="p-3">Reason</th>
                <th
                  className="p-3 cursor-help"
                  title="Service Level Agreement — the deadline by which this case should be handled"
                >
                  SLA
                </th>
              </tr>
            </thead>

            <tbody>
              {sorted.map((h) => {
                const isBreached =
                  Boolean(h.slaBreachedAt) ||
                  (h.signals.slaRemainingSeconds !== null && h.signals.slaRemainingSeconds <= 0);

                return (
                  <tr
                    key={h.id}
                    className="border-t border-neutral-100 transition-colors hover:bg-neutral-100/70"
                  >
                    <td className="p-3 font-mono text-xs">
                      <Link
                        className="text-neutral-900 underline underline-offset-4 hover:text-black"
                        href={`/handoffs/${h.id}`}
                        aria-label={`Open case ${h.id}`}
                      >
                        {h.id}
                      </Link>
                    </td>

                    <td className="p-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${badgeTone(
                          h.status
                        )}`}
                      >
                        {h.status}
                      </span>
                    </td>

                    <td className="p-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${badgeTone(
                          h.priority
                        )}`}
                      >
                        {h.priority}
                      </span>
                    </td>

                    <td className="p-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${riskTone(
                          h.signals.latestRiskLevel
                        )}`}
                        title={
                          h.signals.latestRiskLevel
                            ? `Risk: ${h.signals.latestRiskLevel}`
                            : "Risk not assessed yet. Open the case and click “Run Risk Check” to generate."
                        }
                      >
                        {riskLabel(h.signals.latestRiskLevel)}
                      </span>
                    </td>

                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${
                            h.signals.hasSummary
                              ? "border-neutral-200 bg-white text-neutral-900"
                              : "border-neutral-200 bg-neutral-50 text-neutral-500"
                          }`}
                          title={h.signals.hasSummary ? "AI summary available" : "No AI summary yet"}
                        >
                          Summary
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${
                            h.signals.hasDraft
                              ? "border-neutral-200 bg-white text-neutral-900"
                              : "border-neutral-200 bg-neutral-50 text-neutral-500"
                          }`}
                          title={h.signals.hasDraft ? "AI draft available" : "No AI draft yet"}
                        >
                          Draft
                        </span>
                      </div>
                    </td>

                    <td className="p-3 text-neutral-800">{h.reason}</td>

                    <td className="p-3">
                      {isBreached ? (
                        <span className="font-medium text-red-700">BREACHED</span>
                      ) : h.slaDueAt ? (
                        <span className="text-neutral-700">
                          {new Date(h.slaDueAt).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-neutral-500">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {sorted.length === 0 && (
                <tr>
                  <td className="p-10 text-center text-neutral-500" colSpan={7}>
                    No cases match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-neutral-500">
          Tip: keep your backend running on <span className="font-mono">:3000</span> and this UI on a
          different port.
        </p>
      </div>
    </main>
  );
}
