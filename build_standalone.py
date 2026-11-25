# -*- coding: utf-8 -*-
"""
ساخت نسخه مستقل (بدون پایتون/سرور) — یک فایل HTML واحد که فقط با باز کردن
در مرورگر کار می‌کند. خروجی: standalone/index.html

اجرا: python3 build_standalone.py
"""
import json
import os

BASE = os.path.dirname(os.path.abspath(__file__))


def main():
    html = open(os.path.join(BASE, "templates", "index.html"), encoding="utf-8").read()
    css = open(os.path.join(BASE, "static", "style.css"), encoding="utf-8").read()
    builder = open(os.path.join(BASE, "static", "pptx-builder.js"), encoding="utf-8").read()
    app_js = open(os.path.join(BASE, "standalone", "app.js"), encoding="utf-8").read()
    bundle = open(os.path.join(BASE, "standalone", "pptxgen.bundle.js"), encoding="utf-8").read()

    # پایگاه دانش داخلی از app.py
    import app as flask_app
    kb_json = json.dumps(flask_app.KB, ensure_ascii=False)

    # ۱. CSS داخلی
    html = html.replace('<link rel="stylesheet" href="/static/style.css">',
                        "<style>\n" + css + "\n</style>")

    # ۲. متن‌های مخصوص نسخه سروری را به نسخه مستقل تبدیل کن
    html = html.replace(
        "هر بخش را که وارد کردید ذخیره می‌شود (خودکار روی سرور + مرورگر)",
        "هر بخش را که وارد کردید به‌صورت خودکار در همین مرورگر ذخیره می‌شود")
    html = html.replace(
        '<div class="note">نکته: اگر فایل دانلود نشد، مطمئن شوید سرور در حال اجراست. فایل خروجی در پوشه <b>output</b> سرور هم ذخیره می‌شود.</div>',
        '<div class="note">این نسخه <b>مستقل و بدون نیاز به پایتون/سرور</b> است — فقط همین فایل را در مرورگر باز کنید. تولید فایل PPTX کاملاً داخل مرورگر انجام می‌شود. برای جستجوی اینترنتی، اتصال به اینترنت لازم است (در غیر این صورت پایگاه دانش داخلی در دسترس است).</div>')
    html = html.replace(
        "<title>سازنده گزارش بهبود فرآیند</title>",
        "<title>سازنده گزارش بهبود فرآیند (نسخه مستقل — بدون پایتون)</title>")

    # ۳. اسکریپت‌ها: کتابخانه PPTX + سازنده + پایگاه دانش + منطق برنامه
    scripts = (
        "<script>\n/* PptxGenJS 3.12.0 (MIT) — تولید PPTX داخل مرورگر */\n" + bundle + "\n</script>\n"
        "<script>\n" + builder + "\n</script>\n"
        "<script>\nconst KB_DATA = " + kb_json + ";\n" + app_js + "\n</script>"
    )
    html = html.replace('<script src="/static/app.js"></script>', scripts)

    out = os.path.join(BASE, "standalone", "index.html")
    with open(out, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"ساخته شد: standalone/index.html ({os.path.getsize(out) / 1024:.0f} KB)")
    print("کافی است همین فایل را در مرورگر باز کنید — بدون پایتون، بدون سرور.")


if __name__ == "__main__":
    main()
