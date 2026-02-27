import React, { useState } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Grid,
    TextField,
    Button,
    MenuItem,
    InputAdornment,
    Divider,
    Alert,
    IconButton
} from '@mui/material';
import {
    ChevronLeft,
    Save,
    Image as ImageIcon,
    DollarSign,
    Layers
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { addProduct, type Product } from '../../features/inventory/inventorySlice';
import type { RootState } from '../../store';
import { motion } from 'framer-motion';

const categories = ['Electronics', 'Clothing', 'Home', 'Food', 'Accessories', 'Beauty'];

const AddProduct: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [success, setSuccess] = useState(false);

    const { products } = useSelector((state: RootState) => state.inventory);
    const [formData, setFormData] = useState({
        sku: '',
        name: '',
        category: '',
        price: '',
        stock: '',
        minStock: '',
        description: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Check for duplicate SKU
        if (products.some((p: Product) => p.sku === formData.sku)) {
            alert('A product with this SKU already exists!');
            return;
        }

        dispatch(addProduct({
            id: Math.random().toString(36).substr(2, 9),
            sku: formData.sku.toUpperCase(),
            name: formData.name,
            category: formData.category || 'Uncategorized',
            price: parseFloat(formData.price),
            stock: parseInt(formData.stock),
            minStock: parseInt(formData.minStock),
            description: formData.description,
            lastUpdated: new Date().toISOString()
        }));

        setSuccess(true);
        setTimeout(() => {
            navigate('/inventory');
        }, 1500);
    };

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto' }}>
            <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
                <IconButton onClick={() => navigate('/inventory')} sx={{ bgcolor: 'background.paper' }}>
                    <ChevronLeft size={20} />
                </IconButton>
                <Typography variant="h4" fontWeight={800}>Add New Product</Typography>
            </Box>

            {success && (
                <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
                    Product added successfully! Redirecting to inventory...
                </Alert>
            )}

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
            >
                <Card sx={{ borderRadius: 4 }}>
                    <CardContent sx={{ p: 4 }}>
                        <form onSubmit={handleSubmit}>
                            <Grid container spacing={3}>
                                <Grid size={12}>
                                    <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Layers size={20} /> General Information
                                    </Typography>
                                    <Divider sx={{ mb: 3 }} />
                                </Grid>

                                <Grid size={12}>
                                    <TextField
                                        fullWidth
                                        label="SKU (Unique Identifier)"
                                        name="sku"
                                        required
                                        value={formData.sku}
                                        onChange={handleChange}
                                        placeholder="e.g. ELE-MAC-001"
                                        variant="outlined"
                                        sx={{ mb: 1 }}
                                    />
                                </Grid>

                                <Grid size={{ xs: 12, md: 6 }}>
                                    <TextField
                                        fullWidth
                                        label="Product Name"
                                        name="name"
                                        required
                                        value={formData.name}
                                        onChange={handleChange}
                                        variant="outlined"
                                    />
                                </Grid>

                                <Grid size={{ xs: 12, md: 6 }}>
                                    <TextField
                                        select
                                        fullWidth
                                        label="Category"
                                        name="category"
                                        required
                                        value={formData.category}
                                        onChange={handleChange}
                                    >
                                        {categories.map((option) => (
                                            <MenuItem key={option} value={option}>
                                                {option}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                </Grid>

                                <Grid size={12}>
                                    <TextField
                                        fullWidth
                                        multiline
                                        rows={4}
                                        label="Description"
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        placeholder="Enter product features and details..."
                                    />
                                </Grid>

                                <Grid size={12} sx={{ mt: 2 }}>
                                    <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <DollarSign size={20} /> Pricing & Stock
                                    </Typography>
                                    <Divider sx={{ mb: 3 }} />
                                </Grid>

                                <Grid size={{ xs: 12, md: 4 }}>
                                    <TextField
                                        fullWidth
                                        label="Price ($)"
                                        name="price"
                                        type="number"
                                        required
                                        value={formData.price}
                                        onChange={handleChange}
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start">$</InputAdornment>,
                                        }}
                                    />
                                </Grid>

                                <Grid size={{ xs: 12, md: 4 }}>
                                    <TextField
                                        fullWidth
                                        label="Initial Stock"
                                        name="stock"
                                        type="number"
                                        required
                                        value={formData.stock}
                                        onChange={handleChange}
                                    />
                                </Grid>

                                <Grid size={{ xs: 12, md: 4 }}>
                                    <TextField
                                        fullWidth
                                        label="Minimum Stock Level"
                                        name="minStock"
                                        type="number"
                                        required
                                        value={formData.minStock}
                                        onChange={handleChange}
                                        helperText="Alert dashboard when stock drops below this"
                                    />
                                </Grid>

                                <Grid size={12} sx={{ mt: 2 }}>
                                    <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <ImageIcon size={20} /> Media
                                    </Typography>
                                    <Divider sx={{ mb: 3 }} />
                                    <Box
                                        sx={{
                                            border: '2px dashed',
                                            borderColor: 'divider',
                                            borderRadius: 4,
                                            p: 4,
                                            textAlign: 'center',
                                            bgcolor: 'rgba(0,0,0,0.01)',
                                            cursor: 'pointer',
                                            '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' }
                                        }}
                                    >
                                        <ImageIcon size={48} color="#64748b" style={{ marginBottom: 12 }} />
                                        <Typography variant="body2" color="text.secondary">
                                            Drag and drop product images here, or click to browse
                                        </Typography>
                                    </Box>
                                </Grid>

                                <Grid size={12} sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                                    <Button
                                        variant="outlined"
                                        size="large"
                                        onClick={() => navigate('/inventory')}
                                        sx={{ borderRadius: 2, px: 4 }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        size="large"
                                        startIcon={<Save size={20} />}
                                        sx={{ borderRadius: 2, px: 4 }}
                                    >
                                        Save Product
                                    </Button>
                                </Grid>
                            </Grid>
                        </form>
                    </CardContent>
                </Card>
            </motion.div>
        </Box>
    );
};

export default AddProduct;
