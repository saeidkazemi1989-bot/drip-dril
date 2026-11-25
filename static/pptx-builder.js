/* سازنده گزارش بهبود فرآیند — نسخه مرورگری (PptxGenJS)
   معادل pptx_builder.py؛ خروجی: فایل PPTX با متن/جدول/نمودار قابل ویرایش */
const C = {
  BLUE: "0F6FC6", NAVY: "1B3A5C", YELLOW: "FFC000", LIGHT: "DDE9EC",
  LIGHT2: "EDF2F7", GREY: "595959", DARK: "262626", WHITE: "FFFFFF",
  RED: "C00000", GREEN: "37642E"
};
const FONT = "B Nazanin";

function num(v) {
  const n = parseFloat(String(v == null ? "" : v).replace(/,/g, "").replace(/٬/g, "").trim());
  return isNaN(n) ? 0 : n;
}
function has(v) { return Array.isArray(v) ? v.length > 0 : !!v; }

async function buildPptxJS(report, photos, onlyFilled) {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "WIDE", width: 13.333, height: 7.5 });
  pptx.layout = "WIDE";
  pptx.author = "Process Improvement Report Builder";
  const footer = report.footer || "Quality Report";

  const T = (s, x, y, w, h, text, o = {}) => s.addText(String(text == null ? "" : text), {
    x, y, w, h, fontFace: FONT, fontSize: o.size || 14, bold: !!o.bold,
    color: o.color || C.DARK, align: o.align || "right", rtl: true,
    valign: o.valign || "top", lineSpacingMultiple: 1.15, margin: 0.05
  });
  const BOX = (s, x, y, w, h, text, o = {}) => s.addShape("roundRect", {
    x, y, w, h, fill: { color: o.fill || C.BLUE }, line: { type: "none" },
    rectRadius: 0.08
  }).addText(String(text == null ? "" : text), {
    fontFace: FONT, fontSize: o.size || 14, bold: o.bold !== false,
    color: o.color || C.WHITE, align: "center", rtl: true, valign: "middle",
    margin: 0.08, lineSpacingMultiple: 1.1
  });
  function header(s, phase, title) {
    s.addShape("rect", { x: 0, y: 0, w: 13.333, h: 0.95, fill: { color: C.BLUE }, line: { type: "none" } });
    T(s, 0.3, 0.12, 9.5, 0.7, title, { size: 22, bold: true, color: C.WHITE });
    if (phase) BOX(s, 10.6, 0.18, 2.4, 0.6, phase, { fill: C.YELLOW, color: C.NAVY, size: 13 });
    s.addShape("rect", { x: 0, y: 0.95, w: 13.333, h: 0.06, fill: { color: C.YELLOW }, line: { type: "none" } });
    T(s, 0.3, 7.05, 6, 0.35, footer, { size: 10, color: C.GREY, align: "left" });
    T(s, 10.8, 7.05, 2.2, 0.35, "Quality Report", { size: 10, color: C.GREY });
  }
  function table(s, x, y, w, headers, rows, colW, fs = 11) {
    const data = [headers.map(h => ({ text: String(h), options: { fill: C.BLUE, color: C.WHITE, bold: true, align: "center" } }))];
    rows.forEach((r, i) => data.push(r.map(v => ({
      text: String(v == null ? "" : v),
      options: { fill: i % 2 ? C.LIGHT2 : C.WHITE, align: "center" }
    }))));
    s.addTable(data, {
      x, y, w, colW, fontFace: FONT, fontSize: fs, align: "right", rtl: true,
      border: { pt: 0.75, color: "B0BEC5" }, valign: "middle", margin: 0.04
    });
  }
  function img(s, dataUrl, x, y, w, h) {
    if (dataUrl) {
      s.addImage({ data: dataUrl, x, y, w, h, sizing: { type: "cover", w, h } });
    } else {
      BOX(s, x, y, w, h, "محل عکس — در نرم‌افزار جایگزین کنید", { fill: C.LIGHT2, color: C.GREY, size: 12, bold: false });
    }
  }
  function chart(s, type, series, x, y, w, h, title) {
    s.addChart(type, series, {
      x, y, w, h, showLegend: true, legendPosition: "b", showTitle: !!title,
      title: title || "", chartColors: [C.BLUE, C.YELLOW, C.RED, C.GREEN, C.NAVY],
      catAxisTitle: "", valAxisTitle: "", fontFace: FONT
    });
  }
  const show = (cond) => !onlyFilled || cond;

  // ۱. جلد
  {
    const s = pptx.addSlide();
    s.background = { color: C.NAVY };
    s.addShape("rect", { x: 0, y: 2.6, w: 13.333, h: 2.3, fill: { color: C.BLUE }, line: { type: "none" } });
    T(s, 0.8, 2.85, 11.7, 1.0, report.title || "گزارش بهبود فرآیند", { size: 30, bold: true, color: C.WHITE, align: "center" });
    T(s, 0.8, 3.85, 11.7, 0.8, report.subtitle || "", { size: 20, color: C.YELLOW, align: "center" });
    T(s, 0.8, 5.3, 11.7, 0.6, `تاریخ گزارش: ${report.date || ""}   |   ${report.company || ""}`, { size: 14, color: C.WHITE, align: "center" });
    T(s, 0.8, 6.6, 11.7, 0.5, footer, { size: 11, color: C.LIGHT, align: "center" });
  }
  // ۲. اعضای تیم
  if (show(has(report.team))) {
    const s = pptx.addSlide(); header(s, "", "اعضای تیم");
    const rows = (report.team || []).map(t => [t.name || "", t.role || ""]);
    table(s, 2.2, 1.6, 8.9, ["نام و نام خانوادگی", "سمت / نقش"], rows.length ? rows : [["—", "—"]], [5.9, 3], 13);
    if (report.team_note) T(s, 1.2, 5.6, 10.9, 1.2, report.team_note, { size: 13 });
  }
  // ۳. معرفی محصول
  if (show(has(report.product_desc) || has(photos.product))) {
    const s = pptx.addSlide(); header(s, "آشنایی با سیستم", "معرفی محصول");
    T(s, 6.6, 1.4, 6.2, 5.2, report.product_desc || "«متن معرفی محصول را در نرم‌افزار وارد کنید»", { size: 14 });
    img(s, photos.product, 0.4, 1.4, 5.9, 5.2);
  }
  // ۴. معرفی دستگاه
  if (show(has(report.machine_desc) || has(photos.machine))) {
    const s = pptx.addSlide(); header(s, "", "آشنایی با دستگاه / فرآیند");
    T(s, 6.6, 1.4, 6.2, 5.2, report.machine_desc || "«توضیح فرآیند و دستگاه را وارد کنید»", { size: 14 });
    img(s, photos.machine, 0.4, 1.4, 5.9, 5.2);
  }
  // ۵. عکس دستگاه تمام‌صفحه
  if (has(photos.machine2) || has(report.machine_launch)) {
    const s = pptx.addSlide(); header(s, "", report.machine_name || "دستگاه / فرآیند");
    img(s, photos.machine2, 0.8, 1.3, 11.7, 4.6);
    if (report.machine_launch) BOX(s, 2.2, 6.1, 8.9, 0.7, report.machine_launch, { fill: C.YELLOW, color: C.NAVY, size: 14 });
  }
  // ۶. معرفی قطعه
  if (show(has(report.parts))) {
    const s = pptx.addSlide(); header(s, "", "معرفی قطعه - سازنده");
    const rows = (report.parts || []).map(p => [p.desc || "", p.tech_no || "", p.maker_code || "", p.score || ""]);
    table(s, 0.7, 1.5, 11.9, ["شرح", "شماره فنی", "کد سازنده", "نمره عملکرد"], rows.length ? rows : [["—", "—", "—", "—"]], [5.5, 2.2, 2, 2.2], 12);
  }
  // ۷. فاز ۱
  if (show(has(report.phase1_defects))) {
    const s = pptx.addSlide(); header(s, "فاز ۱", "انتخاب موضوع");
    T(s, 0.6, 1.3, 12.1, 0.6, "شرح ایرادات رویت‌شده مربوط به شکست‌های خارجی و داخلی:", { size: 16, bold: true, color: C.NAVY });
    const txt = (report.phase1_defects || []).map((d, i) => `${i + 1}- ${d}`).join("\n") || "«ایرادات اصلی را وارد کنید»";
    BOX(s, 0.6, 2.1, 12.1, 4.4, txt, { fill: C.LIGHT2, color: C.DARK, size: 14 });
  }
  // ۸. فاز ۲
  if (show(has(report.quality_warnings))) {
    const s = pptx.addSlide(); header(s, "فاز ۲", "توجیه دلایل انتخاب — بررسی اخطارهای کیفی");
    const rows = (report.quality_warnings || []).map(w => [w.date || "", w.no || "", w.defect || "", w.cause || ""]);
    table(s, 0.4, 1.5, 12.5, ["تاریخ", "شماره اخطار کیفی", "ایراد", "علت ایجاد ایراد"], rows.length ? rows : [["—", "—", "—", "—"]], [1.8, 2.1, 4.1, 4.5], 11);
    if (report.warnings_summary) BOX(s, 3.2, 6.3, 6.9, 0.6, report.warnings_summary, { fill: C.YELLOW, color: C.NAVY, size: 13 });
  }
  // ۹. فاز ۳ وضعیت سازنده
  if (show(has(report.supplier_status))) {
    const s = pptx.addSlide(); header(s, "فاز ۳", "درک وضعیت جاری — وضعیت سازنده");
    const rows = (report.supplier_status || []).map(r => [r.item || "", r.value || ""]);
    table(s, 1.6, 1.5, 10.1, ["شرح", "وضعیت"], rows.length ? rows : [["—", "—"]], [3.6, 6.5], 12);
  }
  // ۱۰. فاز ۳ مقایسه ایرادات
  const comp = report.defect_compare || {};
  if (show(has(comp.types))) {
    const s = pptx.addSlide(); header(s, "فاز ۳", "درک وضعیت جاری — مقایسه ایرادات");
    const types = comp.types || [];
    const before = comp.before || {}, after = comp.after || {};
    const rows = types.map(t => [t, before[t] || "", after[t] || ""]);
    rows.push(["جمع ایرادات", comp.before_total || "", comp.after_total || ""]);
    rows.push(["PPM", comp.before_ppm || "", comp.after_ppm || ""]);
    table(s, 7.3, 1.4, 5.5, ["نوع ایراد", comp.before_label || "قبل", comp.after_label || "بعد"], rows, [2.5, 1.5, 1.5], 11);
    chart(s, pptx.ChartType.bar, [
      { name: comp.before_label || "قبل", labels: types, values: types.map(t => num(before[t])) },
      { name: comp.after_label || "بعد", labels: types, values: types.map(t => num(after[t])) }
    ], 0.3, 1.4, 6.7, 5.3, "مقایسه تعداد ایرادات");
  }
  // ۱۱. فاز ۳ قابلیت فرآیند
  if (show(has(report.capability))) {
    const s = pptx.addSlide(); header(s, "فاز ۳", "درک وضعیت جاری — قابلیت فرآیند");
    const rows = (report.capability || []).map(c => [c.status || "", c.date || "", c.index || ""]);
    table(s, 3.4, 1.4, 6.5, ["وضعیت", "تاریخ", "شاخص توانمندی (Cp/Cpk)"], rows.length ? rows : [["—", "—", "—"]], [2.2, 1.7, 2.6], 11);
    if ((report.capability || []).length >= 2) {
      chart(s, pptx.ChartType.line, [
        { name: "شاخص توانمندی", labels: report.capability.map(c => c.date || ""), values: report.capability.map(c => num(c.index)) }
      ], 0.3, 1.4, 2.9, 5.3, "روند شاخص توانمندی");
    }
  }
  // ۱۲. فاز ۳ عکس عیوب
  if (has(photos.defects)) {
    const s = pptx.addSlide(); header(s, "فاز ۳", "درک وضعیت جاری — نمونه عیوب");
    (photos.defects || []).slice(0, 6).forEach((p, i) => {
      img(s, p, 0.4 + (i % 3) * 4.3, 1.3 + Math.floor(i / 3) * 2.9, 4.0, 2.6);
    });
  }
  // ۱۳/۱۴. فاز ۳ هزینه‌ها
  [["cost_before", "قبل"], ["cost_after", "بعد"]].forEach(([key, lbl]) => {
    const c = report[key] || {};
    if (!has(c.items) && !has(c.summary)) return;
    const s = pptx.addSlide(); header(s, "فاز ۳", `درک وضعیت جاری — هزینه‌های فرآیند — ${lbl}`);
    const rows = (c.items || []).map(it => [it.cost || "", it.calc || "", it.process || "", it.station || ""]);
    if (rows.length) table(s, 0.5, 1.5, 12.3, ["هزینه", "نحوه محاسبه", "فرآیند", "ایستگاه تولیدی"], rows, [2.4, 3.9, 3.3, 2.7], 11);
    if (c.summary) BOX(s, 0.8, 5.9, 11.7, 0.9, c.summary, { fill: C.LIGHT2, color: C.DARK, size: 12 });
  });
  // ۱۵. فاز ۳ روند PPM
  if (has(report.ppm_trend)) {
    const s = pptx.addSlide(); header(s, "فاز ۳", "درک وضعیت جاری — روند PPM");
    const rows = report.ppm_trend.map(p => [p.date || "", p.count || "", p.defects || "", p.ppm || ""]);
    table(s, 8.0, 1.4, 4.9, ["تاریخ", "تعداد پایش‌شده", "جمع ایرادات", "PPM"], rows, [1.3, 1.3, 1.2, 1.1], 10);
    const cats = report.ppm_trend.map(p => p.date || "");
    const series = [{ name: "PPM", labels: cats, values: report.ppm_trend.map(p => num(p.ppm)) }];
    if (report.ppm_target) series.push({ name: "هدف", labels: cats, values: cats.map(() => num(report.ppm_target)) });
    if (report.ppm_limit) series.push({ name: "حد قابل قبول", labels: cats, values: cats.map(() => num(report.ppm_limit)) });
    chart(s, pptx.ChartType.line, series, 0.3, 1.4, 7.4, 5.3, "روند PPM");
  }
  // ۱۶. فاز ۳ مقایسه تامین‌کننده‌ها
  if (has(report.supplier_compare)) {
    const s = pptx.addSlide(); header(s, "فاز ۳", "درک وضعیت جاری — مقایسه تامین‌کننده‌ها / طراحی‌ها");
    const rows = report.supplier_compare.map(r => [r.product || "", r.monitored || "", r.defects || "", r.ppm || ""]);
    table(s, 7.6, 1.4, 5.4, ["محصول", "تعداد پایش‌شده", "جمع ایراد", "PPM"], rows, [2.2, 1.1, 1.1, 1.0], 10);
    chart(s, pptx.ChartType.bar, [
      { name: "جمع ایراد", labels: report.supplier_compare.map(r => r.product || ""), values: report.supplier_compare.map(r => num(r.defects)) }
    ], 0.3, 1.4, 7.0, 5.3, "مقایسه جمع ایرادات");
  }
  // ۱۷. فاز ۴ اهداف
  if (show(has(report.goals) || has(report.goal_steps))) {
    const s = pptx.addSlide(); header(s, "فاز ۴", "انتخاب هدف");
    T(s, 0.6, 1.3, 12.1, 0.6, "اهداف کمی:", { size: 16, bold: true, color: C.NAVY });
    const txt = (report.goals || []).map(g => `• ${g}`).join("\n") || "«اهداف را وارد کنید»";
    BOX(s, 0.6, 2.0, 12.1, 1.9, txt, { fill: C.LIGHT2, color: C.DARK, size: 14 });
    T(s, 0.6, 4.2, 12.1, 0.6, "گام‌های اصلی رفع ایراد:", { size: 16, bold: true, color: C.NAVY });
    const txt2 = (report.goal_steps || []).map((st, i) => `${i + 1}- ${st}`).join("\n") || "«گام‌ها را وارد کنید»";
    BOX(s, 0.6, 4.9, 12.1, 1.9, txt2, { fill: C.LIGHT2, color: C.DARK, size: 13 });
  }
  // ۱۸. فاز ۵ پارتو
  if (has(report.pareto)) {
    const s = pptx.addSlide(); header(s, "فاز ۵", "تجزیه و تحلیل — نمودار پارتو (تمرکز نقص)");
    const rows = report.pareto.map(p => [p.defect || "", p.count || "", p.percent || ""]);
    table(s, 8.2, 1.4, 4.8, ["نوع عیب", "تعداد", "درصد تجمعی"], rows, [2.0, 1.3, 1.5], 11);
    chart(s, pptx.ChartType.bar, [
      { name: "تعداد", labels: report.pareto.map(p => p.defect || ""), values: report.pareto.map(p => num(p.count)) }
    ], 0.3, 1.4, 7.6, 5.3, "پارتو عیوب");
  }
  // ۱۹. فاز ۵ ایشیکاوا
  const fish = report.fishbone || {};
  const fishHas = has(fish.effect) || has(report.problem_statement) ||
    ["man", "environment", "measurement", "machine", "material", "method"].some(k => has(fish[k]));
  if (show(fishHas)) {
    const s = pptx.addSlide(); header(s, "فاز ۵", "تجزیه و تحلیل — نمودار علت و معلول (ایشیکاوا)");
    const effect = fish.effect || report.problem_statement || "شرح ایراد";
    BOX(s, 0.4, 3.1, 2.6, 1.1, effect, { fill: C.RED, color: C.WHITE, size: 12 });
    s.addShape("line", { x: 3.0, y: 3.65, w: 9.9, h: 0, line: { color: C.NAVY, width: 2.5 } });
    const cats = [["نیروی انسانی", fish.man], ["محیط", fish.environment], ["اندازه‌گیری", fish.measurement],
                  ["تجهیزات", fish.machine], ["مواد", fish.material], ["روش", fish.method]];
    cats.forEach(([cat, causes], idx) => {
      const top = idx < 3;
      const x = 4.2 + (idx % 3) * 2.9;
      const yb = top ? 1.6 : 5.7;
      s.addShape("line", { x, y: 3.65, w: 0.9, h: (yb + (top ? 0.35 : -0.35)) - 3.65, line: { color: C.BLUE, width: 1.75 } });
      BOX(s, x + 0.55, yb, 1.9, 0.45, cat, { fill: C.BLUE, color: C.WHITE, size: 11 });
      const causeTxt = (causes || []).map(c => `• ${c}`).join("\n") || "—";
      T(s, x + 0.3, top ? yb + 0.5 : yb - 1.15, 2.4, 1.1, causeTxt, { size: 10 });
    });
  }
  // ۲۰. فاز ۵ بررسی علل
  if (has(report.cause_checks)) {
    const chunks = [];
    for (let i = 0; i < report.cause_checks.length; i += 8) chunks.push(report.cause_checks.slice(i, i + 8));
    chunks.forEach(chunk => {
      const s = pptx.addSlide(); header(s, "فاز ۵", "تجزیه و تحلیل — بررسی علل");
      const rows = chunk.map(c => [c.factor || "", c.check || "", c.result || ""]);
      table(s, 0.4, 1.4, 12.5, ["عامل اعلام‌شده", "شرح بررسی انجام‌شده", "نتیجه"], rows, [3.0, 7.5, 2.0], 10);
    });
  }
  // ۲۱. فاز ۶ اقدامات قبلی
  if (has(report.prev_actions)) {
    const s = pptx.addSlide(); header(s, "فاز ۶", "اجرای اقدام اصلاحی — اقدامات تعریف‌شده قبلی");
    const rows = report.prev_actions.map(a => [a.action || "", a.owner || "", a.date || "", a.status || "", a.effect || ""]);
    table(s, 0.3, 1.4, 12.7, ["اقدام تعریف‌شده قبلی", "مسئول انجام اقدام", "تاریخ انجام", "وضعیت", "اثربخشی"], rows, [5.5, 2.1, 1.7, 1.4, 2.0], 10);
  }
  // ۲۲. فاز ۶ اقدامات جدید
  if (has(report.new_actions)) {
    const s = pptx.addSlide(); header(s, "فاز ۶", "اجرای اقدام اصلاحی — اقدامات تعریف‌شده جدید");
    const rows = report.new_actions.map(a => [a.action || "", a.owner || "", a.date || "", a.status || ""]);
    table(s, 0.5, 1.4, 12.3, ["اقدامات تعریف‌شده جدید", "مسئول انجام اقدام", "تاریخ انجام", "وضعیت"], rows, [6.5, 2.2, 1.8, 1.8], 11);
  }
  // ۲۳. فاز ۶ کارت‌های اقدام
  if (has(report.action_cards)) {
    const cards = report.action_cards;
    for (let ci = 0; ci < cards.length; ci += 2) {
      const s = pptx.addSlide(); header(s, "فاز ۶", "اجرای اقدام اصلاحی — مستندات تصویری");
      cards.slice(ci, ci + 2).forEach((card, k) => {
        const y0 = 1.3 + k * 2.95;
        T(s, 0.4, y0, 12.5, 0.45, card.title || "", { size: 15, bold: true, color: C.NAVY });
        if (card.desc) T(s, 0.4, y0 + 0.42, 12.5, 0.55, card.desc, { size: 11 });
        img(s, card.before, 7.0, y0 + 0.95, 5.8, 1.85);
        img(s, card.after, 0.4, y0 + 0.95, 5.8, 1.85);
        T(s, 7.0, y0 + 0.95, 5.8, 0.3, "قبل", { size: 10, bold: true, color: C.RED, align: "center" });
        T(s, 0.4, y0 + 0.95, 5.8, 0.3, "بعد", { size: 10, bold: true, color: C.GREEN, align: "center" });
      });
    }
  }
  // ۲۴. فاز ۷ تایید تاثیرات
  const eff = report.effectiveness || {};
  if (show(has(eff.text) || has(eff.data))) {
    const s = pptx.addSlide(); header(s, "فاز ۷", "تایید تاثیرات");
    if (eff.text) T(s, 0.6, 1.3, 12.1, 1.1, eff.text, { size: 13 });
    if (has(eff.data)) {
      const cats = eff.data.map(d => d.date || "");
      const series = [{ name: "PPM", labels: cats, values: eff.data.map(d => num(d.ppm)) }];
      if (eff.target) series.push({ name: "هدف", labels: cats, values: cats.map(() => num(eff.target)) });
      chart(s, pptx.ChartType.line, series, 0.6, 2.5, 12.1, 4.3, "PPM پس از اصلاحات");
    }
  }
  // ۲۵. فاز ۸ استانداردسازی
  if (has(report.standardization)) {
    const s = pptx.addSlide(); header(s, "فاز ۸", "استانداردسازی — بازنگری سیستم‌ها / مدارک موثر");
    const rows = report.standardization.map(r => [r.doc || "", r.owner || "", r.start || "", r.end || ""]);
    table(s, 0.4, 1.4, 12.5, ["مدرک", "مسئول", "شروع", "پایان"], rows, [6.5, 2.2, 1.9, 1.9], 11);
  }
  // ۲۶. فاز ۹ خلاصه
  if (show(has(report.summary) || has(report.future_actions))) {
    const s = pptx.addSlide(); header(s, "فاز ۹", "خلاصه‌سازی و برنامه‌ریزی اقدامات آینده");
    T(s, 0.6, 1.3, 12.1, 0.5, "خلاصه اقدامات:", { size: 16, bold: true, color: C.NAVY });
    BOX(s, 0.6, 1.9, 12.1, 2.0, report.summary || "«خلاصه اقدامات را وارد کنید»", { fill: C.LIGHT2, color: C.DARK, size: 12 });
    T(s, 0.6, 4.1, 12.1, 0.5, "اقدامات ثانویه / آینده:", { size: 16, bold: true, color: C.NAVY });
    BOX(s, 0.6, 4.7, 12.1, 2.0, report.future_actions || "«اقدامات آینده را وارد کنید»", { fill: C.LIGHT2, color: C.DARK, size: 12 });
  }
  // ۲۷. تحقیق
  const res = report.research || {};
  if (has(res.findings) || has(res.sources)) {
    const s = pptx.addSlide(); header(s, "تحقیق", "تحقیق اینترنتی و بهینه‌کاوی");
    T(s, 0.6, 1.3, 12.1, 0.5, "یافته‌های کلیدی:", { size: 16, bold: true, color: C.NAVY });
    BOX(s, 0.6, 1.9, 12.1, 2.6, res.findings || "", { fill: C.LIGHT2, color: C.DARK, size: 11 });
    T(s, 0.6, 4.7, 12.1, 0.5, "منابع:", { size: 16, bold: true, color: C.NAVY });
    BOX(s, 0.6, 5.3, 12.1, 1.5, (res.sources || []).join("\n") || "—", { fill: C.LIGHT2, color: C.DARK, size: 10 });
  }
  // ۲۸. سپاس
  {
    const s = pptx.addSlide();
    s.background = { color: C.NAVY };
    T(s, 1, 3.0, 11.3, 1.2, "با سپاس از توجه شما", { size: 36, bold: true, color: C.WHITE, align: "center" });
    T(s, 1, 4.3, 11.3, 0.6, footer, { size: 14, color: C.YELLOW, align: "center" });
  }
  return pptx;
}
