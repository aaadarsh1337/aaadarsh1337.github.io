// /intel/iocs.csv: Threat Harbour indicators as CSV (type, value, count, observed_from,
// observed_to, note). Values are quoted where needed. Rebuilt with every deploy.
import { iocs } from "../../lib/ioc";

const cell = (v: string | number) => {
  const s = String(v);
  return /[",\n\r]/.test(s) || /^[=+\-@]/.test(s) ? `"${(/^[=+\-@]/.test(s) ? "'" : "") + s.replace(/"/g, '""')}"` : s;   // quoted, and spreadsheet formulas neutralised
};

export function GET() {
  const { list, from, to } = iocs();
  const rows = [["type", "value", "count", "observed_from", "observed_to", "note"], ...list.map((x) => [x.type, x.value, x.count, from, to, x.note])];
  return new Response(rows.map((r) => r.map(cell).join(",")).join("\n") + "\n", { headers: { "Content-Type": "text/csv; charset=utf-8" } });
}
