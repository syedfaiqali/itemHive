import React from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Grid,
    Stack,
    Tab,
    Tabs,
    TextField,
    Typography,
    alpha,
} from '@mui/material';
import { LockKeyhole, Play, Printer, ReceiptText, RefreshCw } from 'lucide-react';
import { useSelector } from 'react-redux';
import api from '../../api/axios';
import type { RootState } from '../../store';
import useAppCurrency from '../../hooks/useAppCurrency';
import { DEFAULT_APP_SETTINGS } from '../../features/settings/settingsSlice';
import { printReceipt } from '../../lib/printReceipt';
import type { POSShift, ShiftReport, ShiftReportTotals } from '../../types/posShift';

const getErrorMessage = (error: unknown, fallback: string) =>
    (error as { response?: { data?: { message?: string } } }).response?.data?.message || fallback;

const POSShiftReportsPage: React.FC = () => {
    const { formatCurrency } = useAppCurrency();
    const { app } = useSelector((state: RootState) => state.settings);
    const appSettings = app || DEFAULT_APP_SETTINGS;
    const [currentShift, setCurrentShift] = React.useState<POSShift | null>(null);
    const [history, setHistory] = React.useState<POSShift[]>([]);
    const [liveReport, setLiveReport] = React.useState<ShiftReport | null>(null);
    const [displayReport, setDisplayReport] = React.useState<ShiftReport | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [busy, setBusy] = React.useState(false);
    const [printing, setPrinting] = React.useState(false);
    const [error, setError] = React.useState('');
    const [registerName, setRegisterName] = React.useState('Main Counter');
    const [openingCash, setOpeningCash] = React.useState('0');
    const [closeOpen, setCloseOpen] = React.useState(false);
    const [countedCash, setCountedCash] = React.useState('');
    const [sectionTab, setSectionTab] = React.useState(0);

    const loadData = React.useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [currentResponse, historyResponse] = await Promise.all([
                api.get<{ shift: POSShift | null }>('/pos-shifts/current'),
                api.get<POSShift[]>('/pos-shifts/history'),
            ]);
            setCurrentShift(currentResponse.data.shift);
            setHistory(historyResponse.data);
            if (currentResponse.data.shift) {
                const reportResponse = await api.get<{ report: ShiftReport }>('/pos-shifts/x-report');
                setLiveReport(reportResponse.data.report);
            } else {
                setLiveReport(null);
            }
        } catch (requestError: unknown) {
            setError(getErrorMessage(requestError, 'POS shift information could not be loaded.'));
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        void loadData();
    }, [loadData]);

    const handleOpenShift = async () => {
        const openingAmount = Number(openingCash);
        if (!registerName.trim() || !Number.isFinite(openingAmount) || openingAmount < 0) {
            setError('Enter a register name and a valid opening cash amount.');
            return;
        }
        setBusy(true);
        setError('');
        try {
            const response = await api.post<{ shift: POSShift }>('/pos-shifts/open', { registerName: registerName.trim(), openingCash: openingAmount });
            setCurrentShift(response.data.shift);
            window.dispatchEvent(new Event('itemhive-pos-shift-changed'));
            await loadData();
        } catch (requestError: unknown) {
            setError(getErrorMessage(requestError, 'Shift could not be opened.'));
        } finally {
            setBusy(false);
        }
    };

    const handleXReport = async () => {
        setBusy(true);
        setError('');
        try {
            const response = await api.get<{ report: ShiftReport }>('/pos-shifts/x-report');
            setLiveReport(response.data.report);
            setDisplayReport(response.data.report);
        } catch (requestError: unknown) {
            setError(getErrorMessage(requestError, 'X Report could not be generated.'));
        } finally {
            setBusy(false);
        }
    };

    const handleCloseShift = async () => {
        const countedAmount = Number(countedCash);
        if (!Number.isFinite(countedAmount) || countedAmount < 0) {
            setError('Enter a valid counted cash amount.');
            return;
        }
        setBusy(true);
        setError('');
        try {
            const response = await api.post<{ shift: POSShift; report: ShiftReport }>('/pos-shifts/close', { countedCash: countedAmount });
            setDisplayReport(response.data.report);
            setCloseOpen(false);
            setCountedCash('');
            setCurrentShift(null);
            setLiveReport(null);
            window.dispatchEvent(new Event('itemhive-pos-shift-changed'));
            await loadData();
        } catch (requestError: unknown) {
            setError(getErrorMessage(requestError, 'Shift could not be closed.'));
        } finally {
            setBusy(false);
        }
    };

    const handlePrint = async () => {
        const receipt = document.getElementById('shift-report-receipt');
        if (!receipt || printing) return;
        setPrinting(true);
        try {
            await printReceipt(receipt, '#shift-report-receipt', 80);
        } catch {
            setError('The 80mm report could not be prepared for printing.');
        } finally {
            setPrinting(false);
        }
    };

    const differenceLabel = (totals: ShiftReportTotals) => {
        const difference = Number(totals.cashDifference || 0);
        if (difference > 0) return `Over ${formatCurrency(difference)}`;
        if (difference < 0) return `Short ${formatCurrency(Math.abs(difference))}`;
        return 'Balanced';
    };

    if (loading) return <Box sx={{ minHeight: 400, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>;

    return (
        <Box sx={{ maxWidth: 1280, mx: 'auto' }}>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2} sx={{ mb: 2.5 }}>
                <Box>
                    <Typography variant="overline" color="primary.main" fontWeight={900} letterSpacing={1.1}>POS OPERATIONS</Typography>
                    <Typography variant="h4" fontWeight={900} lineHeight={1.15}>Shift Management</Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.5 }}>Open the cashier shift, monitor live totals, then close with a final Z Report.</Typography>
                </Box>
                <Chip
                    color={currentShift ? 'success' : 'default'}
                    label={currentShift ? `${currentShift.shiftCode} · OPEN` : 'NO ACTIVE SHIFT'}
                    sx={{ fontWeight: 900, px: 0.75 }}
                />
            </Stack>

            <Card variant="outlined" sx={{ borderRadius: 3.5, overflow: 'hidden' }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: { xs: 1.5, sm: 2.5 }, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Tabs value={sectionTab} onChange={(_, value) => setSectionTab(value)}>
                        <Tab label="Current Shift" sx={{ fontWeight: 800, minHeight: 58 }} />
                        <Tab label={`Z History (${history.length})`} sx={{ fontWeight: 800, minHeight: 58 }} />
                    </Tabs>
                    <Button size="small" color="inherit" startIcon={<RefreshCw size={16} />} onClick={loadData}>Refresh</Button>
                </Stack>

                {error && <Alert severity="error" onClose={() => setError('')} sx={{ m: 2, mb: 0 }}>{error}</Alert>}

                {sectionTab === 0 && (
                    <Box sx={{ p: { xs: 2, md: 3 } }}>
                        {!currentShift ? (
                            <Grid container sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden', minHeight: 330 }}>
                                <Grid size={{ xs: 12, md: 5 }} sx={{ p: { xs: 2.5, md: 4 }, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.07), display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                    <Box>
                                        <Box sx={{ width: 50, height: 50, borderRadius: 2.5, bgcolor: 'primary.main', color: 'primary.contrastText', display: 'grid', placeItems: 'center', mb: 2.5 }}><Play size={24} /></Box>
                                        <Typography variant="h5" fontWeight={900}>Start the cashier session</Typography>
                                        <Typography color="text.secondary" sx={{ mt: 1 }}>Opening cash becomes the starting drawer balance. POS payments unlock after the shift opens.</Typography>
                                    </Box>
                                    <Stack spacing={1.1} sx={{ mt: 3 }}>
                                        {['Open shift', 'Take payments & print X', 'Count cash & close Z'].map((step, index) => (
                                            <Stack key={step} direction="row" spacing={1.25} alignItems="center">
                                                <Box sx={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid', borderColor: 'primary.main', color: 'primary.main', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 900 }}>{index + 1}</Box>
                                                <Typography variant="body2" fontWeight={700}>{step}</Typography>
                                            </Stack>
                                        ))}
                                    </Stack>
                                </Grid>
                                <Grid size={{ xs: 12, md: 7 }} sx={{ p: { xs: 2.5, md: 4 }, display: 'flex', alignItems: 'center' }}>
                                    <Box sx={{ width: '100%', maxWidth: 520, mx: 'auto' }}>
                                        <Typography variant="h6" fontWeight={900}>Opening details</Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>Confirm the physical cash currently available in this drawer.</Typography>
                                        <Stack spacing={2}>
                                            <TextField fullWidth label="Register / Counter" value={registerName} onChange={(event) => setRegisterName(event.target.value)} inputProps={{ maxLength: 80 }} />
                                            <TextField fullWidth label="Opening Cash" type="number" value={openingCash} onChange={(event) => setOpeningCash(event.target.value)} inputProps={{ min: 0, step: 0.01 }} />
                                            <Button size="large" variant="contained" startIcon={busy ? <CircularProgress size={18} color="inherit" /> : <Play size={19} />} disabled={busy} onClick={handleOpenShift} sx={{ py: 1.25, fontWeight: 900 }}>
                                                {busy ? 'Opening Shift...' : 'Open POS Shift'}
                                            </Button>
                                        </Stack>
                                    </Box>
                                </Grid>
                            </Grid>
                        ) : (
                            <Stack spacing={2.5}>
                                <Box sx={{ p: { xs: 2.5, md: 3 }, border: '1px solid', borderColor: 'divider', borderLeft: '5px solid', borderLeftColor: 'success.main', borderRadius: 3 }}>
                                    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                                        <Box>
                                            <Stack direction="row" spacing={1} alignItems="center"><Chip label="LIVE" size="small" color="success" sx={{ fontWeight: 900 }} /><Typography variant="h5" fontWeight={900}>{currentShift.shiftCode}</Typography></Stack>
                                            <Typography fontWeight={700} sx={{ mt: 1 }}>{currentShift.registerName} · {currentShift.openedByName}</Typography>
                                            <Typography variant="body2" color="text.secondary">Opened {new Date(currentShift.openedAt).toLocaleString()}</Typography>
                                        </Box>
                                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} alignSelf={{ md: 'center' }}>
                                            <Button variant="contained" startIcon={<ReceiptText size={18} />} onClick={handleXReport} disabled={busy} sx={{ fontWeight: 900 }}>Preview X Report</Button>
                                            <Button color="error" variant="outlined" startIcon={<LockKeyhole size={18} />} onClick={() => { setCountedCash(String(liveReport?.totals.expectedDrawerCash ?? '')); setCloseOpen(true); }} disabled={busy} sx={{ fontWeight: 900 }}>Close Shift & Z</Button>
                                        </Stack>
                                    </Stack>
                                </Box>
                                {liveReport && <Grid container spacing={1.5}>
                                    {[
                                        ['Net Sales', formatCurrency(liveReport.totals.netSales)],
                                        ['Expected Drawer', formatCurrency(liveReport.totals.expectedDrawerCash)],
                                        ['Orders', String(liveReport.totals.completedOrders)],
                                        ['Items Sold', String(liveReport.totals.itemsSold)],
                                    ].map(([label, value], index) => <Grid key={label} size={{ xs: 6, md: 3 }}><Box sx={{ p: 2, borderRadius: 2.5, bgcolor: index < 2 ? (theme) => alpha(theme.palette.primary.main, 0.07) : 'action.hover', minHeight: 88 }}><Typography variant="caption" color="text.secondary" fontWeight={700}>{label}</Typography><Typography variant="h6" fontWeight={900} sx={{ mt: 0.5 }}>{value}</Typography></Box></Grid>)}
                                </Grid>}
                            </Stack>
                        )}
                    </Box>
                )}

                {sectionTab === 1 && (
                    <Box sx={{ p: { xs: 2, md: 3 } }}>
                        <Box sx={{ mb: 2.5 }}><Typography variant="h6" fontWeight={900}>Closed shifts</Typography><Typography variant="body2" color="text.secondary">Final Z Reports are locked and available for 80mm reprint.</Typography></Box>
                        {history.length === 0 ? (
                            <Box sx={{ borderRadius: 3, p: 6, textAlign: 'center', bgcolor: 'action.hover' }}><ReceiptText size={34} opacity={0.35} /><Typography fontWeight={800} sx={{ mt: 1 }}>No Z Reports yet</Typography><Typography variant="body2" color="text.secondary">Closed shifts will appear here.</Typography></Box>
                        ) : (
                            <Grid container spacing={2}>
                                {history.map((shift) => <Grid key={shift._id} size={{ xs: 12, md: 6 }}>
                                    <Card variant="outlined" sx={{ borderRadius: 2.5, height: '100%' }}><CardContent>
                                        <Stack direction="row" justifyContent="space-between"><Box><Typography fontWeight={900}>{shift.shiftCode}</Typography><Typography variant="caption" color="text.secondary">{shift.registerName} · {shift.closedByName || shift.openedByName}</Typography></Box><Chip label="Z CLOSED" size="small" /></Stack>
                                        <Divider sx={{ my: 2 }} />
                                        <Grid container spacing={1.5}>
                                            <Grid size={6}><Typography variant="caption" color="text.secondary">Net sales</Typography><Typography fontWeight={900}>{formatCurrency(shift.finalReport?.totals.netSales || 0)}</Typography></Grid>
                                            <Grid size={6}><Typography variant="caption" color="text.secondary">Cash result</Typography><Typography fontWeight={900}>{shift.finalReport ? differenceLabel(shift.finalReport.totals) : '-'}</Typography></Grid>
                                        </Grid>
                                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5 }}>{shift.closedAt ? `Closed ${new Date(shift.closedAt).toLocaleString()}` : ''}</Typography>
                                        <Button fullWidth variant="outlined" startIcon={<Printer size={17} />} disabled={!shift.finalReport} onClick={() => setDisplayReport(shift.finalReport || null)} sx={{ mt: 2, fontWeight: 800 }}>View / Reprint Z</Button>
                                    </CardContent></Card>
                                </Grid>)}
                            </Grid>
                        )}
                    </Box>
                )}
            </Card>

            <Dialog open={closeOpen} onClose={busy ? undefined : () => setCloseOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle fontWeight={900}>Close Shift and Create Z Report</DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ mb: 2 }}>Closing is final. New POS payments will require a new shift.</Alert>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Expected drawer cash</Typography>
                    <Typography variant="h5" fontWeight={900} sx={{ mb: 2 }}>{formatCurrency(liveReport?.totals.expectedDrawerCash || currentShift?.openingCash || 0)}</Typography>
                    <TextField autoFocus fullWidth label="Actual Counted Cash" type="number" value={countedCash} onChange={(event) => setCountedCash(event.target.value)} inputProps={{ min: 0, step: 0.01 }} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCloseOpen(false)} disabled={busy}>Cancel</Button>
                    <Button color="error" variant="contained" onClick={handleCloseShift} disabled={busy} startIcon={busy ? <CircularProgress size={17} color="inherit" /> : <LockKeyhole size={17} />}>{busy ? 'Closing...' : 'Close & Create Z'}</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={Boolean(displayReport)} onClose={printing ? undefined : () => setDisplayReport(null)} maxWidth="xs" fullWidth>
                <DialogTitle fontWeight={900}>{displayReport?.status === 'closed' ? 'Z Report' : 'X Report'} Preview</DialogTitle>
                <DialogContent>
                    {displayReport && <Box id="shift-report-receipt" sx={{ bgcolor: '#fff', color: '#000', p: 2, fontFamily: 'monospace', border: '1px dashed #999' }}>
                        <Typography align="center" fontWeight={900} fontSize={17}>{appSettings.shopName || 'ItemHive'}</Typography>
                        {appSettings.shopAddress && <Typography align="center" fontSize={11}>{appSettings.shopAddress}</Typography>}
                        {appSettings.shopPhone && <Typography align="center" fontSize={11}>{appSettings.shopPhone}</Typography>}
                        <Typography align="center" fontWeight={900} sx={{ my: 1 }}>{displayReport.status === 'closed' ? 'Z REPORT' : 'X REPORT'}</Typography>
                        <Box sx={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', py: 1 }}>
                            <Typography fontSize={11}>Shift: {displayReport.shiftCode}</Typography>
                            <Typography fontSize={11}>Register: {displayReport.registerName}</Typography>
                            <Typography fontSize={11}>Cashier: {displayReport.cashierName}</Typography>
                            <Typography fontSize={11}>Opened: {new Date(displayReport.openedAt).toLocaleString()}</Typography>
                            <Typography fontSize={11}>{displayReport.status === 'closed' ? 'Closed' : 'Report time'}: {new Date(displayReport.reportTime).toLocaleString()}</Typography>
                            <Typography fontSize={11}>Status: {displayReport.status.toUpperCase()}</Typography>
                        </Box>
                        <Stack spacing={0.45} sx={{ py: 1 }}>
                            {[
                                ['Completed Orders', displayReport.totals.completedOrders],
                                ['Items Sold', displayReport.totals.itemsSold],
                                ['Gross Sales', formatCurrency(displayReport.totals.grossSales)],
                                ['Discounts', `-${formatCurrency(displayReport.totals.discounts)}`],
                                ['Tax', formatCurrency(displayReport.totals.tax)],
                                ['NET SALES', formatCurrency(displayReport.totals.netSales)],
                            ].map(([label, value]) => <Stack key={String(label)} direction="row" justifyContent="space-between"><Typography fontSize={11} fontWeight={label === 'NET SALES' ? 900 : 500}>{label}</Typography><Typography fontSize={11} fontWeight={label === 'NET SALES' ? 900 : 700}>{value}</Typography></Stack>)}
                        </Stack>
                        <Divider sx={{ borderStyle: 'dashed', borderColor: '#000' }} />
                        <Stack spacing={0.45} sx={{ py: 1 }}>
                            {[
                                ['Cash Sales', formatCurrency(displayReport.totals.cashSales)],
                                ['Card Sales', formatCurrency(displayReport.totals.cardSales)],
                                ['Credit Sales', formatCurrency(displayReport.totals.creditSales)],
                                ['Credit Cash Paid', formatCurrency(displayReport.totals.creditCashReceived)],
                                ['Credit Card Paid', formatCurrency(displayReport.totals.creditCardReceived)],
                                ['Credit Recovery Cash', formatCurrency(displayReport.totals.creditCollectionsCash)],
                                ['Credit Recovery Card', formatCurrency(displayReport.totals.creditCollectionsCard)],
                                ['Installment Sales', formatCurrency(displayReport.totals.installmentSales)],
                                ['Installment Cash Adv.', formatCurrency(displayReport.totals.installmentCashAdvance)],
                                ['Installment Card Adv.', formatCurrency(displayReport.totals.installmentCardAdvance)],
                                ['EMI Recovery Cash', formatCurrency(displayReport.totals.installmentCollectionsCash)],
                                ['EMI Recovery Card', formatCurrency(displayReport.totals.installmentCollectionsCard)],
                            ].map(([label, value]) => <Stack key={String(label)} direction="row" justifyContent="space-between"><Typography fontSize={11}>{label}</Typography><Typography fontSize={11} fontWeight={700}>{value}</Typography></Stack>)}
                        </Stack>
                        <Divider sx={{ borderStyle: 'dashed', borderColor: '#000' }} />
                        <Stack spacing={0.45} sx={{ py: 1 }}>
                            <Stack direction="row" justifyContent="space-between"><Typography fontSize={11}>Opening Cash</Typography><Typography fontSize={11} fontWeight={700}>{formatCurrency(displayReport.openingCash)}</Typography></Stack>
                            <Stack direction="row" justifyContent="space-between"><Typography fontSize={11} fontWeight={900}>Expected Cash</Typography><Typography fontSize={11} fontWeight={900}>{formatCurrency(displayReport.totals.expectedDrawerCash)}</Typography></Stack>
                            {displayReport.totals.countedCash != null && <Stack direction="row" justifyContent="space-between"><Typography fontSize={11}>Counted Cash</Typography><Typography fontSize={11} fontWeight={700}>{formatCurrency(displayReport.totals.countedCash)}</Typography></Stack>}
                            {displayReport.totals.cashDifference != null && <Stack direction="row" justifyContent="space-between"><Typography fontSize={11} fontWeight={900}>Cash Result</Typography><Typography fontSize={11} fontWeight={900}>{differenceLabel(displayReport.totals)}</Typography></Stack>}
                        </Stack>
                        <Typography align="center" fontSize={10} fontWeight={800} sx={{ borderTop: '1px dashed #000', pt: 1 }}>{displayReport.status === 'open' ? 'X REPORT - SHIFT NOT CLOSED' : 'FINAL Z REPORT - SHIFT CLOSED'}</Typography>
                        <Typography align="center" fontSize={9}>Printed {new Date().toLocaleString()}</Typography>
                    </Box>}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDisplayReport(null)} disabled={printing}>Close</Button>
                    <Button variant="contained" startIcon={printing ? <CircularProgress size={17} color="inherit" /> : <Printer size={18} />} onClick={handlePrint} disabled={printing}>{printing ? 'Preparing...' : 'Print 80mm'}</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default POSShiftReportsPage;
