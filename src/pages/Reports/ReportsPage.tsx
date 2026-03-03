import React, { useMemo } from 'react';
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
import { alpha, useTheme } from '@mui/material/styles';
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
import useAppCurrency from '../../hooks/useAppCurrency';

const ReportsPage: React.FC = () => {
    const theme = useTheme();
    const { products } = useSelector((state: RootState) => state.inventory);
    const { transactions } = useSelector((state: RootState) => state.transactions);
    const { currency, formatCurrency } = useAppCurrency();

    const reportPalette = useMemo(
        () => [
            theme.palette.primary.main,
            theme.palette.secondary.main,
            theme.palette.success.main,
            theme.palette.warning.main,
            '#0ea5e9',
            '#a855f7',
        ],
        [theme.palette]
    );

    const last7Days = useMemo(
        () => [...Array(7)].map((_, i) => {
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
        }),
        [transactions]
    );

    const pieData = useMemo(() => {
        const categorySummary = products.reduce<Record<string, number>>((acc, p) => {
            acc[p.category] = (acc[p.category] || 0) + (p.stock * p.price);
            return acc;
        }, {});

        return Object.keys(categorySummary)
            .map(cat => ({
                name: cat,
                value: categorySummary[cat]
            }))
            .sort((a, b) => b.value - a.value);
    }, [products]);

    const stockLevelData = useMemo(
        () => [...products]
            .map(p => ({
                name: p.name.length > 13 ? `${p.name.substring(0, 13)}...` : p.name,
                stock: p.stock,
                min: p.minStock,
                gap: p.stock - p.minStock,
            }))
            .sort((a, b) => a.gap - b.gap)
            .slice(0, 10),
        [products]
    );

    const topSellingRows = useMemo(
        () => products
            .map((product) => {
                const totalReduced = transactions
                    .filter(t => t.productId === product.id && t.type === 'reduction')
                    .reduce((sum, t) => sum + t.amount, 0);
                return {
                    product,
                    totalReduced,
                    revenue: totalReduced * product.price,
                };
            })
            .sort((a, b) => b.totalReduced - a.totalReduced),
        [products, transactions]
    );

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
                                                <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.22} />
                                                <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={alpha(theme.palette.text.primary, 0.1)} />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                        <YAxis axisLine={false} tickLine={false} />
                                        <Tooltip formatter={(value: number | string | undefined) => [formatCurrency(Number(value || 0)), `Revenue (${currency})`]} />
                                        <Area type="monotone" dataKey="revenue" stroke={theme.palette.primary.main} strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" name={`Revenue (${currency})`} />
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
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={alpha(theme.palette.text.primary, 0.1)} />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                        <YAxis axisLine={false} tickLine={false} />
                                        <Tooltip formatter={(value: number | string | undefined) => [Number(value || 0), 'Units Sold']} />
                                        <Bar dataKey="sales" fill={theme.palette.success.main} radius={[4, 4, 0, 0]} name="Units Sold" />
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
                                <BarChartIcon size={20} /> Stock Level (Top 10 Critical)
                            </Typography>
                            <Box sx={{ height: 300, mt: 3 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stockLevelData} layout="vertical" margin={{ left: 10 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={alpha(theme.palette.text.primary, 0.1)} />
                                        <XAxis type="number" axisLine={false} tickLine={false} />
                                        <YAxis type="category" dataKey="name" width={90} axisLine={false} tickLine={false} />
                                        <Tooltip
                                            formatter={(value: number | string | undefined, name) => [Number(value || 0), name === 'stock' ? 'Current Stock' : 'Min Threshold']}
                                        />
                                        <Legend />
                                        <Bar dataKey="stock" fill={theme.palette.primary.main} radius={[0, 4, 4, 0]} name="Current Stock" />
                                        <Bar dataKey="min" fill={theme.palette.error.main} radius={[0, 4, 4, 0]} name="Min Threshold" />
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
                                                <Cell key={`cell-${index}`} fill={reportPalette[index % reportPalette.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value: number | string | undefined) => [formatCurrency(Number(value || 0), { minimumFractionDigits: 0, maximumFractionDigits: 0 }), `Value (${currency})`]} />
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
                                        {topSellingRows.map(({ product, totalReduced, revenue }) => (
                                            <TableRow key={product.id}>
                                                <TableCell sx={{ fontWeight: 600 }}>{product.name}</TableCell>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <TrendingDown size={14} color={theme.palette.error.main} />
                                                        {totalReduced} Units
                                                    </Box>
                                                </TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>
                                                    {formatCurrency(revenue, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                </TableCell>
                                                <TableCell>{product.stock} Units</TableCell>
                                            </TableRow>
                                        ))}
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
