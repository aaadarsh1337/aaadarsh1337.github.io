(function () {
  var search = document.getElementById("postSearch");
  var grid = document.getElementById("postGrid");
  var count = document.getElementById("postCount");
  var active = "";
  function norm(value) { return (value || "").toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim(); }
  function apply() {
    if (!grid) return;
    var query = norm(search ? search.value : "");
    var shown = 0;
    grid.querySelectorAll(".blog-card").forEach(function (card) {
      var category = card.getAttribute("data-category") || "";
      var text = norm(card.getAttribute("data-search") || card.textContent);
      var show = (!active || category === active) && (!query || text.indexOf(query) !== -1);
      card.hidden = !show;
      if (show) shown++;
    });
    if (count) count.textContent = shown + (shown === 1 ? " post" : " posts");
  }
  if (search) search.addEventListener("input", apply);
  document.querySelectorAll(".blog-filter").forEach(function (button) {
    button.addEventListener("click", function () {
      active = button.getAttribute("data-category") || "";
      document.querySelectorAll(".blog-filter").forEach(function (item) {
        var on = item === button;
        item.classList.toggle("active", on);
        item.setAttribute("aria-pressed", on ? "true" : "false");
      });
      apply();
    });
  });
  var progress = document.getElementById("readProgress");
  var ticking = false;
  function updateProgress() {
    ticking = false;
    if (!progress) return;
    var max = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    progress.style.width = (max > 0 ? document.documentElement.scrollTop / max * 100 : 0) + "%";
  }
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(updateProgress); } }, { passive: true });
  updateProgress();
  var hosts = [];
  document.querySelectorAll(".article-body div.highlight").forEach(function (host) { hosts.push(host); });
  document.querySelectorAll(".article-body pre").forEach(function (pre) {
    if (!pre.closest("div.highlight")) hosts.push(pre);
  });
  hosts.forEach(function (host) {
    var code = host.querySelector("code");
    if (!code || host.querySelector(".copy-btn")) return;
    var button = document.createElement("button");
    button.type = "button";
    button.className = "copy-btn";
    button.textContent = "copy";
    button.setAttribute("aria-label", "Copy code to clipboard");
    button.addEventListener("click", function () {
      var text = code.innerText;
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { button.textContent = "copied"; setTimeout(function () { button.textContent = "copy"; }, 1400); });
    });
    host.appendChild(button);
  });
})();
