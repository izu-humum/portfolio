(function () {
  /* Landing page loader */
  (function runLoader() {
    const overlay = document.getElementById("loader-overlay");
    const loaderLineWrap = document.getElementById("loader-line-wrap");
    const loaderLineFill = document.getElementById("loader-line-fill");
    const percentEl = document.getElementById("loader-percent");
    const coordLeft = document.getElementById("loader-coord-left");
    const coordStrip = document.getElementById("loader-coord-strip");
    const loaderYear = document.getElementById("loader-year");
    if (!overlay) return;

    document.body.classList.add("loader-active");
    if (loaderYear) loaderYear.textContent = new Date().getFullYear();

    var loaderMouseX = 0;
    var loaderMouseY = 0;

    function updateLoaderCoords() {
      var w = window.innerWidth;
      var h = window.innerHeight;
      if (coordLeft) coordLeft.textContent = "W " + w + "  H " + h;
      if (coordStrip) coordStrip.textContent = "X " + Math.round(loaderMouseX) + "  Y " + Math.round(loaderMouseY);
    }
    function onLoaderResize() {
      var w = window.innerWidth;
      var h = window.innerHeight;
      if (coordLeft) coordLeft.textContent = "W " + w + "  H " + h;
    }
    function onLoaderMouseMove(e) {
      loaderMouseX = e.clientX;
      loaderMouseY = e.clientY;
      if (coordStrip) coordStrip.textContent = "X " + Math.round(loaderMouseX) + "  Y " + Math.round(loaderMouseY);
    }
    updateLoaderCoords();
    window.addEventListener("resize", onLoaderResize);
    overlay.addEventListener("mousemove", onLoaderMouseMove);

    var DURATION_MS = 3000;
    var percentSpace = 60;
    var maxLineH = window.innerHeight - percentSpace;
    if (loaderLineWrap) loaderLineWrap.style.height = maxLineH + "px";

    var startTime = null;
    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }
    function animateLoader(timestamp) {
      if (!startTime) startTime = timestamp;
      var elapsed = timestamp - startTime;
      var t = Math.min(elapsed / DURATION_MS, 1);
      var p = easeOutCubic(t) * 100;
      var h = (p / 100) * maxLineH;
      if (loaderLineFill) loaderLineFill.style.height = h + "px";
      if (percentEl) percentEl.textContent = Math.round(p) + "%";
      if (t < 1) requestAnimationFrame(animateLoader);
    }
    requestAnimationFrame(animateLoader);

    var delayPromise = new Promise(function (r) { setTimeout(r, DURATION_MS); });

    delayPromise.then(function () {
      if (loaderLineFill) loaderLineFill.style.height = maxLineH + "px";
      if (percentEl) percentEl.textContent = "100%";
      overlay.classList.add("loader-done");
      document.body.classList.remove("loader-active");
      window.dispatchEvent(new CustomEvent("loader-complete"));
      setTimeout(function () {
        overlay.remove();
        window.removeEventListener("resize", onLoaderResize);
        overlay.removeEventListener("mousemove", onLoaderMouseMove);
      }, 550);
    });
  })();

  const cursorDot = document.getElementById("cursor-dot");
  const cursorRing = document.getElementById("cursor-ring");
  const menuTrigger = document.getElementById("menu-trigger");
  const menuOverlay = document.getElementById("menu-overlay");
  const menuClose = document.getElementById("menu-close");
  const clockEl = document.getElementById("clock");
  const coordViewport = document.getElementById("coord-viewport");
  const heroCoordViewport = document.getElementById("hero-coord-viewport");
  const yearEl = document.getElementById("year");
  const heroTyped = document.getElementById("hero-typed");
  const heroCursor = document.getElementById("hero-cursor");
  const footerAdminLink = document.getElementById("footer-admin-link");

  // Supabase config for shared portfolio data (experience, projects, contact, CV).
  const SUPABASE_URL = "https://zrkzstwtwfgpjdhuakto.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_qNONFUTdFh_g7ejCKm3hTg_R2VUasLf";
  const SUPABASE_TABLE = "portfolio_data";
  const SUPABASE_SINGLETON_ID = "main";

  function createSupabaseClient() {
    if (!window.supabase || !SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
    try {
      return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (e) {
      console.error("Supabase init failed", e);
      return null;
    }
  }

  // Reuse a single Supabase client across pages to avoid multiple GoTrue instances.
  const supabaseClient = window.supabaseClient || createSupabaseClient();
  if (!window.supabaseClient && supabaseClient) {
    window.supabaseClient = supabaseClient;
  }
  let supabaseDataPromise = null;

  function ensureSupabaseData() {
    if (!supabaseClient) return Promise.resolve(null);
    if (supabaseDataPromise) return supabaseDataPromise;
    supabaseDataPromise = (async function () {
      try {
        const { data, error } = await supabaseClient
          .from(SUPABASE_TABLE)
          .select("experience, projects, contact, cv, about_meta, skills")
          .eq("id", SUPABASE_SINGLETON_ID)
          .maybeSingle();
        if (error || !data) return null;
        if (data.experience) localStorage.setItem("portfolio_experience", JSON.stringify(data.experience));
        if (data.projects) localStorage.setItem("portfolio_projects", JSON.stringify(data.projects));
        if (data.contact) localStorage.setItem("portfolio_contact", JSON.stringify(data.contact));
        if (data.cv) localStorage.setItem("portfolio_cv", JSON.stringify(data.cv));
        if (data.about_meta) localStorage.setItem("portfolio_about_meta", JSON.stringify(data.about_meta));
        if (data.skills) localStorage.setItem("portfolio_skills_master", JSON.stringify(data.skills));
        return data;
      } catch (e) {
        console.error("Supabase load failed", e);
        return null;
      }
    })();
    return supabaseDataPromise;
  }

  // Hidden admin link: click on footer "Izu" to open login page.
  if (footerAdminLink) {
    footerAdminLink.addEventListener("click", function (e) {
      e.preventDefault();
      window.location.href = "login.html";
    });
  }

  let mouseX = 0, mouseY = 0;
  let dotX = 0, dotY = 0;
  let ringX = 0, ringY = 0;
  let visible = false;
  let spinTimeout = null;
  const HOVER_SELECTOR = "a, button, [role='button'], .btn-ava, .company-card, .project-card, .contact-link";

  const lerp = (start, end, factor) => start + (end - start) * factor;

  function updateCursor(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!visible) {
      visible = true;
      if (cursorDot) cursorDot.style.opacity = "1";
      if (cursorRing) cursorRing.style.opacity = "1";
    }
  }

  function leaveCursor() {
    visible = false;
    if (cursorDot) cursorDot.style.opacity = "0";
    if (cursorRing) cursorRing.style.opacity = "0";
  }

  function parseRgbLuminance(cssColor) {
    if (!cssColor || cssColor === "rgba(0, 0, 0, 0)" || cssColor === "transparent") return null;
    var m = cssColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return null;
    var r = parseInt(m[1], 10), g = parseInt(m[2], 10), b = parseInt(m[3], 10);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }

  function getBackgroundLuminance(el) {
    var node = el;
    while (node && node !== document.body) {
      var bg = node && window.getComputedStyle(node).backgroundColor;
      var L = parseRgbLuminance(bg);
      if (L !== null) return L;
      node = node.parentElement;
    }
    var bodyBg = document.body && window.getComputedStyle(document.body).backgroundColor;
    var L = parseRgbLuminance(bodyBg);
    return L !== null ? L : 1;
  }

  function isDarkTextElement(el) {
    if (!el || !el.tagName) return false;
    var textTags = ["A", "SPAN", "P", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "TD", "TH", "LABEL", "BUTTON"];
    if (textTags.indexOf(el.tagName) === -1) return false;
    var color = window.getComputedStyle(el).color;
    var lum = parseRgbLuminance(color);
    return lum !== null && lum < 0.5;
  }

  function updateCursorBg() {
    var el = document.elementFromPoint(mouseX, mouseY);
    var onRed = el && el.closest("[data-cursor-bg=\"red\"]");
    var onBlack = el && el.closest("[data-cursor-bg=\"black\"]");
    var onDarkBg = false;
    var onDarkText = false;
    if (!onRed && !onBlack) {
      var bgLum = getBackgroundLuminance(el);
      if (bgLum !== null && bgLum < 0.5) {
        onDarkBg = true;
      } else {
        onDarkText = isDarkTextElement(el);
      }
    }
    if (cursorRing) {
      cursorRing.classList.toggle("on-red", !!onRed);
      cursorRing.classList.toggle("on-black", !!onBlack);
      cursorRing.classList.toggle("on-dark-bg", !!onDarkBg);
      cursorRing.classList.toggle("on-dark-text", !!onDarkText);
    }
  }

  function animate() {
    const ringFactor = 0.18;
    const dotFactor = 0.12;
    ringX = lerp(ringX, mouseX, ringFactor);
    ringY = lerp(ringY, mouseY, ringFactor);
    dotX = lerp(dotX, mouseX, dotFactor);
    dotY = lerp(dotY, mouseY, dotFactor);

    if (cursorRing) {
      cursorRing.style.left = ringX + "px";
      cursorRing.style.top = ringY + "px";
    }
    if (cursorDot) {
      cursorDot.style.left = dotX + "px";
      cursorDot.style.top = dotY + "px";
    }
    updateCursorBg();
    if (heroCoordViewport) heroCoordViewport.textContent = "X " + Math.round(mouseX) + "  Y " + Math.round(mouseY);
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);

  document.addEventListener("mousemove", updateCursor);
  document.addEventListener("mouseleave", leaveCursor);

  document.querySelectorAll(HOVER_SELECTOR).forEach(function (el) {
    el.addEventListener("mouseenter", function () {
      if (cursorRing) {
        cursorRing.classList.add("hover", "spin");
        if (spinTimeout) clearTimeout(spinTimeout);
        spinTimeout = setTimeout(function () {
          if (cursorRing) cursorRing.classList.remove("spin");
          spinTimeout = null;
        }, 1000);
      }
    });
    el.addEventListener("mouseleave", function () {
      if (cursorRing) {
        cursorRing.classList.remove("hover", "spin");
      }
      if (spinTimeout) {
        clearTimeout(spinTimeout);
        spinTimeout = null;
      }
    });
  });

  if (menuTrigger && menuOverlay) {
    menuTrigger.addEventListener("click", () => {
      menuOverlay.classList.add("open");
      document.body.style.overflow = "hidden";
    });
  }

  if (menuClose && menuOverlay) {
    menuClose.addEventListener("click", () => {
      menuOverlay.classList.remove("open");
      document.body.style.overflow = "";
    });
    menuOverlay.addEventListener("click", (e) => {
      if (e.target === menuOverlay) {
        menuOverlay.classList.remove("open");
        document.body.style.overflow = "";
      }
    });
  }

  /* Close menu when a nav link is clicked (e.g. EXPERIENCE) and go to section */
  document.querySelectorAll(".menu-nav a").forEach((link) => {
    link.addEventListener("click", () => {
      if (menuOverlay) {
        menuOverlay.classList.remove("open");
        document.body.style.overflow = "";
      }
    });
  });

  /* Download CV: from localStorage (admin upload) or fallback to cv.pdf */
  var menuDownloadCv = document.getElementById("menu-download-cv");
  if (menuDownloadCv) {
    menuDownloadCv.addEventListener("click", function (e) {
      e.preventDefault();
      if (menuOverlay) {
        menuOverlay.classList.remove("open");
        document.body.style.overflow = "";
      }
      try {
        var stored = localStorage.getItem("portfolio_cv");
        if (stored) {
          var cv = JSON.parse(stored);
          if (cv.filename && cv.data) {
            var binary = atob(cv.data);
            var bytes = new Uint8Array(binary.length);
            for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            var blob = new Blob([bytes], { type: "application/pdf" });
            var url = URL.createObjectURL(blob);
            var a = document.createElement("a");
            a.href = url;
            a.download = cv.filename;
            a.style.display = "none";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            return;
          }
        }
      } catch (err) {}
      var fallback = document.createElement("a");
      fallback.href = "cv.pdf";
      fallback.download = "cv.pdf";
      fallback.style.display = "none";
      document.body.appendChild(fallback);
      fallback.click();
      document.body.removeChild(fallback);
    });
  }

  function updateClock() {
    if (!clockEl) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-GB", { timeZone: "Asia/Dhaka", hour12: false });
    clockEl.textContent = timeStr;
  }
  updateClock();
  setInterval(updateClock, 1000);

  function updateCoords() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    if (coordViewport) coordViewport.textContent = "W " + w + "  H " + h;
  }
  updateCoords();
  window.addEventListener("resize", updateCoords);
  window.addEventListener("scroll", updateCoords, { passive: true });

  /* Hero typing animation: type "HUMAM AHMED " then "IZU", then show blinking cursor */
  function typeHeroName() {
    if (!heroTyped || !heroCursor) return;
    var part1 = "HUMAM AHMED ";
    var part2 = "IZU";
    var charDelay = 90;
    var phase = "part1";
    var idx = 0;
    var accentSpan = null;
    var lineSpan = document.createElement("span");
    lineSpan.className = "hero-title-line";
    heroTyped.appendChild(lineSpan);

    function typeNext() {
      if (phase === "part1") {
        if (idx < part1.length) {
          lineSpan.appendChild(document.createTextNode(part1[idx]));
          idx++;
          setTimeout(typeNext, charDelay);
          return;
        }
        phase = "part2";
        idx = 0;
        heroTyped.appendChild(document.createElement("br"));
        accentSpan = document.createElement("span");
        accentSpan.className = "accent";
        heroTyped.appendChild(accentSpan);
      }
      if (phase === "part2") {
        if (idx < part2.length) {
          accentSpan.appendChild(document.createTextNode(part2[idx]));
          idx++;
          setTimeout(typeNext, charDelay);
          return;
        }
        heroCursor.classList.add("visible");
        return;
      }
      setTimeout(typeNext, charDelay);
    }
    typeNext();
  }

  var loaderOverlay = document.getElementById("loader-overlay");
  if (loaderOverlay) {
    window.addEventListener("loader-complete", function () {
      setTimeout(typeHeroName, 1000);
    }, { once: true });
  } else {
    typeHeroName();
  }

  /* Load Experience and Projects from admin (localStorage) */
  function escapeHtml(str) {
    if (!str) return "";
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  var allowedDescTags = { p: 1, br: 1, b: 1, strong: 1, i: 1, em: 1, u: 1, s: 1, strike: 1, a: 1, ul: 1, ol: 1, li: 1, span: 1 };
  function sanitizeDescriptionHtml(html) {
    if (!html || typeof html !== "string") return "";
    var wrap = document.createElement("div");
    wrap.innerHTML = html;
    function sanitizeNode(node) {
      if (node.nodeType === 3) return true;
      if (node.nodeType !== 1) return false;
      var tag = node.tagName ? node.tagName.toLowerCase() : "";
      if (!allowedDescTags[tag]) return false;
      if (tag === "a") {
        var href = node.getAttribute("href");
        if (href && /^https?:\/\//i.test(href)) {
          node.setAttribute("href", href);
          node.setAttribute("target", "_blank");
          node.setAttribute("rel", "noopener");
        } else {
          node.removeAttribute("href");
        }
        for (var ai = node.attributes.length - 1; ai >= 0; ai--) {
          var ax = node.attributes[ai];
          if (ax.name !== "href" && ax.name !== "target" && ax.name !== "rel") node.removeAttribute(ax.name);
        }
      } else {
        for (var j = node.attributes.length - 1; j >= 0; j--) node.removeAttribute(node.attributes[j].name);
      }
      for (var k = node.childNodes.length - 1; k >= 0; k--) {
        if (!sanitizeNode(node.childNodes[k])) node.removeChild(node.childNodes[k]);
      }
      return true;
    }
    for (var i = wrap.childNodes.length - 1; i >= 0; i--) {
      if (!sanitizeNode(wrap.childNodes[i])) wrap.removeChild(wrap.childNodes[i]);
    }
    return wrap.innerHTML;
  }

  function formatMonthYear(dateStr) {
    if (!dateStr || dateStr.length < 7) return dateStr ? dateStr.slice(0, 4) : "";
    var parts = dateStr.split("-").map(Number);
    var m = parts[1];
    var y = parts[0];
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return (months[m - 1] || "") + " " + y;
  }

  function getPeriodDisplay(item) {
    if (item.startDate) {
      var startStr = formatMonthYear(item.startDate);
      if (item.present) return startStr + " — Present";
      if (item.endDate) return startStr + " — " + formatMonthYear(item.endDate);
      return startStr + " — Present";
    }
    return item.period || "";
  }

  function loadAboutMeta() {
    ensureSupabaseData().then(function () {
      try {
        var raw = localStorage.getItem("portfolio_about_meta");
        var meta = raw ? JSON.parse(raw) : null;
        if (meta) {
          var roleEl = document.getElementById("about-role");
          var expEl = document.getElementById("about-experience");
          var focusEl = document.getElementById("about-focus");
          if (roleEl && meta.role) roleEl.textContent = meta.role;
          if (expEl && meta.experienceYears) expEl.textContent = meta.experienceYears;
          if (focusEl && meta.focus) {
            var focusParts = meta.focus.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
            focusEl.textContent = focusParts.length ? focusParts.join(" · ") : meta.focus;
          }
        }
      } catch (e) {}
    });
  }

  function renderAboutSkills(skillIndex) {
    var container = document.getElementById("about-skills");
    if (!container) return;
    var names = Object.keys(skillIndex);
    if (!names.length) {
      container.textContent = "";
      return;
    }
    container.innerHTML = "";
    container.className = "";
    names.forEach(function (name) {
      if (container.childNodes.length > 0) {
        container.appendChild(document.createTextNode(" · "));
      }
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "about-skill";
      btn.textContent = name;
      var projectIds = skillIndex[name];
      btn.addEventListener("click", function () {
        if (!projectIds || !projectIds.length) return;
        var firstEl = null;
        projectIds.forEach(function (pid) {
          var el = document.getElementById(pid);
          if (!el) return;
          if (!firstEl) firstEl = el;
          el.querySelectorAll(".project-skill").forEach(function (chip) {
            if (chip.textContent.trim() === name) {
              chip.classList.add("glow");
              setTimeout(function () {
                chip.classList.remove("glow");
              }, 3000);
            }
          });
        });
        if (firstEl) {
          firstEl.scrollIntoView({ behavior: "smooth", block: "center" });
          firstEl.classList.add("skill-target");
          setTimeout(function () {
            firstEl.classList.remove("skill-target");
          }, 600);
        }
      });
      container.appendChild(btn);
    });
  }

  function setupProjectSkillCycling(skillIndex) {
    var cycleIndex = {};
    Object.keys(skillIndex).forEach(function (name) {
      cycleIndex[name] = 0;
    });

    document.querySelectorAll(".project-skill").forEach(function (chip) {
      chip.addEventListener("click", function () {
        var name = this.textContent.trim();
        var ids = skillIndex[name];
        if (!ids || !ids.length) return;

        // Advance to next project using this skill
        var idx = (cycleIndex[name] || 0) + 1;
        if (idx >= ids.length) idx = 0;
        cycleIndex[name] = idx;

        var targetId = ids[idx];
        var proj = document.getElementById(targetId);
        if (!proj) return;

        proj.scrollIntoView({ behavior: "smooth", block: "center" });
        proj.classList.add("skill-target");
        setTimeout(function () {
          proj.classList.remove("skill-target");
        }, 600);

        // Glow only this skill inside the target project
        proj.querySelectorAll(".project-skill").forEach(function (pchip) {
          if (pchip.textContent.trim() === name) {
            pchip.classList.add("glow");
            setTimeout(function () {
              pchip.classList.remove("glow");
            }, 3000);
          }
        });
      });
    });
  }

  function loadPortfolioData() {
    var experienceList = document.getElementById("experience-list");
    var projectsList = document.getElementById("projects-list");
    if (!experienceList || !projectsList) return;

    ensureSupabaseData().then(function () {
      try {
        var experienceRaw = localStorage.getItem("portfolio_experience");
        var experience = experienceRaw ? JSON.parse(experienceRaw) : [];
        if (Array.isArray(experience) && experience.length > 0) {
          experienceList.innerHTML = experience
            .map(function (item) {
              var safeUrl = item.companyUrl && /^https?:\/\//i.test(item.companyUrl) ? item.companyUrl : "";
              var nameHtml = escapeHtml(item.companyName);
              if (safeUrl) nameHtml = '<a href="' + escapeHtml(safeUrl) + '" target="_blank" rel="noopener" class="company-name-link">' + nameHtml + "</a>";
              else nameHtml = "<span class=\"company-name-text\">" + nameHtml + "</span>";
              var logoHtml = "";
              if (safeUrl) {
                try {
                  var domain = new URL(safeUrl).hostname;
                  var logoUrl = "https://logo.clearbit.com/" + encodeURIComponent(domain);
                  var fallbackUrl = "https://www.google.com/s2/favicons?domain=" + encodeURIComponent(domain) + "&sz=128";
                  logoHtml = '<img src="' + escapeHtml(logoUrl) + '" alt="" class="company-logo" data-fallback="' + escapeHtml(fallbackUrl) + '" onerror="var f=this.getAttribute(\'data-fallback\');if(f){this.onerror=null;this.src=f;}" />';
                } catch (e) {}
              }
              var periodStr = getPeriodDisplay(item);
              return (
                '<article class="company-card">' +
                '<div class="company-header">' +
                (logoHtml ? '<div class="company-logo-wrap">' + logoHtml + "</div>" : "") +
                '<div class="company-header-text">' +
                "<h3 class=\"company-name\">" + nameHtml + "</h3>" +
                "<span class=\"company-period\">" + escapeHtml(periodStr) + "</span>" +
                "</div>" +
                "</div>" +
                "<p class=\"company-role\">" + escapeHtml(item.role) + "</p>" +
                (item.description ? "<div class=\"tile-desc-wrap\"><div class=\"company-desc\">" + sanitizeDescriptionHtml(item.description) + "</div><button type=\"button\" class=\"tile-desc-toggle\" aria-expanded=\"false\">See more</button></div>" : "") +
                "</article>"
              );
            })
            .join("");
        }

        var projectsRaw = localStorage.getItem("portfolio_projects");
        var projects = projectsRaw ? JSON.parse(projectsRaw) : [];
        if (Array.isArray(projects) && projects.length > 0) {
          var skillIndex = {};
          projectsList.innerHTML = projects
            .map(function (item, idx) {
              var projectId = item.id || ("project-" + idx);
              var skillHtml = "";
              if (item.skill && item.skill.trim()) {
                var skills = item.skill.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
                skills.forEach(function (s) {
                  if (!skillIndex[s]) skillIndex[s] = [];
                  if (skillIndex[s].indexOf(projectId) === -1) skillIndex[s].push(projectId);
                });
                skillHtml = skills.length
                  ? "<div class=\"project-skills\">" + skills.map(function (s) { return "<span class=\"project-skill\">" + escapeHtml(s) + "</span>"; }).join("") + "</div>"
                  : "";
              }
              var types = item.projectType;
              var typeStr = Array.isArray(types) ? (types.length ? types.join(" · ") : "") : (types && typeof types === "string" ? types.trim() : "");
              var typeHtml = typeStr ? "<span class=\"project-type\">" + escapeHtml(typeStr) + "</span>" : "";
              return (
                '<article class="project-card" id="' + escapeHtml(projectId) + '">' +
                "<div class=\"project-title-row\">" +
                "<h3 class=\"project-title\">" + escapeHtml(item.title) + "</h3>" +
                typeHtml +
                "</div>" +
                skillHtml +
                (item.description ? "<div class=\"tile-desc-wrap\"><div class=\"project-desc\">" + sanitizeDescriptionHtml(item.description) + "</div><button type=\"button\" class=\"tile-desc-toggle\" aria-expanded=\"false\">See more</button></div>" : "") +
                "</article>"
              );
            })
            .join("");

          renderAboutSkills(skillIndex);
          setupProjectSkillCycling(skillIndex);
        }
      } catch (e) {}
    });
  }

  function hideSeeMoreWhenNotNeeded() {
    document.querySelectorAll(".tile-desc-wrap").forEach(function (wrap) {
      var desc = wrap.querySelector(".company-desc, .project-desc");
      if (!desc) return;
      var text = (desc.textContent || "").trim();
      // For short descriptions, always hide the toggle to avoid "See more" on one-liners.
      if (text.length <= 160) {
        wrap.classList.add("tile-desc-no-toggle");
        return;
      }
      // Fallback: if content doesn't overflow the clamped area, hide the toggle.
      if (desc.scrollHeight <= desc.clientHeight) {
        wrap.classList.add("tile-desc-no-toggle");
      }
    });
  }

  loadPortfolioData();
  loadAboutMeta();

  function loadContactData() {
    var contactText = document.getElementById("contact-text");
    var contactEmail = document.getElementById("contact-email");
    var contactLinkedin = document.getElementById("contact-linkedin");
    var contactGithub = document.getElementById("contact-github");
    var contactDiscord = document.getElementById("contact-discord");
    ensureSupabaseData().then(function () {
      try {
        var raw = localStorage.getItem("portfolio_contact");
        var c = raw ? JSON.parse(raw) : null;
        if (c) {
          if (contactText && c.text) contactText.textContent = c.text;
          if (contactEmail) contactEmail.href = c.email ? "mailto:" + c.email : "#";
          if (contactLinkedin) contactLinkedin.href = c.linkedinUrl || "#";
          if (contactGithub) contactGithub.href = c.githubUrl || "#";
          if (contactDiscord) contactDiscord.href = c.discordUrl || "#";
        }
      } catch (e) {}
    });
  }
  loadContactData();

  hideSeeMoreWhenNotNeeded();

  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".tile-desc-toggle");
    if (!btn) return;
    e.preventDefault();
    var wrap = btn.closest(".tile-desc-wrap");
    if (!wrap) return;
    var isExpanded = wrap.classList.toggle("expanded");
    btn.setAttribute("aria-expanded", isExpanded);
    btn.textContent = isExpanded ? "See less" : "See more";
  });

  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  const yearFooter = document.getElementById("year-footer");
  if (yearFooter) {
    yearFooter.textContent = new Date().getFullYear();
  }

  const footerViewport = document.getElementById("footer-viewport");
  if (footerViewport) {
    function updateFooterCoord() {
      footerViewport.textContent = `${window.innerWidth} X ${window.innerHeight} W`;
    }
    updateFooterCoord();
    window.addEventListener("resize", updateFooterCoord);
  }
})();
