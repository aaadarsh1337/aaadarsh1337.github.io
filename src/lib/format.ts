const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "8 Oct 2026" (UTC — content dates are calendar days, not instants) */
export const day = (d: Date | null, year = true) =>
  d ? `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}${year ? ` ${d.getUTCFullYear()}` : ""}` : "undated";
export const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");
export const month = (d: Date | null) => (d ? `${LONG[d.getUTCMonth()]} ${d.getUTCFullYear()}` : "Undated");
export const num = (n: number) => n.toLocaleString("en-US");
export const size = (b: number) =>
  b < 1024 ? `${b}B` : b < 1024 ** 2 ? `${(b / 1024).toFixed(1)}K` : `${(b / 1024 ** 2).toFixed(1)}M`;
export const minutes = (words: number, codeLines = 0) => Math.max(1, Math.round(words / 200 + codeLines / 30));
