# -*- coding: utf-8 -*-
"""
سرور گزارش بهبود فرآیند — دریافت اطلاعات و عکس، تحقیق اینترنتی، خروجی PPTX قابل ویرایش
اجرا: python3 app.py  ->  http://0.0.0.0:5000
"""
import json
import os
import re
import urllib.parse
import urllib.request

from flask import Flask, request, jsonify, send_file, render_template

from pptx_builder import build_pptx

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 60 * 1024 * 1024  # 60MB

BASE = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(BASE, "output")
DRAFTS_DIR = os.path.join(BASE, "drafts")
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(DRAFTS_DIR, exist_ok=True)

# ---------------- پایگاه دانش داخلی (یافته‌های تحقیق اینترنتی) ----------------
KB = [
    {
        "cat": "عیوب وان قلع (Wave Soldering)",
        "title": "گلوله قلع (Solder Balls)",
        "body": "علل اصلی: گاززدایی فلکس در تماس با موج قلع (پیش‌گرمایش ناکافی)، رطوبت برد، ضخامت ناکافی مس در سوراخ‌ها (حداقل ۲۵ میکرون)، ارتفاع/سرعت موج، مقدار زیاد فلکس. طبق IPC-A-610: وجود ۵ گلوله یا بیشتر (هر کدام ≤۰٫۱۳ میلی‌متر) در مساحت ۶۰۰ میلی‌متر مربع در کلاس ۲ و ۳ عیب است؛ هر گلوله در فاصله کمتر از ۰٫۱۳ میلی‌متر از پد/ترک نیز در همه کلاس‌ها عیب محسوب می‌شود. راهکار: تنظیم پیش‌گرمایش، کنترل مقدار فلکس، تمیزکاری فیکسچر، کنترل رطوبت انبارش برد.",
        "src": "IPC-A-610 / Bob Willis — Avoiding Solder Ball Formation",
    },
    {
        "cat": "عیوب وان قلع (Wave Soldering)",
        "title": "اتصال کوتاه / پل قلع (Bridging)",
        "body": "علل: ارتفاع زیاد موج قلع، سرعت کم کانوایر، زاویه خروج نامناسب، طراحی فیکسچر (حفره تنگ)، فاصله کم پدها، دمای بالای حوضچه. راهکار: کاهش ارتفاع موج، تنظیم زاویه عبور PCB، باز کردن حفره‌های فیکسچر در محل کانکتورها، اصلاح لبه حفره (انحنا) برای خروج بهتر قلع، کاهش سایز رینگ وایا در طراحی PCB.",
        "src": "IPC-A-610 — Solder Bridging",
    },
    {
        "cat": "عیوب وان قلع (Wave Soldering)",
        "title": "حفره (Void) و عدم قلع‌گیری (Non-wetting)",
        "body": "حفره ناشی از گاززدایی مواد در حین لحیم‌کاری است؛ عدم ترشوندگی به‌علت اکسیداسیون پد، فلکس نامناسب یا آلودگی سطح. راهکار: خشک‌کردن برد، کنترل دمای پیش‌گرمایش مطابق دیتاشیت فلکس، اطمینان از تمیزی پدها، کنترل کیفیت ورودی قطعات THT.",
        "src": "IPC-A-610 / J-STD-001",
    },
    {
        "cat": "عیوب وان قلع (Wave Soldering)",
        "title": "نفوذ قلع به زیر PCB",
        "body": "علل: خرابی/مستهلک‌شدن فیکسچر، انحنای فیکسچر، فشار موج، نبود محافظ برای قطعات SMD. راهکار: ساخت فیکسچر اختصاصی هر محصول، استفاده از واشر نسوز/شابلون محافظ، بازنگری دوره تعویض فیکسچر، پایش انحنا.",
        "src": "تجربه خط تولید — فایل نمونه",
    },
    {
        "cat": "ابزارهای کیفی",
        "title": "نمودار ایشیکاوا (علت و معلول)",
        "body": "دسته‌بندی 6M: نیروی انسانی (Man)، ماشین/تجهیزات (Machine)، مواد (Material)، روش (Method)، اندازه‌گیری (Measurement)، محیط (Mother Nature). در طوفان فکری همه علل احتمالی را زیر هر دسته بنویسید، سپس با داده و آزمایش، علل واقعی را از فرضی جدا کنید.",
        "src": "8D Methodology — Fishbone Diagram",
    },
    {
        "cat": "ابزارهای کیفی",
        "title": "نمودار پارتو و تمرکز نقص",
        "body": "عیوب را بر اساس تعداد مرتب کنید؛ معمولاً ۲۰٪ علل، ۸۰٪ عیوب را می‌سازند. نمودار تمرکز نقص روی نقشه PCB نشان می‌دهد عیب در کدام ناحیه (مثلاً انتهای کانکتور در جهت حرکت PCB) متمرکز است و به اصلاح فیکسچر جهت می‌دهد.",
        "src": "Pareto Analysis / Defect Concentration Diagram",
    },
    {
        "cat": "ابزارهای کیفی",
        "title": "متد 8D",
        "body": "D0 برنامه‌ریزی، D1 تشکیل تیم، D2 شرح مسئله (چه/کجا/کی/چندتا)، D3 اقدام مهار (حفاظت از مشتری)، D4 ریشه‌یابی (5 Why + ایشیکاوا)، D5 اقدام اصلاحی دائمی، D6 اجرا و اعتبارسنجی، D7 جلوگیری از تکرار (به‌روزرسانی FMEA/CP)، D8 تقدیر از تیم.",
        "src": "8D Problem Solving — D0 to D8",
    },
    {
        "cat": "ابزارهای کیفی",
        "title": "قابلیت فرآیند Cp / Cpk",
        "body": "شاخص توانمندی نشان می‌دهد فرآیند چقدر در محدوده مشخصات است. Cpk ≥ ۱٫۳۳ یعنی فرآیند توانمند. روند ماهانه شاخص را پایش کنید؛ افت آن نشانه خروج فرآیند از کنترل است.",
        "src": "SPC — Process Capability",
    },
    {
        "cat": "بهینه‌سازی فرآیند",
        "title": "پروفایل حرارتی و DOE",
        "body": "پارامترهای کلیدی وان قلع: دمای حوضچه (معمولاً ۲۵۰–۲۶۰°C برای آلیاژ SAC)، دمای پیش‌گرمایش، مقدار فلکس، سرعت کانوایر، ارتفاع موج، زاویه عبور. با طراحی آزمایش (DOE) متغیرهای اصلی را پیدا و پروفایل مرجع تعریف کنید؛ سپس محدوده مجاز تغییرات را در دستورالعمل ثبت کنید.",
        "src": "Wave Soldering Process Optimization / DOE",
    },
    {
        "cat": "بهینه‌سازی فرآیند",
        "title": "بهینه‌کاوی (Benchmarking) و فناوری‌های جایگزین",
        "body": "الگوبرداری از شرکت‌های دیگر (مثلاً تفاوت سایز رینگ وایا در کانکتورها) ریسک اتصالی را کم می‌کند. فناوری‌های جایگزین: لحیم‌کاری انتخابی (Selective)، Pin-In-Paste (PIP)، فیکسچر تکی برای جلوگیری از انحنا. امکان‌سنجی این فناوری‌ها از اقدامات آینده گزارش است.",
        "src": "Benchmarking / PIP Technology",
    },
    # ---- فرآیندهای عمومی برد الکترونیکی خودرو ----
    {
        "cat": "مونتاژ SMT و ریفلو",
        "title": "عیوب مونتاژ SMT (Tombstoning، قبرسنگی، جابجایی قطعه)",
        "body": "علل قبرسنگی: عدم تعادل حرارتی دو سر قطعه، خمیر نامتقارن، پد نامتقارن. علل جابجایی: ارتعاش کانوایر، خمیر بیش‌ازحد، پروفایل حرارتی نامناسب. راهکار: اصلاح پروفایل ریفلو (پیش‌گرم/خیس/پیک)، کنترل ضخامت خمیر و شابلون، نگهداری مناسب خمیر (دما/رطوبت)، فیدر و پیک‌ان‌پلیس کالیبره.",
        "src": "SMT Defect Troubleshooting / IPC-A-610",
    },
    {
        "cat": "مونتاژ SMT و ریفلو",
        "title": "پروفایل حرارتی ریفلو (Reflow Profile)",
        "body": "پروفایل استاندارد ۴ ناحیه دارد: پیش‌گرم (Preheat)، خیس‌شدن (Soak)، پیک دما (Peak حدود ۲۴۵–۲۵۰°C برای SAC) و سردایش. دما و زمان هر ناحیه باید با دیتاشیت خمیر و قطعات هماهنگ باشد؛ اندازه‌گیری با ترموکوپل روی برد واقعی انجام می‌شود. خروج از پروفایل مرجع علت بسیاری از عیوب (حفره، گلوله قلع، قبرسنگی) است.",
        "src": "Reflow Soldering Profile / J-STD-020",
    },
    {
        "cat": "تست و بازرسی",
        "title": "تست ICT و بازرسی AOI",
        "body": "ICT اتصال کوتاه/مدار باز و مقادیر قطعات را تست می‌کند؛ AOI عیوب ظاهری (جابجایی، پل قلع، کمبود خمیر) را قبل از ریفلو/بعد از آن می‌یابد. برای پوشش کامل، ترکیب ICT + AOI + تست عملکردی (FCT) به‌کار می‌رود. نرخ پوشش تست (Test Coverage) باید در FMEA/CP تعریف شود.",
        "src": "ICT / AOI Inspection — Automotive Electronics",
    },
    {
        "cat": "تست و بازرسی",
        "title": "تست عملکردی (FCT) و تست محیطی",
        "body": "تست عملکردی جامع همه عملکردهای برد (ورودی/خروجی، شبکه‌ها، رله‌ها، سنسورها) را شبیه‌سازی می‌کند. تست‌های محیطی: حرارتی/برودت، رطوبت، ارتعاش، EMC. خرابی در تست عملکردی معمولاً ریشه در لحیم‌کاری، قطعه یا طراحی دارد — تفکیک این سه با داده‌های ICT/AOI انجام می‌شود.",
        "src": "Functional Test / Environmental Test — IATF 16949",
    },
    {
        "cat": "پوشش و حفاظت",
        "title": "پوشش کانفورمال (Conformal Coating) و عیوب آن",
        "body": "عیوب رایج: حباب، شره، پوشش نازک/ضخیم، عدم چسبندگی. علل: ویسکوزیته نامناسب، دمای محیط، آلودگی سطح، ماسک‌گذاری نامناسب. راهکار: کنترل ویسکوزیته و دما، تمیزکاری و خشک‌کردن برد قبل از پوشش، کنترل ضخامت با شانه ضخامت‌سنج.",
        "src": "IPC-CC-830 — Conformal Coating",
    },
    {
        "cat": "طراحی PCB",
        "title": "قواعد طراحی PCB برای لحیم‌کاری (DFM)",
        "body": "نکات کلیدی: سایز مناسب رینگ وایا (Annular Ring) و پد برای کاهش ریسک اتصالی، فاصله کافی بین پدها، فضای کافی برای حفره فیکسچر وان قلع، جهت‌گیری قطعات در جهت حرکت برد، thermal relief برای پدهای قدرت، و رعایت حداقل فاصله ترک/پد مطابق IPC-2221. بسیاری از عیوب فرآیند ریشه در طراحی دارند و با بهینه‌کاوی از شرکت‌های دیگر قابل اصلاح‌اند.",
        "src": "IPC-2221 / DFM Guidelines",
    },
    {
        "cat": "کیفیت خودرو",
        "title": "IATF 16949 و ابزارهای APQP",
        "body": "در صنعت خودرو، ابزارهای APQP شامل FMEA (تحلیل حالت خرابی)، Control Plan (طرح کنترل)، MSA (تحلیل سیستم اندازه‌گیری)، SPC (کنترل آماری فرآیند) و PPAP (تاییدیه تولید) است. در فاز استانداردسازی گزارش بهبود فرآیند، به‌روزرسانی این مدارک الزامی است تا اصلاحات ماندگار شوند.",
        "src": "IATF 16949 / APQP Core Tools",
    },
    {
        "cat": "کیفیت خودرو",
        "title": "PPM و هزینه‌های کیفی (COPQ)",
        "body": "PPM = (تعداد عیب / تعداد محصول پایش‌شده) × ۱٬۰۰۰٬۰۰۰. هزینه‌های کیفی شامل ضایعات مواد، دوباره‌کاری (نفرساعت اصلاح)، توقف خط، برگشتی مشتری و گارانتی است. در فاز «درک وضعیت جاری» هم PPM و هم هزینه‌ها را قبل/بعد مقایسه کنید تا اثر اقتصادی اقدام اصلاحی مشخص شود.",
        "src": "Quality Metrics — PPM / COPQ",
    },
]


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/kb")
def kb():
    q = (request.args.get("q") or "").strip()
    if not q:
        return jsonify(KB)
    out = [k for k in KB if q in k["title"] or q in k["body"] or q in k["cat"]]
    return jsonify(out)


