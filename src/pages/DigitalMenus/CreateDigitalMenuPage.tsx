import React from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Stack, Step, StepLabel, Stepper, TextField, Typography } from '@mui/material';
import { ArrowLeft, LayoutTemplate, Save, Send, Trash2 } from 'lucide-react';
import { isAxiosError } from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';
import { fetchProducts } from '../../features/inventory/inventorySlice';
import type { AppDispatch, RootState } from '../../store';
import MenuDesignPicker, { MenuPreview } from './MenuDesignPicker';
import MenuBuilder from './MenuBuilder';
import MenuStatus from './MenuStatus';
import { ensureMenuTitle, menuItemPrice, menuPageCount, type MenuBlock, type MenuPrices } from './menuContent';
import { PLAIN_MENU_DESIGN, MENU_TEMPLATES, getMenuDesign, type MenuDesign } from './menuTemplates';
import { createMenuLayout, MENU_LAYOUTS } from './menuLayouts';
import AIMenuAssistant from './AIMenuAssistant';
import { applyAISections, type AIMenuSuggestion, type MenuDeal, type PendingMenuDeal } from './aiMenu';
import ImportMenuButton from './ImportMenuButton';
import { buildImportedMenu, type ReviewedMenuImport } from './oldMenuImport';

export default function CreateDigitalMenuPage() {
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();
    const { id: editingId } = useParams();
    const [savedId, setSavedId] = React.useState(editingId);
    const [published, setPublished] = React.useState(false);
    const [savingAction, setSavingAction] = React.useState<'draft' | 'publish'>('draft');
    const [loadingMenu, setLoadingMenu] = React.useState(Boolean(editingId));
    const [menuLoaded, setMenuLoaded] = React.useState(!editingId);
    const { products, loading, error: productsError } = useSelector((state: RootState) => state.inventory);
    const [step, setStep] = React.useState(0);
    const [design, setDesign] = React.useState<MenuDesign>({ ...PLAIN_MENU_DESIGN });
    const [name, setName] = React.useState('');
    const [productIds, setProductIds] = React.useState<string[]>([]);
    const [productPrices, setProductPrices] = React.useState<MenuPrices>({});
    const [content, setContent] = React.useState<MenuBlock[]>([]);
    const [pageCount, setPageCount] = React.useState(1);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState('');
    const [layoutStarted, setLayoutStarted] = React.useState(false);
    const [pendingDesign, setPendingDesign] = React.useState<MenuDesign | null>(null);
    const [pendingDeals, setPendingDeals] = React.useState<PendingMenuDeal[]>([]);
    const [savedDeals, setSavedDeals] = React.useState<MenuDeal[]>([]);
    const [aiNotice, setAiNotice] = React.useState('');

    React.useEffect(() => { void dispatch(fetchProducts(undefined)); }, [dispatch]);
    React.useEffect(() => {
        if (step === 1) setContent(value => ensureMenuTitle(value, name, design.textColor));
    }, [step, name, design.textColor]);

    React.useEffect(() => {
        let cancelled = false;
        if (!editingId) return;
        api.get<Array<{ _id: string; name: string; productIds: string[]; productPrices?: MenuPrices; design?: MenuDesign; content?: MenuBlock[]; pageCount?: number; menuType?: string; sourceMenuId?: string; status?: string; dealPrice?: number; isActive?: boolean }>>('/digital-menus').then(({ data }) => {
            if (cancelled) return;
            const menu = data.find(value => value._id === editingId && value.menuType !== 'deal' && !value.sourceMenuId);
            if (!menu) { setError('This menu is unavailable.'); return; }
            setName(menu.name);
            setSavedDeals(data.filter(item => item.menuType === 'deal' && item.sourceMenuId === editingId && item.isActive !== false).map(item => ({ id: item._id, name: item.name, productIds: item.productIds, dealPrice: item.dealPrice ?? 0 })));
            setPublished(menu.status === 'published');
            setProductIds(menu.productIds);
            setProductPrices(menu.productPrices ?? {});
            setDesign(getMenuDesign(menu.design));
            setContent(menu.content?.length ? ensureMenuTitle(menu.content, menu.name, getMenuDesign(menu.design).textColor) : createMenuLayout(getMenuDesign(menu.design), menu.name, menu.productIds, [], menu.pageCount ?? 1));
            setPageCount(menuPageCount(menu.content || [], menu.pageCount));
            setStep(1);
            setMenuLoaded(true);
            setLayoutStarted(true);
        }).catch((loadError: unknown) => {
            if (!cancelled) setError(isAxiosError<{ message?: string }>(loadError) ? loadError.response?.data?.message || 'Unable to load this menu.' : 'Unable to load this menu.');
        }).finally(() => { if (!cancelled) setLoadingMenu(false); });
        return () => { cancelled = true; };
    }, [editingId]);

    const selectedProducts = products.filter(product => productIds.includes(product.id)).map(product => ({ ...product, salePrice: menuItemPrice(product, productPrices) }));
    const invalidPrices = Object.values(productPrices).some(price => !Number.isFinite(price) || price < 0 || !Number.isFinite(price * 100));
    const invalidDeals = pendingDeals.some(deal => !deal.name.trim() || !Number.isFinite(deal.dealPrice * 100) || deal.dealPrice < 0);
    const applyImport = (review: ReviewedMenuImport) => {
        try {
            const result = buildImportedMenu(review, design, { name, content, productIds, productPrices, pageCount }, products);
            setName(result.name); setContent(result.content); setProductIds(result.productIds); setProductPrices(result.productPrices); setPageCount(result.pageCount);
            setLayoutStarted(true); setStep(1);
            setAiNotice('Your old menu is now an editable draft. Change its design, headings, sections, and prices before saving or publishing.');
        } catch (err) { return err instanceof Error ? err.message : 'Unable to import this menu.'; }
    };
    const importButton = <ImportMenuButton products={products} productPrices={productPrices} currentName={name} loading={loading} productsError={productsError} onRetry={() => void dispatch(fetchProducts({ force: true }))} onApply={applyImport} disabled={saving} />;
    const applyAI = (suggestion: AIMenuSuggestion) => {
        try {
            const result = applyAISections(content, productIds, productPrices, pageCount, suggestion.sections, design, name);
            const signature = (deal: { name: string; productIds: string[] }) => `${deal.name.trim().toLocaleLowerCase()}\u0000${[...deal.productIds].sort().join('\u0000')}`;
            const known = new Set([...savedDeals, ...pendingDeals].map(signature));
            const addedDeals = suggestion.deals.filter(deal => !known.has(signature(deal))).map(deal => ({ id: crypto.randomUUID(), name: deal.name, productIds: deal.productIds, dealPrice: deal.dealPrice, reason: deal.reason }));
            setContent(result.content); setProductIds(result.productIds); setProductPrices(result.productPrices); setPageCount(result.pageCount);
            setPendingDeals(value => [...value, ...addedDeals]);
            setAiNotice(`Added ${suggestion.sections.length} suggested sections and ${addedDeals.length} deals to your draft. You can edit them before saving.`);
        } catch (err) { return err instanceof Error ? err.message : 'Unable to apply suggestions.'; }
    };
    const changeProducts = (ids: string[]) => {
        setProductIds(ids);
        setProductPrices(value => Object.fromEntries(Object.entries(value).filter(([id]) => ids.includes(id))));
    };
    const applyDesign = (nextDesign: MenuDesign) => {
        setDesign(nextDesign);
        setContent(createMenuLayout(nextDesign, name, productIds, products, pageCount));
        setPendingDesign(null);
    };
    const changeDesign = (nextDesign: MenuDesign) => {
        if (nextDesign.templateId === design.templateId) { setDesign(nextDesign); return; }
        if (layoutStarted) { setPendingDesign(nextDesign); return; }
        applyDesign(nextDesign);
    };
    const pendingBlockCount = pendingDesign ? MENU_LAYOUTS[pendingDesign.templateId] ? (3 + MENU_LAYOUTS[pendingDesign.templateId].sections.length) * pageCount : 1 + (productIds.length ? 1 : 0) : 0;
    const changeStep = (nextStep: number) => {
        if (nextStep === 1) {
            if (!layoutStarted) setContent(createMenuLayout(design, name, productIds, products, pageCount));
            else setContent(value => ensureMenuTitle(value, name, design.textColor));
            setLayoutStarted(true);
        }
        setStep(nextStep);
        window.scrollTo({ top: 0, behavior: 'instant' });
    };
    const templateName = design.templateId === 'custom' ? 'Custom menu' : MENU_TEMPLATES.find(template => template.design.templateId === design.templateId)?.name;

    const save = async (action: 'draft' | 'publish') => {
        setSaving(true);
        setSavingAction(action);
        setError('');
        try {
            const menuName = name.trim() || 'Untitled menu';
            const data = { name: menuName, productIds, productPrices, menuType: 'menu', status: 'draft', design, content: content.map(block => block.type === 'title' ? { ...block, text: menuName } : block), pageCount };
            const response = savedId ? await api.put(`/digital-menus/${savedId}`, data) : await api.post('/digital-menus', data);
            const id = response.data._id as string;
            setSavedId(id);
            for (const deal of pendingDeals) {
                const { data: saved } = await api.post('/digital-menus', { menuType: 'deal', sourceMenuId: id, clientRequestId: deal.id, name: deal.name.trim(), productIds: deal.productIds, dealPrice: deal.dealPrice });
                setPendingDeals(value => value.filter(item => item.id !== deal.id));
                setSavedDeals(value => [...value.filter(item => item.id !== saved._id), { ...deal, id: saved._id }]);
            }
            if (action === 'publish') await api.post(`/digital-menus/${id}/publish`);
            navigate('/digital-menus');
        } catch (saveError: unknown) {
            setError(isAxiosError<{ message?: string }>(saveError) ? saveError.response?.data?.message || 'Unable to save this menu.' : 'Unable to save this menu.');
        } finally {
            setSaving(false);
        }
    };

    if (loadingMenu) return <Box sx={{py:6,textAlign:'center'}}><CircularProgress /><Typography sx={{mt:2}}>Loading your menu...</Typography></Box>;
    if (!menuLoaded) return <Box><Button startIcon={<ArrowLeft size={18}/>} onClick={()=>navigate('/digital-menus')}>Back to Digital Menus</Button><Alert severity="error" sx={{mt:2}}>{error || 'This menu is unavailable.'}</Alert></Box>;

    return <Box>
        <Button startIcon={<ArrowLeft size={18} />} disabled={saving} onClick={() => navigate('/digital-menus')} sx={{ mb: 2 }}>Back to Digital Menus</Button>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2} sx={{ mb: 3 }}>
            <Box><Typography component="h1" variant="h4" fontWeight={900}>{step === 0 ? editingId ? 'Edit Menu' : 'Create Menu' : 'Make your menu'}</Typography><Typography color="text.secondary" sx={{ mt: .75 }}>{step === 0 ? 'Choose a template or continue with a plain card to make your own menu.' : 'Arrange sections, headings, labels, and products to make your menu.'}</Typography></Box>
            {step === 1 && <Stack direction="row" gap={1} flexWrap="wrap" sx={{ alignSelf: 'start', flexShrink: 0 }}>{importButton}<Button variant="outlined" startIcon={<LayoutTemplate size={18} />} disabled={saving} onClick={() => changeStep(0)}>Menu Templates</Button></Stack>}
        </Stack>
        <Stepper activeStep={step} sx={{ maxWidth: 640, mb: 3 }}><Step><StepLabel>Choose your menu</StepLabel></Step><Step><StepLabel>Make your menu</StepLabel></Step></Stepper>
        {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}
        {step === 0 ? <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
            <MenuDesignPicker design={design} onChange={changeDesign} name={name} products={selectedProducts} content={content} initialView="templates" extraAction={importButton} />
        </Paper> : <Paper variant="outlined" sx={{ width: '100%', p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'start', sm: 'center' }} gap={1} sx={{ mb: 2 }}><Typography component="h2" variant="h5" fontWeight={800}>Your menu card</Typography><Stack direction="row" spacing={1} useFlexGap flexWrap="wrap"><MenuStatus published={published} /><Chip size="small" label={templateName} /><Chip size="small" variant="outlined" label={`${productIds.length} products`} /></Stack></Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{published ? 'You are editing a draft. Your published menu stays live until you publish these changes.' : 'Save your work as a draft, or publish it for customers. Publishing replaces the current active menu.'}</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
                <TextField fullWidth required label="Menu name" placeholder="My restaurant menu" value={name} onChange={event => setName(event.target.value)} disabled={saving} slotProps={{ htmlInput: { maxLength: 100 } }} sx={{ flex: 1 }} />
            </Stack>
            {aiNotice && <Alert severity="success" onClose={() => setAiNotice('')} sx={{ mb: 2 }}>{aiNotice}</Alert>}
            <MenuBuilder design={design} name={name} onNameChange={setName} content={content} onChange={setContent} pageCount={pageCount} onPageCountChange={setPageCount} products={products} productIds={productIds} onProductsChange={changeProducts} productPrices={productPrices} onPricesChange={setProductPrices} loading={loading} productsError={productsError} onRetry={()=>void dispatch(fetchProducts({force:true}))} disabled={saving} deals={[...savedDeals, ...pendingDeals]} aiAssistant={<AIMenuAssistant products={products} productPrices={productPrices} name={name} existingSections={[...new Set(content.filter(block => block.type === 'section').map(block => block.text))]} loading={loading} productsError={productsError} onRetry={() => void dispatch(fetchProducts({ force: true }))} disabled={saving} onApply={applyAI} />} />
            {Boolean(savedDeals.length || pendingDeals.length) && <Stack spacing={2} sx={{ mt: 3 }}>
                <Typography component="h3" variant="h6">Deals / combos</Typography>
                {savedDeals.map(deal => <Stack key={deal.id} direction="row" justifyContent="space-between" gap={2}><Box><Typography fontWeight={600}>{deal.name}</Typography><Typography variant="body2" color="text.secondary">{deal.productIds.map(id => products.find(product => product.id === id)?.name || id).join(' + ')}</Typography></Box><Typography sx={{ whiteSpace: 'nowrap' }}>Rs. {deal.dealPrice.toLocaleString()}</Typography></Stack>)}
                {pendingDeals.map(deal => <Box key={deal.id} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 2 }}><Stack direction={{ xs: 'column', sm: 'row' }} gap={2} alignItems={{ sm: 'center' }}>
                    <TextField label="Combo name" fullWidth size="small" value={deal.name} disabled={saving} slotProps={{ htmlInput: { maxLength: 100 } }} onChange={event => setPendingDeals(value => value.map(item => item.id === deal.id ? { ...item, name: event.target.value } : item))} />
                    <TextField label="Combo price (Rs.)" type="number" size="small" value={Number.isNaN(deal.dealPrice) ? '' : deal.dealPrice} disabled={saving} error={!Number.isFinite(deal.dealPrice * 100) || deal.dealPrice < 0} slotProps={{ htmlInput: { min: 0, step: .01 } }} sx={{ minWidth: 180 }} onChange={event => setPendingDeals(value => value.map(item => item.id === deal.id ? { ...item, dealPrice: event.target.value.trim() ? Number(event.target.value) : NaN } : item))} />
                    <Button aria-label={`Remove combo ${deal.name}`} disabled={saving} onClick={() => setPendingDeals(value => value.filter(item => item.id !== deal.id))}><Trash2 size={18} /></Button>
                </Stack><Typography variant="body2" sx={{ mt: 1 }}>{deal.productIds.map(id => products.find(product => product.id === id)?.name || id).join(' + ')}</Typography><Typography variant="body2" color="text.secondary">{deal.reason} · Saves with this draft.</Typography></Box>)}
            </Stack>}
        </Paper>}
        <Stack direction="row" justifyContent="flex-end" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 3, pr: { xs: 6, sm: 8 } }}>
            {step === 1 && <Button disabled={saving} onClick={() => changeStep(0)}>Back to design</Button>}
            {step === 0 ? <Button variant="contained" onClick={() => changeStep(1)}>Next: Make Your Menu</Button> : <><Button variant="outlined" startIcon={<Save size={18} />} disabled={saving || invalidPrices || invalidDeals} onClick={() => void save('draft')}>{saving && savingAction === 'draft' ? 'Saving draft...' : 'Save Draft'}</Button><Button variant="contained" startIcon={<Send size={18} />} disabled={saving || invalidPrices || invalidDeals || loading || !name.trim() || !productIds.length || content.some(block=>block.type !== 'title' && !block.text.trim())} onClick={() => void save('publish')}>{saving && savingAction === 'publish' ? 'Publishing...' : published ? 'Publish changes' : 'Publish'}</Button></>}
        </Stack>
        <Dialog open={pendingDesign !== null} onClose={() => setPendingDesign(null)} fullWidth maxWidth="md">
            <DialogTitle>{pendingDesign?.templateId === 'custom' ? 'Start a custom layout?' : 'Apply this template?'}</DialogTitle>
            <DialogContent><Stack spacing={2}><Typography>This replaces your current headings, sections, and positions. Your menu name, selected products, and {pageCount === 1 ? 'page' : `${pageCount} pages`} will be kept. You can edit every part of the new layout.</Typography>
                {pendingDesign && <MenuPreview design={pendingDesign} name={name} products={selectedProducts} />}
                {pendingBlockCount > 100 && <Alert severity="warning">This template needs {pendingBlockCount} elements across your pages. The limit is 100. Reduce the number of pages before applying it.</Alert>}
            </Stack></DialogContent>
            <DialogActions><Button onClick={() => setPendingDesign(null)}>Keep current layout</Button><Button variant="contained" disabled={!pendingDesign || pendingBlockCount > 100} onClick={() => { if (pendingDesign) applyDesign(pendingDesign); }}>{pendingDesign?.templateId === 'custom' ? 'Start custom layout' : 'Apply template'}</Button></DialogActions>
        </Dialog>
    </Box>;
}
