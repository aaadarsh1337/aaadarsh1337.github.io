(function () {
  function norm(s) {
    return (s || "").toLowerCase().replace(/[_\-]+/g, " ").replace(/\s+/g, " ").trim();
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
    btn.textContent = ok ? "copied \u2713" : "copy failed";
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
        push(k, MONTHS[parseInt(parts[1], 10) - 1] + " \u2019" + parts[0].slice(2), k, p[1]);
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
