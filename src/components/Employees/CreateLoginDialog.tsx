import React from 'react';
import {
    Alert,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    InputAdornment,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import type { AxiosError } from 'axios';
import api from '../../api/axios';

export interface LoginTarget {
    _id: string;
    fullName: string;
    email?: string;
    businessId?: string;
}

interface CreateLoginDialogProps {
    employee: LoginTarget | null;
    onClose: () => void;
    onCreated: () => void;
}

const getErrorMessage = (error: unknown, fallback: string) => {
    const data = (error as AxiosError<{ message?: string; details?: string }>).response?.data;
    return data?.details || data?.message || fallback;
};

/** Creates a User-role Team login for an existing employee profile and links the two. */
const CreateLoginDialog: React.FC<CreateLoginDialogProps> = ({ employee, onClose, onCreated }) => {
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [showPassword, setShowPassword] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState('');

    // Keyed on primitives: callers may pass a fresh object each render, which must not wipe what was typed.
    const employeeId = employee?._id;
    const employeeEmail = employee?.email || '';
    React.useEffect(() => {
        if (!employeeId) return;
        setEmail(employeeEmail);
        setPassword('');
        setShowPassword(false);
        setError('');
    }, [employeeId, employeeEmail]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!employee) return;
        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            await api.post('/auth/register', {
                name: employee.fullName,
                email: email.trim(),
                password,
                role: 'user',
                employeeId: employee._id,
                // Only a super admin's request uses this; it keeps the login in the employee's own business.
                businessId: employee.businessId || undefined,
            });
            window.dispatchEvent(new Event('itemhive-team-updated'));
            onCreated();
        } catch (submitError: unknown) {
            setError(getErrorMessage(submitError, 'Unable to create the login.'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={Boolean(employee)} onClose={() => !saving && onClose()} fullWidth maxWidth="xs">
            <DialogTitle sx={{ fontWeight: 800 }}>Create Login</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent>
                    <Stack spacing={2}>
                        <Typography variant="body2" color="text.secondary">
                            {employee?.fullName} will sign in with this email and password as a User. Set their rights in Team.
                        </Typography>
                        {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
                        <TextField
                            label="Login Email / ID"
                            type="email"
                            autoComplete="off"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            required
                            disabled={saving}
                        />
                        <TextField
                            label="Password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            helperText="At least 6 characters."
                            required
                            disabled={saving}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            size="small"
                                            edge="end"
                                            onClick={() => setShowPassword((visible) => !visible)}
                                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 2.5 }}>
                    <Button variant="outlined" onClick={onClose} disabled={saving}>Cancel</Button>
                    <Button type="submit" variant="contained" startIcon={<KeyRound size={16} />} disabled={saving}>
                        {saving ? 'Creating...' : 'Create Login'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

export default CreateLoginDialog;
