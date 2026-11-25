/* سازنده گزارش بهبود فرآیند — منطق فرانت‌اند */
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

const STEPS = [
  "اطلاعات پایه", "معرفی محصول", "معرفی دستگاه", "معرفی قطعه",
  "فاز ۱ انتخاب موضوع", "فاز ۲ توجیه دلایل", "فاز ۳ وضعیت جاری",
  "فاز ۴ انتخاب هدف", "فاز ۵ تجزیه و تحلیل", "فاز ۶ اقدام اصلاحی",
  "فاز ۷ تایید تاثیرات", "فاز ۸ استانداردسازی", "فاز ۹ خلاصه و آینده",
  "تحقیق اینترنتی", "خروجی"
];
let cur = 0;

// ---------- ساخت ناوبری ----------
const nav = $("#sideNav");
STEPS.forEach((t, i) => {
  const b = document.createElement("button");
  b.innerHTML = `<span class="dot" style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#cbd5e1;margin-left:6px"></span>` + (i + 1) + ". " + t;
  b.onclick = () => go(i);
  nav.appendChild(b);
});
// نشانگر تکمیل هر بخش: سبز = کامل، زرد = نیمه‌کاره، خاکستری = خالی
function stepStatus(r) {
  const has = v => (Array.isArray(v) ? v.length > 0 : !!v);
  const any = (...vs) => vs.some(has);
  const all = (...vs) => vs.every(has);
  return [
    any(r.title, r.team.length),                       // 0 پایه
    any(r.product_desc, photos.product),               // 1 محصول
    any(r.machine_desc, photos.machine),               // 2 دستگاه
    has(r.parts),                                      // 3 قطعه
    has(r.phase1_defects),                             // 4 فاز۱
    has(r.quality_warnings),                           // 5 فاز۲
    any(r.supplier_status, r.defect_compare.types, r.capability, r.ppm_trend, photos.defects.length), // 6 فاز۳
    any(r.goals, r.goal_steps),                        // 7 فاز۴
    any(r.pareto, r.cause_checks, r.fishbone.man, r.fishbone.machine, r.fishbone.material, r.fishbone.method), // 8 فاز۵
    any(r.prev_actions, r.new_actions, r.action_cards.length), // 9 فاز۶
    any(r.effectiveness.text, r.effectiveness.data),   // 10 فاز۷
    has(r.standardization),                            // 11 فاز۸
    any(r.summary, r.future_actions),                  // 12 فاز۹
    any(r.research.findings, r.research.sources),      // 13 تحقیق
    true                                               // 14 خروجی
  ];
}
function refreshDots() {
  try {
    const st = stepStatus(collect());
    $$("#sideNav button").forEach((b, j) => {
      const dot = b.querySelector(".dot");
      if (dot) dot.style.background = st[j] ? "#2e7d32" : "#cbd5e1";
    });
  } catch (e) {}
}
setInterval(refreshDots, 3000);
function go(i) {
  cur = Math.max(0, Math.min(STEPS.length - 1, i));
  $$(".step").forEach(s => s.classList.toggle("active", +s.dataset.step === cur));
  $$("#sideNav button").forEach((b, j) => {
    b.classList.toggle("active", j === cur);
    b.classList.toggle("done", j < cur);
  });
  $("#progBar").style.width = ((cur + 1) / STEPS.length * 100) + "%";
  $("#btnPrev").disabled = cur === 0;
  $("#btnNext").style.display = cur === STEPS.length - 1 ? "none" : "";
  if (cur === STEPS.length - 1) renderSummary();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
$("#btnPrev").onclick = () => go(cur - 1);
$("#btnNext").onclick = () => go(cur + 1);

// ---------- جدول‌های داینامیک ----------
const TABLES = {
  tblTeam: ["name", "role"],
  tblParts: ["desc", "tech_no", "maker_code", "score"],
  tblWarn: ["date", "no", "defect", "cause"],
  tblSupplier: ["item", "value"],
  tblCompare: ["type", "before", "after"],
  tblCap: ["status", "date", "index"],
  tblCostB: ["cost", "calc", "process", "station"],
  tblCostA: ["cost", "calc", "process", "station"],
  tblPpm: ["date", "count", "defects", "ppm"],
  tblSupCmp: ["product", "monitored", "defects", "ppm"],
  tblPareto: ["defect", "count", "percent"],
  tblCauses: ["factor", "check", "result"],
  tblPrev: ["action", "owner", "date", "status", "effect"],
  tblNew: ["action", "owner", "date", "status"],
  tblEff: ["date", "ppm"],
  tblStd: ["doc", "owner", "start", "end"]
};
function addRow(tblId, values = {}) {
  const tb = document.querySelector("#" + tblId + " tbody");
  const tr = document.createElement("tr");
  TABLES[tblId].forEach(k => {
    const td = document.createElement("td");
    const inp = document.createElement("input");
    inp.type = "text"; inp.dataset.key = k; inp.value = values[k] || "";
    td.appendChild(inp); tr.appendChild(td);
  });
  const td = document.createElement("td");
  const del = document.createElement("button");
  del.className = "btn danger"; del.textContent = "✕";
  del.onclick = () => tr.remove();
  td.appendChild(del); tr.appendChild(td);
  tb.appendChild(tr);
}
function readTable(tblId) {
  return [...document.querySelectorAll("#" + tblId + " tbody tr")].map(tr => {
    const o = {};
    tr.querySelectorAll("input").forEach(i => o[i.dataset.key] = i.value.trim());
    return o;
  }).filter(o => Object.values(o).some(v => v));
}
function fillTable(tblId, rows) {
  document.querySelector("#" + tblId + " tbody").innerHTML = "";
  (rows || []).forEach(r => addRow(tblId, r));
  if (!rows || !rows.length) addRow(tblId);
}
document.querySelectorAll("[data-addrow]").forEach(b => b.onclick = () => addRow(b.dataset.addrow));

// ---------- عکس‌ها ----------
const photos = { product: null, machine: null, machine2: null, defects: [], analysis: [] };
function compress(file) {
  return new Promise(res => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const max = 1600;
      let w = img.width, h = img.height;
      const sc = Math.min(1, max / Math.max(w, h));
      w = Math.round(w * sc); h = Math.round(h * sc);
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      res(c.toDataURL("image/jpeg", 0.85));
    };
    img.src = url;
  });
}
function renderPrev(key, wrapId) {
  const w = $("#" + wrapId); w.innerHTML = "";
  const list = Array.isArray(photos[key]) ? photos[key] : (photos[key] ? [photos[key]] : []);
  list.forEach((p, i) => {
    const d = document.createElement("div"); d.className = "photo-item";
    d.innerHTML = `<img src="${p}"><div class="cap">عکس ${i + 1}</div>`;
    const del = document.createElement("button"); del.textContent = "✕";
    del.onclick = () => {
      if (Array.isArray(photos[key])) photos[key].splice(i, 1); else photos[key] = null;
      renderPrev(key, wrapId);
    };
    d.appendChild(del); w.appendChild(d);
  });
}
async function bindPhoto(inputId, key, wrapId, multi) {
  $("#" + inputId).addEventListener("change", async e => {
    for (const f of e.target.files) {
      const d = await compress(f);
      if (multi) photos[key].push(d); else photos[key] = d;
    }
    renderPrev(key, wrapId);
  });
}
bindPhoto("ph_product", "product", "prev_product");
bindPhoto("ph_machine", "machine", "prev_machine");
bindPhoto("ph_machine2", "machine2", "prev_machine2");
bindPhoto("ph_defects", "defects", "prev_defects", true);
bindPhoto("ph_analysis", "analysis", "prev_analysis", true);

