import React, { useMemo, useState } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Grid,
    TextField,
    Button,
    InputAdornment,
    Autocomplete,
    Avatar,
    Chip,
    Divider,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TableContainer,
    Paper,
    Alert,
    MenuItem,
    Stack
} from '@mui/material';
import { Package, Search, CheckCircle2, XCircle, ClipboardList, Download, FileDown } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { reduceStock } from '../../features/inventory/inventorySlice';
import { addTransaction } from '../../features/transactions/transactionSlice';
import { addOrder, type OrderStatus, type Order } from '../../features/orders/ordersSlice';
import { resolveProductImage } from '../../features/inventory/inventorySlice';
import { alpha, useTheme } from '@mui/material/styles';

const OrderDesk: React.FC = () => {
    const theme = useTheme();
    const dispatch = useDispatch();
    const { products } = useSelector((state: RootState) => state.inventory);
    const { user } = useSelector((state: RootState) => state.auth);
    const { orders } = useSelector((state: RootState) => state.orders);

    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [quantity, setQuantity] = useState<number | string>(1);
    const [note, setNote] = useState('');
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
    const [filterText, setFilterText] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');

    const availableStock = selectedProduct?.stock ?? 0;
    const requestedQty = Math.max(0, parseInt(quantity.toString() || '0'));
    const enoughStock = requestedQty > 0 && requestedQty <= availableStock;

    const availabilityLabel = useMemo(() => {
        if (!selectedProduct || requestedQty <= 0) return 'Select product and quantity';
        if (enoughStock) return `Available: ${availableStock} in stock`;
        const shortBy = requestedQty - availableStock;
        return `Short by ${shortBy} unit${shortBy === 1 ? '' : 's'}`;
    }, [selectedProduct, requestedQty, availableStock, enoughStock]);

    const availabilityColor: OrderStatus | 'neutral' = !selectedProduct || requestedQty <= 0
        ? 'neutral'
        : enoughStock
            ? 'fulfilled'
            : 'rejected';

    const handlePlaceOrder = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct) return;

        if (!enoughStock) {
            const orderId = Math.random().toString(36).slice(2, 9).toUpperCase();
            const timestamp = new Date().toISOString();
            const requestedBy = user?.username || 'Admin';

            dispatch(addOrder({
                id: orderId,
                productId: selectedProduct.id,
                productName: selectedProduct.name,
                quantity: requestedQty,
                requestedBy,
                status: 'rejected',
                timestamp,
                notes: note.trim() || 'Insufficient stock'
            }));

            setFeedback({ type: 'error', message: `Order ${orderId} rejected due to insufficient stock.` });
            setSelectedProduct(null);
            setQuantity(1);
            setNote('');
            return;
        }

        const orderId = Math.random().toString(36).slice(2, 9).toUpperCase();
        const timestamp = new Date().toISOString();
        const requestedBy = user?.username || 'Admin';

        dispatch(addOrder({
            id: orderId,
            productId: selectedProduct.id,
            productName: selectedProduct.name,
            quantity: requestedQty,
            requestedBy,
            status: 'fulfilled',
            timestamp,
            notes: note.trim() || undefined
        }));

        dispatch(reduceStock({ id: selectedProduct.id, amount: requestedQty }));
        dispatch(addTransaction({
            id: `ORD-${orderId}`,
            productId: selectedProduct.id,
            productName: selectedProduct.name,
            type: 'reduction',
            amount: requestedQty,
            userName: requestedBy,
            timestamp,
            totalPrice: requestedQty * selectedProduct.price
        }));

        setFeedback({ type: 'success', message: `Order ${orderId} placed and stock updated.` });
        setSelectedProduct(null);
        setQuantity(1);
        setNote('');
    };

    const filteredOrders = useMemo(() => {
        const text = filterText.trim().toLowerCase();
        return orders.filter(order => {
            const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
            if (!matchesStatus) return false;
            if (!text) return true;
            return (
                order.id.toLowerCase().includes(text) ||
                order.productName.toLowerCase().includes(text) ||
                order.requestedBy.toLowerCase().includes(text)
            );
        });
    }, [orders, filterText, statusFilter]);

    const exportOrdersToCSV = () => {
        const headers = ['Order ID', 'Product', 'Quantity', 'Status', 'Reason', 'Requested By', 'Time'];
        const rows = filteredOrders.map((order) => ([
            order.id,
            order.productName,
            order.quantity.toString(),
            order.status,
            order.notes || '',
            order.requestedBy,
            new Date(order.timestamp).toLocaleString(),
        ]));

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `orders_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadPDF = () => {
        window.print();
    };

    const summary = useMemo(() => {
        return filteredOrders.reduce(
            (acc, order) => {
                acc.total += 1;
                if (order.status === 'fulfilled') acc.fulfilled += 1;
                if (order.status === 'rejected') acc.rejected += 1;
                if (order.status === 'pending') acc.pending += 1;
                return acc;
            },
            { total: 0, fulfilled: 0, rejected: 0, pending: 0 }
        );
    }, [filteredOrders]);

    return (
        <Box>
            <Box className="section-rise" sx={{ mb: 4 }}>
                <Typography variant="h4" fontWeight={800}>Order Desk</Typography>
                <Typography variant="body1" color="text.secondary">
                    Check availability, place orders, and auto-deduct inventory in one flow.
                </Typography>
            </Box>

            {feedback && (
                <Alert severity={feedback.type} sx={{ mb: 3, borderRadius: 2 }} onClose={() => setFeedback(null)}>
                    {feedback.message}
                </Alert>
            )}

            <Grid container spacing={3} className="section-rise-delay">
                <Grid size={{ xs: 12, lg: 5 }}>
                    <Card sx={{ borderRadius: 4 }}>
                        <CardContent sx={{ p: 4 }}>
                            <Typography variant="h6" fontWeight={700} gutterBottom>New Order</Typography>
                            <Divider sx={{ mb: 3 }} />
                            <form onSubmit={handlePlaceOrder}>
                                <Box sx={{ mb: 3 }}>
                                    <Autocomplete
                                        options={products}
                                        getOptionLabel={(option) => option.name}
                                        value={selectedProduct}
                                        onChange={(_, newValue) => setSelectedProduct(newValue)}
                                        renderOption={(props, option) => (
                                            <Box component="li" {...props} sx={{ display: 'flex', gap: 2 }}>
                                                <Avatar variant="rounded" sx={{ width: 32, height: 32, bgcolor: 'rgba(99, 102, 241, 0.1)', color: 'primary.main' }}>
                                                    {option.name.charAt(0)}
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="body2" fontWeight={600}>{option.name}</Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {option.sku} • {option.stock} in stock
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        )}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Search Product"
                                                required
                                                placeholder="Type product name or SKU..."
                                                InputProps={{
                                                    ...params.InputProps,
                                                    startAdornment: (
                                                        <InputAdornment position="start">
                                                            <Search size={20} />
                                                        </InputAdornment>
                                                    ),
                                                }}
                                            />
                                        )}
                                    />
                                </Box>

                                <Box sx={{ mb: 3 }}>
                                    <TextField
                                        fullWidth
                                        label="Order Quantity"
                                        type="number"
                                        required
                                        value={quantity}
                                        onChange={(e) => setQuantity(e.target.value)}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <Package size={20} />
                                                </InputAdornment>
                                            ),
                                        }}
                                        helperText={selectedProduct ? `Available stock: ${selectedProduct.stock}` : ''}
                                    />
                                </Box>

                                <Box sx={{ mb: 3 }}>
                                    <TextField
                                        fullWidth
                                        label="Order Notes (optional)"
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                    />
                                </Box>

                                <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {availabilityColor === 'fulfilled' ? (
                                        <CheckCircle2 size={18} color="#16a34a" />
                                    ) : availabilityColor === 'rejected' ? (
                                        <XCircle size={18} color="#dc2626" />
                                    ) : (
                                        <ClipboardList size={18} color="#64748b" />
                                    )}
                                    <Typography variant="body2" color="text.secondary">{availabilityLabel}</Typography>
                                    {availabilityColor !== 'neutral' && (
                                        <Chip
                                            label={availabilityColor === 'fulfilled' ? 'In Stock' : 'Insufficient'}
                                            size="small"
                                            color={availabilityColor === 'fulfilled' ? 'success' : 'error'}
                                            sx={{ fontWeight: 600 }}
                                        />
                                    )}
                                </Box>

                                <Button
                                    fullWidth
                                    variant="contained"
                                    size="large"
                                    type="submit"
                                    disabled={!selectedProduct || !enoughStock}
                                    sx={{ py: 1.6, borderRadius: 2, fontWeight: 800 }}
                                >
                                    Place Order & Deduct Stock
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <Card sx={{ borderRadius: 4, mt: 3 }}>
                        <CardContent sx={{ p: 4 }}>
                            <Typography variant="h6" fontWeight={700} gutterBottom>Availability Snapshot</Typography>
                            <Divider sx={{ mb: 3 }} />
                            {!selectedProduct ? (
                                <Box sx={{ color: 'text.secondary' }}>
                                    Select a product to see real-time availability and impact.
                                </Box>
                            ) : (
                                <Stack spacing={2}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Avatar
                                            variant="rounded"
                                            src={resolveProductImage(selectedProduct)}
                                            alt={selectedProduct.name}
                                            sx={{
                                                width: 48,
                                                height: 48,
                                                bgcolor: alpha(theme.palette.primary.main, 0.12),
                                                color: 'primary.main'
                                            }}
                                        >
                                            {selectedProduct.name.charAt(0)}
                                        </Avatar>
                                        <Box>
                                            <Typography fontWeight={700}>{selectedProduct.name}</Typography>
                                            <Typography variant="caption" color="text.secondary">{selectedProduct.sku}</Typography>
                                        </Box>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="body2" color="text.secondary">Current Stock</Typography>
                                        <Typography variant="body2" fontWeight={700}>{availableStock}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="body2" color="text.secondary">Requested Qty</Typography>
                                        <Typography variant="body2" fontWeight={700}>{requestedQty || 0}</Typography>
                                    </Box>
                                    <Divider />
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="body2" color="text.secondary">Remaining After Order</Typography>
                                        <Typography variant="body2" fontWeight={800} color={enoughStock ? 'success.main' : 'error.main'}>
                                            {enoughStock ? availableStock - requestedQty : 'N/A'}
                                        </Typography>
                                    </Box>
                                    <Chip
                                        label={enoughStock ? 'Can Fulfill' : 'Insufficient Stock'}
                                        color={enoughStock ? 'success' : 'error'}
                                        size="small"
                                        sx={{ fontWeight: 700, alignSelf: 'flex-start' }}
                                    />
                                </Stack>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ xs: 12, lg: 7 }}>
                    <Card sx={{ borderRadius: 4 }}>
                        <CardContent sx={{ p: 0 }}>
                            <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
                                <Typography variant="h6" fontWeight={800}>Order List</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Every placed order is logged here for review and pitching.
                                </Typography>
                            </Box>
                            <Box sx={{ px: 3, py: 2, display: 'flex', gap: 1.5, flexWrap: 'wrap', borderBottom: '1px solid', borderColor: 'divider' }}>
                                <Chip label={`Total: ${summary.total}`} size="small" sx={{ fontWeight: 700 }} />
                                <Chip label={`Fulfilled: ${summary.fulfilled}`} size="small" color="success" sx={{ fontWeight: 700 }} />
                                <Chip label={`Rejected: ${summary.rejected}`} size="small" color="error" sx={{ fontWeight: 700 }} />
                                <Chip label={`Pending: ${summary.pending}`} size="small" color="warning" sx={{ fontWeight: 700 }} />
                            </Box>
                            <Box sx={{ p: 2.5, display: 'flex', gap: 2, alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
                                <TextField
                                    placeholder="Search order, product, or requester..."
                                    size="small"
                                    value={filterText}
                                    onChange={(e) => setFilterText(e.target.value)}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Search size={18} color="#64748b" />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{ flexGrow: 1 }}
                                />
                                <TextField
                                    select
                                    size="small"
                                    label="Status"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value as 'all' | OrderStatus)}
                                    sx={{ minWidth: 140 }}
                                >
                                    <MenuItem value="all">All</MenuItem>
                                    <MenuItem value="fulfilled">Fulfilled</MenuItem>
                                    <MenuItem value="rejected">Rejected</MenuItem>
                                    <MenuItem value="pending">Pending</MenuItem>
                                </TextField>
                                <Button
                                    variant="outlined"
                                    startIcon={<Download size={18} />}
                                    color="inherit"
                                    onClick={exportOrdersToCSV}
                                    sx={{ borderColor: 'divider' }}
                                >
                                    Export CSV
                                </Button>
                                <Button
                                    variant="contained"
                                    startIcon={<FileDown size={18} />}
                                    onClick={handleDownloadPDF}
                                    sx={{ whiteSpace: 'nowrap' }}
                                >
                                    Download PDF
                                </Button>
                            </Box>
                            <TableContainer component={Paper} sx={{ borderRadius: 0 }} id="orders-print-area">
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 700 }}>ORDER ID</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>PRODUCT</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>QTY</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>STATUS</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>REASON</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>REQUESTED BY</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>TIME</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {filteredOrders.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7}>
                                                    <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
                                                        No orders match your filters yet.
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredOrders.map((order: Order) => (
                                                <TableRow key={order.id} hover>
                                                    <TableCell>
                                                        <Typography variant="body2" fontWeight={700}>#{order.id}</Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" fontWeight={600}>{order.productName}</Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" fontWeight={700}>{order.quantity}</Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            label={order.status === 'fulfilled' ? 'Fulfilled' : order.status}
                                                            size="small"
                                                            color={order.status === 'fulfilled' ? 'success' : order.status === 'rejected' ? 'error' : 'warning'}
                                                            sx={{ fontWeight: 700 }}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {order.notes || '-'}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2">{order.requestedBy}</Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {new Date(order.timestamp).toLocaleString()}
                                                        </Typography>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <style>
                {`
                @media print {
                    body * { visibility: hidden; }
                    #orders-print-area, #orders-print-area * { visibility: visible; }
                    #orders-print-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        background: white !important;
                    }
                }
                `}
            </style>
        </Box>
    );
};

export default OrderDesk;
