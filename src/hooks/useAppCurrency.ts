import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import type { CurrencyCode } from '../features/settings/settingsSlice';

const localeByCurrency: Record<CurrencyCode, string> = {
    USD: 'en-US',
    EUR: 'de-DE',
    GBP: 'en-GB',
    PKR: 'en-PK',
    INR: 'en-IN',
    AED: 'en-AE',
};

interface CurrencyFormatOptions {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
}

export const useAppCurrency = () => {
    const storedCurrency = useSelector((state: RootState) => state.settings.currency);
    const currency = storedCurrency || 'USD';
    const locale = localeByCurrency[currency] || 'en-US';

    const currencySymbol = useMemo(() => {
        const parts = new Intl.NumberFormat(locale, {
            style: 'currency',
            currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).formatToParts(0);
        return parts.find((part) => part.type === 'currency')?.value || currency;
    }, [currency, locale]);

    const formatCurrency = (value: number, options?: CurrencyFormatOptions) => {
        const amount = Number.isFinite(value) ? value : 0;
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency,
            minimumFractionDigits: options?.minimumFractionDigits ?? 2,
            maximumFractionDigits: options?.maximumFractionDigits ?? 2,
        }).format(amount);
    };

    return { currency, currencySymbol, formatCurrency };
};

export default useAppCurrency;
