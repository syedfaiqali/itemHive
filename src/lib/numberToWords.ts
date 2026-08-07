const ONES = [
    '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
    'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
    'seventeen', 'eighteen', 'nineteen',
];

const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

const belowThousand = (value: number): string => {
    if (value === 0) return '';
    if (value < 20) return ONES[value];
    if (value < 100) {
        const tens = TENS[Math.floor(value / 10)];
        const ones = ONES[value % 10];
        return ones ? `${tens}-${ones}` : tens;
    }
    const hundreds = `${ONES[Math.floor(value / 100)]} hundred`;
    const remainder = belowThousand(value % 100);
    return remainder ? `${hundreds} ${remainder}` : hundreds;
};

/** South-Asian grouping, matching how the amounts are read locally. */
const SCALES: Array<{ value: number; name: string }> = [
    { value: 10_000_000, name: 'crore' },
    { value: 100_000, name: 'lakh' },
    { value: 1_000, name: 'thousand' },
];

const wholeToWords = (value: number): string => {
    if (value === 0) return 'zero';

    let remaining = value;
    const parts: string[] = [];

    for (const scale of SCALES) {
        const count = Math.floor(remaining / scale.value);
        if (count > 0) {
            parts.push(`${wholeToWords(count)} ${scale.name}`);
            remaining %= scale.value;
        }
    }

    const tail = belowThousand(remaining);
    if (tail) parts.push(tail);

    return parts.join(' ');
};

const capitalize = (text: string) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : text);

/**
 * Spells an invoice total, e.g. 39000 -> "Thirty-nine thousand".
 * Fractions are rendered as "and 50/100" so printed slips stay unambiguous.
 */
export const amountToWords = (amount: number): string => {
    if (!Number.isFinite(amount)) return '';

    const negative = amount < 0;
    const absolute = Math.abs(amount);
    const whole = Math.floor(absolute);
    const fraction = Math.round((absolute - whole) * 100);

    let words = wholeToWords(whole);
    if (fraction > 0) {
        words += ` and ${fraction}/100`;
    }
    if (negative) {
        words = `minus ${words}`;
    }

    return capitalize(words);
};

export default amountToWords;
