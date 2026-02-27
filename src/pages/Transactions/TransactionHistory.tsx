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
    TextField,
    InputAdornment,
    Chip,
    IconButton,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Divider,
} from '@mui/material';
import {
    Search,
    FileDown,
    Printer,
    ArrowUpRight,
    ArrowDownLeft,
    Calendar,
    Filter,
    X
} from 'lucide-react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { format } from 'date-fns';

const TransactionHistory: React.FC = () => {
    const { transactions } = useSelector((state: RootState) => state.transactions || { transactions: [] });
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTx, setSelectedTx] = useState<any>(null);

    const filteredTransactions = (transactions || []).filter(t =>
        t.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handlePrint = () => {
        window.print();
    };

    const exportToCSV = () => {
        const headers = ['TX ID', 'Timestamp', 'Product', 'User', 'Type', 'Quantity', 'Value'];
        const rows = filteredTransactions.map(t => [
            t.id,
            t.timestamp,
            t.productName,
            t.userName,
            t.type,
            t.amount,
            t.totalPrice || 0
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Box>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h4" fontWeight={800}>Transaction History</Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button variant="outlined" startIcon={<Calendar size={20} />} sx={{ borderRadius: 2 }}>
                        Date Range
                    </Button>
                    <Button variant="contained" startIcon={<FileDown size={20} />} sx={{ borderRadius: 2 }} onClick={exportToCSV}>
                        Export CSV
                    </Button>
                </Box>
            </Box>

            <Card sx={{ borderRadius: 4, overflow: 'hidden' }}>
                <CardContent sx={{ p: 0 }}>
                    <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
                        <TextField
                            placeholder="Search by ID, Product or User..."
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
                            sx={{ flexGrow: 1, maxWidth: 500 }}
                        />
                        <Button variant="outlined" startIcon={<Filter size={18} />} color="inherit" sx={{ borderColor: 'divider' }}>
                            Filter Type
                        </Button>
                    </Box>

                    <TableContainer>
                        <Table>
                            <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 700 }}>TX ID</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>DATE & TIME</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>PRODUCT</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>USER</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>TYPE</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>QUANTITY</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>VALUE</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700 }}>ACTIONS</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredTransactions.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                                            <Typography color="text.secondary">No transactions found.</Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredTransactions.map((tx) => (
                                        <TableRow key={tx.id} hover>
                                            <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>#{tx.id}</TableCell>
                                            <TableCell>
                                                <Box>
                                                    <Typography variant="body2">{format(new Date(tx.timestamp), 'MMM dd, yyyy')}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{format(new Date(tx.timestamp), 'hh:mm a')}</Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>{tx.productName}</TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Box
                                                        sx={{
                                                            width: 24,
                                                            height: 24,
                                                            borderRadius: '50%',
                                                            bgcolor: 'primary.light',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: '0.7rem',
                                                            color: 'white',
                                                            fontWeight: 700
                                                        }}
                                                    >
                                                        {tx.userName.charAt(0)}
                                                    </Box>
                                                    <Typography variant="body2">{tx.userName}</Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    icon={tx.type === 'addition' ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                                                    label={tx.type === 'addition' ? 'Restocked' : 'Sold/Reduced'}
                                                    size="small"
                                                    color={tx.type === 'addition' ? 'success' : 'error'}
                                                    sx={{ fontWeight: 700, borderRadius: 1.5 }}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>
                                                {tx.type === 'addition' ? '+' : '-'}{tx.amount}
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 800 }}>
                                                ${tx.totalPrice?.toLocaleString() || '-'}
                                            </TableCell>
                                            <TableCell align="right">
                                                <IconButton size="small" onClick={() => setSelectedTx(tx)}>
                                                    <Printer size={18} />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>

            {/* Print Friendly Invoice Dialog */}
            <Dialog open={Boolean(selectedTx)} onClose={() => setSelectedTx(null)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" fontWeight={800}>Invoice Detail</Typography>
                    <IconButton onClick={() => setSelectedTx(null)} size="small">
                        <X size={20} />
                    </IconButton>
                </DialogTitle>
                <DialogContent id="printable-invoice">
                    {selectedTx && (
                        <Box sx={{ p: 2 }}>
                            <Box sx={{ textAlign: 'center', mb: 4 }}>
                                <Typography variant="h4" fontWeight={900} color="primary.main">ItemHive</Typography>
                                <Typography variant="body2" color="text.secondary">Inventory Management Solutions</Typography>
                            </Box>

                            <Box sx={{ mb: 4 }}>
                                <Typography variant="subtitle2" color="text.secondary">INVOICE TO:</Typography>
                                <Typography variant="h6" fontWeight={700}>{selectedTx.userName}</Typography>
                                <Typography variant="body2">{format(new Date(selectedTx.timestamp), 'MMMM dd, yyyy • hh:mm a')}</Typography>
                            </Box>

                            <Divider sx={{ mb: 3 }} />

                            <Box sx={{ mb: 4 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography fontWeight={700}>Transaction ID:</Typography>
                                    <Typography color="primary.main" fontWeight={700}>#{selectedTx.id}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography fontWeight={700}>Product:</Typography>
                                    <Typography>{selectedTx.productName}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography fontWeight={700}>Type:</Typography>
                                    <Typography sx={{ textTransform: 'capitalize' }}>{selectedTx.type}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography fontWeight={700}>Quantity:</Typography>
                                    <Typography>{selectedTx.amount} Units</Typography>
                                </Box>
                            </Box>

                            <Box sx={{ bgcolor: 'rgba(99, 102, 241, 0.05)', p: 3, borderRadius: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="h6" fontWeight={800}>Total Value:</Typography>
                                    <Typography variant="h6" fontWeight={900} color="primary.main">
                                        ${selectedTx.totalPrice?.toLocaleString() || '0.00'}
                                    </Typography>
                                </Box>
                            </Box>

                            <Box sx={{ mt: 6, textAlign: 'center' }}>
                                <Typography variant="caption" color="text.secondary">
                                    Thank you for using ItemHive Inventory System.
                                </Typography>
                            </Box>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setSelectedTx(null)}>Cancel</Button>
                    <Button variant="contained" startIcon={<Printer size={20} />} onClick={handlePrint}>
                        Print Invoice
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Global Print Style */}
            <style>
                {`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #printable-invoice, #printable-invoice * {
                        visibility: visible;
                    }
                    #printable-invoice {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                    .MuiDialogActions-root {
                        display: none !important;
                    }
                    .MuiDialogTitle-root button {
                        display: none !important;
                    }
                }
                `}
            </style>
        </Box>
    );
};

export default TransactionHistory;
