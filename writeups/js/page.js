(function () {
  function flash(btn, ok) {
    var original = btn.getAttribute("data-label") || "copy";
    btn.textContent = ok ? "copied" : "copy failed";
    setTimeout(function () { btn.textContent = original; }, 1400);
  }
  function copyText(text, btn) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { flash(btn, true); }, function () { flash(btn, false); });
      return;
    }
    var area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    var ok = document.execCommand("copy");
    document.body.removeChild(area);
    flash(btn, ok);
  }
  document.querySelectorAll(".writeup-content div.highlight").forEach(function (host) {
    var code = host.querySelector("code");
    if (!code || host.querySelector(".copy-btn")) return;
    var button = document.createElement("button");
    button.type = "button";
    button.className = "copy-btn";
    button.textContent = "copy";
    button.setAttribute("data-label", "copy");
    button.setAttribute("aria-label", "Copy code to clipboard");
    button.addEventListener("click", function () { copyText(code.innerText, button); });
    host.appendChild(button);
  });
})();
