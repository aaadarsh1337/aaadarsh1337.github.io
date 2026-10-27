// The exact metrics.json snapshot this build rendered from.
import { getMetrics } from "../../lib/intel";
export function GET() {
  return new Response(JSON.stringify(getMetrics().metrics, null, 1), { headers: { "Content-Type": "application/json" } });
}
