#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_intel.py
==============
Builds the static /intel/ threat-intel dashboard from the Threat Harbour
sensor aggregates (analysis/metrics.json in the threat-harbour repo).

This is a *build-time* pull, not a live API: the page ships as static HTML
with a vendored data.json snapshot, so it stays fast, SEO-visible, and
readable offline/rate-limited. A daily workflow re-runs this script.

Usage:
    python3 scripts/build_intel.py --out ./intel
    python3 scripts/build_intel.py --out ./intel \\
        --metrics-url https://raw.githubusercontent.com/aaadarsh1337/threat-harbour/main/analysis/metrics.json

Only stdlib is used (no pip deps) so the workflow needs no install step.
"""

from __future__ import annotations

import argparse
import datetime as dt
import html
import json
import shutil
import urllib.request
from pathlib import Path

UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"}

GH_USER = "aaadarsh1337"
GH_REPO = "threat-harbour"
GH_BRANCH = "main"
RAW_BASE = f"https://raw.githubusercontent.com/{GH_USER}/{GH_REPO}/{GH_BRANCH}"
GH_BASE = f"https://github.com/{GH_USER}/{GH_REPO}"

DIAGRAMS = {
    "session-funnel": f"{RAW_BASE}/diagrams/session-funnel.png",
}


def fetch_json(url: str, timeout: int = 20):
    try:
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read(4_000_000)
        return json.loads(raw.decode("utf-8", errors="replace")), "live sensor pull"
    except Exception as e:
        print(f"  warning: metrics fetch failed ({e})")
        return None, "fetch-failed"


def fmt(n) -> str:
    try:
        return f"{int(n):,}".replace(",", ",")
    except (TypeError, ValueError):
        return "—"


def pct(a, b) -> str:
    try:
        if not b:
            return "—"
        return f"{100.0 * a / b:.1f}%"
    except (TypeError, ZeroDivisionError):
        return "—"


def fmt_med(x) -> str:
    """Session median to 3 significant figures (2.40632 → 2.41)."""
    try:
        return f"{float(x):.3g}"
    except (TypeError, ValueError):
        return "—"


def parse_cutoff(s: str):
    try:
        return dt.datetime.fromisoformat(str(s).replace("Z", "+00:00"))
    except Exception:
        return None


def bucket_days(days: list):
    """Collapse the daily series so the default view never clutters as history
    grows: daily bars up to 35 days, ISO-week totals up to ~200 days of span,
    monthly totals beyond that. Returns (buckets, granularity) where each
    bucket is (axis_label, count, tooltip_title). The Day/Week/Month/Year
    toggle + pager in intel.js page through the full buckets 10 at a time."""
    if len(days) <= 35:
        return ([(d[5:], c, f"{d}: {c:,} events") for d, c in days], "daily")
    try:
        span = (dt.date.fromisoformat(days[-1][0]) - dt.date.fromisoformat(days[0][0])).days
    except ValueError:
        span = len(days)
    if span <= 200:
        buckets: dict = {}
        order: list = []
        for d, c in days:
            try:
                obj = dt.date.fromisoformat(d)
                key = obj.isocalendar()[:2]  # (iso_year, iso_week)
                monday = obj - dt.timedelta(days=obj.weekday())
                label, title = monday.strftime("%m-%d"), f"Week of {monday.isoformat()}"
            except ValueError:
                key, label, title = d, d, d
            if key not in buckets:
                buckets[key] = [label, 0, title]
                order.append(key)
            buckets[key][1] += c
        return ([(lab, cnt, f"{ttl}: {cnt:,} events") for lab, cnt, ttl in (buckets[k] for k in order)], "weekly")
    buckets = {}
    order = []
    for d, c in days:
        key = d[:7]  # YYYY-MM
        if key not in buckets:
            try:
                lab = dt.date.fromisoformat(key + "-01").strftime("%b \u2019%y")
            except ValueError:
                lab = key
            buckets[key] = [lab, 0, key]
            order.append(key)
        buckets[key][1] += c
    return ([(lab, cnt, f"{ttl}: {cnt:,} events") for lab, cnt, ttl in (buckets[k] for k in order)], "monthly")


def timeline_svg(buckets: list) -> str:
    """Server-rendered bar chart (no JS dependency, CSP-safe)."""
    if not buckets:
        return '<p class="dim">No timeline data in this snapshot.</p>'
    W, H, PAD = 900, 220, 56
    vals = [c for _, c, _ in buckets]
    mx = max(vals) or 1
    n = len(vals)
    slot = (W - PAD * 2) / n
    bw = max(3, min(26, slot * 0.62))
    parts = [f'<svg viewBox="0 0 {W} {H}" role="img" aria-label="Daily event volume, {n} days">']
    # gridlines with labeled scale (compact: 62.7k)
    def compact(n):
        return f"{n / 1000:.1f}k" if n >= 1000 else f"{n:,}"
    for frac in (1.0, 0.5):
        y = H - PAD - frac * (H - PAD * 2)
        parts.append(
            f'<line x1="{PAD}" y1="{y:.1f}" x2="{W - 8}" y2="{y:.1f}" stroke="#292e42" stroke-width="1" stroke-dasharray="4 4"/>'
            f'<text x="{PAD - 8}" y="{y + 4:.1f}" fill="#7d86b0" font-size="11" text-anchor="end" font-family="JetBrains Mono, monospace">'
            f'{compact(round(mx * frac))}</text>'
        )
    for i, (label, c, title) in enumerate(buckets):
        x = PAD + i * slot + (slot - bw) / 2
        h = max(2, (c / mx) * (H - PAD * 2))
        y = H - PAD - h
        hot = c == mx
        color = "#f7768e" if hot else ("#7dcfff" if i == n - 1 else "#7aa2f7")
        parts.append(
            f'<rect x="{x:.1f}" y="{y:.1f}" width="{bw:.1f}" height="{h:.1f}" rx="1.5" fill="{color}" fill-opacity="{1.0 if hot or i == n - 1 else 0.75}">'
            f'<title>{html.escape(title)}</title></rect>'
            f'<text x="{x + bw / 2:.1f}" y="{y - 7:.1f}" fill="#a9b1d6" font-size="11" text-anchor="middle" font-family="JetBrains Mono, monospace">'
            f'{c:,}</text>'
        )
        if n <= 26 or i % max(1, n // 13) == 0 or i == n - 1:
            lx = PAD + i * slot + slot / 2
            parts.append(
                f'<text x="{lx:.1f}" y="{H - 10}" fill="#7d86b0" font-size="11" text-anchor="middle" font-family="JetBrains Mono, monospace">'
                f'{html.escape(label)}</text>'
            )
    parts.append("</svg>")
    return '<div class="timeline">' + "".join(parts) + "</div>"


def leader_rows(items: list, max_count: int) -> str:
    rows = []
    for i, it in enumerate(items, 1):
        name = it.get("value", it.get("input", "?"))
        c = it.get("count", 0)
        share = (c / max_count * 100) if max_count else 0
        rows.append(
            f'<div class="leader-row" data-search="{html.escape(str(name).lower())}">'
            f'<span class="leader-rank">{i:02d}</span>'
            f'<div class="leader-main"><div class="leader-name">{html.escape(str(name))}'
            f'<button type="button" class="copy-btn" data-copy="{html.escape(str(name))}" aria-label="Copy {html.escape(str(name))}">copy</button></div>'
            f'<div class="leader-bar"><span style="width:{share:.1f}%"></span></div></div>'
            f'<span class="leader-count">{c:,} <small>{pct(c, max_count)} of top</small></span>'
            f"</div>"
        )
    return "".join(rows) or '<p class="dim">No rows in this snapshot.</p>'


def cat_rows(cats: dict) -> str:
    total = sum(v for v in cats.values() if isinstance(v, (int, float))) or 1
    order = sorted(cats.items(), key=lambda kv: kv[1], reverse=True)
    rows = []
    for name, c in order:
        rows.append(
            f'<div class="cat-row"><span class="cat-name">{html.escape(str(name))}</span>'
            f'<span class="cat-count">{c:,} · {pct(c, total)}</span>'
            f'<div class="cat-bar"><span style="width:{100.0 * c / total:.1f}%"></span></div></div>'
        )
    return "".join(rows)


def build(out: Path, metrics_url: str, portfolio_url: str):
    # Safety guard: never wipe an unexpected directory.
    if out.exists() and out.name != "intel":
        raise SystemExit(f"Refusing to wipe unexpected output dir: {out} (expected .../intel)")
    IntelCSSSrc = Path(__file__).parent / "intel-style.css"
    if not IntelCSSSrc.exists():
        raise SystemExit("intel-style.css missing next to build_intel.py")

    metrics, prov = fetch_json(metrics_url)
    stale_snapshot = False
    if metrics is None:
        prev = out / "data.json"
        if prev.exists():
            try:
                metrics = json.loads(prev.read_text(encoding="utf-8"))
                prov = "last good snapshot (live pull unreachable)"
                stale_snapshot = True
                print("  using previous intel/data.json as fallback")
            except Exception:
                metrics = {}
        else:
            raise SystemExit("No metrics available and no previous intel/data.json to fall back on.")

    totals = metrics.get("totals", {})
    sources = metrics.get("sources", {})
    sessions = metrics.get("sessions", {})
    logins = metrics.get("logins", {})
    commands = metrics.get("commands", {})
    behav = metrics.get("behavioral_command_categories", {})
    dlup = metrics.get("downloads_uploads", {})
    event_ids = metrics.get("event_ids", {})
    collection = metrics.get("collection", {})
    stack = metrics.get("stack", {})
    obs = metrics.get("observation_period", {})
    method = metrics.get("method", "")
    cutoff_raw = metrics.get("analysis_cutoff_utc") or collection.get("interim_cutoff", "")
    cutoff = parse_cutoff(cutoff_raw)
    now = dt.datetime.now(dt.timezone.utc)
    age_h = (now - cutoff).total_seconds() / 3600 if cutoff else None
    is_stale = stale_snapshot or (age_h is not None and age_h > 48)

    per_day = collection.get("per_day_utc", {}) or {}
    days = sorted(per_day.items())
    buckets, granularity = bucket_days(days)
    len_days = len(days)

    seg_btns = []
    for g, lab in (("daily", "Day"), ("weekly", "Week"), ("monthly", "Month"), ("yearly", "Year")):
        on = "true" if g == granularity else "false"
        seg_btns.append(f'<button type="button" data-gran="{g}" aria-pressed="{on}">{lab}</button>')
    seg_html = "".join(seg_btns)
    series_json = json.dumps({"days": days, "default": granularity}, ensure_ascii=False)
    last_day, last_c = days[-1] if days else ("—", 0)
    prev_c = days[-2][1] if len(days) > 1 else 0
    delta = last_c - prev_c if days else 0
    last7 = sum(c for _, c in days[-7:]) if days else 0
    peak_day, peak_c = max(days, key=lambda kv: kv[1]) if days else ("—", 0)
    avg = (sum(c for _, c in days) / len(days)) if days else 0

    events = totals.get("total_events", 0)
    ips = sources.get("unique_source_ips", 0)
    sess = sessions.get("unique_session_ids", sessions.get("session_connect_events", 0))
    fake = logins.get("success_fake", 0)
    cmd_n = commands.get("input_events", 0)
    dl_n = dlup.get("file_download_events", 0) or 0
    ul_n = dlup.get("file_upload_events", 0) or 0

    dur = sessions.get("session_duration_seconds", {}) or {}
    under = dur.get("under_10s", 0)
    n_closed = dur.get("n_closed_matched", 0) or 1
    disc = behav.get("discovery", 0)
    disc_share = pct(disc, cmd_n)

    top_users = logins.get("top_usernames", [])[:10]
    top_pw = logins.get("top_passwords", [])[:10]
    top_cmd = commands.get("top_commands", [])[:8]
    top16 = sources.get("top_source_net16_by_event_volume", [])[:8]
    top_dest = dlup.get("top_destfiles", [])[:6]
    top_sha = dlup.get("top_shasums", [])[:5]
    top_events = sorted(event_ids.items(), key=lambda kv: kv[1], reverse=True)[:10]

    site_base = portfolio_url.rstrip("/") + "/intel"
    canonical = site_base + "/"
    fresh_label = "STALE SNAPSHOT" if is_stale else "LIVE · AUTO-REFRESHED DAILY"
    cutoff_human = cutoff.strftime("%Y-%m-%d %H:%M UTC") if cutoff else str(cutoff_raw or "unknown")
    delta_cls = "up" if delta >= 0 else "down"
    delta_arrow = "▲" if delta >= 0 else "▼"

    kpis = [
        (fmt(events), "events captured", f"across {len(days)} days · avg {avg:,.0f}/day"),
        (fmt(ips), "unique source IPs", "/16-aggregated · never raw IPs"),
        (fmt(sess), "sessions", f"median {fmt_med(dur.get('median'))}s · {pct(under, n_closed)} &lt;10s"),
        (fmt(fake), "fake logins granted", f"{fmt(logins.get('failed', 0))} failed · honeypot lets them in"),
        (fmt(cmd_n), "commands logged", f"{disc_share} discovery/fingerprinting"),
        (fmt(dl_n + ul_n), "file xfers", f"{dl_n} downloads + {ul_n} uploads"),
    ]
    kpi_html = "".join(
        f'<div class="kpi"><div class="kpi__value">{v}</div>'
        f'<div class="kpi__label">{html.escape(l)}</div><div class="kpi__sub">{s}</div></div>'
        for v, l, s in kpis
    )

    net16_rows = "".join(
        f"<tr><td>{html.escape(x.get('cidr', '?'))}</td>"
        f'<td class="num">{x.get("events", 0):,}</td>'
        f'<td class="num">{pct(x.get("events", 0), events)}</td></tr>'
        for x in top16
    )
    event_rows = "".join(
        f"<tr><td>{html.escape(k)}</td>" f'<td class="num">{v:,}</td></tr>'
        for k, v in top_events
    )
    dest_rows = "".join(
        f"<tr><td>{html.escape(x.get('value', '?'))}"
        f'<button type="button" class="copy-btn" data-copy="{html.escape(x.get("value", ""))}">copy</button></td>'
        f'<td class="num">{x.get("count", 0):,}</td></tr>'
        for x in top_dest
    )
    sha_rows = "".join(
        f"<tr><td title=\"{html.escape(x.get('value', ''))}\">{html.escape(x.get('value', '')[:16])}…"
        f'<button type="button" class="copy-btn" data-copy="{html.escape(x.get("value", ""))}">copy</button></td>'
        f'<td class="num">{x.get("count", 0):,}</td></tr>'
        for x in top_sha
    )
    stack_chips = "".join(
        f"<span>{html.escape(str(k))} {html.escape(str(v))}</span>" for k, v in stack.items()
    ) or "<span>stack versions in snapshot</span>"

    start = obs.get("start", "?")
    end = obs.get("end", "ongoing")

    body = f"""
