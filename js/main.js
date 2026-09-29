// vanlang-home — main.js
// Nút CHƠI NGAY mở WebApp V0.6 (window.VANLANG_CONFIG.GAME_URL)
// Trang chủ và game là hai project độc lập — không can thiệp GameSrc/server V0.6
(function () {
  "use strict";
  var cfg = (window.VANLANG_CONFIG || {});
  var GAME_URL = (cfg.GAME_URL || "").trim();
  var VERSION  = cfg.VERSION || "V0.6";

  var isPlaceholder = !GAME_URL || GAME_URL.indexOf("game.vanlang.biz") !== -1;

  function openGame(ev) {
    // Mở WebApp ở tab mới (rel noopener, không giữ window.opener)
    window.open(GAME_URL || "https://game.vanlang.biz", "_blank", "noopener");
    if (ev) ev.preventDefault();
  }

  function wirePlayButtons() {
    ["playBtnTop", "playBtnHero", "playBtnPlay", "playBtnCta", "playBtnMobile"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.setAttribute("href", GAME_URL || "https://game.vanlang.biz");
      el.setAttribute("target", "_blank");
      el.addEventListener("click", openGame);
    });
  }

  function renderVersion() {
    var badge = document.getElementById("versionBadge");
    if (badge) badge.textContent = VERSION.replace(" — chờ V0.6-STABLE", "");

    var ctaUrl = document.getElementById("ctaUrl");
    if (ctaUrl) {
      ctaUrl.innerHTML = 'WebApp: <a href="' + GAME_URL + '" target="_blank" rel="noopener">' + GAME_URL + '</a>';
      if (isPlaceholder) {
        var hint = document.createElement("span");
        hint.style.cssText = "display:block;margin-top:4px;font-size:12px;color:var(--bronze)";
        hint.textContent = "Đang chờ tag V0.6-STABLE — URL sẽ cập nhật tự động khi game sẵn sàng.";
        ctaUrl.appendChild(hint);
      }
    }
    var ctaVersion = document.getElementById("ctaVersion");
    if (ctaVersion) ctaVersion.textContent = VERSION;

    var fv = document.getElementById("footerVersion");
    if (fv) fv.textContent = VERSION;
    var fg = document.getElementById("footerGameUrl");
    if (fg) fg.textContent = GAME_URL.replace(/^https?:\/\//, "") || "game.vanlang.biz";
  }

  // ==== Tabs (weapon + class chooser dùng chung) ====
  function wireTabs(tabSel, panelSel) {
    var tabs = document.querySelectorAll(tabSel);
    var panels = document.querySelectorAll(panelSel);
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        var key = tab.getAttribute("data-weapon") || tab.getAttribute("data-class");
        tabs.forEach(function (t) {
          var active = t === tab;
          t.classList.toggle("is-active", active);
          t.setAttribute("aria-selected", active ? "true" : "false");
        });
        panels.forEach(function (p) {
          var isActive = p.getAttribute("data-panel") === key;
          p.classList.toggle("is-active", isActive);
          if (isActive) p.removeAttribute("hidden"); else p.setAttribute("hidden", "");
        });
        tabs.forEach(function (t) {
          t.setAttribute("tabindex", t.classList.contains("is-active") ? "0" : "-1");
        });
      });
    });
  }

  // ==== Hero lineup: toggle Nam / Nữ (đổi sprite giữa 2 dòng) ====
  function wireHeroGenderToggle() {
    var btn = document.getElementById("heroGenderToggle");
    if (!btn) return;
    var female = false;
    var HERO_SPRITES = {
      axe:    { male: "hero_axe_male",     female: "hero_axe_female" },
      bow:    { male: "hero_bow_male",     female: "hero_bow_female" },
      bamboo: { male: "hero_bamboo_male",  female: "hero_bamboo_female" }
    };
    btn.addEventListener("click", function () {
      female = !female;
      btn.setAttribute("aria-pressed", female ? "true" : "false");
      document.querySelectorAll(".hero-figure").forEach(function (fig) {
        var kind = fig.getAttribute("data-figure");
        var map = HERO_SPRITES[kind];
        if (!map) return;
        var spriteEl = fig.querySelector("[data-sprite]");
        if (!spriteEl) return;
        // đổi data-sprite rồi áp lại atlas
        var h = parseInt(spriteEl.getAttribute("data-h") || "340", 10);
        spriteEl.setAttribute("data-sprite", female ? map.female : map.male);
        spriteEl.setAttribute("data-h", String(h));
        spriteEl.style.height = "";
        if (window.VANLANG_ATLAS) window.VANLANG_ATLAS.applyOne(spriteEl);
      });
    });
  }

  // ==== Reveal on scroll ====
  function wireReveal() {
    var els = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    els.forEach(function (el) { io.observe(el); });
  }

  // ==== Scroll-spy: highlight mục nav đang xem ====
  function wireScrollSpy() {
    var links = document.querySelectorAll(".nav a");
    if (!links.length) return;
    var sections = [];
    links.forEach(function (a) {
      var id = a.getAttribute("href").slice(1);
      var sec = document.getElementById(id);
      if (sec) sections.push({ link: a, sec: sec });
    });
    if (!sections.length) return;
    function update() {
      var pos = window.scrollY + window.innerHeight * 0.3;
      var current = null;
      sections.forEach(function (s) { if (s.sec.offsetTop <= pos) current = s; });
      links.forEach(function (a) { a.classList.remove("is-active"); });
      if (current) current.link.classList.add("is-active");
    }
    window.addEventListener("scroll", update, { passive: true });
    update();
  }

  // Mobile nav
  function wireMobileNav() {
    var toggle = document.getElementById("navToggle");
    var nav = document.getElementById("mobileNav");
    if (!toggle || !nav) return;
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", open ? "false" : "true");
      nav.hidden = open;
    });
    nav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        toggle.setAttribute("aria-expanded", "false");
        nav.hidden = true;
      });
    });
  }

  // Sticky topbar subtle shadow on scroll
  function wireTopbarScroll() {
    var topbar = document.getElementById("topbar");
    if (!topbar) return;
    var onScroll = function () {
      topbar.style.boxShadow = window.scrollY > 8
        ? "0 6px 24px rgba(0,0,0,.35)"
        : "none";
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  function wireNewsTabs() {
    var tabs = document.querySelectorAll(".news-tab");
    var panels = document.querySelectorAll(".news-panel");
    if (!tabs.length) return;
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        var key = tab.getAttribute("data-news");
        tabs.forEach(function (t) {
          var on = t === tab;
          t.classList.toggle("is-active", on);
          t.setAttribute("aria-selected", on ? "true" : "false");
        });
        panels.forEach(function (p) {
          var isActive = p.getAttribute("data-panel") === key;
          p.classList.toggle("is-active", isActive);
          if (isActive) p.removeAttribute("hidden"); else p.setAttribute("hidden", "");
        });
        tabs.forEach(function (t) {
          t.setAttribute("tabindex", t.classList.contains("is-active") ? "0" : "-1");
        });
      });
    });
  }


  // ==== Hero background: assets/images/hero-bg.webp (fallback: không có thì giữ gradient) ====
  function loadHeroBg() {
    var el = document.getElementById('heroBgPhoto');
    if (!el) return;
    var url = 'assets/images/hero-bg.webp';
    var img = new Image();
    img.onload = function () { el.style.backgroundImage = 'url("' + url + '")'; el.classList.add('has-image'); };
    img.onerror = function () { /* giữ gradient */ };
    img.src = url;
  }

  // ==== Map card backgrounds: assets/maps/<slug>.webp ====
  function loadMapBgs() {
    document.querySelectorAll('[data-map-bg]').forEach(function (el) {
      var slug = el.getAttribute('data-map-bg');
      if (!slug) return;
      var url = 'assets/maps/' + slug + '.webp';
      var img = new Image();
      img.onload = function () { el.style.backgroundImage = 'url("' + url + '")'; el.classList.add('has-image'); };
      img.onerror = function () {};
      img.src = url;
    });
  }

  // ==== Gameplay preview: assets/screenshots/gameplay-0N.webp ====
  function loadPreviewShots() {
    document.querySelectorAll('.preview-frame').forEach(function (frame) {
      var n = frame.getAttribute('data-shot');
      if (!n) return;
      var pad = n.length === 1 ? '0' + n : n;
      var url = 'assets/screenshots/gameplay-' + pad + '.webp';
      var slot = frame.querySelector('.preview-slot');
      if (!slot) return;
      var img = new Image();
      img.onload = function () { slot.style.backgroundImage = 'url("' + url + '")'; slot.classList.add('has-image'); };
      img.onerror = function () {};
      img.src = url;
    });
  }

  // ==== Keyboard: arrow keys cho tab groups + smooth scroll cho anchor links ====
  function wireKeyboardTabs() {
    function bindGroup(tabSel) {
      var tabs = Array.prototype.slice.call(document.querySelectorAll(tabSel));
      if (!tabs.length) return;
      tabs.forEach(function (tab, idx) {
        tab.addEventListener('keydown', function (ev) {
          if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft' && ev.key !== 'Home' && ev.key !== 'End') return;
          ev.preventDefault();
          var next;
          if (ev.key === 'Home') next = 0;
          else if (ev.key === 'End') next = tabs.length - 1;
          else if (ev.key === 'ArrowRight') next = (idx + 1) % tabs.length;
          else next = (idx - 1 + tabs.length) % tabs.length;
          tabs[next].focus(); tabs[next].click();
        });
      });
    }
    bindGroup('.class-chooser-btn');
    bindGroup('.weapon-tab');
  }

  function wireSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      var href = a.getAttribute('href');
      if (!href || href === '#') return;
      a.addEventListener('click', function (ev) {
        var target = document.querySelector(href);
        if (!target) return;
        ev.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.replaceState(null, '', href);
        // đóng mobile nav nếu đang mở
        var toggle = document.getElementById('navToggle');
        var nav = document.getElementById('mobileNav');
        if (toggle && nav && toggle.getAttribute('aria-expanded') === 'true') {
          toggle.setAttribute('aria-expanded', 'false');
          nav.hidden = true;
        }
      });
    });
  }

  function wireExploreMenu(){
    var trigger=document.getElementById('exploreTrigger');
    var panel=document.getElementById('explorePanel');
    var overlay=document.getElementById('exploreOverlay');
    if(!trigger||!panel) return;
    function open(){panel.hidden=false; if(overlay) overlay.hidden=false; requestAnimationFrame(function(){panel.classList.add('is-open'); if(overlay) overlay.classList.add('is-open')}); trigger.setAttribute('aria-expanded','true')}
    function close(){panel.classList.remove('is-open'); if(overlay) overlay.classList.remove('is-open'); trigger.setAttribute('aria-expanded','false'); setTimeout(function(){ if(!panel.classList.contains('is-open')) panel.hidden=true; if(overlay&&!overlay.classList.contains('is-open')) overlay.hidden=true},200)}
    trigger.addEventListener('click', function(){ panel.classList.contains('is-open')?close():open()});
    if(overlay) overlay.addEventListener('click', close);
    panel.querySelectorAll('a').forEach(function(a){ a.addEventListener('click', function(ev){ ev.preventDefault(); var target=document.querySelector(a.getAttribute('href')); if(target) target.scrollIntoView({behavior:'smooth',block:'start'}); history.replaceState(null,'',a.getAttribute('href')); close()})});
    document.addEventListener('keydown', function(e){ if(e.key==='Escape') close()});
    document.addEventListener('click', function(e){ if(!panel.contains(e.target)&&!trigger.contains(e.target)&&panel.classList.contains('is-open')) close()});
    // scroll-spy highlight inside explore panel
    var links=Array.from(panel.querySelectorAll('a'));
    var map={}; links.forEach(function(a){ var id=a.getAttribute('href').slice(1); var sec=document.getElementById(id); if(sec) map[id]=a});
    function spy(){ var pos=window.scrollY+window.innerHeight*0.35; var cur=null; Object.keys(map).forEach(function(id){ var sec=document.getElementById(id); if(sec&&sec.offsetTop<=pos) cur=id}); links.forEach(function(a){a.classList.remove('is-active')}); if(cur&&map[cur]) map[cur].classList.add('is-active')}
    window.addEventListener('scroll', spy, {passive:true}); spy()
  }
  document.documentElement.classList.remove('no-js');
  document.addEventListener("DOMContentLoaded", function () {
    // brand logo fallback class
    var bl=document.getElementById('brandLogo'); if(bl){ bl.addEventListener('error', function(){ document.getElementById('brandWordmark').style.display='flex'; }); if(bl.complete && bl.naturalWidth===0) document.getElementById('brandWordmark').style.display='flex'; }
    var hl=document.getElementById('heroLogo'); if(hl){ hl.addEventListener('error', function(){ document.getElementById('hero').classList.remove('hero--with-logo'); }); if(hl.complete && hl.naturalWidth>0) document.getElementById('hero').classList.add('hero--with-logo'); }
    if (window.VANLANG_ATLAS) window.VANLANG_ATLAS.init();
    wirePlayButtons();
    renderVersion();
    wireTabs(".weapon-tab", ".weapon-panel");
    wireTabs(".class-chooser-btn", ".class-panel");
    wireNewsTabs();
    wireHeroGenderToggle();
    wireReveal();
    wireScrollSpy();
    loadHeroBg();
    loadMapBgs();
    loadPreviewShots();
    wireKeyboardTabs();
    wireSmoothScroll();
    wireExploreMenu();
    wireMobileNav();
    wireTopbarScroll();
  });
})();
