import { menuPageCount, newMenuBlock, type MenuBlock, type MenuPrices } from './menuContent';
import { createTemplatePage, MENU_LAYOUTS } from './menuLayouts';
import type { MenuDesign } from './menuTemplates';

export type MenuDeal = { id: string; name: string; productIds: string[]; dealPrice: number };
export type PendingMenuDeal = MenuDeal & { reason: string };
export type AIMenuSuggestion = {
    summary: string;
    sections: Array<{ name: string; reason: string; productIds: string[] }>;
    deals: Array<{ name: string; reason: string; productIds: string[]; dealPrice: number; regularPrice: number }>;
};

// Pure draft transformation: a failed size check never partially applies a suggestion.
export function applyAISections(content: MenuBlock[], productIds: string[], prices: MenuPrices, pageCount: number, sections: AIMenuSuggestion['sections'], design: MenuDesign, name: string) {
    const selected = sections.flatMap(section => section.productIds);
    if (new Set(selected).size !== selected.length) throw new Error('An item can only belong to one suggested section.');
    let next = content.map(block => ({ ...block, productIds: block.productIds.filter(id => !selected.includes(id)) }));
    let count = menuPageCount(next, pageCount);
    const span = next.find(block => block.type === 'section')?.span ?? MENU_LAYOUTS[design.templateId]?.sections[0].span ?? 6;
    const maxSections = (6 / span) * 2;
    for (const section of sections) {
        const remaining = [...section.productIds];
        let page = 1;
        while (remaining.length) {
            let target = next.find(block => block.type === 'section' && (block.page ?? 1) === page && block.text.trim().toLocaleLowerCase() === section.name.trim().toLocaleLowerCase() && block.productIds.length < 15);
            if (!target) {
                const onPage = next.filter(block => block.type === 'section' && (block.page ?? 1) === page);
                // Keep existing sections intact. A newly seeded template page may reuse an empty slot.
                if (page > pageCount) target = onPage.find(block => !block.productIds.length);
                if (target) target.text = section.name.trim();
                else if (onPage.length < maxSections) {
                    target = { ...newMenuBlock('section', design.accentColor, section.name.trim()), page, span };
                    next.push(target);
                }
            }
            if (target) {
                const items = remaining.splice(0, 15 - target.productIds.length);
                target.productIds.push(...items);
            }
            if (!remaining.length) break;
            page++;
            if (page > 20) throw new Error('These suggestions need more than 20 pages. Choose fewer items.');
            if (page > count) {
                next = [...next, ...createTemplatePage(design, name, page)];
                count = page;
            }
        }
    }
    if (next.length > 100) throw new Error('These suggestions exceed the 100-element limit. Choose fewer sections or items.');
    return { content: next, productIds: [...new Set([...productIds, ...selected])], productPrices: { ...prices }, pageCount: count };
}
