import api from '../../api/axios';
import { createPortal } from 'react-dom';
import './reportsPrint.css';
import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import {
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Alert,
    Button,
    ButtonGroup,
    Stack,
    TextField,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
    TrendingDown,
    BarChart as BarChartIcon
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
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
import { fetchProducts } from '../../features/inventory/inventorySlice';
import { type SalesTrendPoint, type CategoryValuationPoint, type TopSellingProduct, type ReportFilters, type ReportPeriod } from '../../features/reports/reportSlice';

const ReportsPage: React.FC = () => {
    const theme = useTheme();
    const dispatch = useDispatch<AppDispatch>();
    const { products } = useSelector((state: RootState) => state.inventory);
    const [salesTrend, setSalesTrend] = useState<SalesTrendPoint[]>([]);
    const [categoryValuation, setCategoryValuation] = useState<CategoryValuationPoint[]>([]);
    const [topSelling, setTopSelling] = useState<TopSellingProduct[]>([]);
    const [error, setError] = useState('');
    const [generating, setGenerating] = useState(false);
    const [generated, setGenerated] = useState(false);
    const requestId = useRef(0);
    const { currency, formatCurrency } = useAppCurrency();
    const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>('7days');
    const [generatedFilters, setGeneratedFilters] = useState<ReportFilters>({ period: '7days' });
    const [fromDate, setFromDate] = useState(() => {
        const date = new Date();
        date.setDate(date.getDate() - 6);
        return date.toISOString().split('T')[0];
    });
    const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);

    const generate = useCallback(async (filters: ReportFilters) => {
        const request = ++requestId.current;
        setGenerating(true); setGenerated(false); setError('');
        try {
            const [trend, valuation, selling] = await Promise.all([
                api.get<SalesTrendPoint[]>('/reports/sales-trend', { params: filters }),
                api.get<CategoryValuationPoint[]>('/reports/category-valuation'),
                api.get<TopSellingProduct[]>('/reports/top-selling', { params: filters }),
            ]);
            if (request !== requestId.current) return;
            setSalesTrend(trend.data); setCategoryValuation(valuation.data); setTopSelling(selling.data);
            setGeneratedFilters(filters); setGenerated(true);
            dispatch(fetchProducts());
        } catch (failure) {
            if (request !== requestId.current) return;
            const response = (failure as { response?: { status?: number; data?: { message?: string } } }).response;
            setError(response?.status === 404 ? 'The report API is unavailable on the connected backend. Deploy the updated backend and retry.' : response?.data?.message || 'Unable to generate reports. Check your connection and retry.');
        } finally { if (request === requestId.current) setGenerating(false); }
    }, [dispatch]);
    useEffect(() => {
        const refresh = () => { setSalesTrend([]); setCategoryValuation([]); setTopSelling([]); void generate({ period: '7days' }); };
        refresh();
        window.addEventListener('itemhive-workspace-changed', refresh);
        return () => { ++requestId.current; window.removeEventListener('itemhive-workspace-changed', refresh); };
    }, [generate]);
    const handleGenerateReport = () => {
        if (selectedPeriod === 'custom' && (!fromDate || !toDate || fromDate > toDate)) {
            setError('Choose a valid From and To date, with From on or before To.'); return;
        }
        void generate(selectedPeriod === 'custom' ? { period: 'custom', from: fromDate, to: toDate } : { period: selectedPeriod });
    };

    const reportHeading = useMemo(() => {
        if (generatedFilters.period === 'monthly') return 'Last 30 Days';
        if (generatedFilters.period === 'yearly') return 'Last 12 Months';
        if (generatedFilters.period === 'custom') {
            return `${generatedFilters.from || fromDate} to ${generatedFilters.to || toDate}`;
        }
        return 'Last 7 Days';
    }, [fromDate, generatedFilters, toDate]);

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

    const trendData = useMemo(() => {
        if (generatedFilters.period === 'yearly') {
            return [...Array(12)].map((_, i) => {
                const d = new Date();
                d.setMonth(d.getMonth() - (11 - i), 1);
                const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                const monthLabel = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                const point = salesTrend.find((entry) => entry._id === monthKey);
                return { name: monthLabel, revenue: point?.revenue || 0, sales: point?.sales || 0 };
            });
        }

        const start = generatedFilters.period === 'custom'
            ? new Date(generatedFilters.from || fromDate)
            : null;
        const end = generatedFilters.period === 'custom'
            ? new Date(generatedFilters.to || toDate)
            : null;

        if (start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
            const rows: Array<{ name: string; revenue: number; sales: number }> = [];
            const cursor = new Date(start);
            while (cursor <= end) {
                const dateStr = cursor.toISOString().split('T')[0];
                const point = salesTrend.find((entry) => entry._id === dateStr);
                rows.push({
                    name: cursor.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    revenue: point?.revenue || 0,
                    sales: point?.sales || 0,
                });
                cursor.setDate(cursor.getDate() + 1);
            }
            return rows;
        }

        const totalDays = generatedFilters.period === 'monthly' ? 30 : 7;
        return [...Array(totalDays)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - ((totalDays - 1) - i));
            const dateStr = d.toISOString().split('T')[0];
            const point = salesTrend.find((entry) => entry._id === dateStr);
            const label = generatedFilters.period === 'monthly'
                ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            return { name: label, revenue: point?.revenue || 0, sales: point?.sales || 0 };
        });
    }, [fromDate, generatedFilters, salesTrend, toDate]);

    const pieData = useMemo(() => categoryValuation, [categoryValuation]);

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
        () => topSelling.map((row) => ({
            ...row,
            product: products.find((product) => product.id === row._id),
        })),
        [topSelling, products]
    );

    const totalProfit = useMemo(
        () => salesTrend.reduce((sum, point) => sum + (point.profit || 0), 0),
        [salesTrend]
    );

    return (
        <Box>
            {createPortal(<section id="itemhive-report-print">
                <h1>ItemHive Inventory &amp; Sales Report</h1>
                <p>{reportHeading} | Currency: {currency}</p>
                <p>Total profit/loss: {formatCurrency(totalProfit)}</p>
                <h2>Sales Summary</h2>
                {salesTrend.length === 0 ? <p>No sales recorded for this period.</p> : <table><thead><tr><th>Date</th><th>Revenue</th><th>Units sold</th><th>Profit/loss</th></tr></thead><tbody>{salesTrend.map(row => <tr key={row._id}><td>{row._id}</td><td>{formatCurrency(row.revenue)}</td><td>{row.sales}</td><td>{formatCurrency(row.profit || 0)}</td></tr>)}</tbody></table>}
                <h2>Top Selling Products</h2>
                {topSelling.length === 0 ? <p>No sales recorded for this period.</p> : <table><thead><tr><th>Product</th><th>Units sold</th><th>Revenue</th><th>Profit/loss</th></tr></thead><tbody>{topSelling.map(row => <tr key={row._id}><td>{row.name}</td><td>{row.totalReduced}</td><td>{formatCurrency(row.revenue)}</td><td>{formatCurrency(row.profit || 0)}</td></tr>)}</tbody></table>}
                <h2>Current Inventory Valuation</h2><p>Current stock values, independent of the selected sales period.</p>
                <table><thead><tr><th>Category</th><th>Stock value</th></tr></thead><tbody>{categoryValuation.map(row => <tr key={row.name}><td>{row.name}</td><td>{formatCurrency(row.value)}</td></tr>)}</tbody></table>
            </section>, document.body)}

            <Box
                sx={{
                    mb: 4,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: 1.5,
                    '@media print': { display: 'none' }
                }}
            >
                <Box>
                    <Typography variant="h4" fontWeight={800}>Inventory Analytics & Reports</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Generate 7-day, monthly, yearly, or custom date range reports from the controls below.
                    </Typography>
                </Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                    <ButtonGroup variant="outlined" sx={{ flexWrap: 'wrap' }}>
                        <Button variant={selectedPeriod === '7days' ? 'contained' : 'outlined'} onClick={() => setSelectedPeriod('7days')}>
                            7 Days
                        </Button>
                        <Button variant={selectedPeriod === 'monthly' ? 'contained' : 'outlined'} onClick={() => setSelectedPeriod('monthly')}>
                            Monthly
                        </Button>
                        <Button variant={selectedPeriod === 'yearly' ? 'contained' : 'outlined'} onClick={() => setSelectedPeriod('yearly')}>
                            Yearly
                        </Button>
                        <Button variant={selectedPeriod === 'custom' ? 'contained' : 'outlined'} onClick={() => setSelectedPeriod('custom')}>
                            Custom Range
                        </Button>
                    </ButtonGroup>
                    {selectedPeriod === 'custom' && (
                        <>
                            <TextField
                                type="date"
                                size="small"
                                label="From"
                                InputLabelProps={{ shrink: true }}
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                            />
                            <TextField
                                type="date"
                                size="small"
                                label="To"
                                InputLabelProps={{ shrink: true }}
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                            />
                        </>
                    )}
                    <Button variant="contained" disabled={generating} onClick={handleGenerateReport}>
                        {generating ? 'Generating...' : 'Generate Report'}
                    </Button>
                </Stack>
            </Box>

            {generated && !error && <Alert severity="success" sx={{ mb: 2 }}>Report generated for {reportHeading}. {salesTrend.length === 0 ? 'No sales were recorded in this period.' : ''}</Alert>}
            <Button variant="outlined" disabled={!generated || generating || Boolean(error)} sx={{ mb: 2 }} onClick={() => window.print()}>Print / Save as PDF</Button>
            <Typography variant="caption" display="block" sx={{ mb: 2 }}>Generate your report, then choose Save as PDF in the print dialog.</Typography>
            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            <Alert severity={totalProfit >= 0 ? 'success' : 'warning'} sx={{ mb: 3 }}>
                Total profit/loss for {reportHeading.toLowerCase()}: {formatCurrency(totalProfit, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </Alert>

            <Grid container spacing={3}>
                {/* Revenue Trend Line Chart */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Card sx={{ borderRadius: 4 }}>
                        <CardContent>
                            <Typography variant="h6" fontWeight={700} gutterBottom>{`Revenue Trend (${reportHeading})`}</Typography>
                            <Box sx={{ height: { xs: 240, sm: 280, md: 300 }, mt: 2.5 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={trendData}>
                                        <defs>
                                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.22} />
                                                <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={alpha(theme.palette.text.primary, 0.1)} />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={generatedFilters.period === 'monthly' || generatedFilters.period === 'custom' ? 24 : 8} />
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
                            <Typography variant="h6" fontWeight={700} gutterBottom>{`Sales Volume (${reportHeading})`}</Typography>
                            <Box sx={{ height: { xs: 240, sm: 280, md: 300 }, mt: 2.5 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={trendData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={alpha(theme.palette.text.primary, 0.1)} />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={generatedFilters.period === 'monthly' || generatedFilters.period === 'custom' ? 24 : 8} />
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
                            <Box sx={{ height: { xs: 240, sm: 280, md: 300 }, mt: 2.5 }}>
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
                            <Box sx={{ height: { xs: 240, sm: 280, md: 300 }, mt: 2.5 }}>
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
                            <TableContainer sx={{ overflowX: 'auto' }}>
                                <Table sx={{ minWidth: 640 }}>
                                    <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 700 }}>PRODUCT</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>TOTAL REDUCED</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>REVENUE GENERATED</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>PROFIT / LOSS</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>CURRENT STOCK</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {topSellingRows.map(({ product, _id, name, totalReduced, revenue, profit }) => (
                                            <TableRow key={_id}>
                                                <TableCell sx={{ fontWeight: 600 }}>{name}</TableCell>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <TrendingDown size={14} color={theme.palette.error.main} />
                                                        {totalReduced} Units
                                                    </Box>
                                                </TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>
                                                    {formatCurrency(revenue, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                </TableCell>
                                                <TableCell sx={{ fontWeight: 700, color: (profit || 0) >= 0 ? 'success.main' : 'error.main' }}>
                                                    {formatCurrency(profit || 0, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                </TableCell>
                                                <TableCell>{product?.stock ?? 0} Units</TableCell>
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

