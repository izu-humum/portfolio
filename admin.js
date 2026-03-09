(function () {
  const STORAGE_EXPERIENCE = "portfolio_experience";
  const STORAGE_PROJECTS = "portfolio_projects";
  const STORAGE_CV = "portfolio_cv";
  const STORAGE_CONTACT = "portfolio_contact";
  const MAX_CV_BYTES = 4 * 1024 * 1024; // ~4MB (localStorage limit ~5MB)

  // Supabase config for shared admin data (fill these with your project settings).
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

  const supabaseClient = createSupabaseClient();
  let supabaseDataLoaded = false;

  async function ensureSupabaseDataAdmin() {
    if (!supabaseClient || supabaseDataLoaded) return;
    try {
      const { data, error } = await supabaseClient
        .from(SUPABASE_TABLE)
        .select("experience, projects, contact, cv")
        .eq("id", SUPABASE_SINGLETON_ID)
        .maybeSingle();
      if (!error && data) {
        if (data.experience) localStorage.setItem(STORAGE_EXPERIENCE, JSON.stringify(data.experience));
        if (data.projects) localStorage.setItem(STORAGE_PROJECTS, JSON.stringify(data.projects));
        if (data.contact) localStorage.setItem(STORAGE_CONTACT, JSON.stringify(data.contact));
        if (data.cv) localStorage.setItem(STORAGE_CV, JSON.stringify(data.cv));
      }
    } catch (e) {
      console.error("Supabase load (admin) failed", e);
    }
    supabaseDataLoaded = true;
  }

  function syncToSupabase(patch) {
    if (!supabaseClient || !patch) return;
    (async function () {
      try {
        const payload = Object.assign({ id: SUPABASE_SINGLETON_ID }, patch);
        const { error } = await supabaseClient
          .from(SUPABASE_TABLE)
          .upsert(payload, { onConflict: "id" });
        if (error) console.error("Supabase sync error", error);
      } catch (e) {
        console.error("Supabase sync failed", e);
      }
    })();
  }

  function getExperience() {
    try {
      const raw = localStorage.getItem(STORAGE_EXPERIENCE);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function getProjects() {
    try {
      const raw = localStorage.getItem(STORAGE_PROJECTS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveExperience(list) {
    localStorage.setItem(STORAGE_EXPERIENCE, JSON.stringify(list));
    syncToSupabase({ experience: list });
  }

  function saveProjects(list) {
    localStorage.setItem(STORAGE_PROJECTS, JSON.stringify(list));
    syncToSupabase({ projects: list });
  }

  function id() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function getContact() {
    try {
      const raw = localStorage.getItem(STORAGE_CONTACT);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function saveContact(data) {
    localStorage.setItem(STORAGE_CONTACT, JSON.stringify(data));
    syncToSupabase({ contact: data });
  }

  // --- CV UI ---
  const cvForm = document.getElementById("cv-form");
  const cvFileInput = document.getElementById("cv-file");
  const cvFilenameInput = document.getElementById("cv-filename");
  const cvRemoveBtn = document.getElementById("cv-remove");
  const cvStatus = document.getElementById("cv-status");

  function getCv() {
    try {
      const raw = localStorage.getItem(STORAGE_CV);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function setCvStatus(msg, isError) {
    if (!cvStatus) return;
    cvStatus.textContent = msg;
    cvStatus.style.color = isError ? "#c53030" : "";
  }

  function updateCvStatus() {
    const cv = getCv();
    if (cv && cv.filename) {
      setCvStatus("Current CV: " + cv.filename + " (uploaded). Visitors can download it from the portfolio menu.");
    } else {
      setCvStatus("No CV uploaded. Add a PDF above, or place cv.pdf in your site folder for a fallback.");
    }
  }

  cvForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const file = cvFileInput.files && cvFileInput.files[0];
    if (!file) {
      setCvStatus("Please choose a PDF file.", true);
      return;
    }
    if (file.type !== "application/pdf") {
      setCvStatus("Only PDF files are supported.", true);
      return;
    }
    if (file.size > MAX_CV_BYTES) {
      setCvStatus("File is too large. Use a PDF under ~4MB for reliable storage.", true);
      return;
    }
    const filename = (cvFilenameInput.value.trim() || file.name).replace(/\.pdf$/i, "") + ".pdf";
    const reader = new FileReader();
    reader.onload = function () {
      try {
        const base64 = reader.result.split(",")[1] || reader.result;
        const payload = { filename: filename, data: base64 };
        localStorage.setItem(STORAGE_CV, JSON.stringify(payload));
        syncToSupabase({ cv: payload });
        setCvStatus("CV uploaded. It will appear as \"Download CV\" on the portfolio.");
        updateCvStatus();
        cvFileInput.value = "";
        cvFilenameInput.value = "";
      } catch (err) {
        setCvStatus("Upload failed. Try a smaller PDF.", true);
      }
    };
    reader.readAsDataURL(file);
  });

  cvRemoveBtn.addEventListener("click", function () {
    if (confirm("Remove the uploaded CV? Visitors will see the fallback (cv.pdf) if you have one.")) {
      localStorage.removeItem(STORAGE_CV);
      syncToSupabase({ cv: null });
      updateCvStatus();
      cvFileInput.value = "";
      cvFilenameInput.value = "";
    }
  });

  // Initial CV status is updated after Supabase sync (see init at bottom).

  // --- Experience UI ---
  const experienceForm = document.getElementById("experience-form");
  const experienceId = document.getElementById("experience-id");
  const expCompany = document.getElementById("exp-company");
  const expUrl = document.getElementById("exp-url");
  const expStartDate = document.getElementById("exp-start-date");
  const expEndDate = document.getElementById("exp-end-date");
  const expPresent = document.getElementById("exp-present");
  const expRole = document.getElementById("exp-role");
  const experienceListEl = document.getElementById("experience-list");
  const experienceCancel = document.getElementById("experience-cancel");

  // Quill editors (same engine as PrimeReact Editor) — init after DOM
  let quillExp = null;
  let quillProj = null;
  function getDescHtml(editor) {
    if (!editor || !editor.root) return "";
    return editor.root.innerHTML;
  }
  function setDescHtml(editor, html) {
    if (!editor) return;
    if (!html || (typeof html === "string" && html.trim() === "")) {
      editor.setContents([], "silent");
      return;
    }
    editor.clipboard.dangerouslyPasteHTML(html);
  }
  (function initQuillEditors() {
    const expEl = document.getElementById("exp-desc-editor");
    const projEl = document.getElementById("proj-desc-editor");
    if (typeof Quill === "undefined" || !expEl || !projEl) return;
    const toolbar = [
      ["bold", "italic", "underline"],
      [{ list: "ordered" }, { list: "bullet" }, { indent: "-1" }, { indent: "+1" }],
      [{ align: [] }],
      ["link"],
    ];
    quillExp = new Quill(expEl, { theme: "snow", placeholder: "Write something...", modules: { toolbar } });
    quillProj = new Quill(projEl, { theme: "snow", placeholder: "Write something...", modules: { toolbar } });
  })();

  expPresent.addEventListener("change", function () {
    expEndDate.disabled = this.checked;
    if (this.checked) expEndDate.value = "";
  });

  function renderExperienceList() {
    const list = getExperience();
    if (list.length === 0) {
      experienceListEl.innerHTML = '<li class="empty">No experience entries yet. Add one above.</li>';
      return;
    }
    experienceListEl.innerHTML = list
      .map(
        (item) =>
          `<li data-id="${item.id}">
            <div class="content">
              <strong>${escapeHtml(item.companyName)}</strong>
              <span>${escapeHtml(item.period)}</span>
              <p>${escapeHtml(item.role)}</p>
              ${item.description ? `<p>${escapeHtml(stripHtml(item.description))}</p>` : ""}
            </div>
            <div class="actions">
              <button type="button" class="btn btn-small btn-ghost edit-exp">Edit</button>
              <button type="button" class="btn btn-small btn-danger delete-exp">Delete</button>
            </div>
          </li>`
      )
      .join("");

    experienceListEl.querySelectorAll(".edit-exp").forEach((btn) => {
      btn.addEventListener("click", function () {
        const li = this.closest("li");
        const item = list.find((i) => i.id === li.dataset.id);
        if (item) {
          experienceId.value = item.id;
          expCompany.value = item.companyName;
          expUrl.value = item.companyUrl || "";
          if (item.startDate) {
            expStartDate.value = item.startDate;
            expEndDate.value = item.endDate || "";
            expPresent.checked = !!item.present;
          } else {
            const parsed = parsePeriod(item.period);
            expStartDate.value = parsed.startDate || "";
            expEndDate.value = parsed.endDate || "";
            expPresent.checked = !!parsed.present;
          }
          expEndDate.disabled = expPresent.checked;
          expRole.value = item.role;
          setDescHtml(quillExp, item.description || "");
          experienceCancel.style.display = "inline-block";
        }
      });
    });

    experienceListEl.querySelectorAll(".delete-exp").forEach((btn) => {
      btn.addEventListener("click", function () {
        const li = this.closest("li");
        if (confirm("Delete this experience entry?")) {
          const next = getExperience().filter((i) => i.id !== li.dataset.id);
          saveExperience(next);
          renderExperienceList();
          if (experienceId.value === li.dataset.id) {
            experienceForm.reset();
            setDescHtml(quillExp, "");
            experienceId.value = "";
            experienceCancel.style.display = "none";
          }
        }
      });
    });
  }

  function parsePeriod(period) {
    if (!period) return {};
    const present = /present/i.test(period);
    const parts = period.split(/\s*—\s*/).map((s) => s.trim());
    const startYear = parts[0] && parts[0].match(/\d{4}/);
    const endYear = parts[1] && parts[1].match(/\d{4}/);
    return {
      startDate: startYear ? startYear[0] + "-01-01" : "",
      endDate: present || !endYear ? "" : endYear[0] + "-12-01",
      present: present,
    };
  }

  function formatMonthYear(dateStr) {
    if (!dateStr || dateStr.length < 7) return dateStr ? dateStr.slice(0, 4) : "";
    const parts = dateStr.split("-").map(Number);
    const y = parts[0];
    const m = parts[1];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return (months[m - 1] || "") + " " + y;
  }

  function buildPeriodFromDates() {
    const start = expStartDate.value;
    if (!start) return "";
    const startStr = formatMonthYear(start);
    if (expPresent.checked) return startStr + " — Present";
    const end = expEndDate.value;
    if (!end) return startStr + " — Present";
    return startStr + " — " + formatMonthYear(end);
  }

  experienceForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const list = getExperience();
    const periodStr = buildPeriodFromDates();
    const payload = {
      id: experienceId.value || id(),
      companyName: expCompany.value.trim(),
      companyUrl: (expUrl && expUrl.value.trim()) || "",
      period: periodStr,
      startDate: expStartDate.value,
      endDate: expPresent.checked ? "" : expEndDate.value,
      present: expPresent.checked,
      role: expRole.value.trim(),
      description: getDescHtml(quillExp).trim(),
    };
    const idx = list.findIndex((i) => i.id === payload.id);
    if (idx >= 0) list[idx] = payload;
    else list.push(payload);
    saveExperience(list);
    experienceForm.reset();
    setDescHtml(quillExp, "");
    expPresent.checked = false;
    expEndDate.disabled = false;
    experienceId.value = "";
    experienceCancel.style.display = "none";
    renderExperienceList();
  });

  experienceCancel.addEventListener("click", function () {
    experienceForm.reset();
    setDescHtml(quillExp, "");
    expPresent.checked = false;
    expEndDate.disabled = false;
    experienceId.value = "";
    this.style.display = "none";
  });

  // --- Projects UI ---
  const projectForm = document.getElementById("project-form");
  const projectId = document.getElementById("project-id");
  const projTitle = document.getElementById("proj-title");
  const projTypeInputs = () => Array.from(document.querySelectorAll('input[name="proj-type"]'));
  const getSelectedProjectTypes = () => projTypeInputs().filter((cb) => cb.checked).map((cb) => cb.value);
  const setSelectedProjectTypes = (arr) => {
    const a = Array.isArray(arr) ? arr : (arr ? [arr] : []);
    projTypeInputs().forEach((cb) => { cb.checked = a.includes(cb.value); });
  };
  const projSkill = document.getElementById("proj-skill");
  const projectsListEl = document.getElementById("projects-list");
  const projectCancel = document.getElementById("project-cancel");

  function renderProjectsList() {
    const list = getProjects();
    if (list.length === 0) {
      projectsListEl.innerHTML = '<li class="empty">No projects yet. Add one above.</li>';
      return;
    }
    projectsListEl.innerHTML = list
      .map(
        (item) =>
          `<li data-id="${item.id}">
            <div class="content">
              <strong>${escapeHtml(item.title)}</strong>
              ${item.projectType && (Array.isArray(item.projectType) ? item.projectType.length : item.projectType) ? `<span class="admin-type-preview">${escapeHtml(Array.isArray(item.projectType) ? item.projectType.join(", ") : item.projectType)}</span>` : ""}
              ${item.skill ? `<span class="admin-skill-preview">${escapeHtml(item.skill)}</span>` : ""}
              ${item.description ? `<p>${escapeHtml(stripHtml(item.description))}</p>` : ""}
            </div>
            <div class="actions">
              <button type="button" class="btn btn-small btn-ghost edit-proj">Edit</button>
              <button type="button" class="btn btn-small btn-danger delete-proj">Delete</button>
            </div>
          </li>`
      )
      .join("");

    projectsListEl.querySelectorAll(".edit-proj").forEach((btn) => {
      btn.addEventListener("click", function () {
        const li = this.closest("li");
        const item = list.find((i) => i.id === li.dataset.id);
        if (item) {
          projectId.value = item.id;
          projTitle.value = item.title;
          setSelectedProjectTypes(item.projectType);
          setDescHtml(quillProj, item.description || "");
          projSkill.value = item.skill || "";
          projectCancel.style.display = "inline-block";
        }
      });
    });

    projectsListEl.querySelectorAll(".delete-proj").forEach((btn) => {
      btn.addEventListener("click", function () {
        const li = this.closest("li");
        if (confirm("Delete this project?")) {
          const next = getProjects().filter((i) => i.id !== li.dataset.id);
          saveProjects(next);
          renderProjectsList();
          if (projectId.value === li.dataset.id) {
            projectForm.reset();
            setDescHtml(quillProj, "");
            setSelectedProjectTypes([]);
            if (projSkill) projSkill.value = "";
            projectId.value = "";
            projectCancel.style.display = "none";
          }
        }
      });
    });
  }

  projectForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const list = getProjects();
    const payload = {
      id: projectId.value || id(),
      title: projTitle.value.trim(),
      projectType: getSelectedProjectTypes(),
      description: getDescHtml(quillProj).trim(),
      skill: (projSkill && projSkill.value.trim()) || "",
    };
    const idx = list.findIndex((i) => i.id === payload.id);
    if (idx >= 0) list[idx] = payload;
    else list.push(payload);
    saveProjects(list);
    projectForm.reset();
    setDescHtml(quillProj, "");
    setSelectedProjectTypes([]);
    if (projSkill) projSkill.value = "";
    projectId.value = "";
    projectCancel.style.display = "none";
    renderProjectsList();
  });

  projectCancel.addEventListener("click", function () {
    projectForm.reset();
    setDescHtml(quillProj, "");
    setSelectedProjectTypes([]);
    if (projSkill) projSkill.value = "";
    projectId.value = "";
    this.style.display = "none";
  });

  // --- Contact UI ---
  const contactForm = document.getElementById("contact-form");
  const contactTextInput = document.getElementById("contact-text-input");
  const contactEmailInput = document.getElementById("contact-email-input");
  const contactLinkedinInput = document.getElementById("contact-linkedin-input");
  const contactGithubInput = document.getElementById("contact-github-input");
  const contactDiscordInput = document.getElementById("contact-discord-input");

  function loadContactForm() {
    const c = getContact();
    if (c) {
      if (contactTextInput) contactTextInput.value = c.text || "";
      if (contactEmailInput) contactEmailInput.value = c.email || "";
      if (contactLinkedinInput) contactLinkedinInput.value = c.linkedinUrl || "";
      if (contactGithubInput) contactGithubInput.value = c.githubUrl || "";
      if (contactDiscordInput) contactDiscordInput.value = c.discordUrl || "";
    }
  }

  if (contactForm) {
    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();
      saveContact({
        text: (contactTextInput && contactTextInput.value.trim()) || "",
        email: (contactEmailInput && contactEmailInput.value.trim()) || "",
        linkedinUrl: (contactLinkedinInput && contactLinkedinInput.value.trim()) || "",
        githubUrl: (contactGithubInput && contactGithubInput.value.trim()) || "",
        discordUrl: (contactDiscordInput && contactDiscordInput.value.trim()) || "",
      });
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function stripHtml(html) {
    if (!html) return "";
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent || "";
  }

  // --- Custom date picker (liquid glass + accent) ---
  const datePickerDropdown = document.getElementById("date-picker-dropdown");
  const datePickerDays = document.getElementById("date-picker-days");
  const datePickerMonthYear = document.getElementById("date-picker-month-year");
  const datePickerPrev = document.getElementById("date-picker-prev");
  const datePickerNext = document.getElementById("date-picker-next");
  const datePickerClear = document.getElementById("date-picker-clear");
  const datePickerToday = document.getElementById("date-picker-today");

  let datePickerTarget = null;
  let pickerYear = new Date().getFullYear();
  let pickerMonth = new Date().getMonth();

  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function openDatePicker(inputEl) {
    datePickerTarget = inputEl;
    const v = inputEl.value;
    if (v) {
      const [y, m] = v.split("-").map(Number);
      pickerYear = y;
      pickerMonth = m - 1;
    } else {
      const d = new Date();
      pickerYear = d.getFullYear();
      pickerMonth = d.getMonth();
    }
    datePickerDropdown.classList.add("open");
    datePickerDropdown.setAttribute("aria-hidden", "false");
    renderDatePickerDays();
    updateDatePickerHeader();
  }

  function closeDatePicker() {
    datePickerDropdown.classList.remove("open");
    datePickerDropdown.setAttribute("aria-hidden", "true");
    datePickerTarget = null;
  }

  function updateDatePickerHeader() {
    datePickerMonthYear.textContent = MONTHS[pickerMonth] + " " + pickerYear;
  }

  function setPickerValue(y, m, d) {
    if (!datePickerTarget) return;
    datePickerTarget.value = y + "-" + pad(m) + "-" + pad(d);
    closeDatePicker();
  }

  function renderDatePickerDays() {
    const first = new Date(pickerYear, pickerMonth, 1);
    const startOffset = first.getDay();
    const daysInMonth = new Date(pickerYear, pickerMonth + 1, 0).getDate();
    const prevMonthDays = new Date(pickerYear, pickerMonth, 0).getDate();
    const today = new Date();
    const todayStr = today.getFullYear() + "-" + pad(today.getMonth() + 1) + "-" + pad(today.getDate());
    const selectedVal = datePickerTarget ? datePickerTarget.value : "";

    let html = "";
    for (let i = 0; i < startOffset; i++) {
      const d = prevMonthDays - startOffset + i + 1;
      html += '<button type="button" class="date-picker-day other-month" data-other="1">' + d + "</button>";
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = pickerYear + "-" + pad(pickerMonth + 1) + "-" + pad(d);
      const isToday = dateStr === todayStr;
      const isSelected = dateStr === selectedVal;
      let cls = "date-picker-day";
      if (isSelected) cls += " selected";
      if (isToday) cls += " today";
      html += '<button type="button" class="' + cls + '" data-date="' + dateStr + '">' + d + "</button>";
    }
    const total = startOffset + daysInMonth;
    const remaining = total % 7 === 0 ? 0 : 7 - (total % 7);
    for (let i = 0; i < remaining; i++) {
      html += '<button type="button" class="date-picker-day other-month" data-other="1">' + (i + 1) + "</button>";
    }
    datePickerDays.innerHTML = html;

    datePickerDays.querySelectorAll(".date-picker-day:not(.other-month)").forEach((btn) => {
      btn.addEventListener("click", function () {
        const dateStr = this.getAttribute("data-date");
        if (!dateStr) return;
        const [y, m, d] = dateStr.split("-").map(Number);
        setPickerValue(y, m, d);
      });
    });
  }

  if (expStartDate && expEndDate) {
    [expStartDate, expEndDate].forEach((input) => {
      input.addEventListener("click", function (e) {
        e.preventDefault();
        openDatePicker(this);
      });
      input.setAttribute("readonly", "readonly");
    });
  }

  datePickerPrev.addEventListener("click", function () {
    pickerMonth--;
    if (pickerMonth < 0) {
      pickerMonth = 11;
      pickerYear--;
    }
    updateDatePickerHeader();
    renderDatePickerDays();
  });

  datePickerNext.addEventListener("click", function () {
    pickerMonth++;
    if (pickerMonth > 11) {
      pickerMonth = 0;
      pickerYear++;
    }
    updateDatePickerHeader();
    renderDatePickerDays();
  });

  datePickerToday.addEventListener("click", function () {
    const d = new Date();
    setPickerValue(d.getFullYear(), d.getMonth() + 1, d.getDate());
  });

  datePickerClear.addEventListener("click", function () {
    if (datePickerTarget) datePickerTarget.value = "";
    closeDatePicker();
  });

  datePickerDropdown.addEventListener("click", function (e) {
    if (e.target === datePickerDropdown) closeDatePicker();
  });

  // Require Supabase auth (if configured) before loading data.
  async function initAdmin() {
    if (supabaseClient) {
      try {
        const result = await supabaseClient.auth.getUser();
        if (!result || !result.data || !result.data.user) {
          window.location.href = "login.html";
          return;
        }
      } catch (e) {
        window.location.href = "login.html";
        return;
      }
    }

    await ensureSupabaseDataAdmin();
    updateCvStatus();
    renderExperienceList();
    renderProjectsList();
    loadContactForm();
  }

  initAdmin();
})();