// ---------- کارت‌های اقدام ----------
let cards = [];
function renderCards() {
  const w = $("#cardsWrap"); w.innerHTML = "";
  cards.forEach((c, i) => {
    const div = document.createElement("div");
    div.style.cssText = "border:1px solid #d7dee8;border-radius:8px;padding:10px;margin-bottom:10px";
    div.innerHTML = `
      <div class="row">
        <div><label>عنوان اقدام</label><input type="text" class="c-title" value="${c.title || ""}"></div>
      </div>
      <label>توضیح اقدام</label><textarea class="c-desc">${c.desc || ""}</textarea>
      <div class="row">
        <div><label>عکس قبل</label><input type="file" class="c-before" accept="image/*">
          <div class="photo-grid c-before-prev">${c.before ? `<div class="photo-item"><img src="${c.before}"></div>` : ""}</div></div>
        <div><label>عکس بعد</label><input type="file" class="c-after" accept="image/*">
          <div class="photo-grid c-after-prev">${c.after ? `<div class="photo-item"><img src="${c.after}"></div>` : ""}</div></div>
      </div>
      <button class="btn danger small c-del">حذف کارت</button>`;
    div.querySelector(".c-title").oninput = e => c.title = e.target.value;
    div.querySelector(".c-desc").oninput = e => c.desc = e.target.value;
    div.querySelector(".c-before").onchange = async e => {
      c.before = await compress(e.target.files[0]);
      div.querySelector(".c-before-prev").innerHTML = `<div class="photo-item"><img src="${c.before}"></div>`;
    };
    div.querySelector(".c-after").onchange = async e => {
      c.after = await compress(e.target.files[0]);
      div.querySelector(".c-after-prev").innerHTML = `<div class="photo-item"><img src="${c.after}"></div>`;
    };
    div.querySelector(".c-del").onclick = () => { cards.splice(i, 1); renderCards(); };
    w.appendChild(div);
  });
}
$("#btnAddCard").onclick = () => { cards.push({}); renderCards(); };

