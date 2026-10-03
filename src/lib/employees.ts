import type { ChipProps } from '@mui/material';
import type { AttendanceDayStatus } from '../types/employee';

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const ATTENDANCE_STATUS_META: Record<AttendanceDayStatus, { label: string; short: string; color: ChipProps['color']; variant: ChipProps['variant'] }> = {
    present: { label: 'Present', short: 'P', color: 'success', variant: 'filled' },
    absent: { label: 'Absent', short: 'A', color: 'error', variant: 'filled' },
    leave: { label: 'On Leave', short: 'L', color: 'info', variant: 'filled' },
    off: { label: 'Off Day', short: 'O', color: 'default', variant: 'filled' },
    upcoming: { label: 'Upcoming', short: '', color: 'default', variant: 'outlined' },
    not_joined: { label: 'Not Joined', short: '', color: 'default', variant: 'outlined' },
};

export const getInitials = (name: string) =>
    name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');

/** The scanner's zone decides which calendar day a punch belongs to. */
export const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

/** YYYY-MM-DD in the browser's local time. */
export const toLocalDateKey = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const startOfMonthKey = (date = new Date()) => toLocalDateKey(new Date(date.getFullYear(), date.getMonth(), 1));

export const weekdayOfKey = (dateKey: string) => new Date(`${dateKey}T00:00:00`).getDay();

export const formatDateKey = (dateKey: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) =>
    dateKey ? new Date(`${dateKey}T00:00:00`).toLocaleDateString(undefined, options) : '-';

export const formatTime = (value?: string | null) =>
    value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';

/** HH:mm for a <input type="time">. */
export const toTimeInputValue = (value?: string | null) => {
    if (!value) return '';
    const date = new Date(value);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

export const formatWorkedMinutes = (minutes: number) => {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return hours ? `${hours}h ${rest}m` : `${rest}m`;
};

export const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/** Matches the backend allowlist. The type comes from the extension because browsers leave File.type empty for some Office files. */
const DOCUMENT_TYPES: Record<string, string> = {
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    txt: 'text/plain',
    csv: 'text/csv',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

export const MAX_DOCUMENT_BYTES = 2 * 1024 * 1024;
export const DOCUMENT_ACCEPT = Object.keys(DOCUMENT_TYPES).map((extension) => `.${extension}`).join(',');

export const readEmployeeDocument = (file: File) => new Promise<string>((resolve, reject) => {
    const mimeType = DOCUMENT_TYPES[file.name.split('.').pop()?.toLowerCase() || ''];
    if (!mimeType) {
        reject(new Error('Upload a PDF, image, Word, Excel, text, or CSV file.'));
        return;
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
        reject(new Error(`${file.name} is larger than 2 MB. Please upload a smaller file.`));
        return;
    }
    const reader = new FileReader();
    reader.onload = () => {
        const result = String(reader.result);
        resolve(`data:${mimeType};base64,${result.slice(result.indexOf(',') + 1)}`);
    };
    reader.onerror = () => reject(new Error(`Unable to read ${file.name}.`));
    reader.readAsDataURL(file);
});

/** PDFs and images open in a new tab; other files download. */
export const openEmployeeDocument = async ({ data, fileName, mimeType }: { data: string; fileName: string; mimeType: string }) => {
    const blob = await (await fetch(data)).blob();
    const url = URL.createObjectURL(blob);
    if (mimeType === 'application/pdf' || mimeType.startsWith('image/')) {
        window.open(url, '_blank', 'noopener');
    } else {
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
};