<div class="page">
  <header class="intel-hero">
    <p class="fig-label">Threat Harbour · live sensor intel</p>
    <h1><span class="live-dot">●</span> What is hitting SSH right now</h1>
    <p class="page-sub">Real Cowrie SSH honeypot on Oracle Cloud ({html.escape(str(start))} → {html.escape(str(end))}).
    Aggregates only — raw IPs and payloads never leave the sensor.</p>
    <div class="freshness">
      <span class="fresh-pill{' is-stale' if is_stale else ''}"><span class="pulse"></span>{fresh_label}</span>
      <span class="fresh-meta">cutoff {html.escape(cutoff_human)} · {html.escape(prov)} · window {html.escape(str(start))} → {html.escape(str(end))}</span>
    </div>
    <div class="kpi-grid">{kpi_html}</div>
    <p class="panel__note">Yesterday ({html.escape(str(last_day))}): <strong>{last_c:,}</strong>
    (<span class="{delta_cls}">{delta_arrow} {delta:+,}</span> vs prior day) ·
    7-day <strong>{last7:,}</strong> · peak <strong>{html.escape(str(peak_day))}</strong> ({peak_c:,})</p>
  </header>

  <section class="panel" id="timeline">
    <div class="panel__head"><p class="tb-label">Activity</p><h2>Event volume · <span id="granLabel">{granularity}</span></h2></div>
    <p class="panel__note">Botnet sweeps against this sensor — not global trends.
    Full daily series in <code>data.json</code>.</p>
    <div class="seg" id="granSeg" role="group" aria-label="Chart granularity">{seg_html}</div>
    <div id="timelineChart">{timeline_svg(buckets)}</div>
    <div class="pager" id="chartPager" hidden>
      <button type="button" id="pagePrev" aria-label="Show older bars">← Older</button>
      <span id="pageLabel" role="status"></span>
      <button type="button" id="pageNext" aria-label="Show newer bars">Newer →</button>
    </div>
    <div class="timeline__stats">
      <span>days <strong>{len_days}</strong></span>
      <span>avg/day <strong>{avg:,.0f}</strong></span>
      <span>peak <strong>{html.escape(str(peak_day))} ({peak_c:,})</strong></span>
      <span>latest <strong>{html.escape(str(last_day))} ({last_c:,})</strong></span>
    </div>
  </section>

  <section class="panel" id="credentials">
    <div class="panel__head"><p class="tb-label">Leaderboard</p><h2>Credentials bots try first</h2></div>
    <p class="panel__note">If it's in this table, bots are trying it against your servers too.</p>
    <div class="cred-filter">
      <label class="visually-hidden" for="credFilter">Filter credentials</label>
      <input type="search" id="credFilter" placeholder="Filter usernames, passwords, commands…" autocomplete="off" />
      <span class="count" id="credCount" role="status"></span>
    </div>
    <div class="grid-2">
      <div><p class="tb-label">Top usernames</p>{leader_rows(top_users, (top_users[0].get("count", 1) if top_users else 1))}</div>
      <div><p class="tb-label">Top passwords</p>{leader_rows(top_pw, (top_pw[0].get("count", 1) if top_pw else 1))}</div>
    </div>
  </section>

  <div class="grid-2">
    <section class="panel" id="commands">
      <div class="panel__head"><p class="tb-label">Behaviour</p><h2>Top commands</h2></div>
      <p class="panel__note">{disc_share} discovery/fingerprinting — automated recon, not humans.</p>
      {leader_rows(top_cmd, (top_cmd[0].get("count", 1) if top_cmd else 1))}
    </section>
    <section class="panel" id="categories">
      <div class="panel__head"><p class="tb-label">Intent</p><h2>Command categories</h2></div>
      <p class="panel__note">How the sensor classifies every command input.</p>
      {cat_rows(behav)}
    </section>
  </div>

  <div class="grid-3">
    <section class="panel" id="network">
      <div class="panel__head"><p class="tb-label">Sources</p><h2>Busiest /16s</h2></div>
      <p class="panel__note">Volume only — a source IP never identifies the operator.</p>
      <table class="mono-table"><thead><tr><th>net/16</th><th class="num">events</th><th class="num">share</th></tr></thead>
      <tbody>{net16_rows or '<tr><td colspan="3">No data.</td></tr>'}</tbody></table>
    </section>
    <section class="panel" id="sessions">
      <div class="panel__head"><p class="tb-label">Sessions</p><h2>How long they stay</h2></div>
      <p class="panel__note">Short, bursty, automated.</p>
      <table class="mono-table"><tbody>
        <tr><td>unique sessions</td><td class="num">{fmt(sess)}</td></tr>
        <tr><td>median duration</td><td class="num">{fmt_med(dur.get("median"))}s</td></tr>
        <tr><td>max duration</td><td class="num">{html.escape(str(dur.get("max", "—")))}s</td></tr>
        <tr><td>under 10s</td><td class="num">{fmt(under)} ({pct(under, n_closed)})</td></tr>
        <tr><td>fake logins / failed</td><td class="num">{fmt(fake)} / {fmt(logins.get("failed", 0))}</td></tr>
      </tbody></table>
    </section>
    <section class="panel" id="events">
      <div class="panel__head"><p class="tb-label">Telemetry</p><h2>Event mix</h2></div>
      <p class="panel__note">Cowrie event IDs by volume.</p>
      <table class="mono-table"><tbody>{event_rows or '<tr><td>No data.</td></tr>'}</tbody></table>
    </section>
  </div>

  <div class="grid-2">
    <section class="panel" id="takeaways">
      <div class="panel__head"><p class="tb-label">So what</p><h2>Defensive takeaways</h2></div>
      <div class="takeaways" style="grid-template-columns:1fr">
        <div class="takeaway"><h3>Blocklist these passwords</h3>
        <p>Deny-list the top 10 in your IdP; require manager-generated secrets.</p></div>
        <div class="takeaway"><h3>Expect recon, not intrusion</h3>
        <p>Mostly <code>uname/hostname/whoami</code> in <code>{fmt_med(dur.get("median"))}s</code> sessions — alert on discovery bursts, not single logins.</p></div>
        <div class="takeaway"><h3>Watch persistence paths</h3>
        <p>Writes toward <code>authorized_keys</code> keep recurring — alert on any unexpected one.</p></div>
      </div>
    </section>
    <section class="panel" id="files">
      <div class="panel__head"><p class="tb-label">Payloads</p><h2>File operations</h2></div>
      <p class="panel__note">Destinations and shasums only — contents withheld.</p>
      <p class="tb-label">Top destinations</p>
      <table class="mono-table"><tbody>{dest_rows or '<tr><td>No data.</td></tr>'}</tbody></table>
      <p class="tb-label" style="margin-top:14px">Top shasums</p>
      <table class="mono-table"><tbody>{sha_rows or '<tr><td>No data.</td></tr>'}</tbody></table>
    </section>
  </div>

  <section class="panel" id="visuals">
    <div class="panel__head"><p class="tb-label">Sensor visuals</p><h2>Session funnel</h2></div>
    <figure class="shot shot--wide"><img src="{DIAGRAMS["session-funnel"]}" alt="Session funnel diagram" loading="lazy" decoding="async" />
    <figcaption>Session funnel · <a href="{GH_BASE}/blob/{GH_BRANCH}/diagrams/session-funnel.png" target="_blank" rel="noopener noreferrer">source ↗</a></figcaption></figure>
  </section>

  <section class="panel" id="method">
    <div class="panel__head"><p class="tb-label">Method</p><h2>How it works</h2></div>
    <div class="prose">
      <p>{html.escape(method or "Parsed Cowrie JSONL on sensor; aggregates only.")}</p>
      <p>Aggregates are published daily; the full dataset ships alongside as <code>data.json</code>.</p>
      <p>One VM, one IP, one region — what hit this sensor, not the internet. Never attribution.</p>
      <div class="stack-chips">{stack_chips}</div>
    </div>
  </section>

  <footer class="intel-foot">
    <span>cutoff {html.escape(cutoff_human)} · {html.escape(prov)}</span>
    <span class="links">
      <a class="btn btn--ghost btn--small" href="{GH_BASE}/blob/{GH_BRANCH}/analysis/summary.md" target="_blank" rel="noopener noreferrer">Full tables ↗</a>
      <a class="btn btn--ghost btn--small" href="{GH_BASE}" target="_blank" rel="noopener noreferrer">threat-harbour repo ↗</a>
      <a class="btn btn--ghost btn--small" href="data.json">data.json</a>
    </span>
  </footer>
