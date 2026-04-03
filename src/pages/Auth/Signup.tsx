import React, { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    TextField,
    Button,
    InputAdornment,
    IconButton,
    Alert,
    Container,
    Paper,
    MenuItem,
    CircularProgress
} from '@mui/material';
import { Mail, Lock, Eye, EyeOff, UserPlus, User, Smartphone, Tablet, Package, ScanLine, Boxes, ShoppingCart, Barcode } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { alpha, useTheme } from '@mui/material/styles';
import { clearError, registerUser } from '../../features/auth/authSlice';
import type { AppDispatch, RootState } from '../../store';

const Signup: React.FC = () => {
    const theme = useTheme();
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();
    const { loading, error } = useSelector((state: RootState) => state.auth);
    const [showPassword, setShowPassword] = useState(false);
    const [success, setSuccess] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<'admin' | 'cashier'>('cashier');
    const [password, setPassword] = useState('');
    const floatingWidgets = [
        { icon: <Smartphone size={20} />, left: '12%', top: '20%', rotate: -7 },
        { icon: <Tablet size={20} />, left: '30%', top: '42%', rotate: 6 },
        { icon: <Package size={20} />, left: '74%', top: '22%', rotate: -5 },
        { icon: <ScanLine size={20} />, left: '68%', top: '58%', rotate: 7 },
        { icon: <Boxes size={20} />, left: '20%', top: '66%', rotate: -8 },
        { icon: <ShoppingCart size={20} />, left: '82%', top: '44%', rotate: 4 },
        { icon: <Barcode size={20} />, left: '46%', top: '14%', rotate: -3 },
        { icon: <Package size={20} />, left: '56%', top: '74%', rotate: 8 },
    ];

    useEffect(() => {
        return () => {
            dispatch(clearError());
        };
    }, [dispatch]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const result = await dispatch(registerUser({ name, email, password, role }));
        if (registerUser.fulfilled.match(result)) {
            setSuccess(true);
        }
    };

    useEffect(() => {
        if (!success) {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            dispatch(clearError());
            setSuccess(false);
            navigate('/login');
        }, 1500);

        return () => window.clearTimeout(timeoutId);
    }, [success, dispatch, navigate]);

    return (
        <Box
            sx={{
                position: 'relative',
                minHeight: '100dvh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                background: theme.palette.mode === 'light'
                    ? 'radial-gradient(circle at 15% 10%, rgba(14, 165, 165, 0.2), transparent 45%), radial-gradient(circle at 85% 0%, rgba(37, 99, 235, 0.14), transparent 45%), linear-gradient(180deg, #eef6f7 0%, #e8eff7 100%)'
                    : 'radial-gradient(circle at 15% 10%, rgba(45, 212, 191, 0.2), transparent 45%), radial-gradient(circle at 85% 0%, rgba(59, 130, 246, 0.18), transparent 45%), linear-gradient(180deg, #0b1220 0%, #0f172a 100%)',
                p: { xs: 0.75, md: 1.25 }
            }}
        >
            {floatingWidgets.map((item, index) => (
                <motion.div
                    key={`${item.left}-${item.top}`}
                    initial={{ y: 0, opacity: 0.48, rotate: item.rotate }}
                    animate={{ y: [0, -13, 0], rotate: [item.rotate, item.rotate + 3, item.rotate] }}
                    transition={{ duration: 4.2 + index * 0.6, repeat: Infinity, ease: 'easeInOut' }}
                    style={{
                        position: 'absolute',
                        left: item.left,
                        top: item.top,
                        zIndex: 0,
                        pointerEvents: 'none',
                    }}
                >
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 38,
                            height: 38,
                            borderRadius: '50%',
                            bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === 'light' ? 0.78 : 0.2),
                            border: '1px solid',
                            borderColor: alpha(theme.palette.primary.main, 0.35),
                            color: theme.palette.primary.main,
                            boxShadow: '0 10px 24px -14px rgba(2, 6, 23, 0.5)',
                            backdropFilter: 'blur(6px)'
                        }}
                    >
                        {item.icon}
                    </Box>
                </motion.div>
            ))}
            <Container maxWidth="sm">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <Paper
                        elevation={24}
                        sx={{
                            borderRadius: { xs: 4, md: 5 },
                            p: { xs: 1.5, md: 2.25 },
                            border: '1px solid',
                            borderColor: 'divider',
                            maxHeight: { xs: 'none', md: '84dvh' }
                        }}
                    >
                        <Box sx={{ mb: 1.25, textAlign: 'center' }}>
                            <Typography variant="h4" fontWeight={800} color="primary.main">
                                Join ItemHive
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Create your workspace access.
                            </Typography>
                        </Box>

                        {success && (
                            <Alert severity="success" sx={{ mb: 1.25, borderRadius: 2 }}>
                                Account created successfully! Redirecting to login...
                            </Alert>
                        )}

                        {error && (
                            <Alert severity="error" sx={{ mb: 1.25, borderRadius: 2 }}>
                                {error}
                            </Alert>
                        )}

                        <form onSubmit={handleSubmit}>
                            <TextField
                                fullWidth
                                label="Full Name"
                                variant="outlined"
                                margin="dense"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                disabled={loading || success}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <User size={20} color="#64748b" />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{ mb: 0.25 }}
                            />
                            <TextField
                                fullWidth
                                label="Email Address"
                                variant="outlined"
                                margin="dense"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={loading || success}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Mail size={20} color="#64748b" />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{ mb: 0.25 }}
                            />
                            <TextField
                                select
                                fullWidth
                                label="Role"
                                variant="outlined"
                                margin="dense"
                                value={role}
                                onChange={(e) => setRole(e.target.value as 'admin' | 'cashier')}
                                required
                                disabled={loading || success}
                                sx={{ mb: 0.25 }}
                            >
                                <MenuItem value="admin">Administrator (Manager)</MenuItem>
                                <MenuItem value="cashier">Staff Member (Cashier)</MenuItem>
                            </TextField>
                            <TextField
                                fullWidth
                                label="Password"
                                type={showPassword ? 'text' : 'password'}
                                variant="outlined"
                                margin="dense"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={loading || success}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Lock size={20} color="#64748b" />
                                        </InputAdornment>
                                    ),
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" disabled={loading || success}>
                                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{ mb: 1.25 }}
                            />

                            <Button
                                fullWidth
                                variant="contained"
                                size="large"
                                type="submit"
                                disabled={loading || success}
                                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <UserPlus size={20} />}
                                sx={{
                                    py: 1.05,
                                    borderRadius: 2,
                                    fontSize: '0.95rem',
                                    fontWeight: 800,
                                    boxShadow: `0 12px 22px -12px ${alpha(theme.palette.primary.main, 0.8)}`
                                }}
                            >
                                {loading ? 'Creating Account...' : 'Create Account'}
                            </Button>
                        </form>

                        <Box sx={{ mt: 1.5, textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary">
                                Already have an account?{' '}
                                <Button
                                    variant="text"
                                    size="small"
                                    onClick={() => navigate('/login')}
                                    disabled={loading}
                                    sx={{ fontWeight: 700, textTransform: 'none' }}
                                >
                                    Sign In
                                </Button>
                            </Typography>
                        </Box>
                    </Paper>
                </motion.div>
            </Container>
        </Box>
    );
};

export default Signup;
