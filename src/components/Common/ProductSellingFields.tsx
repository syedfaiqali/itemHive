import { Box, Button, Checkbox, FormControlLabel, MenuItem, Stack, TextField, Typography } from '@mui/material';
import type { Product } from '../../features/inventory/inventorySlice';
import { useState } from 'react';

export type SellingDetails = Pick<Product, 'unitSizeEnabled' | 'sellingType' | 'productUnitCode' | 'productUnit' | 'sizes'>;
const units = [{ code: 'litre', label: 'Liter' }, { code: 'milliliter', label: 'Milliliter' }, { code: 'kg', label: 'Kg' }, { code: 'gram', label: 'Gram' }, { code: 'piece', label: 'Piece' }, { code: 'other', label: 'Other' }];

function SizeNumberField({ label, value, whole, onChange }: { label: string; value: number; whole: boolean; onChange: (value: number) => void }) {
    const [text, setText] = useState(Number.isFinite(value) ? String(value) : '');
    return <TextField required label={label} value={text} slotProps={{ htmlInput: { inputMode: whole ? 'numeric' : 'decimal' } }} sx={{ flex: '1 1 130px' }} onChange={e => {
        setText(e.target.value);
        onChange(e.target.value.trim() === '' ? NaN : Number(e.target.value));
    }} />;
}

export default function ProductSellingFields({ value, onChange }: { value: SellingDetails; onChange: (value: SellingDetails) => void }) {
    const sizes = value.sizes || [];
    return <Stack spacing={2}>
        <FormControlLabel control={<Checkbox checked={!!value.unitSizeEnabled} onChange={(_, checked) => onChange({ ...value, unitSizeEnabled: checked })} />} label="Use unit/size" />
        {value.unitSizeEnabled && <>
            <TextField select required label="Unit" value={value.productUnitCode || ''} onChange={e => onChange({ ...value, productUnitCode: e.target.value, productUnit: units.find(u => u.code === e.target.value)?.label || '' })}>
                {units.map(unit => <MenuItem key={unit.code} value={unit.code}>{unit.label}</MenuItem>)}
                {!units.some(unit => unit.code === value.productUnitCode) && <MenuItem value={value.productUnitCode}>{value.productUnit}</MenuItem>}
            </TextField>
            {value.productUnitCode === 'other' && <TextField required label="Unit name (e.g. Meter, Box)" value={value.productUnit === 'Other' ? '' : value.productUnit || ''} onChange={e => onChange({ ...value, productUnit: e.target.value })} />}
            <TextField select required label="Selling type" value={value.sellingType || ''} onChange={e => onChange({ ...value, sellingType: e.target.value as SellingDetails['sellingType'] })}>
                <MenuItem value="quantity">Quantity</MenuItem>
                <MenuItem value="fixed">Fixed sizes/packs</MenuItem>
            </TextField>
            {value.sellingType === 'quantity' && <Typography variant="body2">Enter purchase/sale price per {value.productUnit || 'unit'} and stock in {value.productUnit || 'units'} below. Customers enter their own quantity at POS.</Typography>}
            {value.sellingType === 'fixed' && <>
                <Typography variant="body2">Define your own sizes. Stock is the number of bottles/packs for each size.</Typography>
                {sizes.map((size, index) => <Box key={size.id} sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {(['size', 'purchasePrice', 'salePrice', 'stock'] as const).map(field => <SizeNumberField key={field} whole={field === 'stock'} label={field === 'size' ? `Size (${value.productUnit || 'unit'})` : field === 'stock' ? 'Bottles/packs stock' : field === 'purchasePrice' ? 'Purchase price' : 'Sale price'} value={size[field]} onChange={number => onChange({ ...value, sizes: sizes.map((row, i) => i === index ? { ...row, [field]: number } : row) })} />)}
                    <Button color="error" onClick={() => onChange({ ...value, sizes: sizes.filter((_, i) => i !== index) })}>Remove</Button>
                </Box>)}
                <Button onClick={() => onChange({ ...value, sizes: [...sizes, { id: crypto.randomUUID(), size: NaN, purchasePrice: NaN, salePrice: NaN, stock: NaN }] })}>Add size</Button>
            </>}
        </>}
    </Stack>;
}
