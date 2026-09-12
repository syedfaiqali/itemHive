import { thermalInvoicePrintCss } from './thermalPrintCss';

const waitForReceiptImages = async (document: Document) => {
    const images = Array.from(document.images);
    await Promise.all(images.map((image) => {
        if (image.complete) return Promise.resolve();

        return new Promise<void>((resolve) => {
            image.addEventListener('load', () => resolve(), { once: true });
            image.addEventListener('error', () => resolve(), { once: true });
        });
    }));
};

/**
 * Prints only the receipt in a detached document. Printing the live POS page
 * makes Chromium lay out every product card and evaluate its print selectors,
 * which becomes noticeably slow for large inventories.
 */
export const printReceipt = async (receipt: HTMLElement) => {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    // Keep the frame off-screen instead of using visibility:hidden; some
    // browser print engines treat hidden iframe content as non-printable.
    frame.style.cssText = 'position:fixed;left:-10000px;top:-10000px;width:1px;height:1px;border:0;pointer-events:none;';
    document.body.appendChild(frame);

    const printDocument = frame.contentDocument;
    const printWindow = frame.contentWindow;
    if (!printDocument || !printWindow) {
        frame.remove();
        throw new Error('The browser could not prepare the receipt for printing.');
    }

    // MUI/Emotion styles are injected as <style> elements. Copy them so the
    // receipt keeps its layout without taking the rest of the POS DOM along.
    const inheritedStyles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map((stylesheet) => stylesheet.outerHTML)
        .join('');

    printDocument.open();
    printDocument.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${inheritedStyles}
<style>${thermalInvoicePrintCss('#pos-receipt')}</style>
</head>
<body>${receipt.outerHTML}</body>
</html>`);
    printDocument.close();

    await waitForReceiptImages(printDocument);

    await new Promise<void>((resolve) => {
        let cleanedUp = false;
        const cleanup = () => {
            if (cleanedUp) return;
            cleanedUp = true;
            window.setTimeout(() => frame.remove(), 0);
            resolve();
        };

        printWindow.addEventListener('afterprint', cleanup, { once: true });
        printWindow.focus();
        printWindow.print();
        // Some printer drivers do not dispatch afterprint. Do not leave a
        // detached frame behind if that happens.
        window.setTimeout(cleanup, 60_000);
    });
};
