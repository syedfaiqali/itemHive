const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export const isDateKey = (value: unknown): value is string => {
    if (typeof value !== 'string' || !DATE_KEY_PATTERN.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

/** Falls back to UTC when the scanner sends a zone the server's ICU data does not know. */
export const resolveTimeZone = (value: unknown) => {
    const timeZone = String(value || '').trim();
    if (!timeZone) return 'UTC';
    try {
        new Intl.DateTimeFormat('en-US', { timeZone });
        return timeZone;
    } catch {
        return 'UTC';
    }
};

/** The calendar day (YYYY-MM-DD) that `date` falls on in `timeZone`. */
export const toDateKey = (date: Date, timeZone: string) => {
    // en-CA formats dates as YYYY-MM-DD.
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
};

export const addDays = (dateKey: string, days: number) =>
    new Date(new Date(`${dateKey}T00:00:00Z`).getTime() + days * DAY_MS).toISOString().slice(0, 10);

export const weekdayOf = (dateKey: string) => new Date(`${dateKey}T00:00:00Z`).getUTCDay();

export const daysBetweenInclusive = (from: string, to: string) =>
    Math.round((new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / DAY_MS) + 1;

export const listDateKeys = (from: string, to: string) => {
    const keys: string[] = [];
    for (let key = from; key <= to; key = addDays(key, 1)) keys.push(key);
    return keys;
};
