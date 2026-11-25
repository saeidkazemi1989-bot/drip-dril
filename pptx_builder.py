# -*- coding: utf-8 -*-
"""
سازنده گزارش بهبود فرآیند (PPTX قابل ویرایش)
ساختار اسلایدها مطابق فایل نمونه: گزارش کیفی وان قلع NBCM
همه متن‌ها، جدول‌ها و نمودارها به‌صورت Native و قابل ویرایش در PowerPoint ساخته می‌شوند.
"""
import base64
import os
import tempfile

from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE, MSO_CONNECTOR
from pptx.enum.chart import XL_CHART_TYPE, XL_LEGEND_POSITION, XL_LABEL_POSITION
from pptx.chart.data import ChartData
from pptx.oxml.ns import qn

# ---------- رنگ‌ها (مطابق تم فایل نمونه) ----------
BLUE = RGBColor(0x0F, 0x6F, 0xC6)
NAVY = RGBColor(0x1B, 0x3A, 0x5C)
YELLOW = RGBColor(0xFF, 0xC0, 0x00)
LIGHT = RGBColor(0xDD, 0xE9, 0xEC)
LIGHT2 = RGBColor(0xED, 0xF2, 0xF7)
GREY = RGBColor(0x59, 0x59, 0x59)
DARK = RGBColor(0x26, 0x26, 0x26)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
RED = RGBColor(0xC0, 0x00, 0x00)
GREEN = RGBColor(0x37, 0x64, 0x2E)

FONT = "B Nazanin"
FONT_FALLBACK = "Tahoma"

SW, SH = Inches(13.333), Inches(7.5)


def _set_rtl(paragraph):
    """فعال‌سازی راست‌به‌چپ برای پاراگراف"""
    pPr = paragraph._pPr
    if pPr is None:
        pPr = paragraph._p.get_or_add_pPr()
    pPr.set('rtl', '1')


def _style_run(run, size=14, bold=False, color=DARK, font=FONT):
    run.font.name = font
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    # فونت فارسی (cs)
    rPr = run._r.get_or_add_rPr()
    for tag in ('a:latin', 'a:cs', 'a:ea'):
        el = rPr.find(qn(tag))
        if el is None:
            el = rPr.makeelement(qn(tag), {})
            rPr.append(el)
        el.set('typeface', font)


def add_textbox(slide, left, top, width, height, text, size=14, bold=False,
                color=DARK, align=PP_ALIGN.RIGHT, line_spacing=1.15):
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    lines = str(text or "").split("\n")
    for i, line in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.text = line
        p.alignment = align
        p.line_spacing = line_spacing
        _set_rtl(p)
        for run in p.runs:
            _style_run(run, size=size, bold=bold, color=color)
    return txBox


def add_shape_text(slide, shape_type, left, top, width, height, text,
                   fill=BLUE, font_color=WHITE, size=14, bold=True):
    shp = slide.shapes.add_shape(shape_type, left, top, width, height)
    shp.fill.solid()
    shp.fill.fore_color.rgb = fill
    shp.line.fill.background()
    tf = shp.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.text = str(text or "")
    p.alignment = PP_ALIGN.CENTER
    _set_rtl(p)
    for run in p.runs:
        _style_run(run, size=size, bold=bold, color=font_color)
    return shp


def header(slide, phase, title, footer_text=""):
    # نوار بالایی
    bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, SW, Inches(0.95))
    bar.fill.solid()
    bar.fill.fore_color.rgb = BLUE
    bar.line.fill.background()
    add_textbox(slide, Inches(0.3), Inches(0.12), Inches(9.5), Inches(0.7),
                title, size=22, bold=True, color=WHITE, align=PP_ALIGN.RIGHT)
    if phase:
        add_shape_text(slide, MSO_SHAPE.ROUNDED_RECTANGLE,
                       Inches(10.6), Inches(0.18), Inches(2.4), Inches(0.6),
                       phase, fill=YELLOW, font_color=NAVY, size=13)
    # خط زرد زیر نوار
    line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, Inches(0.95), SW, Inches(0.06))
    line.fill.solid()
    line.fill.fore_color.rgb = YELLOW
    line.line.fill.background()
    # فوتر
    add_textbox(slide, Inches(0.3), Inches(7.05), Inches(6), Inches(0.35),
                footer_text, size=10, color=GREY, align=PP_ALIGN.LEFT)
    add_textbox(slide, Inches(10.8), Inches(7.05), Inches(2.2), Inches(0.35),
                "Quality Report", size=10, color=GREY, align=PP_ALIGN.RIGHT)


