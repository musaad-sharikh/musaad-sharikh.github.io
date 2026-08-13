#!/usr/bin/env python3
"""Generate the published CV PDFs (English and Arabic).

Derived from the vault's build_cv_en.py / build_cv_ar.py — same page geometry,
same styles, same content — with exactly one deliberate difference in each
contact line: the phone number and the separator that followed it are dropped.
These are the files linked from the site's download action, so the private
number must never enter the text layer in the first place; re-rendering from
source is the only way to guarantee that (stripping it from an existing PDF
would leave it recoverable in the content stream).
"""
import os
import re
from pathlib import Path

import arabic_reshaper
from bidi.algorithm import get_display
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_RIGHT, TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, ListFlowable, ListItem,
)
from reportlab.lib.styles import ParagraphStyle

ROOT = Path(__file__).resolve().parent.parent
CV_DIR = ROOT / "assets" / "cv"

INK = HexColor("#1a1a1a")
GRAY = HexColor("#555555")
LINE = HexColor("#cccccc")

EN_OUT = CV_DIR / "Musaad-Muhammad-CV-EN.pdf"
AR_OUT = CV_DIR / "Musaad-Muhammad-CV-AR.pdf"

# The contact lines, kept as named variables so the self-check at the bottom
# of this script can inspect the exact strings that get rendered.
EN_CONTACT = (
    '<a href="mailto:musaad.sharikh@gmail.com" color="#555555">musaad.sharikh@gmail.com</a> '
    '&nbsp;·&nbsp; '
    '<a href="https://linkedin.com/in/musaad-muhammad" color="#555555"><u>LinkedIn</u></a> '
    '&nbsp;·&nbsp; '
    '<a href="https://github.com/musaad-sharikh" color="#555555"><u>GitHub</u></a>'
)

AR_CONTACT = (
    '<a href="https://github.com/musaad-sharikh" color="#555555"><u>GitHub</u></a> '
    '&nbsp;·&nbsp; '
    '<a href="https://linkedin.com/in/musaad-muhammad" color="#555555"><u>LinkedIn</u></a> '
    '&nbsp;·&nbsp; '
    '<a href="mailto:musaad.sharikh@gmail.com" color="#555555">musaad.sharikh@gmail.com</a>'
)


def build_en():
    """Generate the English CV PDF (Design Engineer positioning)."""
    doc = SimpleDocTemplate(
        str(EN_OUT), pagesize=A4,
        leftMargin=18 * mm, rightMargin=18 * mm,
        topMargin=15 * mm, bottomMargin=14 * mm,
        title="Musaad Muhammad — Design Engineer", author="Musaad Muhammad",
    )

    name_s = ParagraphStyle("name", fontName="Helvetica-Bold", fontSize=24,
                             textColor=INK, leading=27, spaceAfter=2)
    title_s = ParagraphStyle("title", fontName="Helvetica", fontSize=12.5,
                              textColor=GRAY, leading=15, spaceAfter=4)
    contact_s = ParagraphStyle("contact", fontName="Helvetica", fontSize=9,
                                textColor=GRAY, leading=13)
    sec_s = ParagraphStyle("sec", fontName="Helvetica-Bold", fontSize=10,
                            textColor=INK, leading=12, spaceBefore=10, spaceAfter=3,
                            tracking=1)
    body_s = ParagraphStyle("body", fontName="Helvetica", fontSize=9.7,
                             textColor=INK, leading=13.5)
    bullet_s = ParagraphStyle("bullet", parent=body_s, leftIndent=10, spaceAfter=1.5)
    role_s = ParagraphStyle("role", fontName="Helvetica-Bold", fontSize=10.5,
                             textColor=INK, leading=13)
    date_s = ParagraphStyle("date", fontName="Helvetica", fontSize=9.5,
                             textColor=GRAY, leading=13, alignment=TA_RIGHT)

    def section(title):
        return [Paragraph(title.upper(), sec_s),
                HRFlowable(width="100%", thickness=0.7, color=LINE,
                           spaceBefore=1, spaceAfter=5)]

    def role_line(role, date):
        t = Table([[Paragraph(role, role_s), Paragraph(date, date_s)]],
                  colWidths=[120 * mm, 54 * mm])
        t.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
        ]))
        return t

    def bullets(items):
        return ListFlowable(
            [ListItem(Paragraph(x, bullet_s), value="•", leftIndent=12)
             for x in items],
            bulletType="bullet", bulletColor=GRAY, bulletFontSize=8,
            leftIndent=10, spaceBefore=1, spaceAfter=2,
        )

    s = []
    s.append(Paragraph("Musaad Muhammad", name_s))
    s.append(Paragraph("Design Engineer &nbsp;·&nbsp; Front-End &amp; UI", title_s))
    s.append(Paragraph(EN_CONTACT, contact_s))

    s += section("Summary")
    s.append(Paragraph(
        "I'm a UI designer who learned to build what I design. After seven years designing web "
        "interfaces, I now write the front-end too — HTML, CSS, and JavaScript — so I can take a "
        "screen from a Figma file all the way to a working page. I'm most useful where design and "
        "front-end meet: component libraries, prototypes, and clean hand-offs.", body_s))

    s += section("Experience")
    s.append(role_line("UX/UI Designer — aDawliah", "2019 – 2024"))
    s.append(bullets([
        "Designed 70+ screens and wireframes in Figma for e-commerce and dashboard products, and wrote the specs engineers built from.",
        "Built the team's first shared component library in Figma, which cut design-to-dev revision cycles by about 30%.",
        "Worked directly with front-end engineers to turn wireframes into working prototypes.",
    ]))
    s.append(Spacer(1, 6))
    s.append(role_line("Freelance UI Designer &amp; Front-End", "2017 – 2019"))
    s.append(bullets([
        "Took 5+ small-business and startup projects from first brief to a live site, handling both the design and the build.",
        "Hand-coded responsive layouts in HTML and CSS, and shipped each one inside a two-week window.",
    ]))

    s += section("Projects")
    s.append(bullets([
        "<b>E-Commerce UI</b> — A full shopping flow designed in Figma, 30+ screens from browsing to checkout.",
        "<b>Portfolio Site</b> — Built with HTML, CSS, and JavaScript, and deployed on GitHub Pages.",
    ]))

    s += section("Languages &amp; Technologies")
    s.append(Paragraph("<b>Front-End:</b> HTML5, CSS3, JavaScript (ES6+), Responsive Web Design, Git &amp; GitHub", body_s))
    s.append(Paragraph("<b>Design &amp; Systems:</b> Figma, Auto Layout, Design Systems, Wireframing, Prototyping, User Research, Accessibility (WCAG)", body_s))
    s.append(Paragraph("<b>Tools:</b> VS Code, Chrome DevTools", body_s))

    s += section("Certifications")
    s.append(bullets([
        "Programming with JavaScript — Meta (Coursera, 2025)",
        "JavaScript 101 — Tuwaiq Academy, Sater Platform (2025)",
        "Responsive Web Design — freeCodeCamp (2024)",
        "UX Design — Interaction Design Foundation (2024)",
    ]))

    s += section("Languages")
    s.append(Paragraph("Arabic (native) &nbsp;·&nbsp; English (professional working proficiency — STEP 66, Qiyas 2022)", body_s))

    doc.build(s)
    print("Wrote", EN_OUT)


