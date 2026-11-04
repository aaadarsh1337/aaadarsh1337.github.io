// /intel/iocs.json: Threat Harbour indicators as JSON. The full aggregate snapshot is /intel/data.json.
import { iocs } from "../../lib/ioc";

export function GET() {
  const { list, from, to, sensor } = iocs();
  const body = { source: "https://aaadarsh1337.github.io/intel/", sensor, observed_from: from, observed_to: to, note: "Aggregates from one sensor, not attribution.", indicators: list };
  return new Response(JSON.stringify(body, null, 1), { headers: { "Content-Type": "application/json" } });
}