// ---------- جمع‌آوری داده ----------
function lines(id) { return $("#" + id).value.split("\n").map(s => s.trim()).filter(Boolean); }
function collect() {
  const compTypes = lines("r_comp_types");
  const before = {}, after = {};
  readTable("tblCompare").forEach(r => { if (r.type) { before[r.type] = r.before; after[r.type] = r.after; } });
  return {
    title: $("#r_title").value.trim(), subtitle: $("#r_subtitle").value.trim(),
    company: $("#r_company").value.trim(), date: $("#r_date").value.trim(),
    footer: $("#r_footer").value.trim() || "Quality Report",
    filename: $("#r_filename").value.trim() || "process-improvement-report",
    team: readTable("tblTeam"), team_note: $("#r_team_note").value.trim(),
    product_desc: $("#r_product_desc").value.trim(),
    machine_name: $("#r_machine_name").value.trim(), machine_desc: $("#r_machine_desc").value.trim(),
    machine_launch: $("#r_machine_launch").value.trim(),
    parts: readTable("tblParts"),
    phase1_defects: lines("r_phase1"),
    quality_warnings: readTable("tblWarn"), warnings_summary: $("#r_warn_summary").value.trim(),
    supplier_status: readTable("tblSupplier"),
    defect_compare: { types: compTypes, before, after,
      before_label: $("#r_before_label").value.trim() || "قبل",
      after_label: $("#r_after_label").value.trim() || "بعد",
      before_total: $("#r_before_total").value.trim(), after_total: $("#r_after_total").value.trim(),
      before_ppm: $("#r_before_ppm").value.trim(), after_ppm: $("#r_after_ppm").value.trim() },
    capability: readTable("tblCap"),
    cost_before: { items: readTable("tblCostB"), summary: $("#r_costb_summary").value.trim() },
    cost_after: { items: readTable("tblCostA"), summary: $("#r_costa_summary").value.trim() },
    ppm_trend: readTable("tblPpm"),
    ppm_target: $("#r_ppm_target").value.trim(), ppm_limit: $("#r_ppm_limit").value.trim(),
    supplier_compare: readTable("tblSupCmp"),
    goals: lines("r_goals"), goal_steps: lines("r_goal_steps"),
    pareto: readTable("tblPareto"),
    problem_statement: $("#r_problem").value.trim(),
    fishbone: { effect: $("#r_problem").value.trim(),
      man: lines("f_man"), environment: lines("f_env"), measurement: lines("f_meas"),
      machine: lines("f_mach"), material: lines("f_mat"), method: lines("f_meth") },
    cause_checks: readTable("tblCauses"),
    prev_actions: readTable("tblPrev"), new_actions: readTable("tblNew"),
    action_cards: cards,
    effectiveness: { text: $("#r_eff_text").value.trim(), data: readTable("tblEff"),
      target: $("#r_eff_target").value.trim() },
    standardization: readTable("tblStd"),
    summary: $("#r_summary").value.trim(), future_actions: $("#r_future").value.trim(),
    research: { findings: $("#r_res_findings").value.trim(), sources: lines("r_res_sources") }
  };
}
function applyData(r) {
  $("#r_title").value = r.title || ""; $("#r_subtitle").value = r.subtitle || "";
  $("#r_company").value = r.company || ""; $("#r_date").value = r.date || "";
  $("#r_footer").value = r.footer || ""; $("#r_filename").value = r.filename || "";
  fillTable("tblTeam", r.team); $("#r_team_note").value = r.team_note || "";
  $("#r_product_desc").value = r.product_desc || "";
  $("#r_machine_name").value = r.machine_name || ""; $("#r_machine_desc").value = r.machine_desc || "";
  $("#r_machine_launch").value = r.machine_launch || "";
  fillTable("tblParts", r.parts);
  $("#r_phase1").value = (r.phase1_defects || []).join("\n");
  fillTable("tblWarn", r.quality_warnings); $("#r_warn_summary").value = r.warnings_summary || "";
  fillTable("tblSupplier", r.supplier_status);
  const dc = r.defect_compare || {};
  $("#r_comp_types").value = (dc.types || []).join("\n");
  $("#r_before_label").value = dc.before_label || ""; $("#r_after_label").value = dc.after_label || "";
  fillTable("tblCompare", (dc.types || []).map(t => ({ type: t, before: (dc.before || {})[t] || "", after: (dc.after || {})[t] || "" })));
  $("#r_before_total").value = dc.before_total || ""; $("#r_after_total").value = dc.after_total || "";
  $("#r_before_ppm").value = dc.before_ppm || ""; $("#r_after_ppm").value = dc.after_ppm || "";
  fillTable("tblCap", r.capability);
  fillTable("tblCostB", (r.cost_before || {}).items); $("#r_costb_summary").value = (r.cost_before || {}).summary || "";
  fillTable("tblCostA", (r.cost_after || {}).items); $("#r_costa_summary").value = (r.cost_after || {}).summary || "";
  fillTable("tblPpm", r.ppm_trend);
  $("#r_ppm_target").value = r.ppm_target || ""; $("#r_ppm_limit").value = r.ppm_limit || "";
  fillTable("tblSupCmp", r.supplier_compare);
  $("#r_goals").value = (r.goals || []).join("\n");
  $("#r_goal_steps").value = (r.goal_steps || []).join("\n");
  fillTable("tblPareto", r.pareto);
  $("#r_problem").value = r.problem_statement || "";
  const f = r.fishbone || {};
  $("#f_man").value = (f.man || []).join("\n"); $("#f_env").value = (f.environment || []).join("\n");
  $("#f_meas").value = (f.measurement || []).join("\n"); $("#f_mach").value = (f.machine || []).join("\n");
  $("#f_mat").value = (f.material || []).join("\n"); $("#f_meth").value = (f.method || []).join("\n");
  fillTable("tblCauses", r.cause_checks);
  fillTable("tblPrev", r.prev_actions); fillTable("tblNew", r.new_actions);
  cards = r.action_cards || []; renderCards();
  $("#r_eff_text").value = (r.effectiveness || {}).text || "";
  fillTable("tblEff", (r.effectiveness || {}).data); $("#r_eff_target").value = (r.effectiveness || {}).target || "";
  fillTable("tblStd", r.standardization);
  $("#r_summary").value = r.summary || ""; $("#r_future").value = r.future_actions || "";
  $("#r_res_findings").value = (r.research || {}).findings || "";
  $("#r_res_sources").value = ((r.research || {}).sources || []).join("\n");
}

// ---------- تحقیق (نسخه مستقل: پایگاه دانش داخلی + جستجوی اینترنتی مستقیم) ----------
function loadKB(q = "") {
  const data = q ? KB_DATA.filter(k => k.title.includes(q) || k.body.includes(q) || k.cat.includes(q)) : KB_DATA;
  $("#kbResults").innerHTML = data.map(k => `
    <div class="kb-item"><span class="cat">${k.cat}</span><br><b>${k.title}</b>
    <div style="font-size:12px;line-height:1.8;margin-top:4px">${k.body}</div>
    <div class="src">منبع: ${k.src}</div></div>`).join("") ||
    '<div class="hint">موردی یافت نشد.</div>';
}
$("#kb_query").addEventListener("input", e => loadKB(e.target.value));
loadKB();

$("#btnSearch").onclick = async () => {
  const q = $("#res_query").value.trim();
  if (!q) return;
  $("#resResults").innerHTML = '<div class="hint">در حال جستجو در اینترنت...</div>';
  try {
    // DuckDuckGo Instant Answer API (پشتیبانی از CORS در مرورگر)
    const res = await fetch("https://api.duckduckgo.com/?q=" + encodeURIComponent(q) + "&format=json&no_html=1");
    const d = await res.json();
    const items = [];
    if (d.AbstractText) items.push({ title: d.Heading || "خلاصه", url: d.AbstractURL || "#", snippet: d.AbstractText });
    (d.RelatedTopics || []).forEach(t => {
      if (t.Text && t.FirstURL) items.push({ title: t.Text.split(" - ")[0].slice(0, 90), url: t.FirstURL, snippet: t.Text });
    });
    if (items.length) {
      $("#resResults").innerHTML = items.slice(0, 8).map(r =>
        `<div class="res-item"><a href="${r.url}" target="_blank" rel="noopener">${r.title}</a>
         <div class="snip">${r.snippet || ""}</div></div>`).join("");
    } else {
      $("#resResults").innerHTML = '<div class="note">نتیجه مستقیمی یافت نشد. از پایگاه دانش داخلی پایین استفاده کنید یا خلاصه یافته‌ها را دستی وارد کنید.</div>';
    }
  } catch (e) {
    $("#resResults").innerHTML = '<div class="note">جستجوی اینترنتی در دسترس نیست (اتصال اینترنت لازم است). از پایگاه دانش داخلی پایین استفاده کنید یا خلاصه یافته‌ها را دستی وارد کنید.</div>';
  }
};

