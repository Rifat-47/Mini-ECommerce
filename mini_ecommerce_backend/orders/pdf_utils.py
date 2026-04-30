from io import BytesIO
from decimal import Decimal

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable,
)
from reportlab.lib.enums import TA_RIGHT, TA_CENTER, TA_LEFT

# ── Colour palette ──────────────────────────────────────────────────────────
PRIMARY   = colors.HexColor('#1a1a2e')
ACCENT    = colors.HexColor('#e94560')
PAID_CLR  = colors.HexColor('#16a34a')
UNPAID_CLR= colors.HexColor('#dc2626')
REFUND_CLR= colors.HexColor('#2563eb')
COD_CLR   = colors.HexColor('#d97706')
LIGHT_BG  = colors.HexColor('#f8f8f8')
MID_GREY  = colors.HexColor('#6b7280')
DARK_GREY = colors.HexColor('#374151')
WHITE     = colors.white

PAGE_W, PAGE_H = A4
MARGIN = 18 * mm


def _base_styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle('CompanyName', fontSize=20, textColor=PRIMARY,
                              fontName='Helvetica-Bold', spaceAfter=2))
    styles.add(ParagraphStyle('DocTitle', fontSize=13, textColor=ACCENT,
                              fontName='Helvetica-Bold', spaceAfter=2))
    styles.add(ParagraphStyle('Label', fontSize=8, textColor=MID_GREY,
                              fontName='Helvetica'))
    styles.add(ParagraphStyle('Value', fontSize=9, textColor=DARK_GREY,
                              fontName='Helvetica-Bold'))
    styles.add(ParagraphStyle('Small', fontSize=8, textColor=MID_GREY,
                              fontName='Helvetica'))
    styles.add(ParagraphStyle('SmallRight', fontSize=8, textColor=MID_GREY,
                              fontName='Helvetica', alignment=TA_RIGHT))
    styles.add(ParagraphStyle('TotalLabel', fontSize=10, textColor=PRIMARY,
                              fontName='Helvetica-Bold', alignment=TA_RIGHT))
    styles.add(ParagraphStyle('TotalValue', fontSize=10, textColor=PRIMARY,
                              fontName='Helvetica-Bold', alignment=TA_RIGHT))
    styles.add(ParagraphStyle('Footer', fontSize=7, textColor=MID_GREY,
                              fontName='Helvetica', alignment=TA_CENTER))
    return styles


def _status_badge(text, color):
    return Paragraph(
        f'<font color="white"><b> {text} </b></font>',
        ParagraphStyle('Badge', fontSize=10, fontName='Helvetica-Bold',
                       backColor=color, textColor=WHITE, alignment=TA_CENTER,
                       borderPadding=4),
    )


