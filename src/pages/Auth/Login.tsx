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
import { Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../../features/auth/authSlice';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const Login: React.FC = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

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
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                p: { xs: 2, sm: 4 }
            }}
        >
            <Container maxWidth="md" sx={{ display: 'flex', justifyContent: 'center' }}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    style={{ width: '100%', maxWidth: '850px' }}
                >
                    <Paper
                        elevation={24}
                        sx={{
                            borderRadius: { xs: 4, md: 6 },
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: { xs: 'column', md: 'row' },
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
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
                                background: 'linear-gradient(45deg, #4f46e5 30%, #9333ea 90%)',
                                p: 6,
                                color: 'white'
                            }}
                        >
                            <Box sx={{ position: 'relative', zIndex: 1 }}>
                                <Typography variant="h3" fontWeight={900} gutterBottom sx={{ lineHeight: 1.1 }}>
                                    Precision Hub.
                                </Typography>
                                <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 400, mb: 4 }}>
                                    The next generation of inventory & POS management.
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                    <Paper sx={{ px: 2, py: 1, bgcolor: 'rgba(255,255,255,0.1)', color: 'white', backdropFilter: 'blur(10px)', borderRadius: 2 }}>
                                        Real-time
                                    </Paper>
                                    <Paper sx={{ px: 2, py: 1, bgcolor: 'rgba(255,255,255,0.1)', color: 'white', backdropFilter: 'blur(10px)', borderRadius: 2 }}>
                                        Secure
                                    </Paper>
                                    <Paper sx={{ px: 2, py: 1, bgcolor: 'rgba(255,255,255,0.1)', color: 'white', backdropFilter: 'blur(10px)', borderRadius: 2 }}>
                                        Scalable
                                    </Paper>
                                </Box>
                            </Box>

                            {/* Decorative background shapes */}
                            <Box sx={{ position: 'absolute', top: -100, right: -100, width: 300, height: 300, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />
                            <Box sx={{ position: 'absolute', bottom: -50, left: -50, width: 200, height: 200, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />
                        </Box>
                        <Box
                            sx={{
                                flex: 1,
                                p: { xs: 4, sm: 5, md: 6 },
                                bgcolor: 'background.paper',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center'
                            }}
                        >
                            <Box sx={{ mb: 3, textAlign: { xs: 'center', md: 'left' } }}>
                                <Typography variant="h4" fontWeight={800} color="primary.main" gutterBottom>
                                    ItemHive
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Welcome back! Please enter your details.
                                </Typography>
                            </Box>

                            {error && (
                                <Alert
                                    severity="error"
                                    sx={{
                                        mb: 3,
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
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Mail size={18} color="#64748b" />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{ mb: 2 }}
                                />
                                <TextField
                                    fullWidth
                                    label="Password"
                                    type={showPassword ? 'text' : 'password'}
                                    variant="outlined"
                                    size="small"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
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
                                                >
                                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{ mb: 3 }}
                                />

                                <Button
                                    fullWidth
                                    variant="contained"
                                    size="large"
                                    type="submit"
                                    startIcon={<LogIn size={20} />}
                                    sx={{
                                        py: 1.2,
                                        borderRadius: 2,
                                        fontSize: '0.95rem',
                                        fontWeight: 700,
                                        boxShadow: '0 8px 16px -4px rgba(99, 102, 241, 0.3)',
                                        textTransform: 'none'
                                    }}
                                >
                                    Sign In
                                </Button>
                            </form>

                            <Box sx={{ mt: 3, textAlign: 'center' }}>
                                <Typography variant="body2" color="text.secondary">
                                    Don't have an account? <Button variant="text" size="small" sx={{ fontWeight: 700, textTransform: 'none' }}>Sign Up</Button>
                                </Typography>
                            </Box>

                            <Divider sx={{ my: 3 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>DEMO ACCESS</Typography>
                            </Divider>

                            <Box
                                sx={{
                                    p: 2,
                                    borderRadius: 3,
                                    bgcolor: 'rgba(99, 102, 241, 0.04)',
                                    border: '1px dashed rgba(99, 102, 241, 0.2)'
                                }}
                            >
                                <Typography variant="caption" color="text.secondary" display="block" align="center">
                                    <strong>Admin:</strong> admin@itemhive.com / admin123
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block" align="center">
                                    <strong>Staff:</strong> user@itemhive.com / user123
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
