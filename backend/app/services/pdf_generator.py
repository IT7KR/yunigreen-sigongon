import io
from datetime import datetime
from decimal import Decimal
from typing import Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.platypus import (
    SimpleDocTemplate,
    Table,
    TableStyle,
    Paragraph,
    Spacer,
)

pdfmetrics.registerFont(UnicodeCIDFont("HeiseiMin-W3"))
pdfmetrics.registerFont(UnicodeCIDFont("HeiseiKakuGo-W5"))

FONT_NAME = "HeiseiKakuGo-W5"
FONT_NAME_BOLD = "HeiseiMin-W3"


def _format_currency(amount: Decimal) -> str:
    return f"{int(amount):,}"


def _get_styles() -> dict:
    styles = getSampleStyleSheet()
    
    styles.add(ParagraphStyle(
        name="KoreanTitle",
        fontName=FONT_NAME_BOLD,
        fontSize=18,
        leading=22,
        alignment=1,
        spaceAfter=10,
    ))
    
    styles.add(ParagraphStyle(
        name="KoreanNormal",
        fontName=FONT_NAME,
        fontSize=10,
        leading=14,
    ))
    
    styles.add(ParagraphStyle(
        name="KoreanSmall",
        fontName=FONT_NAME,
        fontSize=8,
        leading=10,
    ))
    
    return styles


def generate_estimate_pdf(
    estimate_id: str,
    project_name: str,
    client_name: str,
    client_address: str,
    estimate_version: int,
    lines: list[dict],
    subtotal: Decimal,
    vat_amount: Decimal,
    total_amount: Decimal,
    issued_at: Optional[datetime] = None,
    notes: Optional[str] = None,
    company_name: str = "유니그린",
) -> bytes:
    buffer = io.BytesIO()
    
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20*mm,
        leftMargin=20*mm,
        topMargin=20*mm,
        bottomMargin=20*mm,
    )
    
    styles = _get_styles()
    elements = []
    
    elements.append(Paragraph("견 적 서", styles["KoreanTitle"]))
    elements.append(Spacer(1, 10*mm))
    
    issue_date = issued_at.strftime("%Y년 %m월 %d일") if issued_at else datetime.now().strftime("%Y년 %m월 %d일")
    
    header_data = [
        ["수신", client_name, "발신", company_name],
        ["현장명", project_name, "일자", issue_date],
        ["주소", client_address, "버전", f"V{estimate_version}"],
    ]
    
    header_table = Table(header_data, colWidths=[25*mm, 55*mm, 25*mm, 55*mm])
    header_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), FONT_NAME),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("BACKGROUND", (0, 0), (0, -1), colors.Color(0.9, 0.9, 0.9)),
        ("BACKGROUND", (2, 0), (2, -1), colors.Color(0.9, 0.9, 0.9)),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 5*mm))
    
    total_box_data = [
        ["합계 금액 (VAT 포함)", f"₩ {_format_currency(total_amount)}"],
    ]
    total_box = Table(total_box_data, colWidths=[80*mm, 80*mm])
    total_box.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), FONT_NAME_BOLD),
        ("FONTSIZE", (0, 0), (0, 0), 12),
        ("FONTSIZE", (1, 0), (1, 0), 16),
        ("BACKGROUND", (0, 0), (-1, -1), colors.Color(0.95, 0.95, 1.0)),
        ("BOX", (0, 0), (-1, -1), 1, colors.black),
        ("ALIGN", (0, 0), (0, 0), "LEFT"),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
    ]))
    elements.append(total_box)
    elements.append(Spacer(1, 8*mm))
    
    table_header = ["No.", "품명", "규격", "단위", "수량", "단가", "금액"]
    table_data = [table_header]
    
    for idx, line in enumerate(lines, 1):
        row = [
            str(idx),
            line.get("description", ""),
            line.get("specification", "") or "-",
            line.get("unit", ""),
            str(line.get("quantity", 0)),
            _format_currency(Decimal(str(line.get("unit_price", 0)))),
            _format_currency(Decimal(str(line.get("amount", 0)))),
        ]
        table_data.append(row)
    
    col_widths = [10*mm, 45*mm, 30*mm, 15*mm, 18*mm, 25*mm, 27*mm]
    items_table = Table(table_data, colWidths=col_widths)
    
    table_style = [
        ("FONTNAME", (0, 0), (-1, -1), FONT_NAME),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("FONTNAME", (0, 0), (-1, 0), FONT_NAME_BOLD),
        ("BACKGROUND", (0, 0), (-1, 0), colors.Color(0.2, 0.3, 0.5)),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("ALIGN", (0, 1), (0, -1), "CENTER"),
        ("ALIGN", (3, 1), (3, -1), "CENTER"),
        ("ALIGN", (4, 1), (6, -1), "RIGHT"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ]
    
    for i in range(1, len(table_data)):
        if i % 2 == 0:
            table_style.append(("BACKGROUND", (0, i), (-1, i), colors.Color(0.95, 0.95, 0.95)))
    
    items_table.setStyle(TableStyle(table_style))
    elements.append(items_table)
    elements.append(Spacer(1, 5*mm))
    
    summary_data = [
        ["공급가액", f"₩ {_format_currency(subtotal)}"],
        ["부가세 (10%)", f"₩ {_format_currency(vat_amount)}"],
        ["합계", f"₩ {_format_currency(total_amount)}"],
    ]
    
    summary_table = Table(summary_data, colWidths=[40*mm, 40*mm])
    summary_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), FONT_NAME),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("FONTNAME", (0, 2), (-1, 2), FONT_NAME_BOLD),
        ("FONTSIZE", (0, 2), (-1, 2), 11),
        ("BACKGROUND", (0, 2), (-1, 2), colors.Color(0.9, 0.9, 0.9)),
        ("ALIGN", (0, 0), (0, -1), "LEFT"),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    
    summary_wrapper = Table([[summary_table]], colWidths=[170*mm])
    summary_wrapper.setStyle(TableStyle([
        ("ALIGN", (0, 0), (0, 0), "RIGHT"),
    ]))
    elements.append(summary_wrapper)
    
    if notes:
        elements.append(Spacer(1, 8*mm))
        elements.append(Paragraph("비고", styles["KoreanNormal"]))
        elements.append(Spacer(1, 2*mm))
        
        notes_table = Table([[notes]], colWidths=[170*mm])
        notes_table.setStyle(TableStyle([
            ("FONTNAME", (0, 0), (-1, -1), FONT_NAME),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.black),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ]))
        elements.append(notes_table)
    
    elements.append(Spacer(1, 15*mm))
    
    footer_text = f"""
    위 금액을 견적합니다.
    
    {company_name}
    """
    elements.append(Paragraph(footer_text.strip(), styles["KoreanNormal"]))
    
    doc.build(elements)
    
    buffer.seek(0)
    return buffer.getvalue()


