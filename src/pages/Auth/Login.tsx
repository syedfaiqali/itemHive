import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    TextField,
    Button,
    InputAdornment,
    IconButton,
    Alert,
    Divider,
    Container,
    Paper,
    CircularProgress
} from '@mui/material';
import { Mail, Lock, Eye, EyeOff, LogIn, ArrowRight, ShieldCheck, Sparkles, Smartphone, Tablet, Package, ScanLine, Boxes, ShoppingCart, Barcode } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser, clearError } from '../../features/auth/authSlice';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { alpha, useTheme } from '@mui/material/styles';
import type { AppDispatch, RootState } from '../../store';

const Login: React.FC = () => {
    const theme = useTheme();
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();
    const { loading, error, isAuthenticated } = useSelector((state: RootState) => state.auth);
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const floatingWidgets = [
        { icon: <Smartphone size={16} />, left: '6%', top: '10%', rotate: -11 },
        { icon: <Tablet size={16} />, left: '12%', top: '28%', rotate: 7 },
        { icon: <Package size={16} />, left: '18%', top: '46%', rotate: -6 },
        { icon: <ScanLine size={16} />, left: '9%', top: '64%', rotate: 8 },
        { icon: <Boxes size={16} />, left: '14%', top: '82%', rotate: -9 },
        { icon: <ShoppingCart size={16} />, left: '24%', top: '14%', rotate: 5 },
        { icon: <Barcode size={16} />, left: '30%', top: '32%', rotate: -4 },
        { icon: <Package size={16} />, left: '26%', top: '50%', rotate: 10 },
        { icon: <ScanLine size={16} />, left: '22%', top: '70%', rotate: -7 },
        { icon: <Smartphone size={16} />, left: '34%', top: '84%', rotate: 6 },
        { icon: <Boxes size={16} />, left: '42%', top: '12%', rotate: -5 },
        { icon: <ShoppingCart size={16} />, left: '46%', top: '26%', rotate: 9 },
        { icon: <Barcode size={16} />, left: '40%', top: '44%', rotate: -8 },
        { icon: <Tablet size={16} />, left: '48%', top: '62%', rotate: 7 },
        { icon: <Package size={16} />, left: '44%', top: '80%', rotate: -6 },
        { icon: <ScanLine size={16} />, left: '58%', top: '16%', rotate: 8 },
        { icon: <Boxes size={16} />, left: '64%', top: '34%', rotate: -9 },
        { icon: <ShoppingCart size={16} />, left: '60%', top: '54%', rotate: 6 },
        { icon: <Barcode size={16} />, left: '68%', top: '72%', rotate: -5 },
        { icon: <Smartphone size={16} />, left: '74%', top: '86%', rotate: 10 },
        { icon: <Tablet size={16} />, left: '82%', top: '14%', rotate: -6 },
        { icon: <Package size={16} />, left: '88%', top: '30%', rotate: 7 },
        { icon: <ScanLine size={16} />, left: '84%', top: '50%', rotate: -8 },
        { icon: <Boxes size={16} />, left: '90%', top: '68%', rotate: 9 },
    ];

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/');
        }
        return () => {
            dispatch(clearError());
        };
    }, [isAuthenticated, navigate, dispatch]);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        dispatch(loginUser({ email, password }));
    };

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
                p: { xs: 0.75, sm: 1.25 }
            }}
        >
            {floatingWidgets.map((item, index) => (
                <motion.div
                    key={`${item.left}-${item.top}`}
                    initial={{ y: 0, opacity: 0.45, rotate: item.rotate }}
                    animate={{ y: [0, -11, 0], rotate: [item.rotate, item.rotate + 3, item.rotate] }}
                    transition={{ duration: 4 + index * 0.45, repeat: Infinity, ease: 'easeInOut' }}
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
                            display: { xs: 'none', sm: 'flex' },
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === 'light' ? 0.76 : 0.2),
                            border: '1px solid',
                            borderColor: alpha(theme.palette.primary.main, 0.34),
                            color: theme.palette.primary.main,
                            boxShadow: '0 10px 24px -14px rgba(2, 6, 23, 0.5)',
                            backdropFilter: 'blur(6px)'
                        }}
                    >
                        {item.icon}
                    </Box>
                </motion.div>
            ))}
            <Container maxWidth="lg" sx={{ display: 'flex', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    style={{ width: '100%', maxWidth: '980px' }}
                >
                    <Paper
                        elevation={24}
                        sx={{
                            borderRadius: { xs: 4, md: 5 },
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: { xs: 'column', md: 'row' },
                            border: '1px solid',
                            borderColor: 'divider',
                            minHeight: { xs: 'auto', md: 500 },
                            maxWidth: '100%',
                            m: 'auto'
                        }}
                    >
                        <Box
                            sx={{
                                flex: 1.2,
                                display: { xs: 'none', md: 'flex' },
                                position: 'relative',
                                overflow: 'hidden',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                background: `linear-gradient(150deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 58%, ${theme.palette.primary.light} 100%)`,
                                p: { md: 3.5, lg: 4.5 },
                                color: 'primary.contrastText'
                            }}
                        >
                            <Box sx={{ position: 'relative', zIndex: 1 }}>
                                <Typography variant="h4" fontWeight={800} gutterBottom sx={{ lineHeight: 1.15 }}>
                                    Inventory intelligence for modern teams.
                                </Typography>
                                <Typography variant="body2" sx={{ opacity: 0.95, fontWeight: 500, mb: 2 }}>
                                    Manage products, stock movement, POS activity, and reports in one unified workspace.
                                </Typography>
                                <Box sx={{ display: 'grid', gap: 0.8 }}>
                                    {[
                                        { icon: <Sparkles size={16} />, text: 'Real-time inventory visibility' },
                                        { icon: <ShieldCheck size={16} />, text: 'Role-aware and secure access control' },
                                        { icon: <ArrowRight size={16} />, text: 'Fast POS and stock workflows' },
                                    ].map((item) => (
                                        <Box
                                            key={item.text}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                                px: 1.25,
                                                py: 0.6,
                                                width: 'fit-content',
                                                borderRadius: 99,
                                                bgcolor: 'rgba(255,255,255,0.16)',
                                                border: '1px solid rgba(255,255,255,0.24)',
                                                backdropFilter: 'blur(8px)',
                                                fontSize: '0.75rem',
                                                fontWeight: 700
                                            }}
                                        >
                                            {item.icon}
                                            {item.text}
                                        </Box>
                                    ))}
                                </Box>
                            </Box>

                            <Box sx={{ position: 'absolute', top: -90, right: -90, width: 280, height: 280, bgcolor: 'rgba(255,255,255,0.08)', borderRadius: '50%' }} />
                            <Box sx={{ position: 'absolute', bottom: -60, left: -40, width: 180, height: 180, bgcolor: 'rgba(255,255,255,0.09)', borderRadius: '50%' }} />
                        </Box>
                        <Box
                            sx={{
                                flex: 1,
                                p: { xs: 1.5, sm: 2.25, md: 2.75 },
                                bgcolor: 'background.paper',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center'
                            }}
                        >
                            <Box sx={{ mb: 1.5, textAlign: { xs: 'center', md: 'left' } }}>
                                <Typography variant="h4" fontWeight={800} color="primary.main" gutterBottom>
                                    ItemHive
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Welcome back. Sign in to continue.
                                </Typography>
                            </Box>

                            {error && (
                                <Alert
                                    severity="error"
                                    sx={{
                                        mb: 1.5,
                                        borderRadius: 2,
                                        fontSize: '0.875rem'
                                    }}
                                >
                                    {error}
                                </Alert>
                            )}

                            <form onSubmit={handleLogin}>
                                <TextField
                                    fullWidth
                                    label="Email Address"
                                    variant="outlined"
                                    size="small"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={loading}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Mail size={18} color="#64748b" />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{ mb: 1.25 }}
                                />
                                <TextField
                                    fullWidth
                                    label="Password"
                                    type={showPassword ? 'text' : 'password'}
                                    variant="outlined"
                                    size="small"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Lock size={18} color="#64748b" />
                                            </InputAdornment>
                                        ),
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    edge="end"
                                                    size="small"
                                                    disabled={loading}
                                                >
                                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{ mb: 1.5 }}
                                />

                                <Button
                                    fullWidth
                                    variant="contained"
                                    size="large"
                                    type="submit"
                                    disabled={loading}
                                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LogIn size={20} />}
                                    sx={{
                                        py: 1.15,
                                        borderRadius: 2,
                                        fontSize: '0.95rem',
                                        fontWeight: 800,
                                        boxShadow: loading ? 'none' : `0 12px 22px -12px ${alpha(theme.palette.primary.main, 0.8)}`,
                                        textTransform: 'none'
                                    }}
                                >
                                    {loading ? 'Signing In...' : 'Sign In'}
                                </Button>
                            </form>

                            <Box sx={{ mt: 1.5, textAlign: 'center' }}>
                                <Typography variant="body2" color="text.secondary">
                                    Don&apos;t have an account?{' '}
                                    <Button
                                        variant="text"
                                        size="small"
                                        onClick={() => navigate('/signup')}
                                        sx={{ fontWeight: 700, textTransform: 'none' }}
                                    >
                                        Sign Up
                                    </Button>
                                </Typography>
                            </Box>

                            <Divider sx={{ my: 1.5 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>DEMO ACCESS</Typography>
                            </Divider>

                            <Box
                                sx={{
                                    p: 1.25,
                                    borderRadius: 3,
                                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                                    border: `1px dashed ${alpha(theme.palette.primary.main, 0.26)}`
                                }}
                            >
                                <Typography variant="caption" color="text.secondary" display="block" align="center">
                                    <strong>Admin:</strong> admin@itemhive.pro / admin123
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block" align="center">
                                    <strong>Staff:</strong> cashier@itemhive.pro / cashier123
                                </Typography>
                            </Box>
                        </Box>
                    </Paper>
                </motion.div>
            </Container>
        </Box>
    );
};

export default Login;
