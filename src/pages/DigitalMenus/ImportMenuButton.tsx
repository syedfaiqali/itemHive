import React from 'react';
import { Alert, Autocomplete, Box, Button, Checkbox, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, InputAdornment, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { FileUp, RefreshCw } from 'lucide-react';
import { isAxiosError } from 'axios';
import api from '../../api/axios';
import { menuItemPrice, type MenuPrices, type MenuProduct } from './menuContent';
import { matchImportedItem, reviewImportedMenu, validateReviewedImport, type ExtractedMenu, type ImportItem, type ImportSection, type ReviewedMenuImport } from './oldMenuImport';

type Props = { products: MenuProduct[]; productPrices: MenuPrices; currentName: string; disabled?: boolean; loading: boolean; productsError: string | null; onRetry: () => void; onApply: (menu: ReviewedMenuImport) => string | undefined };
const formats = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const readFile = (file: File) => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('This menu file could not be opened. Please choose it again.')); reader.readAsDataURL(file); });

export default function ImportMenuButton({ products, productPrices, currentName, disabled, loading, productsError, onRetry, onApply }: Props) {
    const [open, setOpen] = React.useState(false);
    const [source, setSource] = React.useState<'file' | 'text'>('file');
    const [file, setFile] = React.useState<File | null>(null);
    const [text, setText] = React.useState('');
    const [preview, setPreview] = React.useState('');
    const [busy, setBusy] = React.useState(false);
    const [error, setError] = React.useState('');
    const [notes, setNotes] = React.useState('');
    const [sections, setSections] = React.useState<ImportSection[]>([]);
    const [name, setName] = React.useState('');
    const [mode, setMode] = React.useState<ReviewedMenuImport['mode']>('replace');
    const request = React.useRef<AbortController | null>(null);
    const input = React.useRef<HTMLInputElement>(null);
    React.useEffect(() => () => request.current?.abort(), []);
    React.useEffect(() => {
        if (!file || file.type === 'application/pdf') { setPreview(''); return; }
        const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url);
    }, [file]);
    const close = () => { request.current?.abort(); request.current = null; setBusy(false); setOpen(false); };
    const chooseFile = (chosen: File | undefined) => {
        if (!chosen) return;
        if (!formats.includes(chosen.type) || chosen.size > 2 * 1024 * 1024 || !chosen.size) { setError('Choose a JPG, PNG, WebP photo or PDF up to 2 MB.'); return; }
        setFile(chosen); setSections([]); setError('');
    };
    const extract = async () => {
        const controller = new AbortController(); request.current = controller; setBusy(true); setError('');
        try {
            const payload = source === 'file' && file ? { file: await readFile(file) } : { text: text.trim() };
            if (controller.signal.aborted) return;
            const { data } = await api.post<ExtractedMenu>('/digital-menus/ai/import', payload, { signal: controller.signal, timeout: 60000 });
            if (request.current !== controller) return;
            setName(data.name || currentName); setNotes(data.notes); setSections(reviewImportedMenu(data, products, productPrices));
        } catch (err: unknown) {
            if (!controller.signal.aborted && request.current === controller) setError(isAxiosError<{ message?: string }>(err) ? err.response?.data?.message || 'Unable to read the menu. Please try again.' : err instanceof Error ? err.message : 'Unable to read the menu.');
        } finally { if (request.current === controller) { request.current = null; setBusy(false); } }
    };
    const updateSection = (id: string, changes: Partial<ImportSection>) => setSections(value => value.map(section => section.id === id ? { ...section, ...changes } : section));
    const updateItem = (sectionId: string, itemId: string, changes: Partial<ImportItem>) => setSections(value => value.map(section => section.id === sectionId ? { ...section, items: section.items.map(item => item.id === itemId ? { ...item, ...changes } : item) } : section));
    const rematch = () => setSections(value => value.map(section => ({ ...section, items: section.items.map(item => {
        if (item.productId) return item;
        const match = matchImportedItem(item.name, products);
        return match ? { ...item, productId: match.id, price: item.price || String(menuItemPrice(match, productPrices)) } : item;
    }) })));
    const validation = sections.length ? validateReviewedImport(sections, products) : '';
    const selected = sections.filter(section => section.selected).flatMap(section => section.items.filter(item => item.selected));
    const unmatched = selected.filter(item => !products.some(product => product.id === item.productId)).length;
    const apply = () => {
        const message = onApply({ name: name.trim(), sections, mode });
        if (message) setError(message); else { setSections([]); setFile(null); setText(''); close(); }
    };
    return <>
        <Button variant="outlined" startIcon={<FileUp size={18} />} disabled={disabled} onClick={() => { setError(''); setOpen(true); }}>Upload existing menu</Button>
        <Dialog open={open} onClose={close} fullWidth maxWidth="lg">
            <DialogTitle>Revamp your existing menu</DialogTitle>
            <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
                <Typography color="text.secondary">Upload your old menu or paste its text. Review the sections, link items to inventory, and edit prices before adding them to your new design.</Typography>
                <Stack direction="row" gap={1}><Button variant={source === 'file' ? 'contained' : 'outlined'} disabled={busy} onClick={() => { setSource('file'); setSections([]); }}>Photo / PDF</Button><Button variant={source === 'text' ? 'contained' : 'outlined'} disabled={busy} onClick={() => { setSource('text'); setSections([]); }}>Paste menu text</Button></Stack>
                {source === 'file' ? <Box sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 2, p: 2 }}>
                    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" aria-label="Existing menu file" hidden onChange={event => { chooseFile(event.target.files?.[0]); event.target.value = ''; }} />
                    <Button variant="outlined" startIcon={<FileUp size={18} />} disabled={busy} onClick={() => input.current?.click()}>{file ? 'Change file' : 'Choose menu file'}</Button>
                    <Typography variant="body2" sx={{ mt: 1 }}>{file ? `${file.name} · ${(file.size / 1024).toFixed(0)} KB` : 'JPG, PNG, WebP or PDF · up to 2 MB'}</Typography>
                    {preview && <Box component="img" src={preview} alt="Original uploaded menu" sx={{ display: 'block', maxWidth: '100%', maxHeight: 180, objectFit: 'contain', mt: 2 }} />}
                </Box> : <TextField label="Old menu text" multiline minRows={5} disabled={busy} value={text} onChange={event => { setText(event.target.value); setSections([]); }} placeholder={'My restaurant\nDrinks\nPepsi 180\nFanta 100'} slotProps={{ htmlInput: { maxLength: 20000 } }} />}
                <Typography variant="body2" color="text.secondary">Google AI reads the uploaded file or pasted text. Only reviewed items are added to your menu.</Typography>
                <Button variant="contained" disabled={busy || (source === 'file' ? !file : text.trim().length < 3)} startIcon={busy ? <CircularProgress color="inherit" size={18} /> : <FileUp size={18} />} onClick={() => void extract()} sx={{ alignSelf: 'start' }}>{busy ? 'Reading your old menu...' : sections.length ? 'Read menu again' : 'Read menu'}</Button>
                {error && <Alert severity="error">{error}</Alert>}
                {sections.length > 0 && <>
                    {notes && <Alert severity="info">{notes}</Alert>}
                    <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}><TextField fullWidth label="Menu name" value={name} onChange={event => setName(event.target.value)} slotProps={{ htmlInput: { maxLength: 100 } }} /><TextField fullWidth select label="How to import" value={mode} onChange={event => setMode(event.target.value as ReviewedMenuImport['mode'])}><MenuItem value="replace">Replace current layout</MenuItem><MenuItem value="append">Add as new pages</MenuItem></TextField></Stack>
                    <Alert severity="info">{mode === 'replace' ? 'Applying replaces the current draft’s name, sections, items and prices using your chosen design. Your live menu changes only when published.' : 'The imported sections will be added on new pages after your current menu.'}</Alert>
                    <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} alignItems={{ sm: 'center' }}><Typography sx={{ flex: 1 }}>{selected.length} selected items · {unmatched} need inventory matching</Typography><Button startIcon={<RefreshCw size={16} />} disabled={loading} onClick={onRetry}>Refresh inventory</Button><Button disabled={loading} onClick={rematch}>Match by name</Button><Button component="a" href="/inventory/add" target="_blank" rel="noopener noreferrer">Add missing items to inventory</Button></Stack>
                    {productsError && <Alert severity="error">{productsError}</Alert>}
                    {sections.map(section => <Box key={section.id} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 2 }}>
                        <Stack direction="row" gap={1} alignItems="center"><Checkbox checked={section.selected} inputProps={{ 'aria-label': `Import section ${section.name}` }} onChange={event => updateSection(section.id, { selected: event.target.checked })} /><TextField fullWidth label="Section heading" size="small" value={section.name} slotProps={{ htmlInput: { maxLength: 160 } }} onChange={event => updateSection(section.id, { name: event.target.value })} /><TextField label="Page" size="small" type="number" value={section.page} sx={{ width: 105, flexShrink: 0 }} slotProps={{ htmlInput: { min: 1, max: 20 } }} onChange={event => updateSection(section.id, { page: Number(event.target.value) })} /></Stack>
                        {section.items.map(item => <Stack key={item.id} direction={{ xs: 'column', md: 'row' }} gap={1} sx={{ py: 1.5, borderBottom: 1, borderColor: 'divider', opacity: section.selected ? 1 : .55 }} alignItems={{ md: 'center' }}>
                            <FormControlLabel sx={{ minWidth: 170, flex: 1, mr: 0 }} control={<Checkbox checked={item.selected} disabled={!section.selected} onChange={event => updateItem(section.id, item.id, { selected: event.target.checked })} />} label={<Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>{item.name}</Typography>} />
                            <Autocomplete sx={{ flex: 1, minWidth: 200 }} size="small" options={products} loading={loading} value={products.find(product => product.id === item.productId) ?? null} getOptionLabel={product => product.name} isOptionEqualToValue={(a, b) => a.id === b.id} disabled={!section.selected || !item.selected} onChange={(_, product) => updateItem(section.id, item.id, { productId: product?.id ?? '', price: item.price || (product ? String(menuItemPrice(product, productPrices)) : '') })} renderInput={params => <TextField {...params} label={`Inventory item for ${item.name}`} error={section.selected && item.selected && !item.productId} helperText={!item.productId ? 'Choose a matching inventory item or untick this row' : undefined} />} />
                            <TextField label="Menu price" size="small" type="number" value={item.price} disabled={!section.selected || !item.selected} sx={{ width: { xs: '100%', md: 185 } }} onChange={event => updateItem(section.id, item.id, { price: event.target.value })} slotProps={{ input: { startAdornment: <InputAdornment position="start">Rs.</InputAdornment> }, htmlInput: { min: 0, step: .01, 'aria-label': `Menu price for ${item.name}` } }} helperText={item.priceMissing ? 'Old price unclear — please confirm' : undefined} />
                        </Stack>)}
                    </Box>)}
                    {validation && <Alert severity="warning">{validation}</Alert>}
                    <Typography variant="body2" color="text.secondary">Imported sections use your selected template’s styling. You can change the design, drag headings and sections, and edit every menu price afterward.</Typography>
                </>}
            </Stack></DialogContent>
            <DialogActions><Button onClick={close}>Cancel</Button><Button variant="contained" disabled={busy || loading || Boolean(productsError) || !sections.length || Boolean(validation)} onClick={apply}>{mode === 'replace' ? 'Use reviewed menu' : 'Add reviewed pages'}</Button></DialogActions>
        </Dialog>
    </>;
}
