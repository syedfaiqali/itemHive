/**
 * Print CSS that turns an on-screen invoice into an 80mm thermal slip.
 *
 * Receipt printers feed a fixed-width, continuous roll, so the page box is
 * declared 80mm wide with an auto height - a fixed height would eject a full
 * sheet's worth of blank paper after every short sale. The screen layout puts
 * the letterhead, meta column and shop block side by side and prices the table
 * in five columns; none of that survives 72mm of printable width, so the rules
 * below stack every row and drop the columns that a slip does not need.
 *
 * Only invoices use this. The orders list and the analytics report stay on A4.
 */

/** The physical roll. The page box must match it or the driver scales the slip. */
const ROLL_WIDTH_MM = 80;

/** What the head can actually mark: the roll minus ~4mm of dead edge per side. */
const SLIP_WIDTH_MM = 72;

/**
 * @param selector CSS selector of the invoice root, e.g. `#pos-receipt`.
 */
export const thermalInvoicePrintCss = (selector: string) => `
    /* A continuous roll: match the paper width, let the height follow the content
       so a three-line sale does not feed a full sheet of blank paper. */
    @page { size: ${ROLL_WIDTH_MM}mm auto; margin: 0; }

    html, body {
        width: ${ROLL_WIDTH_MM}mm !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #fff !important;
    }

    ${selector} {
        display: block !important;
        width: ${SLIP_WIDTH_MM}mm !important;
        max-width: ${SLIP_WIDTH_MM}mm !important;
        min-width: 0 !important;
        margin: 0 auto !important;
        padding: 2mm !important;
        box-sizing: border-box !important;
        border: none !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        overflow: visible !important;
        background: #fff !important;
        color: #000 !important;
        /* Thermal heads render fine strokes poorly; a compact sans holds up. */
        font-family: Arial, Helvetica, sans-serif !important;
        font-size: 9pt !important;
        line-height: 1.25 !important;
    }

    ${selector} * {
        color: #000 !important;
        background: transparent !important;
        box-shadow: none !important;
        max-width: 100% !important;
        min-width: 0 !important;
        overflow: visible !important;
    }

    /* Anything the screen lays out in a row has to stack on a 72mm slip. */
    ${selector} .MuiStack-root,
    ${selector} .MuiGrid-container,
    ${selector} .MuiBox-root {
        flex-wrap: wrap !important;
    }

    ${selector} .MuiGrid-root {
        width: 100% !important;
        max-width: 100% !important;
        flex-basis: 100% !important;
    }

    /* Letterhead: title, banner, recipient, meta and shop block in one column,
       each left-aligned so the slip reads top to bottom. */
    ${selector} .invoice-letterhead,
    ${selector} .invoice-letterhead > *,
    ${selector} .invoice-letterhead .MuiBox-root {
        display: block !important;
        width: 100% !important;
        margin-left: 0 !important;
        padding-left: 0 !important;
        text-align: left !important;
        border-left: none !important;
    }

    ${selector} .invoice-letterhead img {
        display: block !important;
        max-width: 46mm !important;
        max-height: 16mm !important;
        margin: 0 0 1.5mm 0 !important;
        object-position: left center !important;
    }

    ${selector} .invoice-letterhead h1,
    ${selector} .invoice-letterhead h2,
    ${selector} .invoice-letterhead h3,
    ${selector} .invoice-letterhead .MuiTypography-h3 {
        font-size: 13pt !important;
        line-height: 1.15 !important;
        margin: 0 0 1mm 0 !important;
    }

    ${selector} .invoice-letterhead .MuiTypography-h6 {
        font-size: 9.5pt !important;
        line-height: 1.2 !important;
    }

    /* The meta column prints as label/value lines rather than a right rail. */
    ${selector} .invoice-letterhead-meta > .MuiBox-root {
        margin-bottom: 0.8mm !important;
    }

    ${selector} .MuiTypography-caption {
        font-size: 7pt !important;
        line-height: 1.2 !important;
    }

    ${selector} .MuiTypography-body2,
    ${selector} .MuiTypography-body1 {
        font-size: 8.5pt !important;
        line-height: 1.25 !important;
    }

    ${selector} .MuiDivider-root {
        margin: 1.5mm 0 !important;
        border-color: #000 !important;
        border-bottom-style: dashed !important;
    }

    /* Line items: 72mm has no room for a serial column or per-unit pricing
       beside the total, so keep description, qty and amount only. */
    ${selector} table {
        width: 100% !important;
        table-layout: fixed !important;
        border-collapse: collapse !important;
        margin: 1mm 0 !important;
    }

    ${selector} th,
    ${selector} td {
        border: none !important;
        border-bottom: 1px dotted #000 !important;
        padding: 0.8mm 0 !important;
        font-size: 8pt !important;
        line-height: 1.2 !important;
        word-break: break-word !important;
        background: transparent !important;
    }

    ${selector} th {
        border-bottom: 1px solid #000 !important;
        font-weight: 700 !important;
    }

    /* Column 1 is the serial number and column 4 the unit price. */
    ${selector} th:nth-child(1),
    ${selector} td:nth-child(1),
    ${selector} th:nth-child(4),
    ${selector} td:nth-child(4) {
        display: none !important;
    }

    ${selector} th:nth-child(2),
    ${selector} td:nth-child(2) { width: 52% !important; }
    ${selector} th:nth-child(3),
    ${selector} td:nth-child(3) { width: 14% !important; }
    ${selector} th:nth-child(5),
    ${selector} td:nth-child(5) { width: 34% !important; }

    /* Totals rows span the hidden columns too, so re-point their colspan. */
    ${selector} td[colspan] {
        width: auto !important;
        text-align: right !important;
        border-bottom: none !important;
        padding-right: 1.5mm !important;
    }

    ${selector} tbody tr:last-child td {
        border-bottom: none !important;
    }

    /* Never let a slip break mid-item. */
    ${selector} tr,
    ${selector} table {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
    }
`;
