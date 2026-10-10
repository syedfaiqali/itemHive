import React from 'react';
import { Alert, Autocomplete, Box, Button, Checkbox, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import { Sparkles } from 'lucide-react';
import { isAxiosError } from 'axios';
import api from '../../api/axios';
import { menuItemPrice, type MenuPrices, type MenuProduct } from './menuContent';
import type { AIMenuSuggestion } from './aiMenu';

type SectionReview = AIMenuSuggestion['sections'][number] & { selected: boolean };
type DealReview = Omit<AIMenuSuggestion['deals'][number], 'dealPrice'> & { selected: boolean; price: string };
type Props = {
    products: MenuProduct[]; productPrices: MenuPrices; name: string; existingSections: string[];
    disabled?: boolean; loading: boolean; productsError: string | null; onRetry: () => void;
    onApply: (suggestions: AIMenuSuggestion) => string | undefined;
};

export default function AIMenuAssistant({ products, productPrices, name, existingSections, disabled, loading, productsError, onRetry, onApply }: Props) {
    const [open, setOpen] = React.useState(false);
    const [inventoryIds, setInventoryIds] = React.useState<string[]>([]);
    const [brief, setBrief] = React.useState('');
    const [includeDeals, setIncludeDeals] = React.useState(false);
    const [busy, setBusy] = React.useState(false);
    const [error, setError] = React.useState('');
    const [summary, setSummary] = React.useState('');
    const [sections, setSections] = React.useState<SectionReview[]>([]);
    const [deals, setDeals] = React.useState<DealReview[]>([]);
    const [hasResults, setHasResults] = React.useState(false);
    const request = React.useRef<AbortController | null>(null);
    React.useEffect(() => () => { request.current?.abort(); }, []);
    const close = () => { request.current?.abort(); request.current = null; setBusy(false); setOpen(false); };
    const start = () => {
        setInventoryIds(products.slice(0, 200).map(product => product.id));
        setError(''); setHasResults(false); setSections([]); setDeals([]); setSummary(''); setOpen(true);
    };
    const generate = async () => {
        const controller = new AbortController();
        request.current = controller;
        setBusy(true); setError(''); setHasResults(false);
        try {
            const { data } = await api.post<AIMenuSuggestion>('/digital-menus/ai/suggest', {
                productIds: inventoryIds, menuName: name.trim(), brief: brief.trim(), includeDeals,
                existingSections, productPrices: Object.fromEntries(Object.entries(productPrices).filter(([id]) => inventoryIds.includes(id))),
            }, { signal: controller.signal, timeout: 60000 });
            if (request.current !== controller) return;
            setSummary(data.summary);
            setSections(data.sections.map(section => ({ ...section, selected: true })));
            setDeals(data.deals.map(deal => ({ ...deal, selected: true, price: String(deal.dealPrice) })));
            setHasResults(true);
        } catch (err: unknown) {
            if (controller.signal.aborted || request.current !== controller) return;
            setError(isAxiosError<{ message?: string }>(err) ? err.response?.data?.message || 'Unable to reach the AI assistant. Please try again.' : 'Unable to generate menu suggestions.');
        } finally {
            if (request.current === controller) { request.current = null; setBusy(false); }
        }
    };
    const reviewedSections = sections.filter(section => section.selected && section.productIds.length);
    const reviewedDeals = includeDeals ? deals.filter(deal => deal.selected) : [];
    const invalid = reviewedSections.some(section => !section.name.trim()) || reviewedDeals.some(deal => !deal.name.trim() || !deal.price.trim() || !Number.isFinite(Number(deal.price) * 100) || Number(deal.price) < 0);
    const apply = () => {
        const result = onApply({ summary, sections: reviewedSections.map(({ name, reason, productIds }) => ({ name: name.trim(), reason, productIds })), deals: reviewedDeals.map(({ name, reason, productIds, price, regularPrice }) => ({ name: name.trim(), reason, productIds, dealPrice: Math.round(Number(price) * 100) / 100, regularPrice })) });
        if (result) setError(result); else close();
    };
    return <>
        <Button variant="outlined" startIcon={<Sparkles size={18} />} onClick={start} disabled={disabled || loading}>AI menu assistant</Button>
        <Dialog open={open} onClose={close} fullWidth maxWidth="md">
            <DialogTitle>Build your menu with AI</DialogTitle>
            <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
                <Typography variant="body2" color="text.secondary">Choose inventory items. AI will suggest sections and optional deals for you to review. It uses item names, categories, and selling prices with Google AI.</Typography>
                {productsError && <Alert severity="error" action={<Button onClick={onRetry}>Retry</Button>}>{productsError}</Alert>}
                <Autocomplete multiple disableCloseOnSelect limitTags={2} options={products} value={products.filter(product => inventoryIds.includes(product.id))} isOptionEqualToValue={(a, b) => a.id === b.id} getOptionLabel={product => product.name} disabled={busy} onChange={(_, selected) => { setInventoryIds(selected.map(product => product.id)); setHasResults(false); }} renderOption={(props, option, { selected }) => { const { key, ...rest } = props; return <li key={key} {...rest}><Checkbox checked={selected} sx={{ mr: 1 }} />{option.name}</li>; }} renderInput={params => <TextField {...params} label="Inventory for this menu" helperText={`${inventoryIds.length} selected · maximum 200`} error={inventoryIds.length > 200} />} />
                <Stack direction="row" spacing={1}><Button size="small" disabled={busy} onClick={() => { setInventoryIds(products.slice(0, 200).map(product => product.id)); setHasResults(false); }}>Select {products.length > 200 ? 'first 200' : 'all'}</Button><Button size="small" disabled={busy} onClick={() => { setInventoryIds([]); setHasResults(false); }}>Clear selection</Button></Stack>
                <TextField label="Tell AI about your menu" placeholder="For example: a pizza takeaway menu with drinks and family combos" multiline minRows={2} value={brief} disabled={busy} onChange={event => { setBrief(event.target.value); setHasResults(false); }} slotProps={{ htmlInput: { maxLength: 1000 } }} />
                <FormControlLabel control={<Checkbox checked={includeDeals} disabled={busy} onChange={event => { setIncludeDeals(event.target.checked); setHasResults(false); }} />} label="Suggest deals / combos" />
                <Button variant="contained" startIcon={busy ? <CircularProgress size={17} color="inherit" /> : <Sparkles size={18} />} disabled={busy || loading || Boolean(productsError) || !inventoryIds.length || inventoryIds.length > 200} onClick={() => void generate()} sx={{ alignSelf: 'start' }}>{busy ? 'Analyzing your inventory...' : hasResults ? 'Generate again' : 'Generate suggestions'}</Button>
                {error && <Alert severity="error">{error}</Alert>}
                {hasResults && <>
                    <Alert severity="info">{summary}</Alert>
                    <Typography component="h3" variant="h6">Suggested sections</Typography>
                    {!sections.length && <Typography>No suitable sections found. Choose different inventory items or update your instructions.</Typography>}
                    {sections.map((section, index) => <Box key={index} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 2 }}>
                        <Stack direction="row" alignItems="center" spacing={1}><Checkbox checked={section.selected} inputProps={{ 'aria-label': `Include section ${section.name}` }} onChange={event => setSections(value => value.map((item, i) => i === index ? { ...item, selected: event.target.checked } : item))} /><TextField fullWidth size="small" label="Section name" value={section.name} slotProps={{ htmlInput: { maxLength: 160 } }} onChange={event => setSections(value => value.map((item, i) => i === index ? { ...item, name: event.target.value } : item))} /></Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{section.reason}</Typography>
                        {section.productIds.map(id => { const product = products.find(item => item.id === id); return <Stack key={id} direction="row" justifyContent="space-between" gap={2} sx={{ py: .5, borderBottom: 1, borderColor: 'divider' }}><Typography variant="body2">{product?.name || id}</Typography><Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>Rs. {product ? menuItemPrice(product, productPrices).toLocaleString() : '—'}</Typography></Stack>; })}
                    </Box>)}
                    {includeDeals && <><Typography component="h3" variant="h6">Suggested deals / combos</Typography>{!deals.length && <Typography>No suitable combos found in this inventory.</Typography>}{deals.map((deal, index) => <Box key={index} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 2 }}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} alignItems={{ sm: 'center' }}><Checkbox checked={deal.selected} inputProps={{ 'aria-label': `Include combo ${deal.name}` }} onChange={event => setDeals(value => value.map((item, i) => i === index ? { ...item, selected: event.target.checked } : item))} /><TextField fullWidth label="Combo name" size="small" value={deal.name} slotProps={{ htmlInput: { maxLength: 100 } }} onChange={event => setDeals(value => value.map((item, i) => i === index ? { ...item, name: event.target.value } : item))} /><TextField label="Combo price" size="small" type="number" value={deal.price} sx={{ minWidth: 160 }} slotProps={{ input: { startAdornment: <InputAdornment position="start">Rs.</InputAdornment> }, htmlInput: { min: 0, step: .01 } }} onChange={event => setDeals(value => value.map((item, i) => i === index ? { ...item, price: event.target.value } : item))} /></Stack>
                        <Typography variant="body2" sx={{ mt: 1 }}>{deal.productIds.map(id => products.find(product => product.id === id)?.name || id).join(' + ')}</Typography><Typography variant="body2" color="text.secondary">Separately: Rs. {deal.regularPrice.toLocaleString()} · {deal.reason}</Typography>
                    </Box>)}</>}
                    <Typography variant="body2" color="text.secondary">Applying adds items to matching sections and creates sections or pages where needed. Your headings and styling stay editable. Deals save with your draft; publishing makes them available to customers.</Typography>
                </>}
            </Stack></DialogContent>
            <DialogActions><Button onClick={close}>Cancel</Button><Button variant="contained" disabled={busy || !hasResults || invalid || (!reviewedSections.length && !reviewedDeals.length)} onClick={apply}>Add to my menu</Button></DialogActions>
        </Dialog>
    </>;
}
