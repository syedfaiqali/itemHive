import { useState } from 'react';
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material';
import { Upload, Trash2, Link as LinkIcon } from 'lucide-react';

export default function ProductImageUpload({ value, onChange, disabled = false }: { value?: string; onChange: (value: string) => void; disabled?: boolean }) {
    const [url, setUrl] = useState(value?.startsWith('http') ? value : '');
    const [error, setError] = useState('');
    const [reading, setReading] = useState(false);
    const upload = (file?: File) => {
        if (!file) return;
        setError('');
        if (!file.type.startsWith('image/')) { setError('Please choose an image file.'); return; }
        if (file.size > 1_500_000) { setError('Please use an image smaller than 1.5 MB.'); return; }
        const reader = new FileReader();
        setReading(true);
        reader.onload = () => { onChange(String(reader.result)); setReading(false); };
        reader.onerror = () => { setError('Unable to read this image. Please retry.'); setReading(false); };
        reader.readAsDataURL(file);
    };
    return <Stack spacing={2}>
        <Typography fontWeight={700}>Product Image</Typography>
        {value && <Box component="img" src={value} alt="Product preview" sx={{ width: '100%', height: 180, objectFit: 'contain', borderRadius: 2 }} />}
        <Stack direction="row" gap={1} flexWrap="wrap">
            <Button component="label" variant="outlined" startIcon={<Upload size={18} />} disabled={disabled || reading}>
                {reading ? 'Reading image...' : value ? 'Replace Image' : 'Upload Image'}
                <input type="file" accept="image/*" hidden disabled={disabled || reading} onChange={event => { upload(event.target.files?.[0]); event.target.value = ''; }} />
            </Button>
            {value && <Button color="error" startIcon={<Trash2 size={18} />} disabled={disabled || reading} onClick={() => { onChange(''); setError(''); }}>Remove</Button>}
        </Stack>
        <Typography variant="caption" color="text.secondary">Choose an image up to 1.5 MB. Save the product to apply your changes.</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField fullWidth label="Image URL" placeholder="https://example.com/image.jpg" value={url} disabled={disabled || reading} onChange={event => setUrl(event.target.value)} />
            <Button
                variant="outlined"
                startIcon={<LinkIcon size={18} />}
                sx={{ flexShrink: 0, minWidth: 132, whiteSpace: 'nowrap', px: 2, alignSelf: { xs: 'flex-start', sm: 'stretch' } }}
                disabled={disabled || reading || !url.trim()}
                onClick={() => {
                try {
                    const parsed = new URL(url.trim());
                    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
                    onChange(url.trim()); setError('');
                } catch { setError('Enter a valid HTTP or HTTPS image URL.'); }
            }}>Use URL</Button>
        </Stack>
        {error && <Alert severity="error">{error}</Alert>}
    </Stack>;
}