</div>
<script type="application/json" id="intelSeries">{series_json}</script>
<script src="js/intel.js" defer></script>
"""

    page = PAGE_SHELL.format(
        description=html.escape(
            f"Live SSH honeypot intel: {events:,} events, {ips:,} IPs, top attacker passwords and commands. Refreshed daily {cutoff_human}."
            if events else "Live SSH honeypot threat intel, refreshed daily."
        ),
        canonical=canonical,
        portfolio_url=portfolio_url.rstrip("/"),
        github_repo=GH_BASE,
        body=body,
        jsonld=json.dumps(
            {
                "@context": "https://schema.org",
                "@type": "Dataset",
                "name": "Threat Harbour — live SSH honeypot intel",
                "description": "Daily aggregates from a Cowrie SSH sensor: credential leaderboard, commands, sources.",
                "url": canonical,
                "creator": {"@type": "Person", "name": "Adarsh Pillai", "url": portfolio_url},
                "temporalCoverage": f"{start}/{end}",
            },
            ensure_ascii=False,
        ),
    )

    # Write outputs (wipe + recreate, mirroring build_writeups safety).
    if out.exists():
        shutil.rmtree(out)
    (out / "css").mkdir(parents=True, exist_ok=True)
    (out / "js").mkdir(parents=True, exist_ok=True)
    shutil.copy2(IntelCSSSrc, out / "css" / "style.css")
    (out / "js" / "intel.js").write_text(INTEL_JS, encoding="utf-8")
    (out / "index.html").write_text(page, encoding="utf-8")
    (out / "data.json").write_text(json.dumps(metrics, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"  wrote  intel/index.html  cutoff={cutoff_human} stale={is_stale} ({prov})")
    print(f"  wrote  intel/data.json ({len(json.dumps(metrics)):,} bytes)")
    print("  wrote  intel/css/style.css + intel/js/intel.js")


PAGE_SHELL = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Threat Intel — live SSH honeypot · aaadarsh1337</title>
<meta name="description" content="{description}" />
<meta name="theme-color" content="#16161e" />
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; object-src 'none'; base-uri 'self'; frame-ancestors 'self'" />
<link rel="canonical" href="{canonical}" />
<meta property="og:type" content="article" />
<meta property="og:title" content="Threat Intel — live SSH honeypot" />
<meta property="og:description" content="{description}" />
<meta property="og:url" content="{canonical}" />
<meta property="og:image" content="https://aaadarsh1337.github.io/assets/avatar.jpg" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Threat Intel — live SSH honeypot" />
<meta name="twitter:description" content="{description}" />
<meta name="twitter:image" content="https://aaadarsh1337.github.io/assets/avatar.jpg" />
<script type="application/ld+json">{jsonld}</script>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%2316161e'/%3E%3Crect x='13' y='4' width='6' height='24' fill='%237DCFFF'/%3E%3Crect x='4' y='13' width='24' height='6' fill='%237DCFFF'/%3E%3Crect x='14' y='6' width='4' height='20' fill='%2316161e'/%3E%3Crect x='6' y='14' width='20' height='4' fill='%2316161e'/%3E%3C/svg%3E" />
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../css/tokens.css" />
<link rel="stylesheet" href="css/style.css" />
</head>
<body>
<div class="lab-grid" aria-hidden="true"></div>

<header class="topbar">
  <div class="topbar__inner">
    <a class="topbar__brand" href="index.html">
      <span class="brand-mark">INTEL</span>
      <span class="brand-text">Threat Harbour</span>
    </a>
    <div class="topbar__back">
      <a class="btn btn--ghost" href="../index.html">&#8592; Portfolio</a>
      <a class="btn btn--ghost" href="../writeups/">&#8592; Writeups</a>
    </div>
    <div class="topbar__spacer"></div>
    <div class="topbar__actions">
      <a class="btn btn--ghost" href="data.json">data.json</a>
      <a class="btn btn--ghost" href="{github_repo}" target="_blank" rel="noopener noreferrer">Repo &#8599;</a>
    </div>
  </div>
</header>

<main>
{body}
</main>
</body>
</html>
"""

