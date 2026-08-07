import React from 'react';
import { Box, Typography, alpha, useTheme, type SxProps, type Theme } from '@mui/material';

export interface InvoiceLineItem {
    description: string;
    quantity: number | string;
    unitPrice: string;
    total: string;
}

export interface InvoiceTotalRow {
    label: string;
    value: string;
    strong?: boolean;
}

interface InvoiceItemsTableProps {
    items: InvoiceLineItem[];
    totals?: InvoiceTotalRow[];
    amountInWords?: string;
    sx?: SxProps<Theme>;
}

/**
 * Bordered line-item table shared by every printable invoice, so the screen,
 * the print output and the shared PDF all carry the same columns - including
 * the serial number of each line.
 */
const InvoiceItemsTable: React.FC<InvoiceItemsTableProps> = ({ items, totals = [], amountInWords, sx }) => {
    const theme = useTheme();

    return (
        <Box sx={sx}>
            <Box
                component="table"
                sx={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    '& th, & td': {
                        border: '1px solid',
                        borderColor: alpha(theme.palette.text.primary, 0.35),
                        px: 1.25,
                        py: 1,
                        fontSize: 14,
                    },
                    '& th': {
                        fontWeight: 800,
                        textAlign: 'left',
                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                    },
                    '& td.num, & th.num': { textAlign: 'right' },
                }}
            >
                <Box component="thead">
                    <Box component="tr">
                        <Box component="th" sx={{ width: 44 }}>#</Box>
                        <Box component="th">Description</Box>
                        <Box component="th" className="num" sx={{ width: 80 }}>Qty</Box>
                        <Box component="th" className="num" sx={{ width: 120 }}>Unit price</Box>
                        <Box component="th" className="num" sx={{ width: 130 }}>Total</Box>
                    </Box>
                </Box>
                <Box component="tbody">
                    {items.map((item, index) => (
                        <Box component="tr" key={`${item.description}-${index}`}>
                            <Box component="td">{index + 1}</Box>
                            <Box component="td">{item.description}</Box>
                            <Box component="td" className="num">{item.quantity}</Box>
                            <Box component="td" className="num">{item.unitPrice}</Box>
                            <Box component="td" className="num">{item.total}</Box>
                        </Box>
                    ))}
                    {totals.map((total) => (
                        <Box component="tr" key={total.label}>
                            <Box
                                component="td"
                                colSpan={4}
                                className="num"
                                sx={{ fontWeight: total.strong ? 800 : 400, border: 'none !important' }}
                            >
                                {total.label}
                            </Box>
                            <Box component="td" className="num" sx={{ fontWeight: total.strong ? 900 : 500 }}>
                                {total.value}
                            </Box>
                        </Box>
                    ))}
                </Box>
            </Box>

            {amountInWords && (
                <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        Total amount in words
                    </Typography>
                    <Typography variant="body2">{amountInWords}</Typography>
                </Box>
            )}
        </Box>
    );
};

export default InvoiceItemsTable;
