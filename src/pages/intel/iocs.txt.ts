// /intel/iocs.txt: Threat Harbour indicators as plain text, one value per line,
// '#' comments, grouped by type. Rebuilt with every deploy.
import { iocs } from "../../lib/ioc";

const TITLES: Record<string, string> = {
  sha256: "sha256 of files written by attacker sessions",
  file_path: "file paths attackers wrote to",
  source_net16: "busiest source networks (/16, by event volume)",
  password: "most-attempted SSH passwords",
  username: "most-attempted SSH usernames",
};

export function GET() {
  const { list, from, to, sensor } = iocs();
  const out = [
    "# Threat Harbour indicators · https://aaadarsh1337.github.io/intel/",
    `# ${sensor}, observed ${from} to ${to}. Aggregates from one sensor, not attribution.`,
    "# Format: value  # event count. Regenerated with every deploy.",
  ];
  for (const type of Object.keys(TITLES)) {
    const rows = list.filter((x) => x.type === type);
    if (!rows.length) continue;
    out.push("", `# ${TITLES[type]}`, ...rows.map((x) => `${x.value}  # ${x.count}`));
  }
  return new Response(out.join("\n") + "\n", { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