def set_cell(cell, text, size=11, bold=False, color=DARK, fill=None,
             align=PP_ALIGN.CENTER):
    cell.vertical_anchor = MSO_ANCHOR.MIDDLE
    cell.margin_left = Inches(0.06)
    cell.margin_right = Inches(0.06)
    cell.margin_top = Inches(0.02)
    cell.margin_bottom = Inches(0.02)
    if fill is not None:
        cell.fill.solid()
        cell.fill.fore_color.rgb = fill
    tf = cell.text_frame
    tf.word_wrap = True
    tf.text = str(text if text is not None else "")
    for p in tf.paragraphs:
        p.alignment = align
        _set_rtl(p)
        for run in p.runs:
            _style_run(run, size=size, bold=bold, color=color)


def add_table(slide, left, top, width, headers, rows, col_widths=None,
              header_fill=BLUE, font_size=11, row_height=Inches(0.38)):
    ncols = len(headers)
    nrows = 1 + len(rows)
    height = row_height * nrows
    shape = slide.shapes.add_table(nrows, ncols, left, top, width, height)
    table = shape.table
    if col_widths:
        total = sum(col_widths)
        for i, w in enumerate(col_widths):
            table.columns[i].width = int(width * w / total)
    for j, h in enumerate(headers):
        set_cell(table.cell(0, j), h, size=font_size + 1, bold=True,
                 color=WHITE, fill=header_fill)
    for i, row in enumerate(rows, start=1):
        fill = WHITE if i % 2 == 1 else LIGHT2
        for j in range(ncols):
            val = row[j] if j < len(row) else ""
            set_cell(table.cell(i, j), val, size=font_size, fill=fill)
    return shape


def add_image_fit(slide, img_path, left, top, width, height):
    """افزودن عکس با حفظ نسبت ابعاد داخل کادر (برش از مرکز)"""
    if not img_path or not os.path.exists(img_path):
        ph = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        ph.fill.solid()
        ph.fill.fore_color.rgb = LIGHT2
        ph.line.color.rgb = GREY
        tf = ph.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = "محل عکس — در نرم‌افزار جایگزین کنید"
        p.alignment = PP_ALIGN.CENTER
        _set_rtl(p)
        for run in p.runs:
            _style_run(run, size=12, color=GREY)
        return ph
    from PIL import Image
    try:
        im = Image.open(img_path)
        iw, ih = im.size
    except Exception:
        return slide.shapes.add_picture(img_path, left, top, width=width, height=height)
    box_ratio = width / height
    img_ratio = iw / ih
    if img_ratio > box_ratio:
        # تصویر پهن‌تر است: ارتفاع کامل، عرض برش
        new_h = height
        new_w = int(height * img_ratio)
        pic = slide.shapes.add_picture(img_path, left, top, width=new_w, height=new_h)
        # برش افقی از مرکز
        crop = (new_w - width) / 2 / new_w
        pic.crop_left = crop
        pic.crop_right = crop
    else:
        new_w = width
        new_h = int(width / img_ratio)
        pic = slide.shapes.add_picture(img_path, left, top, width=new_w, height=new_h)
        crop = (new_h - height) / 2 / new_h
        pic.crop_top = crop
        pic.crop_bottom = crop
    pic.left = left
    pic.top = top
    return pic


def add_chart(slide, left, top, width, height, chart_type, categories, series_list,
              title=None, y_title=None):
    """series_list: [(نام سری, [مقادیر])]"""
    cd = ChartData()
    cd.categories = categories
    for name, vals in series_list:
        cd.add_series(name, vals)
    gframe = slide.shapes.add_chart(chart_type, left, top, width, height, cd)
    chart = gframe.chart
    chart.has_legend = True
    chart.legend.position = XL_LEGEND_POSITION.BOTTOM
    chart.legend.include_in_layout = False
    if title:
        chart.has_title = True
        chart.chart_title.text_frame.text = title
    if y_title:
        try:
            chart.value_axis.has_title = True
            chart.value_axis.axis_title.text_frame.text = y_title
        except Exception:
            pass
    return gframe


def save_dataurl(dataurl, tmpdir, name):
    if not dataurl or not isinstance(dataurl, str) or "," not in dataurl:
        return None
    try:
        b64 = dataurl.split(",", 1)[1]
        raw = base64.b64decode(b64)
        ext = ".jpg"
        if dataurl.startswith("data:image/png"):
            ext = ".png"
        path = os.path.join(tmpdir, name + ext)
        with open(path, "wb") as f:
            f.write(raw)
        return path
    except Exception:
        return None


def num(v, default=0):
    try:
        if v is None or v == "":
            return default
        return float(str(v).replace(",", "").replace("٬", "").strip())
    except Exception:
        return default


