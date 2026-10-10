import { useState, type ReactNode } from 'react';
import { Button, Stack } from '@mui/material';
import MenuSheet from './MenuSheet';
import PrintMenuButton from './PrintMenuButton';
import { MenuPageContent } from './MenuPageContent';
import { contrastingText, type MenuDesign } from './menuTemplates';
import { menuPageCount, type MenuBlock, type MenuProduct } from './menuContent';
import type { MenuDeal } from './aiMenu';

export default function MenuContent({ content, products, design, pageCount = 1, renderProduct, deals }: { content: MenuBlock[]; products: MenuProduct[]; design: MenuDesign; pageCount?: number; renderProduct?: (product: MenuProduct) => ReactNode; deals?: MenuDeal[] }) {
    const [selectedPage, setPage] = useState(1);
    const count = menuPageCount(content, pageCount);
    const page = Math.min(selectedPage, count);
    return <Stack spacing={2}>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
            {count > 1 && <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" aria-label="Menu pages">{Array.from({ length: count }, (_, index) => <Button key={index} variant={page === index + 1 ? 'contained' : 'outlined'} aria-pressed={page === index + 1} onClick={() => setPage(index + 1)} sx={{ color: page === index + 1 ? contrastingText(design.accentColor) : design.accentColor, bgcolor: page === index + 1 ? design.accentColor : 'transparent', borderColor: design.accentColor }}>Page {index + 1}</Button>)}</Stack>}
            <PrintMenuButton content={content} products={products} design={design} pageCount={count} deals={deals} />
        </Stack>
        <MenuSheet design={design}><MenuPageContent content={content} products={products} design={design} page={page} renderProduct={renderProduct} /></MenuSheet>
    </Stack>;
}
