import { menuItemPrice, newMenuBlock, type MenuBlock, type MenuPrices, type MenuProduct } from './menuContent';
import { createTemplatePage } from './menuLayouts';
import type { MenuDesign } from './menuTemplates';

export type ExtractedMenu = { name: string; notes: string; sections: Array<{ name: string; page: number; items: Array<{ name: string; price: number | null }> }> };
export type ImportItem = { id: string; name: string; productId: string; price: string; selected: boolean; priceMissing: boolean };
export type ImportSection = { id: string; name: string; page: number; selected: boolean; items: ImportItem[] };
export type ReviewedMenuImport = { name: string; sections: ImportSection[]; mode: 'replace' | 'append' };

const normalizeName = (name: string) => name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
export function matchImportedItem(name: string, products: MenuProduct[]) {
    const matches = products.filter(product => normalizeName(product.name) === normalizeName(name));
    // Ambiguous variants must be selected by the user rather than guessed.
    return matches.length === 1 ? matches[0] : undefined;
}
export function reviewImportedMenu(source: ExtractedMenu, products: MenuProduct[], prices: MenuPrices): ImportSection[] {
    return source.sections.map(section => ({ ...section, id: crypto.randomUUID(), selected: true, items: section.items.map(item => {
        const match = matchImportedItem(item.name, products);
        return { id: crypto.randomUUID(), name: item.name, productId: match?.id ?? '', selected: true, priceMissing: item.price === null, price: item.price === null ? match ? String(menuItemPrice(match, prices)) : '' : String(item.price) };
    }) }));
}
export function validateReviewedImport(sections: ImportSection[], products: MenuProduct[]) {
    const seen = new Set<string>();
    let count = 0;
    for (const section of sections.filter(value => value.selected)) {
        if (!section.name.trim() || section.name.trim().length > 160 || !Number.isInteger(section.page) || section.page < 1 || section.page > 20) return 'Enter a section name and a page from 1 to 20.';
        for (const item of section.items.filter(value => value.selected)) {
            if (!products.some(product => product.id === item.productId)) return 'Match every selected item to inventory, or untick items you want to leave out.';
            if (seen.has(item.productId)) return 'The same inventory item is selected more than once. Choose another item or untick the duplicate.';
            if (!item.price.trim() || !Number.isFinite(Number(item.price) * 100) || Number(item.price) < 0) return 'Enter a valid menu price for every selected item.';
            seen.add(item.productId); count++;
        }
    }
    if (!count) return 'Select at least one item to import.';
}

export function buildImportedMenu(review: ReviewedMenuImport, design: MenuDesign, existing: { name: string; content: MenuBlock[]; productIds: string[]; productPrices: MenuPrices; pageCount: number }, products: MenuProduct[]) {
    const error = validateReviewedImport(review.sections, products);
    if (error) throw new Error(error);
    const name = (review.mode === 'append' ? existing.name.trim() || review.name.trim() : review.name.trim()) || 'Untitled menu';
    if (name.length > 100) throw new Error('Use a menu name up to 100 characters.');
    const offset = review.mode === 'append' ? existing.pageCount : 0;
    const prices: MenuPrices = review.mode === 'append' ? { ...existing.productPrices } : {};
    const importedIds: string[] = [];
    const blocks: MenuBlock[] = [];
    let count = 1;
    for (const section of review.sections.filter(value => value.selected)) {
        const items = section.items.filter(item => item.selected);
        if (!items.length) continue;
        for (const item of items) { importedIds.push(item.productId); prices[item.productId] = Math.round(Number(item.price) * 100) / 100; }
        for (let start = 0; start < items.length; start += 15) {
            const page = section.page + offset + Math.floor(start / 15);
            if (page > 20) throw new Error('This import needs more than 20 pages. Import fewer sections or items.');
            const preset = createTemplatePage(design, name, page).filter(block => block.type === 'section');
            const style = preset.find(block => normalizeName(block.text) === normalizeName(section.name)) ?? preset[0];
            blocks.push({ ...newMenuBlock('section', design.accentColor), ...(style ? { fontSize: style.fontSize, color: style.color, align: style.align, span: style.span } : { span: 6 as const }), text: start ? `${section.name.trim().slice(0, 148)} (continued)` : section.name.trim(), page, productIds: items.slice(start, start + 15).map(item => item.productId) });
            count = Math.max(count, page);
        }
    }
    const headers = Array.from({ length: count - offset }, (_, index) => {
        const page = index + offset + 1;
        const template = createTemplatePage(design, name, page).filter(block => block.type !== 'section');
        return template.length ? template : [{ ...newMenuBlock(page === 1 ? 'title' : 'heading', design.textColor, page === 1 ? name : 'More from our menu'), page, align: 'center' as const, span: 6 as const }];
    }).flat();
    const previous = review.mode === 'append' ? existing.content.map(block => ({ ...block, productIds: block.productIds.filter(id => !importedIds.includes(id)) })) : [];
    const content = [...previous, ...headers, ...blocks].sort((a, b) => (a.page ?? 1) - (b.page ?? 1));
    if (content.length > 100) throw new Error('This import exceeds the 100-element limit. Choose fewer sections or pages.');
    return { name, content, pageCount: count, productIds: [...new Set([...(review.mode === 'append' ? existing.productIds : []), ...importedIds])], productPrices: prices };
}