@app.route("/api/research", methods=["POST"])
def research():
    """جستجوی اینترنتی (DuckDuckGo HTML) — در صورت عدم دسترسی، پیام راهنما برمی‌گرداند."""
    data = request.get_json(force=True, silent=True) or {}
    query = (data.get("query") or "").strip()
    if not query:
        return jsonify({"ok": False, "error": "کلمه کلیدی را وارد کنید."})
    url = "https://html.duckduckgo.com/html/?q=" + urllib.parse.quote(query)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        html = urllib.request.urlopen(req, timeout=12).read().decode("utf-8", "ignore")
        # استخراج نتایج
        results = []
        for m in re.finditer(r'class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)</a>', html, re.S):
            link, title = m.group(1), re.sub(r"<[^>]+>", "", m.group(2)).strip()
            # لینک DuckDuckGo redirect
            if "uddg=" in link:
                try:
                    link = urllib.parse.unquote(link.split("uddg=")[1].split("&")[0])
                except Exception:
                    pass
            results.append({"title": title, "url": link})
        for m in re.finditer(r'class="result__snippet"[^>]*>(.*?)</a>', html, re.S):
            snip = re.sub(r"<[^>]+>", "", m.group(1)).strip()
            if results and len(results) > 0:
                idx = len(results) - 1
                if "snippet" not in results[idx]:
                    results[idx]["snippet"] = snip
        if not results:
            return jsonify({"ok": False,
                            "error": "نتیجه‌ای یافت نشد. از پایگاه دانش داخلی استفاده کنید یا خلاصه یافته‌ها را دستی وارد کنید."})
        return jsonify({"ok": True, "results": results[:8]})
    except Exception as e:
        return jsonify({"ok": False,
                        "error": f"دسترسی به اینترنت در این محیط ممکن نیست ({e}). از پایگاه دانش داخلی استفاده کنید یا یافته‌ها را دستی وارد کنید."})


