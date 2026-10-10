import type { ReactNode } from 'react';
import { Box, Stack, Typography, alpha } from '@mui/material';
import { menuFont, type MenuDesign } from './menuTemplates';
import { sectionProducts, unsectionedProducts, type MenuBlock, type MenuProduct } from './menuContent';

export function MenuBlockText({ block, design }: { block: MenuBlock; design: MenuDesign }) {
    return <Typography component={block.type === 'title' ? 'h1' : block.type === 'label' ? 'p' : 'h2'} sx={{ m: 0, color: block.color, fontSize: block.fontSize, lineHeight: 1.25, textAlign: block.align, fontWeight: block.type === 'label' ? 400 : 800, fontFamily: block.type === 'label' ? 'inherit' : menuFont(design), whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{block.text}</Typography>;
}

export function MenuProductCard({ product, design, priceControl }: { product: MenuProduct; design: MenuDesign; priceControl?: ReactNode }) {
    return <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0, minHeight: 30, color: design.textColor, borderBottom: '1px solid', borderColor: alpha(design.textColor, .1) }}>
        <Typography sx={{ flex: 1, minWidth: 0, fontSize: 14, lineHeight: 1.3, overflowWrap: 'anywhere' }}>{product.name}</Typography>
        {priceControl || <Typography sx={{ fontSize: 14, fontWeight: 700, flexShrink: 0 }}>Rs. {product.salePrice ?? product.price ?? 0}</Typography>}
    </Stack>;
}

export function MenuProductItems({ products, design, renderProduct }: { products: MenuProduct[]; design: MenuDesign; renderProduct?: (product: MenuProduct) => ReactNode }) {
    return <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 0 }}>{products.map(product => <Box key={product.id} sx={{ minWidth: 0 }}>{renderProduct ? renderProduct(product) : <MenuProductCard product={product} design={design} />}</Box>)}</Box>;
}

export function MenuPageContent({ content, products, design, page, print = false, renderProduct }: { content: MenuBlock[]; products: MenuProduct[]; design: MenuDesign; page: number; print?: boolean; renderProduct?: (product: MenuProduct) => ReactNode }) {
    const remaining = unsectionedProducts(content, products);
    return <>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', columnGap: 4, rowGap: 2.5, alignItems: 'start' }}>
            {content.filter(block => (block.page ?? 1) === page).map(block => <Box key={block.id} component={block.type === 'section' ? 'section' : 'div'} sx={{ minWidth: 0, gridColumn: print ? `span ${block.span ?? 6}` : { xs: 'span 6', sm: `span ${block.span ?? 6}` } }}>
                <MenuBlockText block={block} design={design} />
                {block.type === 'section' && <Box sx={{ mt: 1 }}><MenuProductItems products={sectionProducts(block, products)} design={design} renderProduct={renderProduct} /></Box>}
            </Box>)}
        </Box>
        {page === 1 && remaining.length > 0 && <Box component="section" sx={{ mt: 3 }}><Typography component="h2" fontWeight={800} sx={{ mb: 1.5, color: design.accentColor, fontFamily: menuFont(design) }}>Menu items</Typography><MenuProductItems products={remaining} design={design} renderProduct={renderProduct} /></Box>}
    </>;
}