def generate_contract_pdf(
    contract_id: str,
    project_name: str,
    client_name: str,
    client_address: str,
    total_amount: Decimal,
    terms: str,
    company_name: str = "유니그린",
    signed_at: Optional[datetime] = None,
) -> bytes:
    buffer = io.BytesIO()
    
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=25*mm,
        leftMargin=25*mm,
        topMargin=25*mm,
        bottomMargin=25*mm,
    )
    
    styles = _get_styles()
    elements = []
    
    elements.append(Paragraph("공 사 계 약 서", styles["KoreanTitle"]))
    elements.append(Spacer(1, 15*mm))
    
    contract_date = signed_at.strftime("%Y년 %m월 %d일") if signed_at else datetime.now().strftime("%Y년 %m월 %d일")
    
    info_data = [
        ["공사명", project_name],
        ["공사장소", client_address],
        ["계약금액", f"₩ {_format_currency(total_amount)} (VAT 포함)"],
        ["계약일자", contract_date],
    ]
    
    info_table = Table(info_data, colWidths=[35*mm, 125*mm])
    info_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), FONT_NAME),
        ("FONTSIZE", (0, 0), (-1, -1), 11),
        ("BACKGROUND", (0, 0), (0, -1), colors.Color(0.9, 0.9, 0.9)),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 10*mm))
    
    elements.append(Paragraph("계약 조건", styles["KoreanNormal"]))
    elements.append(Spacer(1, 3*mm))
    
    terms_table = Table([[terms or "별첨 참조"]], colWidths=[160*mm])
    terms_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), FONT_NAME),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.black),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
    ]))
    elements.append(terms_table)
    elements.append(Spacer(1, 20*mm))
    
    agreement_text = """
위 공사에 대하여 발주자와 수급자는 상호 대등한 입장에서 
본 계약을 체결하고, 신의에 따라 성실히 이행할 것을 확약합니다.
    """
    elements.append(Paragraph(agreement_text.strip(), styles["KoreanNormal"]))
    elements.append(Spacer(1, 15*mm))
    
    parties_data = [
        ["발주자 (갑)", "", "수급자 (을)", ""],
        ["상호/성명", client_name, "상호", company_name],
        ["주소", client_address, "주소", ""],
        ["서명", "", "서명", ""],
    ]
    
    parties_table = Table(parties_data, colWidths=[30*mm, 50*mm, 30*mm, 50*mm])
    parties_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), FONT_NAME),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("SPAN", (0, 0), (1, 0)),
        ("SPAN", (2, 0), (3, 0)),
        ("BACKGROUND", (0, 0), (1, 0), colors.Color(0.9, 0.9, 0.9)),
        ("BACKGROUND", (2, 0), (3, 0), colors.Color(0.9, 0.9, 0.9)),
        ("BACKGROUND", (0, 1), (0, -1), colors.Color(0.95, 0.95, 0.95)),
        ("BACKGROUND", (2, 1), (2, -1), colors.Color(0.95, 0.95, 0.95)),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    elements.append(parties_table)

    doc.build(elements)

    buffer.seek(0)
    return buffer.getvalue()


