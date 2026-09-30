import React from 'react';
import { Alert, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Grid, IconButton, Paper, Stack, TextField, Typography } from '@mui/material';
import { ExternalLink, Plus, QrCode, ReceiptText, Trash2 } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { AppDispatch, RootState } from '../../store';
import { fetchProducts } from '../../features/inventory/inventorySlice';
import api from '../../api/axios';
import type { OrderDraft } from '../../types/orderDraft';

type DigitalMenu = { _id: string; name: string; tableName: string; token: string; productIds: string[]; createdAt: string };

const DigitalMenusPage: React.FC = () => {
    const dispatch = useDispatch<AppDispatch>(); const navigate = useNavigate();
    const { products } = useSelector((state: RootState) => state.inventory);
    const user = useSelector((state: RootState) => state.auth.user);
    const [menus, setMenus] = React.useState<DigitalMenu[]>([]); const [drafts, setDrafts] = React.useState<OrderDraft[]>([]);
    const [open, setOpen] = React.useState(false); const [name, setName] = React.useState(''); const [tableName, setTableName] = React.useState(''); const [productIds, setProductIds] = React.useState<string[]>([]);
    const [error, setError] = React.useState(''); const [saving, setSaving] = React.useState(false);
    const canSendToPos = user?.role === 'super_admin' || user?.digitalMenuAccess === 'pos';
    const load = React.useCallback(async () => { try { const [menuResponse, draftResponse] = await Promise.all([api.get<DigitalMenu[]>('/digital-menus'), api.get<OrderDraft[]>('/digital-menus/table-drafts')]); setMenus(menuResponse.data); setDrafts(draftResponse.data); } catch (e: any) { setError(e.response?.data?.message || 'Unable to load Digital Menus.'); } }, []);
    React.useEffect(() => { void dispatch(fetchProducts(undefined)); void load(); }, [dispatch, load]);
    const reset = () => { setName(''); setTableName(''); setProductIds([]); setOpen(false); };
    const create = async () => { setSaving(true); setError(''); try { await api.post('/digital-menus', { name, tableName, productIds }); reset(); await load(); } catch (e: any) { setError(e.response?.data?.message || 'Unable to create this QR menu.'); } finally { setSaving(false); } };
    const remove = async (id: string) => { if (!window.confirm('Remove this QR menu?')) return; await api.delete(`/digital-menus/${id}`); await load(); };
    const menuUrl = (token: string) => `${window.location.origin}/menu/${token}`;
    return <Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2} sx={{ mb: 3 }}><Box><Stack direction="row" spacing={1} alignItems="center"><QrCode size={30} /><Typography variant="h4" fontWeight={900}>Digital Menus</Typography></Stack><Typography color="text.secondary" sx={{ mt: .75 }}>Create a QR for every table. Customer selections automatically collect in one table draft.</Typography></Box><Button variant="contained" startIcon={<Plus size={18} />} onClick={() => setOpen(true)}>Add Menu</Button></Stack>
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
        <Grid container spacing={2.5}>{menus.map(menu => <Grid key={menu._id} size={{ xs: 12, md: 6, xl: 4 }}><Paper variant="outlined" sx={{ p: 2.25, borderRadius: 3 }}><Stack direction="row" justifyContent="space-between" alignItems="start"><Box><Typography fontWeight={900}>{menu.name}</Typography><Chip size="small" label={menu.tableName} color="primary" sx={{ mt: .75 }} /></Box><IconButton color="error" size="small" onClick={() => void remove(menu._id)}><Trash2 size={17} /></IconButton></Stack><Box component="img" src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(menuUrl(menu.token))}`} alt={`QR code for ${menu.tableName}`} sx={{ display: 'block', width: 150, height: 150, mx: 'auto', my: 1.5 }} /><Stack direction="row" spacing={1}><Button size="small" fullWidth variant="outlined" startIcon={<ExternalLink size={15} />} onClick={() => window.open(menuUrl(menu.token), '_blank')}>Preview</Button><Button size="small" fullWidth variant="outlined" onClick={() => navigator.clipboard.writeText(menuUrl(menu.token))}>Copy Link</Button></Stack></Paper></Grid>)}</Grid>
        {!menus.length && <Paper variant="outlined" sx={{ textAlign: 'center', py: 7, borderRadius: 3 }}><QrCode size={38} /><Typography fontWeight={800} sx={{ mt: 1 }}>No QR menus yet</Typography><Typography variant="body2" color="text.secondary">Add a menu and assign it to a table.</Typography></Paper>}
        <Typography variant="h5" fontWeight={900} sx={{ mt: 5, mb: 2 }}>Table Draft Orders</Typography>
        <Grid container spacing={2}>{drafts.map(draft => <Grid key={draft._id} size={{ xs: 12, md: 6, xl: 4 }}><Paper variant="outlined" sx={{ p: 2.25, borderRadius: 3 }}><Stack direction="row" justifyContent="space-between"><Box><Chip label={draft.digitalMenuTable || 'Table'} color="secondary" size="small" /><Typography fontWeight={900} sx={{ mt: 1 }}>{draft.items.map(item => `${item.quantity}× ${item.productName}`).join(', ')}</Typography></Box><ReceiptText size={21} /></Stack><Typography variant="caption" color="text.secondary" display="block" sx={{ my: 1.5 }}>Updated {new Date(draft.updatedAt).toLocaleString()}</Typography>{canSendToPos ? <Button fullWidth variant="contained" onClick={() => navigate(`/pos?draft=${draft._id}`)}>Send to POS Billing</Button> : <Alert severity="info" icon={false} sx={{ py: .3 }}>Menu-only access: billing is disabled.</Alert>}</Paper></Grid>)}</Grid>
        {!drafts.length && <Typography color="text.secondary">Customer QR orders will appear here table-wise.</Typography>}
        <Dialog open={open} onClose={reset} fullWidth maxWidth="sm"><DialogTitle>Add Digital Menu</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}><TextField label="Menu name" value={name} onChange={e => setName(e.target.value)} placeholder="Restaurant menu" required /><TextField label="Table number / name" value={tableName} onChange={e => setTableName(e.target.value)} placeholder="Table 01" required /><Typography fontWeight={800}>Choose items shown after scan</Typography><Box sx={{ maxHeight: 280, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 2, px: 1 }}>{products.map(product => <FormControlLabel key={product.id} control={<Checkbox checked={productIds.includes(product.id)} onChange={() => setProductIds(current => current.includes(product.id) ? current.filter(id => id !== product.id) : [...current, product.id])} />} label={`${product.name} — ${product.salePrice ?? product.price}`} sx={{ display: 'flex', m: 0 }} />)}</Box></Stack></DialogContent><DialogActions><Button onClick={reset}>Cancel</Button><Button variant="contained" disabled={saving || !name.trim() || !tableName.trim() || !productIds.length} onClick={() => void create()}>{saving ? 'Creating...' : 'Create QR Menu'}</Button></DialogActions></Dialog>
    </Box>;
};
export default DigitalMenusPage;
