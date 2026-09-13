import { useState } from 'react';
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material';
import { Upload, Trash2, Link as LinkIcon } from 'lucide-react';
import { optimizeProductImage, PRODUCT_IMAGE_HELPER_TEXT } from '../../lib/productImage';

export default function ProductImageUpload({ value, onChange, disabled = false }: { value?: string; onChange: (value: string) => void; disabled?: boolean }) {
    const [url, setUrl] = useState(value?.startsWith('http') ? value : '');
    const [error, setError] = useState('');
    const [reading, setReading] = useState(false);
    const upload = (file?: File) => {
        if (!file) return;
        setError('');
        setReading(true);
        optimizeProductImage(file)
            .then(onChange)
            .catch((uploadError: unknown) => setError(uploadError instanceof Error ? uploadError.message : 'Unable to optimize this image. Please retry.'))
            .finally(() => setReading(false));
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
        <Typography variant="caption" color="text.secondary">{PRODUCT_IMAGE_HELPER_TEXT} Source file limit: 10 MB.</Typography>
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