def _items_table(items):
    headers = ['#', 'Product', 'Qty', 'Unit Price (BDT)', 'Total (BDT)']
    rows = [headers]
    for i, item in enumerate(items, 1):
        unit = item.price_at_purchase / item.quantity
        rows.append([
            str(i),
            item.product.name,
            str(item.quantity),
            f'{unit:,.2f}',
            f'{item.price_at_purchase:,.2f}',
        ])

    col_widths = [10*mm, 75*mm, 15*mm, 35*mm, 35*mm]
    tbl = Table(rows, colWidths=col_widths, repeatRows=1)
    tbl.setStyle(TableStyle([
        # Header row
        ('BACKGROUND',   (0, 0), (-1, 0), PRIMARY),
        ('TEXTCOLOR',    (0, 0), (-1, 0), WHITE),
        ('FONTNAME',     (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE',     (0, 0), (-1, 0), 8),
        ('ALIGN',        (0, 0), (-1, 0), 'CENTER'),
        ('BOTTOMPADDING',(0, 0), (-1, 0), 6),
        ('TOPPADDING',   (0, 0), (-1, 0), 6),
        # Data rows
        ('FONTNAME',     (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE',     (0, 1), (-1, -1), 8),
        ('ALIGN',        (0, 1), (0, -1), 'CENTER'),
        ('ALIGN',        (2, 1), (-1, -1), 'RIGHT'),
        ('ROWBACKGROUNDS',(0, 1), (-1, -1), [WHITE, LIGHT_BG]),
        ('TOPPADDING',   (0, 1), (-1, -1), 5),
        ('BOTTOMPADDING',(0, 1), (-1, -1), 5),
        ('LINEBELOW',    (0, -1), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
    ]))
    return tbl


def _totals_table(subtotal, discount, total, styles):
    rows = []
    if discount and discount > 0:
        rows.append([
            Paragraph('Subtotal:', styles['TotalLabel']),
            Paragraph(f'BDT {subtotal:,.2f}', styles['TotalValue']),
        ])
        rows.append([
            Paragraph('Discount:', styles['TotalLabel']),
            Paragraph(f'- BDT {discount:,.2f}', styles['TotalValue']),
        ])
    rows.append([
        Paragraph('Total:', ParagraphStyle('GrandLabel', fontSize=12,
                  fontName='Helvetica-Bold', textColor=PRIMARY, alignment=TA_RIGHT)),
        Paragraph(f'BDT {total:,.2f}', ParagraphStyle('GrandValue', fontSize=12,
                  fontName='Helvetica-Bold', textColor=ACCENT, alignment=TA_RIGHT)),
    ])
    tbl = Table(rows, colWidths=[120*mm, 45*mm])
    tbl.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    return tbl


# ── Invoice ─────────────────────────────────────────────────────────────────

def generate_invoice(order):
    """
    Returns a BytesIO buffer containing the invoice PDF for the given order.
    Status shows PAID or UNPAID based on payment record.
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
                            leftMargin=MARGIN, rightMargin=MARGIN,
                            topMargin=MARGIN, bottomMargin=MARGIN)
    styles = _base_styles()
    story = []

    # Determine payment status badge
    payment = getattr(order, 'payment', None)
    is_paid = payment is not None and payment.status == 'completed'
    is_cod  = payment is not None and payment.payment_method == 'cash_on_delivery'

    if is_paid:
        status_text, status_color = 'PAID', PAID_CLR
    elif is_cod:
        status_text, status_color = 'CASH ON DELIVERY', COD_CLR
    else:
        status_text, status_color = 'UNPAID', UNPAID_CLR

    # ── Header ───────────────────────────────────────────────────────────────
    from config.models import SiteSettings
    cfg = SiteSettings.get()
    header_data = [[
        Paragraph(cfg.store_name, styles['CompanyName']),
        _status_badge(status_text, status_color),
    ]]
    header_tbl = Table(header_data, colWidths=[120*mm, 45*mm])
    header_tbl.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'MIDDLE')]))
    story.append(header_tbl)
    story.append(Spacer(1, 2*mm))
    story.append(HRFlowable(width='100%', thickness=1, color=ACCENT))
    story.append(Spacer(1, 4*mm))

    # ── Invoice meta ─────────────────────────────────────────────────────────
    story.append(Paragraph('INVOICE', styles['DocTitle']))
    meta_data = [
        [Paragraph('Invoice No.', styles['Label']),
         Paragraph(f'#{order.id:05d}', styles['Value']),
         Paragraph('Order Date', styles['Label']),
         Paragraph(order.created_at.strftime('%d %b %Y'), styles['Value'])],
        [Paragraph('Customer', styles['Label']),
         Paragraph(f'{order.user.get_full_name() or order.user.email}', styles['Value']),
         Paragraph('Email', styles['Label']),
         Paragraph(order.user.email, styles['Value'])],
        [Paragraph('Shipping Address', styles['Label']),
         Paragraph(order.shipping_address, styles['Small']),
         Paragraph('Order Status', styles['Label']),
         Paragraph(order.status, styles['Value'])],
    ]
    if payment is not None:
        meta_data.append([
            Paragraph('Payment Method', styles['Label']),
            Paragraph((payment.payment_method or '—').replace('_', ' ').upper(), styles['Value']),
            Paragraph('Transaction ID', styles['Label']),
            Paragraph(payment.transaction_id or '—', styles['Value']),
        ])
    meta_tbl = Table(meta_data, colWidths=[35*mm, 65*mm, 35*mm, 50*mm])
    meta_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_BG),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(meta_tbl)
    story.append(Spacer(1, 5*mm))

    # ── Items table ───────────────────────────────────────────────────────────
    story.append(_items_table(order.items.select_related('product').all()))
    story.append(Spacer(1, 4*mm))

    # ── Totals ────────────────────────────────────────────────────────────────
    subtotal = order.total_amount + order.discount_amount
    story.append(_totals_table(subtotal, order.discount_amount, order.total_amount, styles))
    story.append(Spacer(1, 6*mm))

    # ── Footer ────────────────────────────────────────────────────────────────
    story.append(HRFlowable(width='100%', thickness=0.5, color=colors.HexColor('#e5e7eb')))
    story.append(Spacer(1, 2*mm))
    story.append(Paragraph(
        f'Thank you for shopping with {cfg.store_name}. '
        f'For support, contact us at {cfg.support_email}',
        styles['Footer'],
    ))

    doc.build(story)
    buffer.seek(0)
    return buffer


# ── Credit Note ──────────────────────────────────────────────────────────────

def generate_credit_note(return_request):
    """
    Returns a BytesIO buffer containing the credit note PDF.
    Issued only after refund is marked complete.
    """
    order = return_request.order
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
                            leftMargin=MARGIN, rightMargin=MARGIN,
                            topMargin=MARGIN, bottomMargin=MARGIN)
    styles = _base_styles()
    story = []

    # ── Header ───────────────────────────────────────────────────────────────
    from config.models import SiteSettings
    cfg = SiteSettings.get()
    header_data = [[
        Paragraph(cfg.store_name, styles['CompanyName']),
        _status_badge('REFUNDED', REFUND_CLR),
    ]]
    header_tbl = Table(header_data, colWidths=[120*mm, 45*mm])
    header_tbl.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'MIDDLE')]))
    story.append(header_tbl)
    story.append(Spacer(1, 2*mm))
    story.append(HRFlowable(width='100%', thickness=1, color=REFUND_CLR))
    story.append(Spacer(1, 4*mm))

    # ── Credit note meta ──────────────────────────────────────────────────────
    story.append(Paragraph('CREDIT NOTE', styles['DocTitle']))
    meta_data = [
        [Paragraph('Credit Note No.', styles['Label']),
         Paragraph(f'CN-{return_request.id:05d}', styles['Value']),
         Paragraph('Issue Date', styles['Label']),
         Paragraph(return_request.updated_at.strftime('%d %b %Y'), styles['Value'])],
        [Paragraph('Original Invoice', styles['Label']),
         Paragraph(f'#{order.id:05d}', styles['Value']),
         Paragraph('Order Date', styles['Label']),
         Paragraph(order.created_at.strftime('%d %b %Y'), styles['Value'])],
        [Paragraph('Customer', styles['Label']),
         Paragraph(order.user.get_full_name() or order.user.email, styles['Value']),
         Paragraph('Email', styles['Label']),
         Paragraph(order.user.email, styles['Value'])],
        [Paragraph('Return Reason', styles['Label']),
         Paragraph(return_request.reason, styles['Small']),
         Paragraph('', styles['Label']),
         Paragraph('', styles['Value'])],
    ]
    meta_tbl = Table(meta_data, colWidths=[35*mm, 65*mm, 35*mm, 50*mm])
    meta_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_BG),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(meta_tbl)
    story.append(Spacer(1, 5*mm))

    # ── Items table (same items from original order) ──────────────────────────
    story.append(Paragraph(
        'Returned Items',
        ParagraphStyle('SectionHead', fontSize=9, fontName='Helvetica-Bold',
                       textColor=PRIMARY, spaceAfter=3),
    ))
    story.append(_items_table(order.items.select_related('product').all()))
    story.append(Spacer(1, 4*mm))

    # ── Refund total ──────────────────────────────────────────────────────────
    subtotal = order.total_amount + order.discount_amount
    story.append(_totals_table(subtotal, order.discount_amount, order.total_amount, styles))
    story.append(Spacer(1, 4*mm))

    # ── Refund note ───────────────────────────────────────────────────────────
    story.append(Paragraph(
        f'Refund of <b>BDT {order.total_amount:,.2f}</b> has been processed to your '
        f'original payment method. Please allow 3–7 business days for it to reflect.',
        ParagraphStyle('RefundNote', fontSize=9, textColor=REFUND_CLR,
                       fontName='Helvetica', backColor=colors.HexColor('#eff6ff'),
                       borderPadding=6, spaceAfter=4),
    ))
    story.append(Spacer(1, 4*mm))

    # ── Footer ────────────────────────────────────────────────────────────────
    story.append(HRFlowable(width='100%', thickness=0.5, color=colors.HexColor('#e5e7eb')))
    story.append(Spacer(1, 2*mm))
    story.append(Paragraph(
        f'{cfg.store_name} — For support, contact us at {cfg.support_email}',
        styles['Footer'],
    ))

    doc.build(story)
    buffer.seek(0)
    return buffer
