import React, { useState, useMemo } from 'react';
import {
    Box,
    Grid,
    Typography,
    Card,
    CardContent,
    TextField,
    InputAdornment,
    Tabs,
    Tab,
    IconButton,
    Button,
    Divider,
    Paper,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Stack
} from '@mui/material';
import {
    Search,
    ShoppingCart,
    Trash2,
    Plus,
    Minus,
    CreditCard,
    Banknote,
    Receipt,
    CheckCircle,
    Printer,
    Download,
    X
} from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../store';
import { addToCart, updateQuantity, clearCart } from '../../features/pos/posSlice';
import { reduceStock } from '../../features/inventory/inventorySlice';
import { addTransaction } from '../../features/transactions/transactionSlice';
import type { Product } from '../../features/inventory/inventorySlice';
import { motion, AnimatePresence } from 'framer-motion';

const categories = ['All', 'Electronics', 'Clothing', 'Home', 'Food', 'Accessories', 'Beauty'];

const POSTerminal: React.FC = () => {
    const dispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { products } = useSelector((state: RootState) => state.inventory);
    const { cart, taxRate, activeDiscount } = useSelector((state: RootState) => state.pos);

    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | null>(null);
    const [orderDone, setOrderDone] = useState(false);
    const [receiptId, setReceiptId] = useState('');

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.sku.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = activeTab === 0 || p.category === categories[activeTab];
            return matchesSearch && matchesCategory;
        });
    }, [products, searchTerm, activeTab]);

    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const tax = subtotal * taxRate;
    const total = subtotal + tax - activeDiscount;

    const handleAddToCart = (product: Product) => {
        if (product.stock > 0) {
            dispatch(addToCart(product));
        }
    };

    const handleCheckout = (method: 'cash' | 'card') => {
        const id = Math.random().toString(36).substr(2, 9).toUpperCase();
        setReceiptId(id);
        setPaymentMethod(method);

        // Process all items in cart
        cart.forEach(item => {
            dispatch(reduceStock({ id: item.id, amount: item.quantity }));
            dispatch(addTransaction({
                id: `${id}-${item.id.substr(0, 3)}`,
                productId: item.id,
                productName: item.name,
                type: 'reduction',
                amount: item.quantity,
                userName: user?.username || 'Staff',
                timestamp: new Date().toISOString(),
                totalPrice: item.price * item.quantity
            }));
        });

        setOrderDone(true);
    };

    const handleCloseOrder = () => {
        dispatch(clearCart());
        setOrderDone(false);
        setPaymentMethod(null);
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: { xs: 'column', lg: 'row' },
                gap: 2,
                height: { xs: 'auto', lg: 'calc(100dvh - 140px)' },
                minHeight: { xs: 0, lg: 'calc(100dvh - 130px)' },
                overflow: 'hidden'
            }}
        >
            {/* Left Side: Product Selection */}
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
                <Paper sx={{ p: 2, mb: 2, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <TextField
                        fullWidth
                        placeholder="Scan Barcode or Search (Name/SKU)..."
                        variant="outlined"
                        size="small"
                        autoFocus
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search size={20} color="#6366f1" />
                                </InputAdornment>
                            ),
                        }}
                    />
                </Paper>

                <Tabs
                    value={activeTab}
                    onChange={(_, v) => setActiveTab(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
                >
                    {categories.map((cat) => (
                        <Tab key={cat} label={cat} sx={{ fontWeight: 700, px: 3, textTransform: 'none' }} />
                    ))}
                </Tabs>

                <Box
                    sx={{
                        flexGrow: 1,
                        minHeight: 0,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        px: 0.5,
                        pt: 0.75,
                        pb: 0.5
                    }}
                >
                    <Grid container spacing={2}>
                        {filteredProducts.map((product) => (
                            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3, xl: 2 }} key={product.id}>
                                <motion.div whileHover={{ y: -4 }} whileTap={{ scale: 0.95 }}>
                                    <Card
                                        onClick={() => handleAddToCart(product)}
                                        sx={{
                                            cursor: 'pointer',
                                            height: '100%',
                                            borderRadius: 3,
                                            border: '2px solid transparent',
                                            '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(99, 102, 241, 0.02)' },
                                            position: 'relative',
                                            opacity: product.stock === 0 ? 0.6 : 1,
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <CardContent sx={{ p: 2, textAlign: 'center' }}>
                                            <Typography variant="caption" color="text.secondary" fontWeight={800} display="block">
                                                {product.sku}
                                            </Typography>
                                            <Typography variant="body1" fontWeight={700} noWrap sx={{ mt: 1 }}>
                                                {product.name}
                                            </Typography>
                                            <Typography variant="h6" color="primary.main" fontWeight={800}>
                                                ${product.price.toFixed(2)}
                                            </Typography>
                                            <Chip
                                                label={product.stock > 0 ? `${product.stock} in stock` : 'Out of Stock'}
                                                size="small"
                                                color={product.stock > 0 ? (product.stock <= product.minStock ? 'warning' : 'success') : 'error'}
                                                sx={{ mt: 1, fontSize: '0.65rem', height: 20, fontWeight: 700 }}
                                            />
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            </Box>

            {/* Right Side: Cart / Order Summary */}
            <Paper
                elevation={3}
                sx={{
                    width: '100%',
                    maxWidth: { xs: '100%', lg: 330 },
                    minWidth: { lg: 320 },
                    height: { xs: 'auto', lg: '99%' },
                    minHeight: { xs: 360, lg: 0 },
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 4,
                    overflow: 'hidden',
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    flexShrink: 0
                }}
            >
                <Box sx={{ p: 2.5, bgcolor: 'primary.main', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <ShoppingCart size={22} />
                        <Typography variant="h6" fontWeight={800}>Current Order</Typography>
                    </Box>
                    <IconButton size="small" color="inherit" onClick={() => dispatch(clearCart())}>
                        <Trash2 size={20} />
                    </IconButton>
                </Box>

                <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, minHeight: 0 }}>
                    {cart.length === 0 ? (
                        <Box sx={{ textAlign: 'center', mt: { xs: 4, lg: 10 }, opacity: 0.3 }}>
                            <ShoppingCart size={80} strokeWidth={1} style={{ marginBottom: 16 }} />
                            <Typography variant="h6" fontWeight={600}>Cart is empty</Typography>
                            <Typography variant="body2">Select products to start</Typography>
                        </Box>
                    ) : (
                        <AnimatePresence>
                            {cart.map((item) => (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                >
                                    <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Box sx={{ flexGrow: 1 }}>
                                            <Typography variant="body2" fontWeight={700} noWrap sx={{ maxWidth: 180 }}>{item.name}</Typography>
                                            <Typography variant="caption" color="text.secondary">${item.price.toFixed(2)} / unit</Typography>
                                        </Box>
                                        <Stack direction="row" alignItems="center" spacing={1} sx={{ bgcolor: 'action.hover', borderRadius: 2, p: 0.5 }}>
                                            <IconButton size="small" onClick={() => dispatch(updateQuantity({ id: item.id, quantity: item.quantity - 1 }))}>
                                                <Minus size={14} />
                                            </IconButton>
                                            <Typography variant="body2" sx={{ fontWeight: 800, minWidth: 20, textAlign: 'center' }}>
                                                {item.quantity}
                                            </Typography>
                                            <IconButton size="small" onClick={() => dispatch(updateQuantity({ id: item.id, quantity: item.quantity + 1 }))}>
                                                <Plus size={14} />
                                            </IconButton>
                                        </Stack>
                                        <Typography variant="body2" fontWeight={800} sx={{ minWidth: 70, textAlign: 'right' }}>
                                            ${(item.price * item.quantity).toFixed(2)}
                                        </Typography>
                                    </Box>
                                    <Divider sx={{ mb: 2, borderStyle: 'dashed' }} />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    )}
                </Box>

                <Box sx={{ p: 3, bgcolor: 'action.hover', borderTop: '1px solid', borderColor: 'divider' }}>
                    <Stack spacing={1} sx={{ mb: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                            <Typography variant="body2" fontWeight={700}>${subtotal.toFixed(2)}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">Tax (10%)</Typography>
                            <Typography variant="body2" fontWeight={700}>${tax.toFixed(2)}</Typography>
                        </Box>
                        {activeDiscount > 0 && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="error.main">Discount</Typography>
                                <Typography variant="body2" fontWeight={700} color="error.main">-${activeDiscount.toFixed(2)}</Typography>
                            </Box>
                        )}
                        <Divider sx={{ my: 1 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="h5" fontWeight={900}>Total Payable</Typography>
                            <Typography variant="h5" fontWeight={900} color="primary.main">${total.toFixed(2)}</Typography>
                        </Box>
                    </Stack>

                    <Grid container spacing={2}>
                        <Grid size={{ xs: 6 }}>
                            <Button
                                fullWidth
                                variant="outlined"
                                startIcon={<Banknote size={20} />}
                                disabled={cart.length === 0}
                                onClick={() => handleCheckout('cash')}
                                sx={{ py: 1.5, borderRadius: 2, fontWeight: 700 }}
                            >
                                Cash
                            </Button>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                            <Button
                                fullWidth
                                variant="outlined"
                                startIcon={<CreditCard size={20} />}
                                disabled={cart.length === 0}
                                onClick={() => handleCheckout('card')}
                                sx={{ py: 1.5, borderRadius: 2, fontWeight: 700 }}
                            >
                                Card
                            </Button>
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <Button
                                fullWidth
                                variant="contained"
                                size="large"
                                startIcon={<Receipt size={24} />}
                                disabled={cart.length === 0}
                                onClick={() => handleCheckout('card')}
                                sx={{ py: 2, mt: 1, borderRadius: 3, fontWeight: 900, fontSize: '1.1rem', boxShadow: '0 8px 16px -4px rgba(99, 102, 241, 0.4)' }}
                            >
                                Pay Now
                            </Button>
                        </Grid>
                    </Grid>
                </Box>
            </Paper>

            {/* Checkout Success & Receipt Dialog */}
            <Dialog
                open={orderDone}
                onClose={handleCloseOrder}
                maxWidth="xs"
                fullWidth
                PaperProps={{
                    sx: { borderRadius: 4, p: 1 }
                }}
            >
                <DialogTitle sx={{ textAlign: 'center', pb: 0 }}>
                    <Box sx={{ color: 'success.main', mb: 2 }}>
                        <CheckCircle size={64} strokeWidth={2.5} />
                    </Box>
                    <Typography variant="h5" fontWeight={900}>Payment Successful!</Typography>
                    <Typography variant="body2" color="text.secondary">Order #{receiptId}</Typography>
                </DialogTitle>
                <DialogContent>
                    <Box id="pos-receipt" sx={{ mt: 3, p: 3, bgcolor: 'action.hover', borderRadius: 3, border: '1px dashed', borderColor: 'divider' }}>
                        <Box sx={{ textAlign: 'center', mb: 3 }}>
                            <Typography variant="h6" fontWeight={800} className="gradient-text">ItemHive POS</Typography>
                            <Typography variant="caption" color="text.secondary" display="block">Terminal #01 - {user?.username || 'Staff'}</Typography>
                            <Typography variant="caption" color="text.secondary">{new Date().toLocaleString()}</Typography>
                        </Box>

                        <Stack spacing={1.5}>
                            {cart.map(item => (
                                <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Box>
                                        <Typography variant="body2" fontWeight={700}>{item.name}</Typography>
                                        <Typography variant="caption" color="text.secondary">{item.quantity} x ${item.price.toFixed(2)}</Typography>
                                    </Box>
                                    <Typography variant="body2" fontWeight={700}>${(item.price * item.quantity).toFixed(2)}</Typography>
                                </Box>
                            ))}
                        </Stack>

                        <Divider sx={{ my: 2, borderStyle: 'dashed' }} />

                        <Stack spacing={0.5}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="caption">Subtotal</Typography>
                                <Typography variant="caption" fontWeight={700}>${subtotal.toFixed(2)}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="caption">Tax (10%)</Typography>
                                <Typography variant="caption" fontWeight={700}>${tax.toFixed(2)}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                                <Typography variant="body1" fontWeight={900}>Total Paid</Typography>
                                <Typography variant="body1" fontWeight={900} color="primary.main">${total.toFixed(2)}</Typography>
                            </Box>
                        </Stack>

                        <Box sx={{ mt: 3, textAlign: 'center', opacity: 0.6 }}>
                            <Typography variant="caption" fontWeight={700} sx={{ textTransform: 'uppercase' }}>
                                Paid via {paymentMethod}
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 1, fontSize: '0.7rem' }}>Thank you for shopping with us!</Typography>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 3, gap: 1 }}>
                    <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<Download size={18} />}
                        sx={{ borderRadius: 2 }}
                    >
                        Save
                    </Button>
                    <Button
                        fullWidth
                        variant="contained"
                        startIcon={<Printer size={18} />}
                        onClick={handlePrint}
                        sx={{ borderRadius: 2 }}
                    >
                        Print
                    </Button>
                </DialogActions>
                <IconButton
                    onClick={handleCloseOrder}
                    sx={{ position: 'absolute', right: 16, top: 16, color: 'text.secondary' }}
                >
                    <X size={20} />
                </IconButton>
            </Dialog>

            {/* Print Friendly Style */}
            <style>
                {`
                @media print {
                    body * { visibility: hidden; }
                    #pos-receipt, #pos-receipt * { visibility: visible; }
                    #pos-receipt {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        background: white !important;
                        border: none !important;
                        padding: 0 !important;
                    }
                    .MuiDialog-container { display: block !important; }
                    .MuiPaper-root { box-shadow: none !important; }
                }
                `}
            </style>
        </Box>
    );
};

export default POSTerminal;