// ---------- خلاصه و تولید ----------
function renderSummary() {
  const r = collect();
  const counts = [
    ["اعضای تیم", r.team.length], ["قطعات", r.parts.length],
    ["اخطارهای کیفی", r.quality_warnings.length], ["ردیف‌های قابلیت", r.capability.length],
    ["داده‌های PPM", r.ppm_trend.length], ["علل بررسی‌شده", r.cause_checks.length],
    ["اقدامات قبلی", r.prev_actions.length], ["اقدامات جدید", r.new_actions.length],
    ["کارت‌های اقدام", r.action_cards.length], ["مدارک استانداردسازی", r.standardization.length]
  ];
  $("#summaryBox").innerHTML = `<div class="note">عنوان: <b>${r.title || "—"}</b><br>` +
    counts.map(c => `${c[0]}: <b>${c[1]}</b>`).join(" | ") + `<br>عکس‌ها: محصول ${photos.product ? 1 : 0}، دستگاه ${photos.machine ? 1 : 0}، عیوب ${photos.defects.length}، تحلیل ${photos.analysis.length}</div>`;
}
async function doGenerate(btn, msgEl) {
  btn.disabled = true; const old = btn.textContent; btn.textContent = "در حال تولید...";
  if (msgEl) msgEl.innerHTML = "";
  try {
    const onlyFilled = $("#chkOnlyFilled") ? $("#chkOnlyFilled").checked : false;
    const pptx = await buildPptxJS(collect(), photos, onlyFilled);
    await pptx.writeFile({ fileName: (collect().filename || "report") + ".pptx" });
    if (msgEl) msgEl.innerHTML = '<div class="note" style="background:#e8f5e9;border-color:var(--green)">فایل PPTX با موفقیت ساخته و دانلود شد. همه متن‌ها، جدول‌ها و نمودارها در PowerPoint قابل ویرایش هستند.</div>';
  } catch (e) {
    if (msgEl) msgEl.innerHTML = `<div class="note">خطا: ${e.message}</div>`;
    else alert("خطا در تولید فایل: " + e.message);
  }
  btn.disabled = false; btn.textContent = old;
}
$("#btnGenerate").onclick = () => doGenerate($("#btnGenerate"), $("#genMsg"));
$("#btnGenerateTop").onclick = () => doGenerate($("#btnGenerateTop"), null);

// ---------- ذخیره خودکار در مرورگر ----------
function save() { try { localStorage.setItem("report_v1", JSON.stringify({ r: collect(), photos })); } catch (e) {} }
setInterval(save, 5000);
document.addEventListener("input", save);

// ---------- پیش‌نویس در مرورگر (ادامه کار در دفعات بعد — بدون سرور) ----------
function draftNames() {
  try { return JSON.parse(localStorage.getItem("drafts_list") || "[]"); } catch (e) { return []; }
}
function refreshDraftList() {
  const sel = $("#draftSelect");
  sel.innerHTML = '<option value="">— پیش‌نویس‌ها —</option>' +
    draftNames().map(n => `<option value="${n}">${n}</option>`).join("");
}
function saveDraftLocal(name) {
  try {
    localStorage.setItem("draft_" + name, JSON.stringify({ report: collect(), photos }));
    const names = draftNames();
    if (!names.includes(name)) { names.push(name); localStorage.setItem("drafts_list", JSON.stringify(names)); }
    refreshDraftList();
  } catch (e) { alert("خطا در ذخیره (حافظه مرورگر پر است؟): " + e.message); }
}
$("#btnSaveDraft").onclick = () => {
  const name = prompt("نام پیش‌نویس را وارد کنید:", collect().filename || "پیش‌نویس من");
  if (!name) return;
  saveDraftLocal(name);
  alert("پیش‌نویس «" + name + "» ذخیره شد. هر وقت برگشتید از لیست پیش‌نویس‌ها بارگذاری کنید.");
};
$("#btnLoadDraft").onclick = () => {
  const name = $("#draftSelect").value;
  if (!name) { alert("ابتدا یک پیش‌نویس از لیست انتخاب کنید."); return; }
  try {
    const d = JSON.parse(localStorage.getItem("draft_" + name) || "null");
    if (!d) throw new Error("یافت نشد");
    applyData(d.report || {}); Object.assign(photos, d.photos || {});
    renderPrev("product", "prev_product"); renderPrev("machine", "prev_machine");
    renderPrev("machine2", "prev_machine2"); renderPrev("defects", "prev_defects");
    renderPrev("analysis", "prev_analysis");
    refreshDots();
    alert("پیش‌نویس «" + name + "» بارگذاری شد.");
  } catch (e) { alert("خطا: " + e.message); }
};
$("#btnDelDraft").onclick = () => {
  const name = $("#draftSelect").value;
  if (!name) { alert("ابتدا یک پیش‌نویس از لیست انتخاب کنید."); return; }
  if (!confirm("پیش‌نویس «" + name + "» حذف شود؟")) return;
  localStorage.removeItem("draft_" + name);
  localStorage.setItem("drafts_list", JSON.stringify(draftNames().filter(n => n !== name)));
  refreshDraftList();
};

