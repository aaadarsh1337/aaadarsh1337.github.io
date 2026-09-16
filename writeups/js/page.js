(function () {
  // Thin reading-progress bar under the topbar.
  var bar = document.getElementById("readProgress");
  var ticking = false;
  function updateBar() {
    ticking = false;
    if (!bar) return;
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    bar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + "%";
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(updateBar); }
  }, { passive: true });
  window.addEventListener("resize", updateBar);
  updateBar();

  // Copy buttons on every code block (highlighted or plain <pre>).
  function flash(btn, ok) {
    var orig = btn.getAttribute("data-label") || "copy";
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
  var hosts = [];
  document.querySelectorAll("div.highlight").forEach(function (el) { hosts.push(el); });
  document.querySelectorAll(".reader__body pre").forEach(function (pre) {
    if (!pre.closest("div.highlight")) hosts.push(pre);
  });
  hosts.forEach(function (host) {
    var code = host.querySelector("code");
    if (!code) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "copy-btn";
    btn.textContent = "copy";
    btn.setAttribute("data-label", "copy");
    btn.setAttribute("aria-label", "Copy code to clipboard");
    btn.addEventListener("click", function () { copyText(code.innerText, btn); });
    host.appendChild(btn);
  });
})();