def build_ar(font_dir):
    """Generate the Arabic CV PDF (RTL) — mirror of the English Design Engineer CV."""
    pdfmetrics.registerFont(TTFont("AR", str(font_dir / "NotoSansArabic-Regular.ttf")))
    pdfmetrics.registerFont(TTFont("AR-B", str(font_dir / "NotoSansArabic-Bold.ttf")))

    def r(t):
        """Reshape + bidi-order Arabic (with embedded Latin) for visual display."""
        return get_display(arabic_reshaper.reshape(t))

    doc = SimpleDocTemplate(
        str(AR_OUT), pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm,
        topMargin=15 * mm, bottomMargin=14 * mm,
        title="مساعد محمد — مهندس واجهات", author="Musaad Muhammad",
    )

    name_s = ParagraphStyle("name", fontName="AR-B", fontSize=23, textColor=INK,
                             leading=30, alignment=TA_RIGHT, spaceAfter=2)
    title_s = ParagraphStyle("title", fontName="AR", fontSize=12, textColor=GRAY,
                              leading=18, alignment=TA_RIGHT, spaceAfter=4)
    contact_s = ParagraphStyle("contact", fontName="AR", fontSize=9, textColor=GRAY,
                                leading=14, alignment=TA_RIGHT)
    sec_s = ParagraphStyle("sec", fontName="AR-B", fontSize=10.5, textColor=INK,
                            leading=15, alignment=TA_RIGHT, spaceBefore=10, spaceAfter=3)
    body_s = ParagraphStyle("body", fontName="AR", fontSize=9.7, textColor=INK,
                             leading=16, alignment=TA_RIGHT)
    bullet_s = ParagraphStyle("bullet", parent=body_s, spaceAfter=2, rightIndent=2)
    role_s = ParagraphStyle("role", fontName="AR-B", fontSize=10.5, textColor=INK,
                             leading=15, alignment=TA_RIGHT)
    date_s = ParagraphStyle("date", fontName="AR", fontSize=9.5, textColor=GRAY,
                             leading=15, alignment=TA_LEFT)

    def section(t):
        return [Paragraph(r(t), sec_s),
                HRFlowable(width="100%", thickness=0.7, color=LINE, spaceBefore=1, spaceAfter=5)]

    def role_line(role, date):
        # RTL: date on the left, role on the right
        t = Table([[Paragraph(date, date_s), Paragraph(r(role), role_s)]],
                  colWidths=[40 * mm, 134 * mm])
        t.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ]))
        return t

    def bullet(text):
        # bullet glyph placed at far right of the visual line
        return Paragraph(r(text) + "  •", bullet_s)

    s = []
    s.append(Paragraph(r("مساعد محمد"), name_s))
    s.append(Paragraph(r("مهندس واجهات أمامية ومصمّم تجربة المستخدم"), title_s))
    s.append(Paragraph(AR_CONTACT, contact_s))

    s += section("نبذة مهنية")
    s.append(Paragraph(r(
        "مصمّم واجهات يمتدّ عمله إلى تطوير الواجهة الأمامية. بعد سبع سنوات في تصميم واجهات الويب، "
        "أصبحتُ أُبرمج ما أُصمّمه باستخدام HTML وCSS وJavaScript، بما يتيح نقل التصميم من Figma إلى "
        "صفحة متكاملة جاهزة للعمل. وتتركّز خبرتي عند نقطة التقاء التصميم والتطوير: بناء مكتبات المكوّنات، "
        "وإعداد النماذج التفاعلية، وتسليم تصاميم دقيقة قابلة للتنفيذ مباشرةً."), body_s))

    s += section("الخبرة العملية")
    s.append(role_line("مصمّم واجهات (UX/UI) — aDawliah", "2019 – 2024"))
    for b in [
        "صمّمتُ أكثر من 70 شاشة ومخطّطًا أوّليًا في Figma لمنتجات التجارة الإلكترونية ولوحات التحكّم، مع إعداد المواصفات التي اعتمد عليها المطوّرون في التنفيذ.",
        "أنشأتُ أوّل مكتبة مكوّنات موحّدة للفريق في Figma، ما خفّض دورات المراجعة بين التصميم والتطوير بنحو 30%.",
        "تعاونتُ مباشرةً مع مطوّري الواجهة الأمامية لتحويل المخطّطات إلى نماذج تفاعلية قابلة للاستخدام.",
    ]:
        s.append(bullet(b))
    s.append(Spacer(1, 6))
    s.append(role_line("مصمّم واجهات مستقل ومطوّر واجهات أمامية", "2017 – 2019"))
    for b in [
        "نفّذتُ أكثر من 5 مشاريع لشركات صغيرة وناشئة، من الفكرة الأولى حتى إطلاق الموقع، متولّيًا التصميم والتطوير معًا.",
        "برمجتُ تخطيطات متجاوبة يدويًا باستخدام HTML وCSS، وسلّمتُ كل مشروع خلال أسبوعين.",
    ]:
        s.append(bullet(b))

    s += section("المشاريع")
    for b in [
        "واجهة متجر إلكتروني — تجربة تسوّق متكاملة مُصمّمة في Figma، تضمّ أكثر من 30 شاشة من التصفّح حتى إتمام الدفع.",
        "موقع شخصي — مُطوَّر باستخدام HTML وCSS وJavaScript، ومنشور على GitHub Pages.",
    ]:
        s.append(bullet(b))

    s += section("اللغات والتقنيات")
    for b in [
        "تطوير الواجهات الأمامية: HTML5، CSS3، JavaScript (ES6+)، تصميم ويب متجاوب، Git وGitHub.",
        "التصميم والأنظمة: Figma، Auto Layout، أنظمة التصميم، التخطيط الأوّلي، النماذج التفاعلية، أبحاث المستخدم، إمكانية الوصول (WCAG).",
        "الأدوات: VS Code، Chrome DevTools.",
    ]:
        s.append(Paragraph(r(b), body_s))

    s += section("الشهادات")
    for b in [
        "البرمجة بلغة JavaScript — Meta (Coursera، 2025).",
        "JavaScript 101 — أكاديمية طويق، منصّة سطر (2025).",
        "تصميم ويب متجاوب — freeCodeCamp (2024).",
        "تصميم تجربة المستخدم — Interaction Design Foundation (2024).",
    ]:
        s.append(bullet(b))

    s += section("اللغات")
    s.append(Paragraph(r("العربية (اللغة الأم) · الإنجليزية (إجادة مهنية في بيئة العمل — STEP 66، قياس 2022)"), body_s))

    doc.build(s)
    print("Wrote", AR_OUT)


def main():
    CV_DIR.mkdir(parents=True, exist_ok=True)

    # No country code, no digit run long enough to be a phone number, in either
    # contact line. A build that reintroduces the number fails loudly rather
    # than shipping it.
    PHONEY = re.compile(r"\+?\s*9\s*6\s*6|\d[\d\s-]{7,}")
    for label, src in (("EN", EN_CONTACT), ("AR", AR_CONTACT)):
        assert not PHONEY.search(src), f"{label} contact line looks like it carries a phone number"

    font_dir = Path(os.environ.get(
        "NOTO_ARABIC_DIR",
        os.path.expanduser("~/.local/share/fonts/Noto_Sans_Arabic/static/"),
    ))

    build_en()
    build_ar(font_dir)


if __name__ == "__main__":
    main()