// ---------- خروجی/ورود JSON ----------
$("#btnExportJson").onclick = () => {
  const blob = new Blob([JSON.stringify({ report: collect(), photos }, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = "report-data.json"; a.click();
};
$("#btnImportJson").onclick = () => $("#fileJson").click();
$("#fileJson").addEventListener("change", e => {
  const f = e.target.files[0]; if (!f) return;
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const d = JSON.parse(rd.result);
      applyData(d.report || {}); Object.assign(photos, d.photos || {});
      renderPrev("product", "prev_product"); renderPrev("machine", "prev_machine");
      renderPrev("machine2", "prev_machine2"); renderPrev("defects", "prev_defects");
      renderPrev("analysis", "prev_analysis");
      alert("داده‌ها بارگذاری شد.");
    } catch (err) { alert("فایل JSON معتبر نیست."); }
  };
  rd.readAsText(f);
});

// ---------- داده نمونه (فقط مثال ساختار — برای محصول/فرآیند خودتان اطلاعات وارد کنید) ----------
$("#btnDemo").onclick = () => {
  applyData({
    title: "بررسی وضعیت کیفی محصول NBCM در فرآیند WAVE SOLDERING (ERSA POWER FLOW)",
    subtitle: "WAVE SOLDERING (ERSA POWER FLOW)", company: "سازه پویش — واحد کنترل کیفیت",
    date: "1403/07/12", footer: "Quality Report - NBCM", filename: "report-nbcm-sample",
    team: [
      { name: "سعید آقائی میبدی", role: "مدیر کنترل کیفیت" },
      { name: "رضا بابایی بوئینی", role: "کارشناس کنترل کیفیت" },
      { name: "سعید کاظمی پور", role: "بازرس کنترل کیفیت" }
    ],
    product_desc: "یونیت کنترل بدنه NBCM در واقع یک مرکز فرماندهی اصلی برای کنترل و پشتیبانی از سیستم‌های الکتریکال و الکترونیک خودرو است که با توانایی‌های سخت‌افزاری و نرم‌افزاری خود می‌تواند به‌صورت کامل و دقیق سیستم‌های الکترونیک خودرو، بارها و عملگرهای بدنه خودرو را تحت کنترل گرفته یا راه‌اندازی نماید. همچنین مدیریت انتقال داده‌ها در شبکه‌های مختلف خودرو را یونیت NBCM نظارت و هدایت می‌نماید.",
    machine_name: "دستگاه Wave Soldering",
    machine_desc: "وان قلع جهت مونتاژ قطعات با حجم زیاد و ابعاد کوچک به کار می‌رود. حوضچه قلع وسیله‌ای است که می‌تواند موجب صرفه‌جویی در وقت و هزینه شود و برای اتصال اجزای کوچک به کار می‌رود. بدین صورت که با ذوب کردن شمش قلع در آن و عبور مدارات مونتاژشده از داخل آن، کل اتصالات مدار لحیم‌کاری می‌شود.",
    machine_launch: "وان قلع جدید در تاریخ 1402/07/20 در خط تولید الکترونیک راه‌اندازی گردیده است.",
    parts: [
      { desc: "NBCM 207", tech_no: "IK01596980", maker_code: "4126", score: "43.75" },
      { desc: "NBCM DENA", tech_no: "IK01403980", maker_code: "4126", score: "43.75" },
      { desc: "NBCM SOREN", tech_no: "IK01750880", maker_code: "4126", score: "43.75" },
      { desc: "NBCM2-TARA-MY", tech_no: "IK01843080", maker_code: "4126", score: "43.75" }
    ],
    phase1_defects: [
      "اخطار کیفی در خط مشتری و دوره گارانتی به علت وجود گلوله قلع و عدم قلع‌کاری پایه‌ها (34 مورد)",
      "PPM داخلی و هزینه‌های کیفی (دوباره‌کاری و ضایعات) مربوط به ایرادات وان قلع",
      "توقفات خط تولید و کاهش ظرفیت تولیدی خط وان قلع"
    ],
    quality_warnings: [
      { date: "1403/01/27", no: "194773", defect: "عدم عملکرد کامل اتصالی ادوات برقی", cause: "آثار فلکس بر روی PCB" },
      { date: "1403/02/16", no: "195610", defect: "یکسره بودن پمپ شیشه‌شور عقب", cause: "اتصالی خازن توسط پاشش قلع" },
      { date: "1403/03/01", no: "196491", defect: "یکسره بودن گرمکن شیشه عقب", cause: "پاشش قلع روی خازن 47N" },
      { date: "1403/06/25", no: "201572", defect: "یکسره بودن برف‌پاکن عقب", cause: "پاشش قلع روی خازن 47N" }
    ],
    warnings_summary: "تعداد اخطار کیفی با عامل مسبب وان قلع: 5",
    supplier_status: [
      { item: "تاریخ اخذ تاییدیه", value: "1401/06/31" },
      { item: "آخرین گرید سیستمی", value: "A" },
      { item: "درصد تامین", value: "100" },
      { item: "وضعیت CF و تجهیزات تست آزمایشگاه داخلی", value: "تستر عملکردی جامع + آزمایشگاه مجهز (تست حرارتی، EMC، برودت) — دارای تاییدیه متد ساپکو" },
      { item: "ضریب کیفیت", value: "63" }
    ],
    defect_compare: {
      types: ["اتصال کوتاه", "حفره", "گلوله قلع", "عدم قلع مخروطی", "عدم قلع‌گیری", "نفوذ قلع"],
      before: { "اتصال کوتاه": "12526", "حفره": "3242", "گلوله قلع": "10", "عدم قلع مخروطی": "12207", "عدم قلع‌گیری": "8232", "نفوذ قلع": "5" },
      after: { "اتصال کوتاه": "13904", "حفره": "1413", "گلوله قلع": "0", "عدم قلع مخروطی": "0", "عدم قلع‌گیری": "412", "نفوذ قلع": "0" },
      before_label: "وان قدیمی", after_label: "وان جدید",
      before_total: "44880", after_total: "16729", before_ppm: "5183645", after_ppm: "1855890"
    },
    capability: [
      { status: "وان قلع قدیمی", date: "1402/06", index: "0.93" },
      { status: "وان قلع قدیمی", date: "1402/07", index: "0.88" },
      { status: "وان قلع جدید", date: "1402/08", index: "0.87" },
      { status: "وان قلع جدید", date: "1402/09", index: "1" },
      { status: "وان قلع جدید", date: "1402/10", index: "0.92" },
      { status: "وان قلع جدید", date: "1402/11", index: "1.03" },
      { status: "وان قلع جدید", date: "1402/12", index: "1.12" },
      { status: "وان قلع جدید", date: "1403/01", index: "1.11" },
      { status: "وان قلع جدید", date: "1403/02", index: "1.10" },
      { status: "وان قلع جدید", date: "1403/03", index: "1.01" },
      { status: "وان قلع جدید", date: "1403/04", index: "0.99" },
      { status: "وان قلع جدید", date: "1403/05", index: "0.97" },
      { status: "وان قلع جدید", date: "1403/06", index: "1.02" }
    ],
    cost_before: { items: [
      { cost: "802,359,100", calc: "هزینه مواد اولیه", process: "برد نیمه‌ساخته و قطعات به علت نفوذ قلع", station: "DP ضایعات" },
      { cost: "235,097,411", calc: "هزینه نفرساعت", process: "اصلاح عیوب قلع‌کاری وان قلع", station: "FAULT" },
      { cost: "25,283,439", calc: "هزینه نفرساعت", process: "بررسی عیوب قلع‌کاری", station: "ICT" },
      { cost: "2,064,805", calc: "هزینه نفرساعت", process: "بررسی و رفع ایراد قلع‌کاری قطعات THT", station: "QV" }
    ], summary: "وضعیت کیفی وان قلع قدیم | تاریخ: 1402/05/01 الی 1402/07/30 | تعداد کل تولید: 53,362 | تعداد کل ایراد: 141,025 | PPM: 2,151,849 | مجموع هزینه‌ها: 1,064,804,755" },
    cost_after: { items: [
      { cost: "6,664,667,392", calc: "هزینه مواد اولیه", process: "برد نیمه‌ساخته و قطعات به علت نفوذ قلع", station: "DP ضایعات" },
      { cost: "1,753,585,641", calc: "هزینه نفرساعت", process: "اصلاح عیوب قلع‌کاری وان قلع", station: "FAULT" },
      { cost: "439,632,191", calc: "هزینه نفرساعت", process: "بررسی عیوب قلع‌کاری", station: "ICT" },
      { cost: "15,991,831", calc: "هزینه نفرساعت", process: "بررسی و رفع ایراد قلع‌کاری قطعات THT", station: "QV" }
    ], summary: "وضعیت کیفی وان قلع جدید | تاریخ: 1402/08/01 الی 1403/06/31 | تعداد کل تولید: 211,400 | تعداد کل ایراد: 519,691 | PPM: 2,445,704 | مجموع هزینه‌ها: 8,873,877,055" },
    ppm_trend: [
      { date: "1403/06/26", count: "916", defects: "1115", ppm: "1217248" },
      { date: "1403/06/27", count: "955", defects: "1410", ppm: "1476439" },
      { date: "1403/06/28", count: "1104", defects: "1227", ppm: "1111413" },
      { date: "1403/06/29", count: "1226", defects: "2081", ppm: "1697389" },
      { date: "1403/06/30", count: "594", defects: "497", ppm: "836700" },
      { date: "1403/07/01", count: "1064", defects: "987", ppm: "927631" },
      { date: "1403/07/02", count: "868", defects: "1062", ppm: "1223502" },
      { date: "1403/07/03", count: "875", defects: "1394", ppm: "1593142" },
      { date: "1403/07/04", count: "756", defects: "1408", ppm: "1862433" },
      { date: "1403/07/05", count: "686", defects: "972", ppm: "1416909" }
    ],
    ppm_target: "300000", ppm_limit: "600000",
    supplier_compare: [
      { product: "NBCM 207 (ORG) داخلی", monitored: "100", defects: "399", ppm: "3990000" },
      { product: "NBCM SOREN PERIM خارجی", monitored: "100", defects: "224", ppm: "2240000" },
      { product: "NBCM SOREN PERIM داخلی", monitored: "100", defects: "207", ppm: "2070000" }
    ],
    goals: [
      "کاهش 60% هزینه‌های فرآیندی تولیدات وان قلع نسبت به شش‌ماهه اول سال 1403",
      "کاهش 80% تعداد اخطارهای کیفی مشتری مربوط به فرآیند وان قلع",
      "کاهش 80% PPM مجاز وان قلع نسبت به شش‌ماهه اول سال 1403"
    ],
    goal_steps: [
      "تشکیل تیم 8D جهت بررسی و ریشه‌یابی قطعات برگشتی از خط مشتری",
      "بررسی قطعات برگشتی خدمات پس از فروش و ایرادات خط تولید وان قلع",
      "شناسایی عوامل موثر در ایجاد ایراد و ریشه‌های آن",
      "تعریف اقدام اصلاحی مناسب جهت حذف ریشه‌ای ایراد",
      "انجام اقدامات اصلاحی تعریف‌شده",
      "پایش اثربخشی اقدامات اصلاحی تعریف‌شده"
    ],
    pareto: [
      { defect: "اتصال کوتاه", count: "13904", percent: "83%" },
      { defect: "حفره", count: "1413", percent: "91%" },
      { defect: "عدم قلع‌گیری", count: "412", percent: "94%" }
    ],
    problem_statement: "PPM بالای خرابی‌های اتصالی، گلوله قلع و کمبود قلع در فرآیند وان قلع",
    fishbone: {
      effect: "PPM بالای خرابی‌های اتصالی، گلوله قلع و کمبود قلع در فرآیند وان قلع",
      man: ["عدم توجه اپراتور به دستورالعمل کاری", "ناکافی بودن مهارت اپراتور", "تنوع اپراتور"],
      environment: ["شرایط محیطی خط"],
      measurement: ["کالیبره نبودن سنسورهای دستگاه"],
      machine: ["خرابی یا مستهلک شدن قسمت‌های مختلف دستگاه", "عملکرد نادرست دستگاه", "تنظیمات اشتباه دستگاه"],
      material: ["کیفیت شمش قلع", "کیفیت فلکس", "تحت کنترل نبودن قلع در حوضچه", "مقدار حجم قلع حوضچه در طول شیفت کاری", "کیفیت مواد اولیه فیکسچر وان قلع", "پایین بودن کیفیت قطعات THT"],
      method: ["طراحی فیکسچر", "جابجایی نامناسب بردها در زمان جایگذاری در فیکسچر", "موجود نبودن دستورالعمل کاری", "LAYOUT نامناسب", "طراحی سخت‌افزاری PCB"]
    },
    cause_checks: [
      { factor: "کیفیت مواد اولیه فیکسچر وان قلع", check: "با توجه به سوابق و مدت زمان خرابی فیکسچرها با مواد تشکیل‌دهنده متفاوت، نوع جنس در روند خرابی فیکسچر موثر می‌باشد.", result: "تاثیرگذار می‌باشد" },
      { factor: "پایین بودن کیفیت قطعات THT", check: "بررسی نوع ایرادات وان قلع و پایش سوابق کیفی قطعات THT در بازرسی ورودی موردی گزارش نشده است.", result: "تاثیرگذار نمی‌باشد" },
      { factor: "کیفیت شمش قلع", check: "نمونه شمش قلع و قلع حوضچه به آزمایشگاه خارجی جهت آنالیز مواد ارسال و نتایج مطابق با تست‌ریپورت بوده است.", result: "تاثیرگذار نمی‌باشد" },
      { factor: "عملکرد نادرست دستگاه", check: "جهت صحه‌گذاری پارامترهای قسمت‌های مختلف وان قلع، مشاوران شرکت گراندیل به همراه تجهیزات اندازه‌گیری در تاریخ 1402/07/30 حضور پیدا کردند.", result: "تاثیرگذار می‌باشد" },
      { factor: "کالیبره نبودن سنسورهای دستگاه", check: "تمامی تجهیزات دستگاه در تاریخ‌های مقرر توسط شرکت لکسر کالیبره گردید و مغایرتی مشاهده نگردید.", result: "تاثیرگذار نمی‌باشد" },
      { factor: "تنظیمات اشتباه دستگاه", check: "با توجه به وضعیت مختلف شرایط وان قلع، مقدار حجم حوضچه تنظیمات در بازه مشخص تعریف نشده است.", result: "تاثیرگذار می‌باشد" },
      { factor: "مقدار حجم قلع حوضچه در طول شیفت کاری", check: "ایرادات قلع‌کاری بخصوص نفوذ قلع و عدم پوشش کامل پد رابطه مستقیم با مقدار حجم قلع حوضچه در طول شیفت کاری دارد.", result: "تاثیرگذار می‌باشد" },
      { factor: "LAYOUT نامناسب", check: "با بررسی صورت‌گرفته در خط وان قلع، LAYOUT مناسب و مورد تایید می‌باشد.", result: "تاثیرگذار نمی‌باشد" }
    ],
    prev_actions: [
      { action: "ساخت گیج جهت اندازه‌گیری فاصله ناخنی کانوایر با پاتیل", owner: "آقای حیدری", date: "1402/11/15", status: "انجام شده", effect: "اثربخش" },
      { action: "فیلتر جهت جلوگیری از بالا آمدن خاک در پاتیل نصب گردد", owner: "آقای حیدری", date: "1402/11/15", status: "قابل اجرا نیست", effect: "—" },
      { action: "ساخت محافظ نازل فلکس برای جلوگیری از پاشش اضافه فلکس بر روی PCB", owner: "آقای حیدری", date: "1403/05/20", status: "انجام شده", effect: "اثربخش" },
      { action: "بررسی عدم آلارم تجهیز در زمان اتمام فلکس مخزن", owner: "آقای خلیلی", date: "1402/09/30", status: "انجام شده", effect: "اثربخش" },
      { action: "خارج شدن فیکسچر معیوب از چرخه تولید، تذکر و آموزش مجدد به اپراتور جهت چک کردن فیکسچر و تکمیل چک‌لیست آن", owner: "آقای دشتی‌فر", date: "1402/09/21", status: "انجام شده", effect: "اثربخش" },
      { action: "نظافت مجدد تجهیز وان قلع و بازنگری تنظیمات و پایش مجدد آن تا بهبودی فرآیند", owner: "آقای رحیمی", date: "1402/10/23", status: "انجام شده", effect: "اثربخش" },
      { action: "مشخص کردن تنظیمات مجزا برای دو نوع محصول", owner: "آقای رستمی", date: "1402/10/24", status: "انجام شده", effect: "اثربخش" },
      { action: "تنظیم میزان فوران وان قلع و باز کردن سوراخ‌های سقف پاتیل", owner: "آقای رستمی", date: "1402/11/12", status: "انجام شده", effect: "اثربخش" }
    ],
    new_actions: [
      { action: "تنظیمات وان قلع مطابق پروفایل مرجع و تعریف محدوده مجاز تغییرات", owner: "آقای میبدی", date: "14030710", status: "انجام شده" },
      { action: "بازآموزی پرسنل مرتبط با بازرسی محصول مطابق با الزامات IPC", owner: "آقای بابایی", date: "14030710", status: "انجام شده" },
      { action: "صحه‌گذاری تنظیمات و کالیبراسیون سنجه‌های موجود در فرآیند", owner: "آقای بابایی", date: "14030711", status: "انجام شده" },
      { action: "بررسی ماتریس ILUO و انجام MSA برای پرسنل بازرسی و استفاده از افراد مجاز", owner: "آقای بابایی", date: "14030712", status: "انجام شده" },
      { action: "تعریف نحوه ثبت اطلاعات و استفاده مناسب از ابزارهای کیفی به ویژه نمودار تمرکز نقص برای شناسایی نقاط شکست", owner: "آقای میبدی", date: "14030711", status: "انجام شده" },
      { action: "تفکیک نتایج خروجی فرآیند برای محصولات مختلف برای ارزیابی دقیق‌تر نتایج", owner: "آقای بابایی", date: "1402/10/20", status: "انجام شده" }
    ],
    action_cards: [
      { title: "مشخص کردن پروفایل مرجع و اندازه‌گیری پروفایل حرارتی", desc: "صحه‌گذاری پارامترهای دستگاه با مشاوران و تجهیزات اندازه‌گیری" },
      { title: "استفاده از نمودار تمرکز نقص برای شناسایی نقاط شکست در محصول", desc: "تعیین نقاط شکست با توجه به جهت حرکت PCB در وان قلع" },
      { title: "اصلاح فیکسچر: باز کردن فضای انتهایی کانکتورها و اصلاح لبه حفره‌ها", desc: "کاهش ریسک اتصالی و گردش بهتر جریان قلع" },
      { title: "افزایش دمای پیش‌گرمایش و اصلاح زمان‌بندی پاشش فلکس", desc: "حذف ایراد گلوله قلع و کاهش ریسک اتصالی در قطعات SMD" }
    ],
    effectiveness: {
      text: "با توجه به اقدامات تعریف‌شده در فرآیند و اصلاحات انجام‌شده بر روی فیکسچرها، مطابق اطلاعات ثبت‌شده فرآیندی، مشکلات مربوط به فرآیند تولید کاهش داشته است.",
      data: [
        { date: "1403/07/11", ppm: "3430000" }, { date: "1403/07/12", ppm: "1764000" },
        { date: "1403/07/14", ppm: "3219780" }, { date: "1403/07/15", ppm: "4694300" },
        { date: "1403/07/16", ppm: "3063660" }, { date: "1403/07/17", ppm: "2642857" },
        { date: "1403/07/18", ppm: "889961" }, { date: "1403/07/21", ppm: "956521" },
        { date: "1403/07/22", ppm: "903333" }, { date: "1403/07/23", ppm: "834254" },
        { date: "1403/07/24", ppm: "923076" }, { date: "1403/07/26", ppm: "898373" }
      ],
      target: "300000"
    },
    standardization: [
      { doc: "بازنگری دستورالعمل تنظیمات وان قلع", owner: "تولید", start: "14030725", end: "14030727" },
      { doc: "بازنگری چک‌لیست JOB SETUP", owner: "کنترل کیفیت", start: "14030725", end: "14030727" },
      { doc: "اصلاح نقشه ساخت فیکسچر وان قلع مطابق نمونه اصلاح‌شده برای محصول F1L", owner: "نت", start: "14030727", end: "14030810" },
      { doc: "به‌روزرسانی الزامات تولیدی برای طراحی PCB با لحاظ سایز رینگ وایا و مساحت مورد نیاز برای حفره قلع‌کاری فیکسچر", owner: "تولید", start: "14030727", end: "14030810" },
      { doc: "به‌روزرسانی راهنمای عیوب فرآیند وان قلع", owner: "کنترل کیفیت", start: "14030727", end: "14030810" },
      { doc: "تهیه فرم ثبت دانش و اجرای رویه مدیریت دانش", owner: "کنترل کیفیت", start: "14030727", end: "14030810" },
      { doc: "بازنگری FMEA", owner: "تیم CFT", start: "14030727", end: "14030810" },
      { doc: "بازنگری CP", owner: "تیم CFT", start: "14030727", end: "14030810" },
      { doc: "بازنگری LPA", owner: "تولید", start: "14030727", end: "14030810" },
      { doc: "بازنگری محتوای سوابق کیفی (FLOWS)", owner: "تیم CFT", start: "14030727", end: "14030810" }
    ],
    summary: "با استفاده از ابزارهای کیفی به ویژه نمودار تمرکز نقص، محل شکست و ایرادات بر روی محصول مشخص شد و با استفاده از متد طوفان فکری نسبت به شناسایی راه‌حل برای رفع مشکل و تعریف اقدامات اصلاحی اقدام شد. تغییرات بر روی SETUP دستگاه برای حذف مشکل گلوله قلع که منجر به شکست خارجی و هزینه‌های گارانتی می‌گردید انجام شد و با استفاده از تغییرات بر روی فیکسچر وان قلع نسبت به حذف ایرادات در بخش‌های اصلی محصول اقدام شد و با توجه به بهینه‌کاوی صورت‌گرفته نسبت به اصلاحات ابعادی در وایا بر روی PCB توسط واحد مهندسی و بازرگانی درخواست شد.",
    future_actions: "استفاده از ابزار کیفی DOE برای تعیین متغیرهای اصلی فرآیند برای بهینه‌سازی تجهیز و کاهش هزینه‌های فرآیند | اجرای الزامات برای طراحی سایر محصولات از جمله SBM و IKBCM | امکان‌سنجی استفاده از وان قلع برای تولید محصولات جلوآمپر | استفاده از فیکسچر تکی جهت جلوگیری از انحنای فیکسچر و نفوذ قلع | بررسی تکنولوژی PIP (Pin In Paste) و امکان استفاده آن در محصولات سازه پویش",
    research: {
      findings: "گلوله قلع ناشی از گاززدایی فلکس در تماس با موج قلع و رطوبت برد است؛ طبق IPC-A-610 وجود ۵ گلوله یا بیشتر (≤۰٫۱۳ میلی‌متر) در ۶۰۰ میلی‌متر مربع در کلاس ۲/۳ عیب است. اتصال کوتاه با تنظیم ارتفاع موج، زاویه عبور و اصلاح حفره فیکسچر کنترل می‌شود. بهینه‌کاوی نشان داد تفاوت سایز رینگ وایا ریسک اتصالی را کاهش می‌دهد.",
      sources: [
        "IPC-A-610 — Acceptability of Electronic Assemblies",
        "Bob Willis — Avoiding Solder Ball Formation (Process Solutions)",
        "8D Problem Solving — D0 to D8 Methodology"
      ]
    }
  });
  alert("داده نمونه بارگذاری شد — این فقط یک مثال برای دیدن ساختار است. برای محصول و فرآیند خودتان اطلاعات را وارد کنید (می‌توانید بخش‌بخش و در دفعات بعد تکمیل کنید).");
};

// ---------- شروع ----------
(function init() {
  Object.keys(TABLES).forEach(t => addRow(t));
  let loaded = false;
  try {
    const saved = JSON.parse(localStorage.getItem("report_v1") || "null");
    if (saved && saved.r && (saved.r.title || saved.r.product_desc || saved.r.machine_desc)) {
      applyData(saved.r);
      Object.assign(photos, saved.photos || {});
      renderPrev("product", "prev_product"); renderPrev("machine", "prev_machine");
      renderPrev("machine2", "prev_machine2"); renderPrev("defects", "prev_defects");
      renderPrev("analysis", "prev_analysis");
      loaded = true;
    }
  } catch (e) {}
  // اگر در این مرورگر داده‌ای نبود، پیش‌نویس خودکار را بارگذاری کن (ادامه کار تدریجی)
  if (!loaded) {
    try {
      const d = JSON.parse(localStorage.getItem("draft_پیش‌نویس خودکار") || "null");
      if (d && d.report) {
        applyData(d.report || {});
        Object.assign(photos, d.photos || {});
        renderPrev("product", "prev_product"); renderPrev("machine", "prev_machine");
        renderPrev("machine2", "prev_machine2"); renderPrev("defects", "prev_defects");
        renderPrev("analysis", "prev_analysis");
        refreshDots();
      }
    } catch (e) {}
  }
  refreshDraftList();
  go(0);
  refreshDots();
})();
