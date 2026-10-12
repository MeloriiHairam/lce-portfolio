// Theme toggle, mobile menu and scroll reveal. No libraries.
(function () {
  var root = document.documentElement;
  root.classList.add("js");

  // Theme toggle (saved in localStorage)
  var themeBtn = document.querySelector(".theme-btn");
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) {}
    });
  }

  // Mobile menu
  var nav = document.querySelector(".nav");
  var menuBtn = document.querySelector(".menu-btn");
  if (menuBtn) {
    menuBtn.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", open);
      menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
  }

  // Staggered fade-up + scroll reveal
  var items = document.querySelectorAll(".reveal");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !("IntersectionObserver" in window)) {
    items.forEach(function (el) { el.classList.add("in"); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    var i = 0;
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.style.setProperty("--d", (i++ * 0.08) + "s");
        e.target.classList.add("in");
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  items.forEach(function (el) { io.observe(el); });
})();

// Colour bleed: the page background takes on the colours of the photo in view.
(function () {
  var imgs = document.querySelectorAll("img[data-bleed]");
  if (!imgs.length || !("IntersectionObserver" in window)) return;
  function autoColours(img) {
    try {
      var c = document.createElement("canvas"); c.width = c.height = 24;
      var x = c.getContext("2d"); x.drawImage(img, 0, 0, 24, 24);
      var d = x.getImageData(0, 0, 24, 24).data, best = [], i;
      for (i = 0; i < d.length; i += 4) {
        var r = d[i], g = d[i + 1], b = d[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        best.push({ s: (mx - mn) * (1 - Math.abs(mx + mn - 255) / 255), c: "rgb(" + r + "," + g + "," + b + ")" });
      }
      best.sort(function (a, b) { return b.s - a.s; });
      return [best[0].c, best[Math.floor(best.length / 8)].c];
    } catch (e) { return null; } // e.g. opened from your computer: no auto colours
  }
  function colours(img) {
    var v = img.getAttribute("data-bleed");
    if (v) return v.split(",");
    return img.complete && img.naturalWidth ? autoColours(img) : null;
  }
  var seen = new Map();
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { seen.set(e.target, e.intersectionRatio); });
    var top = null, ratio = 0.25;
    seen.forEach(function (r, el) { if (r > ratio) { ratio = r; top = el; } });
    var cs = top && colours(top);
    if (cs) {
      document.body.style.setProperty("--bleed-a", cs[0].trim());
      document.body.style.setProperty("--bleed-b", (cs[1] || cs[0]).trim());
      document.body.classList.add("bleeding");
    } else document.body.classList.remove("bleeding");
  }, { threshold: [0, 0.25, 0.5, 0.75, 1] });
  imgs.forEach(function (img) { io.observe(img); });
})();

// Full-screen photo viewer: click any photo to open; arrows, swipe or keys to browse.
(function () {
  var imgs = Array.prototype.slice.call(document.querySelectorAll("main img"));
  if (!imgs.length) return;
  var box = document.createElement("div");
  box.className = "lb"; box.hidden = true;
  box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-label", "Photo viewer");
  box.innerHTML = '<button class="lb-btn lb-close" aria-label="Close">&times;</button>' +
    '<button class="lb-btn lb-prev" aria-label="Previous photo">&#8249;</button>' +
    '<figure class="lb-fig"><img alt=""><figcaption></figcaption></figure>' +
    '<button class="lb-btn lb-next" aria-label="Next photo">&#8250;</button>';
  document.body.appendChild(box);
  var big = box.querySelector("img"), cap = box.querySelector("figcaption"), cur = 0, last = null;
  function caption(img) { var f = img.closest("figure"), fc = f && f.querySelector("figcaption"); return fc ? fc.textContent : img.alt; }
  function show(i) {
    cur = (i + imgs.length) % imgs.length;
    big.src = imgs[cur].src; big.alt = imgs[cur].alt;
    cap.textContent = caption(imgs[cur]) + "  ·  " + (cur + 1) + " / " + imgs.length;
  }
  function open(i) { last = document.activeElement; show(i); box.hidden = false; document.body.style.overflow = "hidden"; box.querySelector(".lb-close").focus(); }
  function close() { box.hidden = true; document.body.style.overflow = ""; if (last) last.focus(); }
  imgs.forEach(function (img, i) {
    img.classList.add("zoomable"); img.tabIndex = 0; img.setAttribute("role", "button");
    img.addEventListener("click", function () { open(i); });
    img.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(i); } });
  });
  box.querySelector(".lb-prev").onclick = function () { show(cur - 1); };
  box.querySelector(".lb-next").onclick = function () { show(cur + 1); };
  box.querySelector(".lb-close").onclick = close;
  box.addEventListener("click", function (e) { if (e.target === box) close(); });
  document.addEventListener("keydown", function (e) {
    if (box.hidden) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") show(cur - 1);
    if (e.key === "ArrowRight") show(cur + 1);
  });
  var sx = null;
  box.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; }, { passive: true });
  box.addEventListener("touchend", function (e) {
    if (sx === null) return; var dx = e.changedTouches[0].clientX - sx; sx = null;
    if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1));
  });
})();
