import React, { useState } from 'react';
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
    Paper
} from '@mui/material';
import { Mail, Lock, Eye, EyeOff, LogIn, Smartphone, Tablet, Package, ScanLine, Boxes, ShoppingCart, Barcode } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../../features/auth/authSlice';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { alpha, useTheme } from '@mui/material/styles';

const Login: React.FC = () => {
    const theme = useTheme();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const floatingWidgets = [
        { icon: <Smartphone size={20} />, left: '10%', top: '16%', rotate: -6 },
        { icon: <Tablet size={20} />, left: '27%', top: '34%', rotate: 7 },
        { icon: <Package size={20} />, left: '78%', top: '18%', rotate: -5 },
        { icon: <ScanLine size={20} />, left: '72%', top: '56%', rotate: 6 },
        { icon: <Boxes size={20} />, left: '18%', top: '62%', rotate: -8 },
        { icon: <ShoppingCart size={20} />, left: '84%', top: '40%', rotate: 5 },
        { icon: <Barcode size={20} />, left: '43%', top: '12%', rotate: -4 },
        { icon: <Package size={20} />, left: '52%', top: '70%', rotate: 8 },
    ];

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Mock Login Logic
        if (email === 'admin@itemhive.com' && password === 'admin123') {
            dispatch(loginSuccess({ id: '1', username: 'System Admin', role: 'admin' }));
            navigate('/');
        } else if (email === 'user@itemhive.com' && password === 'user123') {
            dispatch(loginSuccess({ id: '2', username: 'Staff User', role: 'user' }));
            navigate('/');
        } else {
            setError('Invalid email or password. Use admin@itemhive.com / admin123 or user@itemhive.com / user123');
        }
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
                p: { xs: 1, md: 0.5 }
            }}
        >
            {floatingWidgets.map((item, index) => (
                <motion.div
                    key={`${item.left}-${item.top}`}
                    initial={{ y: 0, opacity: 0.48, rotate: item.rotate }}
                    animate={{ y: [0, -12, 0], rotate: [item.rotate, item.rotate + 3, item.rotate] }}
                    transition={{ duration: 4 + index * 0.6, repeat: Infinity, ease: 'easeInOut' }}
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
                            width: 44,
                            height: 44,
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
                            borderRadius: 4,
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: { xs: 'column', md: 'row' },
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                            minHeight: { xs: 'auto', md: 540 },
                            maxHeight: { xs: 'none', md: '90dvh' }
                        }}
                    >
                        <Box
                            sx={{
                                flex: 1,
                                display: { xs: 'none', md: 'block' },
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                            <Box
                                component="img"
                                src="/hero.png"
                                sx={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                }}
                            />
                            <Box
                                sx={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    background: 'linear-gradient(to top, rgba(14, 165, 165, 0.82), transparent)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'flex-end',
                                    p: 4,
                                    color: 'white'
                                }}
                            >
                                <Typography variant="h4" fontWeight={800} gutterBottom>
                                    Precision in Every Pixel.
                                </Typography>
                                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                                    Experience the next generation of inventory management with ItemHive.
                                </Typography>
                            </Box>
                        </Box>
                        <Box
                            sx={{
                                flex: 1,
                                p: { xs: 2.25, md: 3 },
                                bgcolor: 'background.paper',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center'
                            }}
                        >
                            <Box sx={{ mb: 2, textAlign: 'center' }}>
                                <Typography variant="h4" fontWeight={800} color="primary.main" gutterBottom>
                                    ItemHive
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Manage your inventory with intelligence and ease.
                                </Typography>
                            </Box>

                            {error && <Alert severity="error" sx={{ mb: 1.5, borderRadius: 2 }}>{error}</Alert>}

                            <form onSubmit={handleLogin}>
                                <TextField
                                    fullWidth
                                    label="Email Address"
                                    variant="outlined"
                                    margin="dense"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Mail size={20} color="#64748b" />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{ mb: 1 }}
                                />
                                <TextField
                                    fullWidth
                                    label="Password"
                                    type={showPassword ? 'text' : 'password'}
                                    variant="outlined"
                                    margin="dense"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Lock size={20} color="#64748b" />
                                            </InputAdornment>
                                        ),
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
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
                                    startIcon={<LogIn size={20} />}
                                    sx={{
                                        py: 1.5,
                                        borderRadius: 2,
                                        fontSize: '1rem',
                                        fontWeight: 700,
                                        boxShadow: `0 10px 18px -8px ${alpha(theme.palette.primary.main, 0.65)}`
                                    }}
                                >
                                    Sign In
                                </Button>
                            </form>

                            <Box sx={{ mt: 2, textAlign: 'center' }}>
                                <Typography variant="body2" color="text.secondary">
                                    Don't have an account? <Button variant="text" onClick={() => navigate('/signup')} sx={{ fontWeight: 700 }}>Sign Up</Button>
                                </Typography>
                            </Box>

                            <Divider sx={{ my: 1.5 }}>
                                <Typography variant="caption" color="text.secondary">DEMO CREDENTIALS</Typography>
                            </Divider>

                            <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="caption" color="text.secondary" display="block">
                                    Admin: admin@itemhive.com / admin123
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block">
                                    User: user@itemhive.com / user123
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
