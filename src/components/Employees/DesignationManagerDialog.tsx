import React from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { Plus } from 'lucide-react';
import type { AxiosError } from 'axios';
import api from '../../api/axios';
import type { Designation } from '../../types/employee';

interface DesignationManagerDialogProps {
    open: boolean;
    designations: Designation[];
    onClose: () => void;
    onChange: (designations: Designation[]) => void;
}

const getErrorMessage = (error: unknown, fallback: string) =>
    (error as AxiosError<{ message?: string }>).response?.data?.message || fallback;

const DesignationManagerDialog: React.FC<DesignationManagerDialogProps> = ({ open, designations, onClose, onChange }) => {
    const [name, setName] = React.useState('');
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState('');

    const defaults = designations.filter((designation) => designation.isDefault);
    const custom = designations.filter((designation) => !designation.isDefault);

    const handleAdd = async () => {
        if (name.trim().length < 2) {
            setError('Designation name must be at least 2 characters.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            const response = await api.post('/employees/designations', { name: name.trim() });
            onChange([...designations, response.data]);
            setName('');
        } catch (addError: unknown) {
            setError(getErrorMessage(addError, 'Unable to add designation.'));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (designation: Designation) => {
        if (!designation._id) return;
        setSaving(true);
        setError('');
        try {
            await api.delete(`/employees/designations/${designation._id}`);
            onChange(designations.filter((item) => item._id !== designation._id));
        } catch (deleteError: unknown) {
            setError(getErrorMessage(deleteError, 'Unable to delete designation.'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 800 }}>Designations</DialogTitle>
            <DialogContent>
                {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

                <Typography variant="overline" color="text.secondary" fontWeight={900}>Predefined</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2.5 }}>
                    {defaults.map((designation) => <Chip key={designation.name} label={designation.name} />)}
                </Box>

                <Typography variant="overline" color="text.secondary" fontWeight={900}>Added by your business</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2.5 }}>
                    {custom.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">No custom designations yet.</Typography>
                    ) : custom.map((designation) => (
                        <Chip
                            key={designation._id}
                            label={designation.name}
                            color="primary"
                            variant="outlined"
                            onDelete={saving ? undefined : () => handleDelete(designation)}
                        />
                    ))}
                </Box>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <TextField
                        fullWidth
                        size="small"
                        label="New designation"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        onKeyDown={(event) => { if (event.key === 'Enter') handleAdd(); }}
                    />
                    <Button variant="contained" startIcon={<Plus size={16} />} onClick={handleAdd} disabled={saving} sx={{ flexShrink: 0 }}>
                        Add
                    </Button>
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Removing a designation only hides it from the list. Employees keep the designation they were given.
                </Typography>
            </DialogContent>
            <DialogActions sx={{ p: 2.5 }}>
                <Button variant="outlined" onClick={onClose}>Done</Button>
            </DialogActions>
        </Dialog>
    );
};

export default DesignationManagerDialog;
