import React from 'react';
import { Box, Typography, type SxProps, type Theme } from '@mui/material';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { DEFAULT_APP_SETTINGS } from '../../features/settings/settingsSlice';

export interface LetterheadMeta {
    label: string;
    value: string;
}

interface InvoiceLetterheadProps {
    title?: string;
    /** Small label above the recipient, e.g. "Invoice to". */
    billToLabel?: string;
    billTo?: string;
    /** Secondary line under the recipient, e.g. the cashier who served them. */
    billToSubtitle?: string;
    /** Right-aligned label/value pairs: invoice date, due date, invoice number... */
    meta?: LetterheadMeta[];
    sx?: SxProps<Theme>;
}

/**
 * Printable invoice letterhead: document title on the left, uploaded banner on
 * the right, then the recipient beside a meta column and the shop's own
 * contact block. Banner and shop details come from Settings -> POS & Receipt.
 */
const InvoiceLetterhead: React.FC<InvoiceLetterheadProps> = ({
    title = 'Invoice',
    billToLabel,
    billTo,
    billToSubtitle,
    meta = [],
    sx,
}) => {
    const { app } = useSelector((state: RootState) => state.settings);
    const appSettings = app || DEFAULT_APP_SETTINGS;
    const bannerUrl = appSettings.receiptBannerUrl;
    const shopName = appSettings.shopName || DEFAULT_APP_SETTINGS.shopName;

    return (
        <Box
            sx={[
                {
                    // Keep the logo and its colours in the printed output.
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                },
                ...(Array.isArray(sx) ? sx : [sx]),
            ]}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 2,
                    minHeight: bannerUrl ? 72 : 'auto',
                }}
            >
                <Typography variant="h3" fontWeight={800} sx={{ lineHeight: 1.1 }}>
                    {title}
                </Typography>
                {bannerUrl && (
                    <Box
                        component="img"
                        src={bannerUrl}
                        alt={`${shopName} banner`}
                        sx={{
                            maxHeight: 90,
                            maxWidth: { xs: 160, sm: 280 },
                            objectFit: 'contain',
                        }}
                    />
                )}
            </Box>

            <Box
                sx={{
                    mt: 4,
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 3,
                    flexWrap: 'wrap',
                }}
            >
                <Box sx={{ minWidth: 0 }}>
                    {billToLabel && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {billToLabel}
                        </Typography>
                    )}
                    {billTo && (
                        <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.3 }}>
                            {billTo}
                        </Typography>
                    )}
                    {billToSubtitle && (
                        <Typography variant="body2" color="text.secondary">
                            {billToSubtitle}
                        </Typography>
                    )}
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2.5, ml: 'auto' }}>
                    {meta.length > 0 && (
                        <Box sx={{ textAlign: 'right' }}>
                            {meta.map((entry) => (
                                <Box key={entry.label} sx={{ mb: 1.25 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                        {entry.label}
                                    </Typography>
                                    <Typography variant="body2" fontWeight={700}>
                                        {entry.value}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                    )}

                    <Box
                        sx={{
                            pl: 2.5,
                            borderLeft: '1px solid',
                            borderColor: 'divider',
                            maxWidth: 260,
                        }}
                    >
                        <Typography variant="body2" fontWeight={800} sx={{ textTransform: 'uppercase' }}>
                            {shopName}
                        </Typography>
                        {appSettings.shopAddress && (
                            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                                {appSettings.shopAddress}
                            </Typography>
                        )}
                        {appSettings.shopPhone && (
                            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                                {appSettings.shopPhone}
                            </Typography>
                        )}
                    </Box>
                </Box>
            </Box>
        </Box>
    );
};

export default InvoiceLetterhead;
