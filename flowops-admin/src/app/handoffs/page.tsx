import Link from "next/link";
import { apiGet } from "@/lib/api";

type Handoff = {
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
};

function badgeTone(value: string) {
  switch (value) {
    case "resolved":
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    case "claimed":
      return "bg-blue-50 text-blue-800 border-blue-200";
    case "pending":
      return "bg-amber-50 text-amber-800 border-amber-200";
    default:
      return "bg-neutral-50 text-neutral-800 border-neutral-200";
  }
}

export default async function HandoffsPage() {
  const handoffs = await apiGet<Handoff[]>("/debug/handoffs");

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">
              FlowOps Operator Console
            </h1>
            <p className="mt-1 text-sm text-neutral-600">
              Click a handoff to inspect AI artifacts and take actions.
            </p>
          </div>
          <div className="text-xs text-neutral-500">
            {handoffs.length} handoff{handoffs.length === 1 ? "" : "s"}
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-neutral-100 text-neutral-700">
              <tr className="text-left">
                <th className="p-3">ID</th>
                <th className="p-3">Status</th>
                <th className="p-3">Priority</th>
                <th className="p-3">Reason</th>
                <th className="p-3">SLA</th>
              </tr>
            </thead>

            <tbody>
              {handoffs.map((h) => (
                <tr
                  key={h.id}
                  className="border-t border-neutral-100 transition-colors hover:bg-neutral-100/70"
                >
                  <td className="p-3 font-mono text-xs">
                    <Link
                      className="text-neutral-900 underline underline-offset-4 hover:text-black"
                      href={`/handoffs/${h.id}`}
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

                  <td className="p-3 text-neutral-800">{h.reason}</td>

                  <td className="p-3">
                    {h.slaBreachedAt ? (
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
              ))}

              {handoffs.length === 0 && (
                <tr>
                  <td className="p-10 text-center text-neutral-500" colSpan={5}>
                    No handoffs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-neutral-500">
          Tip: keep your backend running on <span className="font-mono">:3000</span>{" "}
          and this UI on a different port.
        </p>
      </div>
    </main>
  );
}