def generate_diagnosis_pdf(
    diagnosis_id: int,
    project_name: str,
    site_address: str,
    diagnosed_at: datetime,
    leak_opinion_text: str,
    field_opinion_text: Optional[str] = None,
    material_suggestions: Optional[list] = None,
) -> bytes:
    """AI 소견서 PDF 생성."""
    buffer = io.BytesIO()
    styles = _get_styles()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )

    story = []

    # Title
    story.append(Paragraph("AI 누수 진단 소견서", styles["KoreanTitle"]))
    story.append(Spacer(1, 5 * mm))

    # Header info table
    header_data = [
        ["현장명", project_name],
        ["현장주소", site_address],
        ["진단일시", diagnosed_at.strftime("%Y년 %m월 %d일 %H:%M")],
        ["소견서 번호", f"DIAG-{diagnosis_id}"],
    ]
    header_table = Table(header_data, colWidths=[35 * mm, 135 * mm])
    header_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), FONT_NAME),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("FONTNAME", (0, 0), (0, -1), FONT_NAME_BOLD),
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F3F4F6")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("PADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 8 * mm))

    # AI Analysis Section
    story.append(Paragraph("■ AI 진단 결과", styles["KoreanNormal"]))
    story.append(Spacer(1, 3 * mm))

    normal_style = ParagraphStyle(
        name="KoreanBodyText",
        fontName=FONT_NAME,
        fontSize=10,
        leading=16,
        spaceAfter=6,
    )

    if leak_opinion_text:
        for line in leak_opinion_text.split("\n"):
            if line.strip():
                story.append(Paragraph(line, normal_style))

    story.append(Spacer(1, 5 * mm))

    # Field opinion section
    if field_opinion_text:
        story.append(Paragraph("■ 현장 의견", normal_style))
        story.append(Spacer(1, 3 * mm))
        for line in field_opinion_text.split("\n"):
            if line.strip():
                story.append(Paragraph(line, normal_style))
        story.append(Spacer(1, 5 * mm))

    # Material suggestions
    if material_suggestions:
        story.append(Paragraph("■ 제안 자재", normal_style))
        story.append(Spacer(1, 3 * mm))
        mat_data = [["품명", "규격", "수량", "단위"]]
        for mat in material_suggestions[:10]:
            mat_data.append([
                str(mat.get("item_name", "")),
                str(mat.get("spec", "")),
                str(mat.get("quantity", "")),
                str(mat.get("unit", "")),
            ])
        mat_table = Table(mat_data, colWidths=[70 * mm, 50 * mm, 25 * mm, 25 * mm])
        mat_table.setStyle(TableStyle([
            ("FONTNAME", (0, 0), (-1, -1), FONT_NAME),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E5E7EB")),
            ("FONTNAME", (0, 0), (-1, 0), FONT_NAME_BOLD),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("PADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(mat_table)
        story.append(Spacer(1, 5 * mm))

    # Footer
    story.append(Spacer(1, 10 * mm))
    footer_style = ParagraphStyle(
        name="Footer",
        fontName=FONT_NAME,
        fontSize=8,
        textColor=colors.grey,
        alignment=1,
    )
    story.append(Paragraph(
        "본 소견서는 AI 분석을 기반으로 생성되었습니다. 최종 판단은 전문가 확인이 필요합니다.",
        footer_style,
    ))
    story.append(Paragraph(
        f"생성일시: {datetime.utcnow().strftime('%Y-%m-%d %H:%M')} UTC | 시공ON AI 진단 시스템",
        footer_style,
    ))

    doc.build(story)
    return buffer.getvalue()
