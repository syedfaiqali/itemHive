import React from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Avatar,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Grid,
    Chip
} from '@mui/material';
import {
    Package,
    TrendingUp,
    AlertTriangle,
    ArrowRight,
    ShoppingCart,
    DollarSign,
    Monitor
} from 'lucide-react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell
} from 'recharts';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const { products } = useSelector((state: RootState) => state.inventory);
    const { transactions = [] } = useSelector((state: RootState) => state.transactions || { transactions: [] });
    const { user } = useSelector((state: RootState) => state.auth);

    const totalStock = products.reduce((acc, p) => acc + p.stock, 0);
    const lowStockItems = products.filter(p => p.stock <= p.minStock);
    const totalValue = products.reduce((acc, p) => acc + (p.price * p.stock), 0);

    const recentTransactions = transactions.slice(0, 5);

    // Dynamic Chart Data: Last 7 days movement
    const last7Days = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const dateStr = d.toISOString().split('T')[0];
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });

        const daySales = transactions
            .filter(t => t.timestamp.startsWith(dateStr) && t.type === 'reduction')
            .reduce((sum, t) => sum + (t.totalPrice || 0), 0);

        return { name: dayName, sales: daySales };
    });

    // Dynamic Category Data: Top 4 categories by value
    const catMap = products.reduce((acc: any, p) => {
        acc[p.category] = (acc[p.category] || 0) + (p.stock * p.price);
        return acc;
    }, {});

    const COLORS = ['#6366f1', '#f43f5e', '#10b981', '#f59e0b'];
    const dynamicCategoryData = Object.keys(catMap)
        .map((cat, i) => ({
            name: cat,
            value: catMap[cat],
            color: COLORS[i % COLORS.length]
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 4);

    const stats = [
        {
            title: 'Total Products',
            value: products.length,
            icon: <Package size={24} />,
            color: '#6366f1',
            trend: 'Live Database'
        },
        {
            title: 'Total Stock',
            value: totalStock,
            icon: <TrendingUp size={24} />,
            color: '#10b981',
            trend: 'Across all items'
        },
        {
            title: 'Low Stock Alerts',
            value: lowStockItems.length,
            icon: <AlertTriangle size={24} />,
            color: '#f43f5e',
            trend: `${lowStockItems.length} items need attention`
        },
        {
            title: 'Inventory Value',
            value: `$${totalValue.toLocaleString()}`,
            icon: <DollarSign size={24} />,
            color: '#f59e0b',
            trend: 'Calculated current valuation'
        },
    ];

    return (
        <Box>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h4" fontWeight={800} gutterBottom>
                        Welcome back, {user?.username?.split(' ')[0] || 'User'}!
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Here's what's happening with your POS system today.
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<Monitor size={20} />}
                    sx={{ display: { xs: 'none', md: 'flex' }, borderRadius: 3, py: 1.5, px: 3, fontWeight: 800 }}
                    onClick={() => navigate('/pos')}
                >
                    Open POS Terminal
                </Button>
            </Box>

            <Grid container spacing={3}>
                {stats.map((stat, index) => (
                    <Grid size={{ xs: 12, sm: 6, md: 3 }} key={stat.title}>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card sx={{ height: '100%', borderRadius: 4 }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                        <Avatar
                                            sx={{
                                                bgcolor: `${stat.color}15`,
                                                color: stat.color,
                                                width: 48,
                                                height: 48,
                                                borderRadius: 3
                                            }}
                                        >
                                            {stat.icon}
                                        </Avatar>
                                    </Box>
                                    <Typography variant="h4" fontWeight={800}>{stat.value}</Typography>
                                    <Typography variant="body2" color="text.secondary" fontWeight={600} gutterBottom>
                                        {stat.title}
                                    </Typography>
                                    <Typography variant="caption" color={stat.title === 'Low Stock Alerts' && lowStockItems.length > 0 ? 'error' : 'success.main'} fontWeight={700}>
                                        {stat.trend}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </Grid>
                ))}

                <Grid size={{ xs: 12, md: 8 }}>
                    <Card sx={{ borderRadius: 4 }}>
                        <CardContent>
                            <Typography variant="h6" fontWeight={700} gutterBottom>
                                Inventory Sales Volume (7 Days)
                            </Typography>
                            <Box sx={{ height: 300, mt: 2 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={last7Days}>
                                        <defs>
                                            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: '12px',
                                                border: 'none',
                                                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                                            }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="sales"
                                            stroke="#6366f1"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorSales)"
                                            name="Revenue ($)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                    <Card sx={{ borderRadius: 4, height: '100%' }}>
                        <CardContent>
                            <Typography variant="h6" fontWeight={700} gutterBottom>
                                Valuation by Category
                            </Typography>
                            <Box sx={{ height: 280, mt: 2 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dynamicCategoryData} layout="vertical">
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} width={80} />
                                        <Tooltip
                                            cursor={{ fill: 'transparent' }}
                                            formatter={(value: any) => [`$${(value || 0).toLocaleString()}`, 'Value']}
                                        />
                                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={25}>
                                            {dynamicCategoryData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </Box>
                            <Box sx={{ mt: 2 }}>
                                {dynamicCategoryData.map((item) => (
                                    <Box key={item.name} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: item.color }} />
                                            {item.name}
                                        </Typography>
                                        <Typography variant="body2" fontWeight={700}>${item.value.toLocaleString()}</Typography>
                                    </Box>
                                ))}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={12}>
                    <Card sx={{ borderRadius: 4 }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="h6" fontWeight={700}>
                                    Recent Activity
                                </Typography>
                                <Button size="small" endIcon={<ArrowRight size={16} />} onClick={() => navigate('/transactions')}>View All</Button>
                            </Box>
                            {recentTransactions.length === 0 ? (
                                <Box sx={{ textAlign: 'center', py: 4 }}>
                                    <Typography color="text.secondary">No transactions yet recorded.</Typography>
                                </Box>
                            ) : (
                                <Box>
                                    <TableContainer>
                                        <Table size="small">
                                            <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                                                <TableRow>
                                                    <TableCell sx={{ fontWeight: 700 }}>ID</TableCell>
                                                    <TableCell sx={{ fontWeight: 700 }}>Product</TableCell>
                                                    <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
                                                    <TableCell sx={{ fontWeight: 700 }}>Quantity</TableCell>
                                                    <TableCell sx={{ fontWeight: 700 }}>Value</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {recentTransactions.map((tx) => (
                                                    <TableRow key={tx.id} hover>
                                                        <TableCell sx={{ fontWeight: 600 }}>#{tx.id}</TableCell>
                                                        <TableCell>{tx.productName}</TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                label={tx.type === 'addition' ? 'Stock In' : 'Stock Out'}
                                                                size="small"
                                                                color={tx.type === 'addition' ? 'success' : 'error'}
                                                                variant="outlined"
                                                                sx={{ fontWeight: 700, fontSize: '0.65rem' }}
                                                            />
                                                        </TableCell>
                                                        <TableCell sx={{ fontWeight: 600 }}>{tx.amount}</TableCell>
                                                        <TableCell sx={{ fontWeight: 700 }}>${tx.totalPrice?.toLocaleString() || '0'}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default Dashboard;
