(function () {
  var input = document.getElementById("searchInput");
  var activeTag = "";
  function norm(s) {
    return (s || "").toLowerCase().replace(/[_\-]+/g, " ").replace(/\s+/g, " ").trim();
  }
  function applyFilter() {
    var q = input ? norm(input.value) : "";
    var total = 0;
    document.querySelectorAll(".writeup-card").forEach(function (card) {
      var hay = norm(card.getAttribute("data-search") || card.textContent);
      var tags = (card.getAttribute("data-tags") || "").split(/\s+/);
      var tagOk = !activeTag || tags.indexOf(activeTag) !== -1;
      var textOk = !q || hay.indexOf(q) !== -1;
      var show = tagOk && textOk;
      card.style.display = show ? "" : "none";
      if (show) total++;
    });
    document.querySelectorAll(".writeup-section").forEach(function (sec) {
      var any = Array.prototype.some.call(sec.querySelectorAll(".writeup-card"), function (c) {
        return c.style.display !== "none";
      });
      sec.style.display = any ? "" : "none";
    });
    var empty = document.getElementById("writeupEmpty");
    if (empty) empty.hidden = total !== 0;
    var jump = document.getElementById("sectionJump");
    if (jump) jump.hidden = total === 0;
    var meta = document.getElementById("searchMeta");
    if (meta) meta.textContent = total + " writeup" + (total === 1 ? "" : "s");
  }
  if (input) input.addEventListener("input", applyFilter);
  document.querySelectorAll("#tagFilters .tag-chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      var tag = chip.getAttribute("data-tag") || "";
      activeTag = (activeTag === tag) ? "" : tag;
      document.querySelectorAll("#tagFilters .tag-chip").forEach(function (c) {
        var on = activeTag && c.getAttribute("data-tag") === activeTag;
        c.classList.toggle("active", !!on);
        c.setAttribute("aria-pressed", on ? "true" : "false");
      });
      applyFilter();
    });
  });
})();
