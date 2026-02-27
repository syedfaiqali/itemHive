import React, { useState } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    TextField,
    InputAdornment,
    Chip,
    Button,
    Avatar,
    Menu,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Grid,
    Snackbar,
    Alert
} from '@mui/material';
import {
    Search,
    MoreVertical,
    Edit,
    Trash2,
    Plus,
    Filter,
    Download,
    Eye,
    Save
} from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../store';
import { deleteProduct, updateProduct, type Product } from '../../features/inventory/inventorySlice';
import { useNavigate } from 'react-router-dom';

const ProductList: React.FC = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { products } = useSelector((state: RootState) => state.inventory);
    const { user } = useSelector((state: RootState) => state.auth);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [viewProduct, setViewProduct] = useState<Product | null>(null);
    const [editProduct, setEditProduct] = useState<Product | null>(null);
    const [snack, setSnack] = useState<{ open: boolean, message: string, severity: 'success' | 'error' | 'info' | 'warning' }>({
        open: false,
        message: '',
        severity: 'success'
    });

    const handleSnackClose = () => setSnack({ ...snack, open: false });

    const showSnack = (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'success') => {
        setSnack({ open: true, message, severity });
    };

    React.useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 300);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    const isAdmin = user?.role === 'admin';

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, id: string) => {
        setAnchorEl(event.currentTarget);
        setSelectedProductId(id);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setSelectedProductId(null);
    };

    const handleDeleteClick = () => {
        setDeleteId(selectedProductId);
        handleMenuClose();
    };

    const handleViewClick = () => {
        const product = products.find(p => p.id === selectedProductId);
        if (product) setViewProduct(product);
        handleMenuClose();
    };

    const handleEditClick = () => {
        const product = products.find(p => p.id === selectedProductId);
        if (product) setEditProduct({ ...product });
        handleMenuClose();
    };

    const confirmDelete = () => {
        if (deleteId) {
            dispatch(deleteProduct(deleteId));
            setDeleteId(null);
            showSnack('Product deleted successfully', 'success');
        }
    };

    const handleUpdateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editProduct) {
            dispatch(updateProduct(editProduct));
            setEditProduct(null);
            showSnack('Product updated successfully', 'success');
        }
    };

    const exportToCSV = () => {
        const headers = ['ID', 'Name', 'Category', 'Price', 'Stock', 'Min Stock', 'Last Updated'];
        const rows = products.map(p => [
            p.id,
            p.name,
            p.category,
            p.price,
            p.stock,
            p.minStock,
            p.lastUpdated
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `inventory_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        p.category.toLowerCase().includes(debouncedSearch.toLowerCase())
    );

    return (
        <Box>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h4" fontWeight={800}>Inventory Management</Typography>
                {isAdmin && (
                    <Button
                        variant="contained"
                        startIcon={<Plus size={20} />}
                        onClick={() => navigate('/inventory/add')}
                        sx={{ borderRadius: 2 }}
                    >
                        Add Product
                    </Button>
                )}
            </Box>

            <Card sx={{ borderRadius: 4, overflow: 'hidden' }}>
                <CardContent sx={{ p: 0 }}>
                    <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
                        <TextField
                            placeholder="Search products..."
                            size="small"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search size={18} color="#64748b" />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ flexGrow: 1, maxWidth: 400 }}
                        />
                        <Button variant="outlined" startIcon={<Filter size={18} />} color="inherit" sx={{ borderColor: 'divider' }}>
                            Filters
                        </Button>
                        <Button variant="outlined" startIcon={<Download size={18} />} color="inherit" sx={{ borderColor: 'divider' }} onClick={exportToCSV}>
                            Export CSV
                        </Button>
                    </Box>

                    <TableContainer component={Box}>
                        <Table>
                            <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 700 }}>PRODUCT NAME</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>CATEGORY</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>STOCK LEVEL</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>PRICE</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>STATUS</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700 }}>ACTIONS</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredProducts.map((product) => (
                                    <TableRow key={product.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <Avatar
                                                    variant="rounded"
                                                    sx={{ bgcolor: 'rgba(99, 102, 241, 0.1)', color: 'primary.main', fontWeight: 700 }}
                                                >
                                                    {product.name.charAt(0)}
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="subtitle2" fontWeight={700}>{product.name}</Typography>
                                                    <Typography variant="caption" color="text.secondary">ID: {product.id}</Typography>
                                                </Box>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={product.category}
                                                size="small"
                                                sx={{ fontWeight: 600, bgcolor: 'rgba(0,0,0,0.05)' }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={600}>{product.stock} Units</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={700}>${product.price}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            {product.stock <= 0 ? (
                                                <Chip label="Out of Stock" size="small" color="error" sx={{ fontWeight: 600 }} />
                                            ) : product.stock <= product.minStock ? (
                                                <Chip label="Low Stock" size="small" color="warning" sx={{ fontWeight: 600 }} />
                                            ) : (
                                                <Chip label="In Stock" size="small" color="success" sx={{ fontWeight: 600 }} />
                                            )}
                                        </TableCell>
                                        <TableCell align="right">
                                            <IconButton onClick={(e) => handleMenuOpen(e, product.id)}>
                                                <MoreVertical size={20} />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
                <MenuItem onClick={handleViewClick}><Eye size={16} style={{ marginRight: 8 }} /> View Details</MenuItem>
                {isAdmin && (
                    <>
                        <MenuItem onClick={handleEditClick}><Edit size={16} style={{ marginRight: 8 }} /> Edit Product</MenuItem>
                        <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}><Trash2 size={16} style={{ marginRight: 8 }} /> Delete</MenuItem>
                    </>
                )}
            </Menu>

            {/* View Product Dialog */}
            <Dialog open={Boolean(viewProduct)} onClose={() => setViewProduct(null)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 800 }}>Product Details</DialogTitle>
                <DialogContent dividers>
                    {viewProduct && (
                        <Box sx={{ py: 2 }}>
                            <Box sx={{ display: 'flex', gap: 3, mb: 4 }}>
                                <Avatar variant="rounded" sx={{ width: 100, height: 100, fontSize: '3rem', bgcolor: 'primary.light' }}>
                                    {viewProduct.name.charAt(0)}
                                </Avatar>
                                <Box>
                                    <Typography variant="h5" fontWeight={800}>{viewProduct.name}</Typography>
                                    <Typography color="text.secondary" gutterBottom>{viewProduct.category}</Typography>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <Chip label={`ID: ${viewProduct.id}`} size="small" variant="outlined" />
                                        <Chip label={`SKU: ${viewProduct.sku}`} size="small" color="primary" variant="outlined" />
                                    </Box>
                                </Box>
                            </Box>
                            <Grid container spacing={3}>
                                <Grid size={6}>
                                    <Typography variant="caption" color="text.secondary" display="block">CURRENT STOCK</Typography>
                                    <Typography variant="h6" fontWeight={700}>{viewProduct.stock} Units</Typography>
                                </Grid>
                                <Grid size={6}>
                                    <Typography variant="caption" color="text.secondary" display="block">UNIT PRICE</Typography>
                                    <Typography variant="h6" fontWeight={700}>${viewProduct.price}</Typography>
                                </Grid>
                                <Grid size={6}>
                                    <Typography variant="caption" color="text.secondary" display="block">MINIMUM THRESHOLD</Typography>
                                    <Typography variant="h6" fontWeight={700}>{viewProduct.minStock} Units</Typography>
                                </Grid>
                                <Grid size={6}>
                                    <Typography variant="caption" color="text.secondary" display="block">LAST UPDATED</Typography>
                                    <Typography variant="body1">{new Date(viewProduct.lastUpdated).toLocaleDateString()}</Typography>
                                </Grid>
                                <Grid size={12}>
                                    <Typography variant="caption" color="text.secondary" display="block">DESCRIPTION</Typography>
                                    <Typography variant="body2">{viewProduct.description || 'No description provided.'}</Typography>
                                </Grid>
                            </Grid>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setViewProduct(null)} variant="outlined">Close</Button>
                    {isAdmin && <Button onClick={() => { setEditProduct(viewProduct); setViewProduct(null); }} variant="contained">Edit Product</Button>}
                </DialogActions>
            </Dialog>

            {/* Edit Product Dialog */}
            <Dialog open={Boolean(editProduct)} onClose={() => setEditProduct(null)} maxWidth="md" fullWidth>
                <form onSubmit={handleUpdateSubmit}>
                    <DialogTitle sx={{ fontWeight: 800 }}>Edit Product</DialogTitle>
                    <DialogContent dividers>
                        {editProduct && (
                            <Grid container spacing={3} sx={{ mt: 1 }}>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <TextField
                                        fullWidth
                                        label="Product Name"
                                        required
                                        value={editProduct.name}
                                        onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <TextField
                                        select
                                        fullWidth
                                        label="Category"
                                        required
                                        value={editProduct.category}
                                        onChange={(e) => setEditProduct({ ...editProduct, category: e.target.value })}
                                    >
                                        {['Electronics', 'Clothing', 'Home', 'Food', 'Accessories', 'Beauty'].map((cat) => (
                                            <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                                        ))}
                                    </TextField>
                                </Grid>
                                <Grid size={{ xs: 12, md: 4 }}>
                                    <TextField
                                        fullWidth
                                        label="Price ($)"
                                        type="number"
                                        required
                                        value={editProduct.price}
                                        onChange={(e) => setEditProduct({ ...editProduct, price: parseFloat(e.target.value) })}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, md: 4 }}>
                                    <TextField
                                        fullWidth
                                        label="Current Stock"
                                        type="number"
                                        required
                                        value={editProduct.stock}
                                        onChange={(e) => setEditProduct({ ...editProduct, stock: parseInt(e.target.value) })}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, md: 4 }}>
                                    <TextField
                                        fullWidth
                                        label="Min Stock Threshold"
                                        type="number"
                                        required
                                        value={editProduct.minStock}
                                        onChange={(e) => setEditProduct({ ...editProduct, minStock: parseInt(e.target.value) })}
                                    />
                                </Grid>
                                <Grid size={12}>
                                    <TextField
                                        fullWidth
                                        multiline
                                        rows={3}
                                        label="Description"
                                        value={editProduct.description}
                                        onChange={(e) => setEditProduct({ ...editProduct, description: e.target.value })}
                                    />
                                </Grid>
                            </Grid>
                        )}
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={() => setEditProduct(null)}>Cancel</Button>
                        <Button type="submit" variant="contained" startIcon={<Save size={20} />}>Save Changes</Button>
                    </DialogActions>
                </form>
            </Dialog>

            <Dialog open={Boolean(deleteId)} onClose={() => setDeleteId(null)}>
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    <Typography>Are you sure you want to delete this product? This action cannot be undone.</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteId(null)}>Cancel</Button>
                    <Button onClick={confirmDelete} color="error" variant="contained">Delete</Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snack.open}
                autoHideDuration={4000}
                onClose={handleSnackClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert onClose={handleSnackClose} severity={snack.severity} variant="filled" sx={{ width: '100%' }}>
                    {snack.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default ProductList;
