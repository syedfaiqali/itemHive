import React, { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
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
                p: 2
            }}
        >
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
                            minHeight: 600
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
                                    background: 'linear-gradient(to top, rgba(99, 102, 241, 0.8), transparent)',
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
                                p: { xs: 4, md: 6 },
                                bgcolor: 'background.paper',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center'
                            }}
                        >
                            <Box sx={{ mb: 4, textAlign: 'center' }}>
                                <Typography variant="h4" fontWeight={800} color="primary.main" gutterBottom>
                                    ItemHive
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Manage your inventory with intelligence and ease.
                                </Typography>
                            </Box>

                            {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

                            <form onSubmit={handleLogin}>
                                <TextField
                                    fullWidth
                                    label="Email Address"
                                    variant="outlined"
                                    margin="normal"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Mail size={20} color="#64748b" />
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
                                    margin="normal"
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
                                    sx={{ mb: 3 }}
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
                                        boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.4)'
                                    }}
                                >
                                    Sign In
                                </Button>
                            </form>

                            <Box sx={{ mt: 4, textAlign: 'center' }}>
                                <Typography variant="body2" color="text.secondary">
                                    Don't have an account? <Button variant="text" sx={{ fontWeight: 700 }}>Sign Up</Button>
                                </Typography>
                            </Box>

                            <Divider sx={{ my: 3 }}>
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
