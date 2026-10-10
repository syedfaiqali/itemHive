export interface MenuBlock {
    id: string;
    type: 'title' | 'section' | 'heading' | 'label';
    text: string;
    fontSize: number;
    color: string;
    align: 'left' | 'center' | 'right';
    productIds: string[];
    page?: number;
    span?: 2 | 3 | 6;
}

export const parseMenuPageCount = (value: unknown): number | undefined | null => value === undefined ? undefined : typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 20 ? value : null;

// The menu's products are authoritative; layout cannot introduce extra items.
export const parseMenuContent = (value: unknown, productIds: string[], allowEmptyText = false): MenuBlock[] | null => {
    if (!Array.isArray(value) || value.length > 100) return null;
    const result: MenuBlock[] = [];
    const ids = new Set<string>();
    const assignedProducts = new Set<string>();
    const allowedProducts = new Set(productIds);
    let hasTitle = false;
    for (const raw of value) {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
        const block = raw as Record<string, unknown>;
        if (typeof block.id !== 'string' || !/^[a-z0-9_-]{1,80}$/i.test(block.id) || ids.has(block.id)) return null;
        if (!['title', 'section', 'heading', 'label'].includes(String(block.type))) return null;
        if (block.type === 'title') { if (hasTitle) return null; hasTitle = true; }
        if (typeof block.text !== 'string' || (!allowEmptyText && !block.text.trim()) || block.text.length > (block.type === 'label' ? 500 : 160)) return null;
        if (typeof block.fontSize !== 'number' || !Number.isFinite(block.fontSize) || block.fontSize < 10 || block.fontSize > 96) return null;
        if (typeof block.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(block.color)) return null;
        if (!['left', 'center', 'right'].includes(String(block.align))) return null;
        if (block.page !== undefined && (typeof block.page !== 'number' || !Number.isInteger(block.page) || block.page < 1 || block.page > 20)) return null;
        if (block.span !== undefined && ![2, 3, 6].includes(Number(block.span))) return null;
        if (block.span !== undefined && typeof block.span !== 'number') return null;
        if (!Array.isArray(block.productIds) || block.productIds.length > 1000 || (block.type !== 'section' && block.productIds.length)) return null;
        const items: string[] = [];
        for (const id of block.productIds) {
            if (typeof id !== 'string' || !allowedProducts.has(id) || assignedProducts.has(id)) return null;
            assignedProducts.add(id);
            items.push(id);
        }
        ids.add(block.id);
        result.push({ id: block.id, type: block.type as MenuBlock['type'], text: block.text.trim(), fontSize: block.fontSize, color: block.color, align: block.align as MenuBlock['align'], productIds: items, ...(block.page !== undefined ? { page: block.page as number } : {}), ...(block.span !== undefined ? { span: block.span as MenuBlock['span'] } : {}) });
    }
    return result;
};