@app.route("/api/generate", methods=["POST"])
def generate():
    data = request.get_json(force=True, silent=True) or {}
    report = data.get("report", {})
    photos = data.get("photos", {})
    only_filled = bool(data.get("only_filled", False))
    fname = (report.get("filename") or "process-improvement-report").strip()
    fname = re.sub(r"[^\w\-]+", "_", fname, flags=re.UNICODE) or "report"
    out = os.path.join(OUTPUT_DIR, fname + ".pptx")
    try:
        build_pptx(report, photos, out, only_filled=only_filled)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"ok": False, "error": str(e)}), 500
    return send_file(out, as_attachment=True, download_name=fname + ".pptx",
                     mimetype="application/vnd.openxmlformats-officedocument.presentationml.presentation")


# ---------------- پیش‌نویس‌ها (ذخیره تدریجی روی سرور) ----------------
def _draft_path(name):
    safe = re.sub(r"[^\w\-]+", "_", (name or "").strip(), flags=re.UNICODE) or "draft"
    return os.path.join(DRAFTS_DIR, safe + ".json")


@app.route("/api/draft", methods=["POST"])
def save_draft():
    data = request.get_json(force=True, silent=True) or {}
    name = data.get("name") or "پیش‌نویس خودکار"
    path = _draft_path(name)
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump({"name": name, "data": data.get("data", {})}, f, ensure_ascii=False)
        return jsonify({"ok": True, "name": name})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/drafts")
def list_drafts():
    out = []
    try:
        for fn in sorted(os.listdir(DRAFTS_DIR)):
            if fn.endswith(".json"):
                p = os.path.join(DRAFTS_DIR, fn)
                try:
                    with open(p, encoding="utf-8") as f:
                        d = json.load(f)
                    out.append({"name": d.get("name", fn[:-5]),
                                "updated": os.path.getmtime(p)})
                except Exception:
                    continue
    except Exception:
        pass
    return jsonify(out)


@app.route("/api/draft", methods=["GET", "DELETE"])
def get_or_delete_draft():
    name = request.args.get("name", "")
    path = _draft_path(name)
    if request.method == "DELETE":
        try:
            if os.path.exists(path):
                os.remove(path)
            return jsonify({"ok": True})
        except Exception as e:
            return jsonify({"ok": False, "error": str(e)}), 500
    if not os.path.exists(path):
        return jsonify({"ok": False, "error": "پیش‌نویس یافت نشد."}), 404
    try:
        with open(path, encoding="utf-8") as f:
            d = json.load(f)
        return jsonify({"ok": True, "name": d.get("name", name), "data": d.get("data", {})})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/health")
def health():
    return jsonify({"ok": True})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