# External JS (no inline handlers — strict CSP). Credential filter + copy
# buttons + interactive Day/Week/Month/Year chart toggle. The server renders
# one static SVG first, so the page works with JS disabled; this upgrades it.
INTEL_JS = """(function () {
  function norm(s) {
    return (s || "").toLowerCase().replace(/[_\\-]+/g, " ").replace(/\\s+/g, " ").trim();
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  var input = document.getElementById("credFilter");
  var count = document.getElementById("credCount");
  function apply() {
    var q = input ? norm(input.value) : "";
    var total = 0;
    document.querySelectorAll("#credentials .leader-row").forEach(function (row) {
      var hay = norm(row.getAttribute("data-search") || row.textContent);
      var show = !q || hay.indexOf(q) !== -1;
      row.style.display = show ? "" : "none";
      if (show) total++;
    });
    if (count) count.textContent = total + " shown";
  }
  if (input) {
    input.addEventListener("input", apply);
    apply();
  }
  function flash(btn, ok) {
    var orig = "copy";
    btn.textContent = ok ? "copied \\u2713" : "copy failed";
    setTimeout(function () { btn.textContent = orig; }, 1600);
  }
  function copyText(text, btn) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { flash(btn, true); }, function () { flash(btn, false); });
    } else {
      try {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand("copy");
        document.body.removeChild(ta);
        flash(btn, ok);
      } catch (e) { flash(btn, false); }
    }
  }
  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      copyText(btn.getAttribute("data-copy") || "", btn);
    });
  });

  // ---- Interactive granularity ----
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function mondayOf(y, m, d) {
    var dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
    return dt;
  }
  function mondayKey(iso) {
    var dp = iso.split("-");
    var mon = mondayOf(+dp[0], +dp[1], +dp[2]);
    return mon.getFullYear() + "-" + pad2(mon.getMonth() + 1) + "-" + pad2(mon.getDate());
  }
  function fmtNum(n) { return n.toLocaleString("en-US"); }
  function compact(n) { return n >= 1000 ? (n / 1000).toFixed(1) + "k" : fmtNum(n); }
  // daysArr: [[isoDate, count], ...] sorted. Returns [axisLabel, count, tooltip].
  function bucket(daysArr, gran) {
    var groups = {}, order = [];
    function push(k, label, title, c) {
      if (!groups[k]) { groups[k] = { label: label, title: title, count: 0 }; order.push(k); }
      groups[k].count += c;
    }
    if (gran === "daily") {
      return daysArr.map(function (p) { return [p[0].slice(5), p[1], p[0] + ": " + fmtNum(p[1]) + " events"]; });
    }
    if (gran === "yearly") {
      daysArr.forEach(function (p) {
        var y = p[0].slice(0, 4);
        push(y, y, y, p[1]);
      });
    } else if (gran === "monthly") {
      daysArr.forEach(function (p) {
        var k = p[0].slice(0, 7);
        var parts = k.split("-");
        push(k, MONTHS[parseInt(parts[1], 10) - 1] + " \\u2019" + parts[0].slice(2), k, p[1]);
      });
    } else { // weekly, keyed by Monday date (1:1 with ISO weeks)
      daysArr.forEach(function (p) {
        var k = mondayKey(p[0]);
        push(k, k.slice(5), "Week of " + k, p[1]);
      });
    }
    return order.map(function (k) {
      var g = groups[k];
      return [g.label, g.count, g.title + ": " + fmtNum(g.count) + " events"];
    });
  }
  // 10 bars per view — except Day, which pages a full Mon–Sun week at a
  // time so weekday rhythm stays intact. Latest page first.
  var PAGE_SIZE = 10;
  var chartState = { gran: "daily", page: -1 }; // page -1 = latest
  function paginate(gran) {
    if (gran === "daily") {
      var weeks = {}, order = [];
      SERIES.days.forEach(function (p) {
        var k = mondayKey(p[0]);
        if (!weeks[k]) { weeks[k] = []; order.push(k); }
        weeks[k].push([p[0].slice(5), p[1], p[0] + ": " + fmtNum(p[1]) + " events"]);
      });
      return order.map(function (k) { return weeks[k]; });
    }
    var all = bucket(SERIES.days, gran), out = [], i;
    for (i = 0; i < all.length; i += PAGE_SIZE) out.push(all.slice(i, i + PAGE_SIZE));
    return out;
  }
  function renderChart() {
    var host = document.getElementById("timelineChart");
    var label = document.getElementById("granLabel");
    var pager = document.getElementById("chartPager");
    var prev = document.getElementById("pagePrev");
    var next = document.getElementById("pageNext");
    var pageLabel = document.getElementById("pageLabel");
    if (!host || !SERIES || !SERIES.days) return;
    var pages = paginate(chartState.gran);
    if (!pages.length) return;
    var page = chartState.page < 0 ? pages.length - 1 : chartState.page;
    page = Math.max(0, Math.min(pages.length - 1, page));
    chartState.page = page;
    var visible = pages[page];
    // Adaptive geometry: narrow screens get a taller canvas so bars and
    // labels stay legible instead of shrinking into a short strip.
    var hostW = (host && host.clientWidth) || 900;
    var tall = hostW < 560;
    var W = tall ? 440 : 900, H = tall ? 360 : 220, PAD = tall ? 52 : 56;
    var mx = 1, n = visible.length;
    visible.forEach(function (b) { if (b[1] > mx) mx = b[1]; });
    var slot = (W - PAD * 2) / n, bw = Math.max(3, Math.min(26, slot * 0.62));
    var top = H - PAD - (H - PAD * 2), mid = H - PAD - 0.5 * (H - PAD * 2);
    var s = '<div class="timeline"><svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Event volume, ' + chartState.gran + " view, page " + (page + 1) + " of " + pages.length + '">';
    s += '<line x1="' + PAD + '" y1="' + top.toFixed(1) + '" x2="' + (W - 8) + '" y2="' + top.toFixed(1) + '" stroke="#292e42" stroke-width="1" stroke-dasharray="4 4"/>';
    s += '<text x="' + (PAD - 8) + '" y="' + (top + 4).toFixed(1) + '" fill="#7d86b0" font-size="11" text-anchor="end" font-family="JetBrains Mono, monospace">' + compact(Math.round(mx)) + "</text>";
    s += '<line x1="' + PAD + '" y1="' + mid.toFixed(1) + '" x2="' + (W - 8) + '" y2="' + mid.toFixed(1) + '" stroke="#292e42" stroke-width="1" stroke-dasharray="4 4"/>';
    s += '<text x="' + (PAD - 8) + '" y="' + (mid + 4).toFixed(1) + '" fill="#7d86b0" font-size="11" text-anchor="end" font-family="JetBrains Mono, monospace">' + compact(Math.round(mx / 2)) + "</text>";
    visible.forEach(function (b, idx) {
      var x = PAD + idx * slot + (slot - bw) / 2;
      var h = Math.max(2, (b[1] / mx) * (H - PAD * 2));
      var y = H - PAD - h;
      var hot = b[1] === mx;
      var color = hot ? "#f7768e" : (idx === n - 1 ? "#7dcfff" : "#7aa2f7");
      var op = (hot || idx === n - 1) ? 1 : 0.75;
      s += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="1.5" fill="' + color + '" fill-opacity="' + op + '"><title>' + esc(b[2]) + "</title></rect>";
      s += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (y - 7).toFixed(1) + '" fill="#a9b1d6" font-size="11" text-anchor="middle" font-family="JetBrains Mono, monospace">' + fmtNum(b[1]) + "</text>";
      if (n <= 26 || idx % Math.max(1, Math.floor(n / 13)) === 0 || idx === n - 1) {
        var lx = PAD + idx * slot + slot / 2;
        s += '<text x="' + lx.toFixed(1) + '" y="' + (H - 10) + '" fill="#7d86b0" font-size="11" text-anchor="middle" font-family="JetBrains Mono, monospace">' + esc(b[0]) + "</text>";
      }
    });
    s += "</svg></div>";
    host.innerHTML = s;
    if (label) label.textContent = chartState.gran;
    document.querySelectorAll("#granSeg button").forEach(function (btn) {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-gran") === chartState.gran ? "true" : "false");
    });
    if (pager) {
      if (pages.length > 1) {
        pager.hidden = false;
        if (prev) prev.disabled = page === 0;
        if (next) next.disabled = page === pages - 1;
        if (pageLabel) pageLabel.textContent = visible[0][0] + " → " + visible[n - 1][0] + " · " + (page + 1) + "/" + pages.length;
      } else {
        pager.hidden = true;
      }
    }
  }
  var SERIES = null;
  try {
    var sel = document.getElementById("intelSeries");
    SERIES = sel ? JSON.parse(sel.textContent) : null;
  } catch (e) { SERIES = null; }
  var seg = document.getElementById("granSeg");
  if (SERIES && SERIES.days && SERIES.days.length && seg) {
    chartState.gran = SERIES.default || "daily";
    chartState.page = -1; // latest
    seg.querySelectorAll("button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        chartState.gran = btn.getAttribute("data-gran");
        chartState.page = -1;
        renderChart();
      });
    });
    var prevBtn = document.getElementById("pagePrev");
    var nextBtn = document.getElementById("pageNext");
    if (prevBtn) prevBtn.addEventListener("click", function () { chartState.page--; renderChart(); });
    if (nextBtn) nextBtn.addEventListener("click", function () { chartState.page++; renderChart(); });
    var resizeT = null;
    window.addEventListener("resize", function () {
      if (resizeT) clearTimeout(resizeT);
      resizeT = setTimeout(renderChart, 200);
    });
    renderChart();
  } else if (seg) {
    seg.style.display = "none"; // no data: keep the server chart, hide the toggle
  }
})();
"""


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--out", required=True)
    p.add_argument("--metrics-url", default=f"{RAW_BASE}/analysis/metrics.json")
    p.add_argument("--portfolio-url", default="https://aaadarsh1337.github.io/")
    args = p.parse_args()
    out = Path(args.out).resolve()
    print(f"Building intel from {args.metrics_url} → {out}")
    build(out, args.metrics_url, args.portfolio_url)
    print("Done.")


if __name__ == "__main__":
    main()
