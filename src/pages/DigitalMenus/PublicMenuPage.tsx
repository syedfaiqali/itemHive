import React from 'react';
import { Alert, Box, Button, CircularProgress, IconButton, Paper, Stack, Typography, alpha } from '@mui/material';
import { CheckCircle2, ChevronRight, Minus, Plus, ShoppingBag, UtensilsCrossed } from 'lucide-react';
import { useParams } from 'react-router-dom';
import api from '../../api/axios';

type Item = { id: string; name: string; salePrice?: number; price?: number; imageUrl?: string };
type Menu = { name: string; tableName: string; orderingEnabled?: boolean };

const PublicMenuPage: React.FC = () => {
    const { token = '' } = useParams();
    const [items, setItems] = React.useState<Item[]>([]); const [menu, setMenu] = React.useState<Menu | null>(null);
    const [cart, setCart] = React.useState<Record<string, number>>({}); const [error, setError] = React.useState(''); const [sending, setSending] = React.useState(false); const [done, setDone] = React.useState(false);
    React.useEffect(() => { api.get(`/digital-menus/public/${token}`).then(({ data }) => { setMenu(data.menu); setItems(data.products); }).catch(e => setError(e.response?.data?.message || 'Unable to open this menu.')); }, [token]);
    const change = (id: string, delta: number) => setCart(c => ({ ...c, [id]: Math.max(0, (c[id] || 0) + delta) }));
    const selected = Object.values(cart).reduce((total, count) => total + count, 0);
    const submit = async () => { setSending(true); try { await api.post(`/digital-menus/public/${token}/order`, { items: Object.entries(cart).filter(([, q]) => q).map(([productId, quantity]) => ({ productId, quantity })) }); setDone(true); setCart({}); } catch (e: any) { setError(e.response?.data?.message || 'Could not send your order.'); } finally { setSending(false); } };
    if (error) return <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}><Alert severity="error">{error}</Alert></Box>;
    if (!menu) return <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: '#f8f7f3' }}><CircularProgress /></Box>;
    const canOrder = menu.orderingEnabled !== false;
    return <Box sx={{ minHeight: '100dvh', bgcolor: '#f8f7f3', pb: canOrder ? { xs: 13, sm: 14 } : 3, color: '#20221f' }}>
        <Box sx={{ position: 'relative', overflow: 'hidden', px: { xs: 2, sm: 3 }, pt: { xs: 2.25, sm: 3 }, pb: { xs: 4, sm: 5 }, color: '#fff', background: 'linear-gradient(135deg, #16251e 0%, #284e3d 53%, #d88522 155%)' }}>
            <Box sx={{ position: 'absolute', width: 270, height: 270, borderRadius: '50%', right: -110, top: -145, bgcolor: alpha('#f6c26a', .16) }} />
            <Box sx={{ maxWidth: 820, mx: 'auto', position: 'relative' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: { xs: 2.5, sm: 3.5 } }}><Stack direction="row" spacing={1} alignItems="center"><Box sx={{ display: 'grid', placeItems: 'center', width: 36, height: 36, borderRadius: 2, bgcolor: alpha('#fff', .14), border: '1px solid', borderColor: alpha('#fff', .2) }}><UtensilsCrossed size={19} /></Box><Typography fontWeight={800}>ItemHive Eats</Typography></Stack><Box sx={{ px: 1.25, py: .6, borderRadius: 99, bgcolor: alpha('#fff', .13), border: '1px solid', borderColor: alpha('#fff', .19) }}><Typography variant="caption" fontWeight={800}>{menu.tableName}</Typography></Box></Stack>
                <Typography variant="overline" sx={{ opacity: .72, letterSpacing: 1.4 }}>WELCOME TO YOUR TABLE</Typography><Typography component="h1" sx={{ fontSize: { xs: '1.8rem', sm: '2.5rem' }, lineHeight: 1.07, letterSpacing: '-.045em', fontWeight: 900, maxWidth: 600 }}>{menu.name}</Typography>
                <Typography sx={{ mt: 1, maxWidth: 480, fontSize: { xs: '.9rem', sm: '1rem' }, opacity: .84 }}>{canOrder ? 'Pick your favourites, adjust quantities, and we will add them straight to your table.' : 'Browse our menu at your pace. To place an order, please call your waiter.'}</Typography>
            </Box>
        </Box>
        <Box sx={{ maxWidth: 820, mx: 'auto', px: { xs: 1.5, sm: 2.5 }, mt: { xs: -2, sm: -2.5 }, position: 'relative' }}>
            {done && <Paper elevation={0} sx={{ mb: 2, p: 1.35, borderRadius: 2.5, bgcolor: '#e6f5e9', border: '1px solid #bce1c3', display: 'flex', alignItems: 'center', gap: 1, color: '#176334' }}><CheckCircle2 size={19} /><Typography variant="body2" fontWeight={700}>Order added to {menu.tableName}. You can keep adding items.</Typography></Paper>}
            <Paper elevation={0} sx={{ p: { xs: 1.6, sm: 2 }, borderRadius: { xs: 3, sm: 4 }, bgcolor: '#fffdf8', color: '#20221f', border: '1px solid #ece8dc', boxShadow: '0 12px 34px rgba(42,45,32,.08)' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="end" sx={{ mb: 1.5 }}><Box><Typography variant="overline" sx={{ color: '#798177', letterSpacing: 1.1, fontWeight: 800 }}>{canOrder ? 'ORDER FROM THE MENU' : 'VIEW OUR MENU'}</Typography><Typography variant="h6" fontWeight={900}>What are you craving?</Typography></Box>{canOrder && <Typography variant="caption" color="text.secondary">Tap + to add</Typography>}</Stack>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: { xs: 1.15, sm: 1.5 } }}>{items.map(item => {
                    const quantity = cart[item.id] || 0;
                    return <Paper key={item.id} elevation={0} sx={{ minHeight: { xs: 86, sm: 116 }, p: { xs: 1, sm: 1.25 }, borderRadius: 2.75, display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.25 }, bgcolor: quantity ? '#fff8ea' : '#fbfaf6', color: '#20221f', border: '1px solid', borderColor: quantity ? '#eeb45a' : '#eeeae0', '&:hover': canOrder ? { borderColor: '#d89738', transform: { sm: 'translateY(-2px)' } } : {} }}>
                        <Box sx={{ width: { xs: 58, sm: 76 }, height: { xs: 58, sm: 76 }, flex: '0 0 auto', borderRadius: 2, overflow: 'hidden', bgcolor: '#ecece4', color: '#576057', display: 'grid', placeItems: 'center' }}>{item.imageUrl ? <Box component="img" src={item.imageUrl} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ShoppingBag size={23} />}</Box>
                        <Box sx={{ minWidth: 0, flex: 1 }}><Typography fontWeight={850} noWrap sx={{ fontSize: { xs: '.9rem', sm: '1rem' } }}>{item.name}</Typography><Typography sx={{ mt: .3, color: '#bf6d0a', fontWeight: 900 }}>Rs. {item.salePrice ?? item.price ?? 0}</Typography></Box>
                        {canOrder && (quantity ? <Stack direction="row" alignItems="center" spacing={.3} sx={{ bgcolor: '#fff', border: '1px solid #e8c98e', borderRadius: 2, p: .2 }}><IconButton size="small" onClick={() => change(item.id, -1)} sx={{ color: '#8e5511' }}><Minus size={16} /></IconButton><Typography fontWeight={900} sx={{ minWidth: 18, textAlign: 'center' }}>{quantity}</Typography><IconButton size="small" onClick={() => change(item.id, 1)} sx={{ color: '#b96400' }}><Plus size={16} /></IconButton></Stack> : <IconButton aria-label={`Add ${item.name}`} onClick={() => change(item.id, 1)} sx={{ width: 34, height: 34, color: '#fff', bgcolor: '#d77b0d', '&:hover': { bgcolor: '#aa5d07' } }}><Plus size={18} /></IconButton>)}
                    </Paper>;
                })}</Box>
            </Paper>
        </Box>
        {canOrder ? <Box sx={{ position: 'fixed', zIndex: 10, bottom: 0, left: 0, right: 0, p: { xs: 1.25, sm: 1.75 }, background: 'linear-gradient(180deg, rgba(248,247,243,0), #f8f7f3 32%)' }}><Box sx={{ maxWidth: 760, mx: 'auto' }}><Button fullWidth size="large" variant="contained" disabled={!selected || sending} onClick={() => void submit()} endIcon={<ChevronRight size={19} />} sx={{ minHeight: 56, borderRadius: 3, fontWeight: 900, bgcolor: '#1d4936', '&:hover': { bgcolor: '#133a29' } }}>{sending ? 'Sending your order...' : selected ? `Review & send ${selected} item${selected > 1 ? 's' : ''} to ${menu.tableName}` : 'Choose items to continue'}</Button></Box></Box> : <Box sx={{ maxWidth: 760, mx: 'auto', px: 2, mt: 2 }}><Paper elevation={0} sx={{ p: 1.5, textAlign: 'center', borderRadius: 3, bgcolor: '#e9f2ec', color: '#1d4936', border: '1px solid #c7dfce' }}><Typography fontWeight={800}>To place an order, please call your waiter.</Typography></Paper></Box>}
    </Box>;
};
export default PublicMenuPage;
