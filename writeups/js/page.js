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

  // Line-number gutter on real code only (never terminal/output).
  // Gutter is a separate element so copy still grabs clean code.
  document.querySelectorAll("div.highlight.is-code").forEach(function (host) {
    var code = host.querySelector("code");
    if (!code) return;
    var n = code.innerText.replace(/\n$/, "").split("\n").length;
    if (n < 2) return;
    var gut = document.createElement("div");
    gut.className = "line-nos";
    gut.setAttribute("aria-hidden", "true");
    var s = "";
    for (var i = 1; i <= n; i++) s += "<span>" + i + "</span>";
    gut.innerHTML = s;
    host.appendChild(gut);
    host.classList.add("has-lines");
  });

  // Click-to-zoom screenshots (native dialog, no deps).
  var dlg = document.createElement("dialog");
  dlg.className = "img-lightbox";
  dlg.setAttribute("aria-label", "Screenshot preview");
  var dlgClose = document.createElement("button");
  dlgClose.type = "button";
  dlgClose.className = "img-lightbox__close";
  dlgClose.textContent = "×";
  dlgClose.setAttribute("aria-label", "Close screenshot preview");
  var dlgImg = document.createElement("img");
  dlgImg.alt = "";
  dlg.appendChild(dlgImg);
  dlg.appendChild(dlgClose);
  document.body.appendChild(dlg);
  var lastImage = null;
  dlg.addEventListener("click", function (e) {
    if (e.target === dlg || e.target === dlgClose) dlg.close();
  });
  dlg.addEventListener("close", function () {
    if (lastImage && lastImage.focus) lastImage.focus();
  });
  document.querySelectorAll(".md-fig img").forEach(function (im) {
    lastImage = im;
    im.tabIndex = 0;
    im.setAttribute("role", "button");
    im.setAttribute("aria-label", "Open screenshot: " + (im.alt || "screenshot"));
    im.style.cursor = "zoom-in";
    function openPreview() {
      dlgImg.src = im.currentSrc || im.src;
      dlgImg.alt = im.alt || "";
      if (dlg.showModal) {
        dlg.showModal();
        dlgClose.focus();
      }
    }
    im.addEventListener("click", openPreview);
    im.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openPreview();
      }
    });
  });

  // Copy-link button (page URL, no query).
  var linkBtn = document.getElementById("copyLinkBtn");
  if (linkBtn) {
    linkBtn.addEventListener("click", function () {
      copyText(window.location.href.split("?")[0], linkBtn);
    });
  }
})();
