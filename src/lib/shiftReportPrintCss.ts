/**
 * Self-contained 80mm roll styles for the Shift Closing Report.
 * The detached print frame cannot reliably inherit Emotion's generated MUI
 * rules, so this includes the report's complete layout at print time.
 */
export const shiftReportPrintCss = (selector = '#shift-report-receipt') => `
    @page { size: 80mm auto; margin: 0; }

    html, body { width: 80mm !important; height: auto !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; background: #fff !important; color: #000 !important; }
    ${selector}, ${selector} * { box-sizing: border-box !important; }
    ${selector} { width: 74mm !important; max-width: 74mm !important; min-width: 0 !important; margin: 0 !important; padding: 2.5mm !important; border: 0 !important; background: #fff !important; color: #000 !important; font-family: Arial, Helvetica, sans-serif !important; overflow: visible !important; }
    ${selector} .MuiTypography-root { display: block !important; margin: 0 !important; color: #000 !important; font-size: 7.6pt !important; line-height: 1.25 !important; }
    ${selector} .shift-report-brand { font-size: 13pt !important; font-weight: 800 !important; text-align: center !important; }
    ${selector} .shift-report-contact { font-size: 7pt !important; text-align: center !important; }
    ${selector} .shift-report-title { margin-top: 2mm !important; font-size: 9pt !important; font-weight: 800 !important; text-align: center !important; }
    ${selector} .shift-report-status { font-size: 7.4pt !important; font-weight: 800 !important; text-align: center !important; }
    ${selector} .MuiStack-root { display: flex !important; flex-direction: row !important; min-width: 0 !important; }
    ${selector} .shift-report-list { flex-direction: column !important; gap: 0.65mm !important; padding: 1.75mm 0 !important; }
    ${selector} .shift-report-meta { margin-top: 2mm !important; padding: 1.75mm 0 !important; border-top: 1px dashed #000 !important; border-bottom: 1px dashed #000 !important; }
    ${selector} .shift-report-meta .MuiStack-root, ${selector} .shift-report-list > .MuiStack-root, ${selector} .shift-report-total-row { justify-content: space-between !important; gap: 2mm !important; }
    ${selector} .shift-report-meta .MuiTypography-root:first-child, ${selector} .shift-report-list .MuiTypography-root:first-child { font-weight: 700 !important; }
    ${selector} .shift-report-meta .MuiTypography-root:last-child, ${selector} .shift-report-list .MuiTypography-root:last-child { text-align: right !important; }
    ${selector} .shift-report-section { margin-top: 1.75mm !important; padding-bottom: 0.8mm !important; border-bottom: 1px dashed #000 !important; font-size: 8.2pt !important; font-weight: 800 !important; }
    ${selector} .shift-report-table-row { align-items: flex-start !important; padding: 0.65mm 0 !important; }
    ${selector} .shift-report-table-row > :first-child { flex: 1 1 0 !important; min-width: 0 !important; overflow-wrap: anywhere !important; }
    ${selector} .shift-report-table-row > :nth-child(2) { flex: 0 0 10mm !important; text-align: center !important; }
    ${selector} .shift-report-table-row > :last-child { flex: 0 0 21mm !important; text-align: right !important; font-weight: 700 !important; white-space: nowrap !important; }
    ${selector} .shift-report-table-head { border-bottom: 1px dotted #777 !important; }
    ${selector} .shift-report-table-head .MuiTypography-root { font-size: 7pt !important; font-weight: 800 !important; }
    ${selector} .shift-report-item-row > :nth-child(2) { flex-basis: 8mm !important; }
    ${selector} .shift-report-item-row > :last-child { flex-basis: 18mm !important; }
    ${selector} .shift-report-total-row { border-top: 1px dotted #777 !important; padding-top: 0.75mm !important; }
    ${selector} .shift-report-print-footer { margin-top: 2mm !important; padding-top: 1.5mm !important; border-top: 1px dashed #000 !important; text-align: center !important; font-size: 7pt !important; font-weight: 800 !important; }
    ${selector} .shift-report-print-footer + .MuiTypography-root { text-align: center !important; font-size: 6.5pt !important; }
    ${selector} .MuiStack-root, ${selector} .MuiTypography-root { break-inside: avoid !important; page-break-inside: avoid !important; }
`;