def build_pptx(report, photos, output_path, only_filled=False):
    """report: dict اطلاعات گزارش | photos: dict کلید->dataURL یا لیست"""
    prs = Presentation()
    prs.slide_width = SW
    prs.slide_height = SH
    blank = prs.slide_layouts[6]

    footer = report.get("footer", "Quality Report")
    tmpdir = tempfile.mkdtemp(prefix="pptx_")

    def P(key, name):
        v = photos.get(key) if isinstance(photos, dict) else None
        return save_dataurl(v, tmpdir, name) if v else None

    def PL(key, name):
        v = photos.get(key) if isinstance(photos, dict) else None
        if isinstance(v, list):
            return [save_dataurl(x, tmpdir, f"{name}_{i}") for i, x in enumerate(v)]
        return []

    # ============ ۱. جلد ============
    s = prs.slides.add_slide(blank)
    bg = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, SW, SH)
    bg.fill.solid(); bg.fill.fore_color.rgb = NAVY; bg.line.fill.background()
    band = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, Inches(2.6), SW, Inches(2.3))
    band.fill.solid(); band.fill.fore_color.rgb = BLUE; band.line.fill.background()
    add_textbox(s, Inches(0.8), Inches(2.85), Inches(11.7), Inches(1.0),
                report.get("title", "گزارش بهبود فرآیند"), size=30, bold=True,
                color=WHITE, align=PP_ALIGN.CENTER)
    add_textbox(s, Inches(0.8), Inches(3.85), Inches(11.7), Inches(0.8),
                report.get("subtitle", ""), size=20, color=YELLOW, align=PP_ALIGN.CENTER)
    add_textbox(s, Inches(0.8), Inches(5.3), Inches(11.7), Inches(0.6),
                f"تاریخ گزارش: {report.get('date', '')}   |   {report.get('company', '')}",
                size=14, color=WHITE, align=PP_ALIGN.CENTER)
    add_textbox(s, Inches(0.8), Inches(6.6), Inches(11.7), Inches(0.5),
                footer, size=11, color=LIGHT, align=PP_ALIGN.CENTER)

    if not only_filled or report.get("team"):
        # ============ ۲. اعضای تیم ============
        s = prs.slides.add_slide(blank)
        header(s, "", "اعضای تیم", footer)
        team = report.get("team", [])
        rows = [[t.get("name", ""), t.get("role", "")] for t in team] or [["—", "—"]]
        add_table(s, Inches(2.2), Inches(1.6), Inches(8.9), ["نام و نام خانوادگی", "سمت / نقش"],
                  rows, col_widths=[2, 1], font_size=13, row_height=Inches(0.5))
        if report.get("team_note"):
            add_textbox(s, Inches(1.2), Inches(5.6), Inches(10.9), Inches(1.2),
                        report["team_note"], size=13)

    if not only_filled or report.get("product_desc") or photos.get("product"):
        # ============ ۳. معرفی محصول ============
        s = prs.slides.add_slide(blank)
        header(s, "آشنایی با سیستم", "معرفی محصول", footer)
        add_textbox(s, Inches(6.6), Inches(1.4), Inches(6.2), Inches(5.2),
                    report.get("product_desc", "«متن معرفی محصول را در نرم‌افزار وارد کنید»"),
                    size=14)
        add_image_fit(s, P("product", "product"), Inches(0.4), Inches(1.4),
                      Inches(5.9), Inches(5.2))

    if not only_filled or report.get("machine_desc") or photos.get("machine"):
        # ============ ۴. معرفی دستگاه/فرآیند ============
        s = prs.slides.add_slide(blank)
        header(s, "", "آشنایی با دستگاه / فرآیند", footer)
        add_textbox(s, Inches(6.6), Inches(1.4), Inches(6.2), Inches(5.2),
                    report.get("machine_desc", "«توضیح فرآیند و دستگاه را وارد کنید»"),
                    size=14)
        add_image_fit(s, P("machine", "machine"), Inches(0.4), Inches(1.4),
                      Inches(5.9), Inches(5.2))

    # ============ ۵. عکس دستگاه + تاریخ راه‌اندازی ============
    if P("machine2", "machine2") or report.get("machine_launch"):
        s = prs.slides.add_slide(blank)
        header(s, "", report.get("machine_name", "دستگاه / فرآیند"), footer)
        add_image_fit(s, P("machine2", "machine2"), Inches(0.8), Inches(1.3),
                      Inches(11.7), Inches(4.6))
        if report.get("machine_launch"):
            add_shape_text(s, MSO_SHAPE.ROUNDED_RECTANGLE, Inches(2.2), Inches(6.1),
                           Inches(8.9), Inches(0.7), report["machine_launch"],
                           fill=YELLOW, font_color=NAVY, size=14)

    if not only_filled or report.get("parts"):
        # ============ ۶. معرفی قطعه - سازنده ============
        s = prs.slides.add_slide(blank)
        header(s, "", "معرفی قطعه - سازنده", footer)
        parts = report.get("parts", [])
        rows = [[p.get("desc", ""), p.get("tech_no", ""), p.get("maker_code", ""),
                 p.get("score", "")] for p in parts] or [["—", "—", "—", "—"]]
        add_table(s, Inches(0.7), Inches(1.5), Inches(11.9),
                  ["شرح", "شماره فنی", "کد سازنده", "نمره عملکرد"], rows,
                  col_widths=[3, 1.4, 1.2, 1.2], font_size=12)

    if not only_filled or report.get("phase1_defects"):
        # ============ ۷. فاز ۱ انتخاب موضوع ============
        s = prs.slides.add_slide(blank)
        header(s, "فاز ۱", "انتخاب موضوع", footer)
        add_textbox(s, Inches(0.6), Inches(1.3), Inches(12.1), Inches(0.6),
                    "شرح ایرادات رویت‌شده مربوط به شکست‌های خارجی و داخلی:",
                    size=16, bold=True, color=NAVY)
        defects = report.get("phase1_defects", [])
        txt = "\n".join([f"{i+1}- {d}" for i, d in enumerate(defects)]) or \
            "«ایرادات اصلی را وارد کنید»"
        add_shape_text(s, MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.6), Inches(2.1),
                       Inches(12.1), Inches(4.4), txt, fill=LIGHT2, font_color=DARK,
                       size=14)

    if not only_filled or report.get("quality_warnings"):
        # ============ ۸. فاز ۲ اخطارهای کیفی ============
        s = prs.slides.add_slide(blank)
        header(s, "فاز ۲", "توجیه دلایل انتخاب — بررسی اخطارهای کیفی", footer)
        warns = report.get("quality_warnings", [])
        rows = [[w.get("date", ""), w.get("no", ""), w.get("defect", ""),
                 w.get("cause", "")] for w in warns] or [["—", "—", "—", "—"]]
        add_table(s, Inches(0.4), Inches(1.5), Inches(12.5),
                  ["تاریخ", "شماره اخطار کیفی", "ایراد", "علت ایجاد ایراد"], rows,
                  col_widths=[1.1, 1.3, 2.6, 3.2], font_size=11)
        if report.get("warnings_summary"):
            add_shape_text(s, MSO_SHAPE.ROUNDED_RECTANGLE, Inches(3.2), Inches(6.3),
                           Inches(6.9), Inches(0.6), report["warnings_summary"],
                           fill=YELLOW, font_color=NAVY, size=13)

    if not only_filled or report.get("supplier_status"):
        # ============ ۹. فاز ۳ وضعیت سازنده ============
        s = prs.slides.add_slide(blank)
        header(s, "فاز ۳", "درک وضعیت جاری — وضعیت سازنده", footer)
        sup = report.get("supplier_status", [])
        rows = [[r.get("item", ""), r.get("value", "")] for r in sup] or [["—", "—"]]
        add_table(s, Inches(1.6), Inches(1.5), Inches(10.1),
                  ["شرح", "وضعیت"], rows, col_widths=[2.2, 3], font_size=12,
                  row_height=Inches(0.45))

    if not only_filled or (report.get("defect_compare") or {}).get("types"):
        # ============ ۱۰. فاز ۳ مقایسه ایرادات قبل/بعد + نمودار ============
        s = prs.slides.add_slide(blank)
        header(s, "فاز ۳", "درک وضعیت جاری — مقایسه ایرادات", footer)
        comp = report.get("defect_compare", {})
        dtypes = comp.get("types", []) or ["اتصال کوتاه", "حفره", "گلوله قلع"]
        before = comp.get("before", {}) or {}
        after = comp.get("after", {}) or {}
        rows = []
        for t in dtypes:
            rows.append([t, before.get(t, ""), after.get(t, "")])
        rows.append(["جمع ایرادات", comp.get("before_total", ""), comp.get("after_total", "")])
        rows.append(["PPM", comp.get("before_ppm", ""), comp.get("after_ppm", "")])
        add_table(s, Inches(7.3), Inches(1.4), Inches(5.5),
                  ["نوع ایراد", comp.get("before_label", "قبل"), comp.get("after_label", "بعد")],
                  rows, col_widths=[2, 1, 1], font_size=11)
        add_chart(s, Inches(0.3), Inches(1.4), Inches(6.7), Inches(5.3),
                  XL_CHART_TYPE.COLUMN_CLUSTERED, dtypes,
                  [(comp.get("before_label", "قبل"), [num(before.get(t)) for t in dtypes]),
                   (comp.get("after_label", "بعد"), [num(after.get(t)) for t in dtypes])],
                  title="مقایسه تعداد ایرادات")

    if not only_filled or report.get("capability"):
        # ============ ۱۱. فاز ۳ قابلیت فرآیند ============
        s = prs.slides.add_slide(blank)
        header(s, "فاز ۳", "درک وضعیت جاری — قابلیت فرآیند", footer)
        cap = report.get("capability", [])
        rows = [[c.get("status", ""), c.get("date", ""), c.get("index", "")] for c in cap] or \
            [["—", "—", "—"]]
        add_table(s, Inches(3.4), Inches(1.4), Inches(6.5),
                  ["وضعیت", "تاریخ", "شاخص توانمندی (Cp/Cpk)"], rows,
                  col_widths=[1.6, 1.2, 1.8], font_size=11)
        if len(cap) >= 2:
            add_chart(s, Inches(0.3), Inches(1.4), Inches(2.9), Inches(5.3),
                      XL_CHART_TYPE.LINE, [c.get("date", "") for c in cap],
                      [("شاخص توانمندی", [num(c.get("index")) for c in cap])],
                      title="روند شاخص توانمندی")

    # ============ ۱۲. فاز ۳ عکس عیوب ============
    defect_imgs = PL("defects", "defect")
    if defect_imgs:
        s = prs.slides.add_slide(blank)
        header(s, "فاز ۳", "درک وضعیت جاری — نمونه عیوب", footer)
        for i, p in enumerate(defect_imgs[:6]):
            col, row = i % 3, i // 3
            add_image_fit(s, p, Inches(0.4 + col * 4.3), Inches(1.3 + row * 2.9),
                          Inches(4.0), Inches(2.6))

    # ============ ۱۳/۱۴. فاز ۳ هزینه‌ها ============
    for key, title in [("cost_before", "هزینه‌های فرآیند — قبل"),
                       ("cost_after", "هزینه‌های فرآیند — بعد")]:
        c = report.get(key, {}) or {}
        items = c.get("items", [])
        if not items and not c.get("summary"):
            continue
        s = prs.slides.add_slide(blank)
        header(s, "فاز ۳", f"درک وضعیت جاری — {title}", footer)
        rows = [[it.get("cost", ""), it.get("calc", ""), it.get("process", ""),
                 it.get("station", "")] for it in items]
        if rows:
            add_table(s, Inches(0.5), Inches(1.5), Inches(12.3),
                      ["هزینه", "نحوه محاسبه", "فرآیند", "ایستگاه تولیدی"], rows,
                      col_widths=[1.6, 2.6, 2.2, 1.4], font_size=11)
        if c.get("summary"):
            add_shape_text(s, MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(5.9),
                           Inches(11.7), Inches(0.9), c["summary"],
                           fill=LIGHT2, font_color=DARK, size=12)

    # ============ ۱۵. فاز ۳ روند PPM ============
    ppm = report.get("ppm_trend", [])
    if ppm:
        s = prs.slides.add_slide(blank)
        header(s, "فاز ۳", "درک وضعیت جاری — روند PPM", footer)
        rows = [[p.get("date", ""), p.get("count", ""), p.get("defects", ""),
                 p.get("ppm", "")] for p in ppm]
        add_table(s, Inches(8.0), Inches(1.4), Inches(4.9),
                  ["تاریخ", "تعداد پایش‌شده", "جمع ایرادات", "PPM"], rows,
                  col_widths=[1.2, 1.2, 1.2, 1.2], font_size=10)
        cats = [p.get("date", "") for p in ppm]
        series = [("PPM", [num(p.get("ppm")) for p in ppm])]
        if report.get("ppm_target"):
            series.append(("هدف", [num(report["ppm_target"])] * len(cats)))
        if report.get("ppm_limit"):
            series.append(("حد قابل قبول", [num(report["ppm_limit"])] * len(cats)))
        add_chart(s, Inches(0.3), Inches(1.4), Inches(7.4), Inches(5.3),
                  XL_CHART_TYPE.LINE, cats, series, title="روند PPM")

    # ============ ۱۶. فاز ۳ مقایسه تامین‌کننده‌ها ============
    sc = report.get("supplier_compare", [])
    if sc:
        s = prs.slides.add_slide(blank)
        header(s, "فاز ۳", "درک وضعیت جاری — مقایسه تامین‌کننده‌ها / طراحی‌ها", footer)
        rows = [[r.get("product", ""), r.get("monitored", ""), r.get("defects", ""),
                 r.get("ppm", "")] for r in sc]
        add_table(s, Inches(7.6), Inches(1.4), Inches(5.4),
                  ["محصول", "تعداد پایش‌شده", "جمع ایراد", "PPM"], rows,
                  col_widths=[2.4, 1.2, 1.1, 1.1], font_size=10)
        add_chart(s, Inches(0.3), Inches(1.4), Inches(7.0), Inches(5.3),
                  XL_CHART_TYPE.COLUMN_CLUSTERED,
                  [r.get("product", "") for r in sc],
                  [("جمع ایراد", [num(r.get("defects")) for r in sc])],
                  title="مقایسه جمع ایرادات")

    if not only_filled or report.get("goals") or report.get("goal_steps"):
        # ============ ۱۷. فاز ۴ اهداف ============
        s = prs.slides.add_slide(blank)
        header(s, "فاز ۴", "انتخاب هدف", footer)
        add_textbox(s, Inches(0.6), Inches(1.3), Inches(12.1), Inches(0.6),
                    "اهداف کمی:", size=16, bold=True, color=NAVY)
        goals = report.get("goals", [])
        txt = "\n".join([f"• {g}" for g in goals]) or "«اهداف را وارد کنید»"
        add_shape_text(s, MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.6), Inches(2.0),
                       Inches(12.1), Inches(1.9), txt, fill=LIGHT2, font_color=DARK, size=14)
        add_textbox(s, Inches(0.6), Inches(4.2), Inches(12.1), Inches(0.6),
                    "گام‌های اصلی رفع ایراد:", size=16, bold=True, color=NAVY)
        steps = report.get("goal_steps", [])
        txt2 = "\n".join([f"{i+1}- {st}" for i, st in enumerate(steps)]) or "«گام‌ها را وارد کنید»"
        add_shape_text(s, MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.6), Inches(4.9),
                       Inches(12.1), Inches(1.9), txt2, fill=LIGHT2, font_color=DARK, size=13)

    # ============ ۱۸. فاز ۵ پارتو ============
    pareto = report.get("pareto", [])
    if pareto:
        s = prs.slides.add_slide(blank)
        header(s, "فاز ۵", "تجزیه و تحلیل — نمودار پارتو (تمرکز نقص)", footer)
        rows = [[p.get("defect", ""), p.get("count", ""), p.get("percent", "")]
                for p in pareto]
        add_table(s, Inches(8.2), Inches(1.4), Inches(4.8),
                  ["نوع عیب", "تعداد", "درصد تجمعی"], rows,
                  col_widths=[1.8, 1.1, 1.2], font_size=11)
        add_chart(s, Inches(0.3), Inches(1.4), Inches(7.6), Inches(5.3),
                  XL_CHART_TYPE.COLUMN_CLUSTERED,
                  [p.get("defect", "") for p in pareto],
                  [("تعداد", [num(p.get("count")) for p in pareto])],
                  title="پارتو عیوب")

    if not only_filled or ((report.get("fishbone") or {}).get("effect") or report.get("problem_statement") or any((report.get("fishbone") or {}).get(k) for k in ("man", "environment", "measurement", "machine", "material", "method"))):
        # ============ ۱۹. فاز ۵ ایشیکاوا ============
        fish = report.get("fishbone", {}) or {}
        s = prs.slides.add_slide(blank)
        header(s, "فاز ۵", "تجزیه و تحلیل — نمودار علت و معلول (ایشیکاوا)", footer)
        effect = fish.get("effect", "") or report.get("problem_statement", "شرح ایراد")
        add_shape_text(s, MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.4), Inches(3.1),
                       Inches(2.6), Inches(1.1), effect, fill=RED, font_color=WHITE, size=12)
        # خط اصلی (ستون فقرات)
        spine = s.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, Inches(3.0), Inches(3.65),
                                       Inches(12.9), Inches(3.65))
        spine.line.color.rgb = NAVY
        spine.line.width = Pt(2.5)
        cats = [("نیروی انسانی", fish.get("man", [])),
                ("محیط", fish.get("environment", [])),
                ("اندازه‌گیری", fish.get("measurement", [])),
                ("تجهیزات", fish.get("machine", [])),
                ("مواد", fish.get("material", [])),
                ("روش", fish.get("method", []))]
        for idx, (cat, causes) in enumerate(cats):
            top_row = idx < 3
            x = Inches(4.2 + (idx % 3) * 2.9)
            y_branch = Inches(1.6) if top_row else Inches(5.7)
            # خط شاخه
            conn = s.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, x, Inches(3.65),
                                          x + Inches(0.9), y_branch + (Inches(0.35) if top_row else Inches(-0.35)))
            conn.line.color.rgb = BLUE
            conn.line.width = Pt(1.75)
            # باکس دسته
            add_shape_text(s, MSO_SHAPE.ROUNDED_RECTANGLE, x + Inches(0.55),
                           y_branch - (Inches(0.0) if top_row else Inches(0.0)),
                           Inches(1.9), Inches(0.45), cat, fill=BLUE, font_color=WHITE, size=11)
            cause_txt = "\n".join([f"• {c}" for c in (causes or [])]) or "—"
            ty = y_branch + Inches(0.5) if top_row else y_branch - Inches(1.15)
            add_textbox(s, x + Inches(0.3), ty, Inches(2.4), Inches(1.1),
                        cause_txt, size=10)

    # ============ ۲۰. فاز ۵ بررسی علل ============
    causes = report.get("cause_checks", [])
    if causes:
        # تقسیم به دو اسلاید در صورت نیاز
        chunks = [causes[i:i+8] for i in range(0, len(causes), 8)]
        for ci, chunk in enumerate(chunks):
            s = prs.slides.add_slide(blank)
            header(s, "فاز ۵", "تجزیه و تحلیل — بررسی علل", footer)
            rows = [[c.get("factor", ""), c.get("check", ""), c.get("result", "")]
                    for c in chunk]
            add_table(s, Inches(0.4), Inches(1.4), Inches(12.5),
                      ["عامل اعلام‌شده", "شرح بررسی انجام‌شده", "نتیجه"], rows,
                      col_widths=[2.2, 5.5, 1.8], font_size=10)

    # ============ ۲۱. فاز ۶ اقدامات قبلی ============
    prev = report.get("prev_actions", [])
    if prev:
        s = prs.slides.add_slide(blank)
        header(s, "فاز ۶", "اجرای اقدام اصلاحی — اقدامات تعریف‌شده قبلی", footer)
        rows = [[a.get("action", ""), a.get("owner", ""), a.get("date", ""),
                 a.get("status", ""), a.get("effect", "")] for a in prev]
        add_table(s, Inches(0.3), Inches(1.4), Inches(12.7),
                  ["اقدام تعریف‌شده قبلی", "مسئول انجام اقدام", "تاریخ انجام",
                   "وضعیت", "اثربخشی"], rows,
                  col_widths=[4.2, 1.6, 1.3, 1.1, 1.6], font_size=10)

    # ============ ۲۲. فاز ۶ اقدامات جدید ============
    newa = report.get("new_actions", [])
    if newa:
        s = prs.slides.add_slide(blank)
        header(s, "فاز ۶", "اجرای اقدام اصلاحی — اقدامات تعریف‌شده جدید", footer)
        rows = [[a.get("action", ""), a.get("owner", ""), a.get("date", ""),
                 a.get("status", "")] for a in newa]
        add_table(s, Inches(0.5), Inches(1.4), Inches(12.3),
                  ["اقدامات تعریف‌شده جدید", "مسئول انجام اقدام", "تاریخ انجام", "وضعیت"],
                  rows, col_widths=[5.5, 1.8, 1.5, 1.3], font_size=11)

    # ============ ۲۳. فاز ۶ کارت‌های اقدام با عکس قبل/بعد ============
    cards = report.get("action_cards", [])
    if cards:
        # هر اسلاید ۲ کارت
        for ci in range(0, len(cards), 2):
            s = prs.slides.add_slide(blank)
            header(s, "فاز ۶", "اجرای اقدام اصلاحی — مستندات تصویری", footer)
            for k, card in enumerate(cards[ci:ci + 2]):
                y0 = Inches(1.3 + k * 2.95)
                add_textbox(s, Inches(0.4), y0, Inches(12.5), Inches(0.45),
                            card.get("title", ""), size=15, bold=True, color=NAVY)
                if card.get("desc"):
                    add_textbox(s, Inches(0.4), y0 + Inches(0.42), Inches(12.5),
                                Inches(0.55), card["desc"], size=11)
                before = save_dataurl(card.get("before", ""), tmpdir, f"card{ci+k}_b")
                after = save_dataurl(card.get("after", ""), tmpdir, f"card{ci+k}_a")
                add_image_fit(s, before, Inches(7.0), y0 + Inches(0.95),
                              Inches(5.8), Inches(1.85))
                add_image_fit(s, after, Inches(0.4), y0 + Inches(0.95),
                              Inches(5.8), Inches(1.85))
                add_textbox(s, Inches(7.0), y0 + Inches(0.95), Inches(5.8), Inches(0.3),
                            "قبل", size=10, bold=True, color=RED, align=PP_ALIGN.CENTER)
                add_textbox(s, Inches(0.4), y0 + Inches(0.95), Inches(5.8), Inches(0.3),
                            "بعد", size=10, bold=True, color=GREEN, align=PP_ALIGN.CENTER)

    if not only_filled or ((report.get("effectiveness") or {}).get("text") or (report.get("effectiveness") or {}).get("data")):
        # ============ ۲۴. فاز ۷ تایید تاثیرات ============
        eff = report.get("effectiveness", {}) or {}
        s = prs.slides.add_slide(blank)
        header(s, "فاز ۷", "تایید تاثیرات", footer)
        if eff.get("text"):
            add_textbox(s, Inches(0.6), Inches(1.3), Inches(12.1), Inches(1.1),
                        eff["text"], size=13)
        data = eff.get("data", [])
        if data:
            cats = [d.get("date", "") for d in data]
            series = [("PPM", [num(d.get("ppm")) for d in data])]
            if eff.get("target"):
                series.append(("هدف", [num(eff["target"])] * len(cats)))
            add_chart(s, Inches(0.6), Inches(2.5), Inches(12.1), Inches(4.3),
                      XL_CHART_TYPE.LINE, cats, series, title="PPM پس از اصلاحات")

    # ============ ۲۵. فاز ۸ استانداردسازی ============
    std = report.get("standardization", [])
    if std:
        s = prs.slides.add_slide(blank)
        header(s, "فاز ۸", "استانداردسازی — بازنگری سیستم‌ها / مدارک موثر", footer)
        rows = [[r.get("doc", ""), r.get("owner", ""), r.get("start", ""),
                 r.get("end", "")] for r in std]
        add_table(s, Inches(0.4), Inches(1.4), Inches(12.5),
                  ["مدرک", "مسئول", "شروع", "پایان"], rows,
                  col_widths=[5.5, 1.8, 1.5, 1.5], font_size=11)

    if not only_filled or report.get("summary") or report.get("future_actions"):
        # ============ ۲۶. فاز ۹ خلاصه و اقدامات آینده ============
        s = prs.slides.add_slide(blank)
        header(s, "فاز ۹", "خلاصه‌سازی و برنامه‌ریزی اقدامات آینده", footer)
        add_textbox(s, Inches(0.6), Inches(1.3), Inches(12.1), Inches(0.5),
                    "خلاصه اقدامات:", size=16, bold=True, color=NAVY)
        add_shape_text(s, MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.6), Inches(1.9),
                       Inches(12.1), Inches(2.0),
                       report.get("summary", "«خلاصه اقدامات را وارد کنید»"),
                       fill=LIGHT2, font_color=DARK, size=12)
        add_textbox(s, Inches(0.6), Inches(4.1), Inches(12.1), Inches(0.5),
                    "اقدامات ثانویه / آینده:", size=16, bold=True, color=NAVY)
        add_shape_text(s, MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.6), Inches(4.7),
                       Inches(12.1), Inches(2.0),
                       report.get("future_actions", "«اقدامات آینده را وارد کنید»"),
                       fill=LIGHT2, font_color=DARK, size=12)

    # ============ ۲۷. تحقیق اینترنتی و بهینه‌کاوی ============
    res = report.get("research", {}) or {}
    if res.get("findings") or res.get("sources"):
        s = prs.slides.add_slide(blank)
        header(s, "تحقیق", "تحقیق اینترنتی و بهینه‌کاوی", footer)
        add_textbox(s, Inches(0.6), Inches(1.3), Inches(12.1), Inches(0.5),
                    "یافته‌های کلیدی:", size=16, bold=True, color=NAVY)
        add_shape_text(s, MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.6), Inches(1.9),
                       Inches(12.1), Inches(2.6),
                       res.get("findings", ""), fill=LIGHT2, font_color=DARK, size=11)
        add_textbox(s, Inches(0.6), Inches(4.7), Inches(12.1), Inches(0.5),
                    "منابع:", size=16, bold=True, color=NAVY)
        src_txt = "\n".join(res.get("sources", [])) or "—"
        add_shape_text(s, MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.6), Inches(5.3),
                       Inches(12.1), Inches(1.5), src_txt,
                       fill=LIGHT2, font_color=DARK, size=10)

    # ============ ۲۸. سپاس ============
    s = prs.slides.add_slide(blank)
    bg = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, SW, SH)
    bg.fill.solid(); bg.fill.fore_color.rgb = NAVY; bg.line.fill.background()
    add_textbox(s, Inches(1), Inches(3.0), Inches(11.3), Inches(1.2),
                "با سپاس از توجه شما", size=36, bold=True, color=WHITE,
                align=PP_ALIGN.CENTER)
    add_textbox(s, Inches(1), Inches(4.3), Inches(11.3), Inches(0.6),
                footer, size=14, color=YELLOW, align=PP_ALIGN.CENTER)

    prs.save(output_path)
    return output_path
