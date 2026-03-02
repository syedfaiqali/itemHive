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
    Stack,
    Snackbar,
    Alert,
    useTheme,
    alpha
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
import { reduceStock, resolveProductImage, PRODUCT_CATEGORIES } from '../../features/inventory/inventorySlice';
import { addTransaction } from '../../features/transactions/transactionSlice';
import type { Product } from '../../features/inventory/inventorySlice';
import { motion, AnimatePresence } from 'framer-motion';

const categories = ['All', ...PRODUCT_CATEGORIES];

const escapePdfText = (text: string) => text
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E]/g, '?');

const buildSimplePdf = (lines: string[]) => {
    const textStream = [
        'BT',
        '/F1 11 Tf',
        '14 TL',
        '40 800 Td',
        ...lines.map((line, index) => `${index === 0 ? '' : 'T* '}(` + escapePdfText(line) + ') Tj'),
        'ET'
    ].join('\n');

    const objects: string[] = [];
    objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    objects[2] = '<< /Type /Pages /Kids [3 0 R] /Count 1 >>';
    objects[3] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>';
    objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
    objects[5] = `<< /Length ${textStream.length} >>\nstream\n${textStream}\nendstream`;

    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [0];
    for (let i = 1; i <= 5; i += 1) {
        offsets[i] = pdf.length;
        pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
    }

    const xrefStart = pdf.length;
    pdf += 'xref\n';
    pdf += `0 ${objects.length}\n`;
    pdf += '0000000000 65535 f \n';
    for (let i = 1; i <= 5; i += 1) {
        pdf += `${offsets[i].toString().padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

    return new Blob([pdf], { type: 'application/pdf' });
};

const POSTerminal: React.FC = () => {
    const dispatch = useDispatch();
    const theme = useTheme();
    const { user } = useSelector((state: RootState) => state.auth);
    const { products } = useSelector((state: RootState) => state.inventory);
    const { transactions = [] } = useSelector((state: RootState) => state.transactions || { transactions: [] });
    const { cart, taxRate, activeDiscount } = useSelector((state: RootState) => state.pos);

    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | null>(null);
    const [orderDone, setOrderDone] = useState(false);
    const [receiptId, setReceiptId] = useState('');
    const [receiptTime, setReceiptTime] = useState('');
    const [stockToast, setStockToast] = useState({ open: false, message: '' });
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingMethod, setPendingMethod] = useState<'cash' | 'card' | null>(null);

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

    const handleSaveReceiptPdf = (id: string, method: 'cash' | 'card', receiptTimeIso: string) => {
        const dateLabel = new Date(receiptTimeIso).toLocaleString();
        const lines = [
            'ItemHive POS Receipt',
            `Order ID: ${id}`,
            `Date: ${dateLabel}`,
            `Cashier: ${user?.username || 'Staff'}`,
            `Payment: ${method.toUpperCase()}`,
            '----------------------------------------',
            ...cart.map((item) => `${item.name} x${item.quantity} @ $${item.price.toFixed(2)} = $${(item.price * item.quantity).toFixed(2)}`),
            '----------------------------------------',
            `Subtotal: $${subtotal.toFixed(2)}`,
            `Tax (10%): $${tax.toFixed(2)}`,
            activeDiscount > 0 ? `Discount: -$${activeDiscount.toFixed(2)}` : '',
            `Total Paid: $${total.toFixed(2)}`,
            '----------------------------------------',
            'Thank you for shopping with us!'
        ].filter(Boolean);

        const pdfBlob = buildSimplePdf(lines);
        const url = URL.createObjectURL(pdfBlob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `receipt-${id}.pdf`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
    };

    const handleAddToCart = (product: Product) => {
        const itemInCart = cart.find(item => item.id === product.id);
        const currentQty = itemInCart ? itemInCart.quantity : 0;

        if (product.stock <= 0) {
            setStockToast({ open: true, message: `${product.name} is out of stock.` });
            return;
        }

        if (product.stock <= currentQty) {
            setStockToast({ open: true, message: `${product.name} is out of stock.` });
            return;
        }

        dispatch(addToCart(product));
    };

    const handleCheckout = (method: 'cash' | 'card') => {
        setPendingMethod(method);
        setConfirmOpen(true);
    };

    const handleConfirmCheckout = () => {
        if (!pendingMethod) return;

        const id = `R${String(transactions.length + 1).padStart(6, '0')}`;
        const receiptTimeIso = new Date().toISOString();
        setReceiptId(id);
        setReceiptTime(receiptTimeIso);
        setPaymentMethod(pendingMethod);

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
                timestamp: receiptTimeIso,
                totalPrice: item.price * item.quantity
            }));
        });

        setOrderDone(true);
        setConfirmOpen(false);
        setPendingMethod(null);
    };

    const handleCancelCheckout = () => {
        setConfirmOpen(false);
        setPendingMethod(null);
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
        <Box sx={{ height: 'calc(100vh - 120px)', display: 'flex', gap: 2, overflow: 'hidden' }}>
            {/* Left Side: Product Selection */}
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
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
                                    <Search size={20} color={theme.palette.primary.main} />
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

                <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 1, pt: 1, px: 2 }}>
                    <Grid container spacing={4}>
                        {filteredProducts.map((product) => (
                            <Grid
                                key={product.id}
                                size={{ xs: 12, sm: 6, md: 4, lg: 3, xl: 3 }}
                            >
                                <motion.div
                                    whileHover={{ y: -8, transition: { duration: 0.25 } }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <Card
                                        onClick={() => handleAddToCart(product)}
                                        sx={{
                                            cursor: product.stock > 0 ? 'pointer' : 'default',
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            borderRadius: 4,
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            bgcolor: 'background.paper',
                                            boxShadow: '0 4px 10px rgba(0,0,0,0.02)',
                                            overflow: 'hidden',
                                            position: 'relative',
                                            '&:hover': {
                                                borderColor: product.stock > 0 ? 'primary.main' : 'divider',
                                                boxShadow: (theme) => product.stock > 0
                                                    ? `0 25px 50px -12px ${alpha(theme.palette.primary.main, 0.1)}`
                                                    : '0 4px 10px rgba(0,0,0,0.02)',
                                                '& .product-img': { transform: product.stock > 0 ? 'scale(1.08)' : 'none' },
                                                '& .add-btn': { opacity: product.stock > 0 ? 1 : 0.4, transform: 'translateY(0)' }
                                            },
                                            opacity: product.stock === 0 ? 0.7 : 1,
                                            transition: 'all 0.3s'
                                        }}
                                    >
                                        <Box sx={{
                                            position: 'relative',
                                            pt: '90%',
                                            bgcolor: (theme) => alpha(theme.palette.text.primary, 0.025),
                                            overflow: 'hidden'
                                        }}>
                                            <Box
                                                className="product-img"
                                                component="img"
                                                src={resolveProductImage(product)}
                                                alt={product.name}
                                                sx={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'contain',
                                                    p: 2.5,
                                                    transition: 'transform 0.5s ease',
                                                }}
                                            />
                                            {product.stock <= 5 && (
                                                <Chip
                                                    label={product.stock === 0 ? "Out of Stock" : "Limited Stock"}
                                                    size="small"
                                                    color={product.stock === 0 ? "error" : "warning"}
                                                    sx={{
                                                        position: 'absolute',
                                                        top: 10,
                                                        left: 10,
                                                        fontSize: '0.6rem',
                                                        fontWeight: 900,
                                                        height: 18,
                                                        textTransform: 'uppercase'
                                                    }}
                                                />
                                            )}
                                            {product.stock === 0 && (
                                                <Box
                                                    sx={{
                                                        position: 'absolute',
                                                        inset: 0,
                                                        bgcolor: alpha(theme.palette.error.main, 0.18),
                                                        backdropFilter: 'blur(1px)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        zIndex: 2,
                                                        pointerEvents: 'none',
                                                    }}
                                                >
                                                    <Typography
                                                        variant="caption"
                                                        sx={{
                                                            px: 1.2,
                                                            py: 0.6,
                                                            borderRadius: 1,
                                                            bgcolor: alpha(theme.palette.background.paper, 0.9),
                                                            color: 'error.main',
                                                            border: '1px solid',
                                                            borderColor: alpha(theme.palette.error.main, 0.4),
                                                            fontWeight: 900,
                                                            letterSpacing: 0.5,
                                                            textTransform: 'uppercase'
                                                        }}
                                                    >
                                                        Out of Stock
                                                    </Typography>
                                                </Box>
                                            )}

                                            <Box
                                                className="add-btn"
                                                sx={{
                                                    position: 'absolute',
                                                    bottom: 12,
                                                    right: 12,
                                                    p: 1,
                                                    borderRadius: 2,
                                                    bgcolor: product.stock > 0 ? 'primary.main' : 'action.disabledBackground',
                                                    color: product.stock > 0 ? 'white' : 'action.disabled',
                                                    display: 'flex',
                                                    opacity: 0,
                                                    transform: 'translateY(10px)',
                                                    transition: 'all 0.3s ease',
                                                    boxShadow: product.stock > 0 ? '0 4px 12px rgba(14, 165, 165, 0.3)' : 'none',
                                                    cursor: product.stock > 0 ? 'pointer' : 'not-allowed'
                                                }}
                                            >
                                                <Plus size={18} strokeWidth={3} />
                                            </Box>
                                        </Box>

                                        <CardContent sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                                            <Typography variant="caption" color="primary.main" fontWeight={900} sx={{ mb: 0.5, letterSpacing: 0.5, opacity: 0.8 }}>
                                                {product.category.toUpperCase()}
                                            </Typography>

                                            <Typography
                                                variant="subtitle1"
                                                color="text.primary"
                                                fontWeight={700}
                                                sx={{
                                                    lineHeight: 1.25,
                                                    mb: 1,
                                                    fontSize: '0.95rem',
                                                    height: '2.5em',
                                                    overflow: 'hidden',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                }}
                                            >
                                                {product.name}
                                            </Typography>

                                            <Box sx={{ mt: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <Typography variant="h6" color="primary.main" fontWeight={900}>
                                                    ${product.price.toFixed(2)}
                                                </Typography>

                                                <Box sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 0.5,
                                                    px: 1,
                                                    py: 0.3,
                                                    borderRadius: 1.5,
                                                    bgcolor: (theme) => {
                                                        if (product.stock === 0) return alpha(theme.palette.error.main, 0.1);
                                                        if (product.stock <= 5) return alpha(theme.palette.warning.main, 0.1);
                                                        return alpha(theme.palette.success.main, 0.06);
                                                    }
                                                }}>
                                                    <Box sx={{
                                                        width: 6,
                                                        height: 6,
                                                        borderRadius: '50%',
                                                        bgcolor: (theme) => {
                                                            if (product.stock === 0) return theme.palette.error.main;
                                                            if (product.stock <= 5) return theme.palette.warning.main;
                                                            return theme.palette.success.main;
                                                        }
                                                    }} />
                                                    <Typography
                                                        variant="caption"
                                                        fontWeight={800}
                                                        sx={{
                                                            fontSize: '0.65rem',
                                                            color: (theme) => {
                                                                if (product.stock === 0) return theme.palette.error.main;
                                                                if (product.stock <= 5) return theme.palette.warning.main;
                                                                return theme.palette.success.main;
                                                            }
                                                        }}
                                                    >
                                                        {product.stock === 0 ? 'Out' : product.stock} left
                                                    </Typography>
                                                </Box>
                                            </Box>
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
                    width: { xs: '100%', md: 420 },
                    flexShrink: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 4,
                    overflow: 'hidden',
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider'
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

                <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 0, position: 'relative' }}>
                    {cart.length === 0 ? (
                        <Box sx={{
                            position: 'absolute',
                            top: '40%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            textAlign: 'center',
                            opacity: 0.4,
                            width: '100%',
                            px: 3
                        }}>
                            <ShoppingCart size={80} strokeWidth={1} style={{ marginBottom: 16 }} />
                            <Typography variant="h6" fontWeight={800}>Cart is empty</Typography>
                            <Typography variant="body2" fontWeight={600}>Select products to start</Typography>
                        </Box>
                    ) : (
                        <Box sx={{ p: 2 }}>
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
                                                <IconButton
                                                    size="small"
                                                    onClick={() => {
                                                        const product = products.find(p => p.id === item.id);
                                                        if (product && item.quantity < product.stock) {
                                                            dispatch(updateQuantity({ id: item.id, quantity: item.quantity + 1 }));
                                                        }
                                                    }}
                                                >
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
                        </Box>
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
                                sx={{
                                    py: 2,
                                    mt: 1,
                                    borderRadius: 3,
                                    fontWeight: 900,
                                    fontSize: '1.1rem',
                                    boxShadow: (theme) => `0 8px 16px -4px ${alpha(theme.palette.primary.main, 0.4)}`
                                }}
                            >
                                Pay Now
                            </Button>
                        </Grid>
                    </Grid>
                </Box>
            </Paper>

            <Dialog
                open={confirmOpen}
                onClose={handleCancelCheckout}
                maxWidth="xs"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3 } }}
            >
                <DialogTitle sx={{ fontWeight: 800 }}>Confirm Payment</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Confirm this payment to finalize sale and update stock.
                    </Typography>
                    <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="body2" fontWeight={700}>
                            Method: {(pendingMethod || '').toUpperCase()}
                        </Typography>
                        <Typography variant="h6" fontWeight={900} color="primary.main" sx={{ mt: 0.5 }}>
                            Total: ${total.toFixed(2)}
                        </Typography>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button variant="outlined" onClick={handleCancelCheckout}>
                        Cancel
                    </Button>
                    <Button variant="contained" onClick={handleConfirmCheckout}>
                        Confirm Payment
                    </Button>
                </DialogActions>
            </Dialog>

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
                        onClick={() => {
                            if (!paymentMethod || !receiptId) return;
                            handleSaveReceiptPdf(receiptId, paymentMethod, receiptTime || new Date().toISOString());
                        }}
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

            <Snackbar
                open={stockToast.open}
                autoHideDuration={2200}
                onClose={() => setStockToast({ open: false, message: '' })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setStockToast({ open: false, message: '' })}
                    severity="warning"
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {stockToast.message}
                </Alert>
            </Snackbar>

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
