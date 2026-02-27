import React from 'react';
import {
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from '@mui/material';
import {
    Download,
    Printer,
    TrendingDown,
    BarChart as BarChartIcon
} from 'lucide-react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area
} from 'recharts';

const COLORS = ['#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];

const ReportsPage: React.FC = () => {
    const { products } = useSelector((state: RootState) => state.inventory);
    const { transactions } = useSelector((state: RootState) => state.transactions);

    // Filter transactions for last 7 days for trend
    const last7Days = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const dateStr = d.toISOString().split('T')[0];
        const dayLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        const dayRevenue = transactions
            .filter(t => t.timestamp.startsWith(dateStr) && t.type === 'reduction')
            .reduce((sum, t) => sum + (t.totalPrice || 0), 0);

        const daySales = transactions
            .filter(t => t.timestamp.startsWith(dateStr) && t.type === 'reduction')
            .reduce((sum, t) => sum + t.amount, 0);

        return { name: dayLabel, revenue: dayRevenue, sales: daySales };
    });

    const categorySummary = products.reduce((acc: any, p) => {
        acc[p.category] = (acc[p.category] || 0) + (p.stock * p.price);
        return acc;
    }, {});

    const pieData = Object.keys(categorySummary).map(cat => ({
        name: cat,
        value: categorySummary[cat]
    }));

    const stockLevelData = products.map(p => ({
        name: p.name.length > 10 ? p.name.substring(0, 10) + '...' : p.name,
        stock: p.stock,
        min: p.minStock
    }));

    const handlePrint = () => {
        window.print();
    };

    return (
        <Box>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', '@media print': { display: 'none' } }}>
                <Typography variant="h4" fontWeight={800}>Inventory Analytics & Reports</Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button variant="outlined" startIcon={<Printer size={20} />} onClick={handlePrint}>Print Report</Button>
                    <Button variant="contained" startIcon={<Download size={20} />}>Export Data</Button>
                </Box>
            </Box>

            <Grid container spacing={3}>
                {/* Revenue Trend Line Chart */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Card sx={{ borderRadius: 4 }}>
                        <CardContent>
                            <Typography variant="h6" fontWeight={700} gutterBottom>Revenue Trend (Last 7 Days)</Typography>
                            <Box sx={{ height: 300, mt: 3 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={last7Days}>
                                        <defs>
                                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                        <YAxis axisLine={false} tickLine={false} />
                                        <Tooltip />
                                        <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" name="Revenue ($)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Sales Volume Bar Chart */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Card sx={{ borderRadius: 4 }}>
                        <CardContent>
                            <Typography variant="h6" fontWeight={700} gutterBottom>Sales Volume (Units)</Typography>
                            <Box sx={{ height: 300, mt: 3 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={last7Days}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                        <YAxis axisLine={false} tickLine={false} />
                                        <Tooltip />
                                        <Bar dataKey="sales" fill="#10b981" radius={[4, 4, 0, 0]} name="Units Sold" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <Card sx={{ borderRadius: 4 }}>
                        <CardContent>
                            <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <BarChartIcon size={20} /> Stock Level Comparison
                            </Typography>
                            <Box sx={{ height: 300, mt: 3 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stockLevelData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                        <YAxis axisLine={false} tickLine={false} />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="stock" fill="#6366f1" radius={[4, 4, 0, 0]} name="Current Stock" />
                                        <Bar dataKey="min" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Min Threshold" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <Card sx={{ borderRadius: 4 }}>
                        <CardContent>
                            <Typography variant="h6" fontWeight={700} gutterBottom>Inventory Value by Category</Typography>
                            <Box sx={{ height: 300, mt: 3 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {pieData.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={12}>
                    <Card sx={{ borderRadius: 4 }}>
                        <CardContent>
                            <Typography variant="h6" fontWeight={700} gutterBottom>Top Selling Products (Performance)</Typography>
                            <TableContainer>
                                <Table>
                                    <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 700 }}>PRODUCT</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>TOTAL REDUCED</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>REVENUE GENERATED</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>CURRENT STOCK</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {products.map((product) => {
                                            const totalReduced = transactions
                                                .filter(t => t.productId === product.id && t.type === 'reduction')
                                                .reduce((sum, t) => sum + t.amount, 0);

                                            const revenue = totalReduced * product.price;

                                            return (
                                                <TableRow key={product.id}>
                                                    <TableCell sx={{ fontWeight: 600 }}>{product.name}</TableCell>
                                                    <TableCell>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <TrendingDown size={14} color="#f43f5e" />
                                                            {totalReduced} Units
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell sx={{ fontWeight: 700 }}>${revenue.toLocaleString()}</TableCell>
                                                    <TableCell>{product.stock} Units</TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};


export default ReportsPage;
