import React, { useState } from 'react';
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
    MenuItem
} from '@mui/material';
import { Mail, Lock, Eye, EyeOff, UserPlus, User, Smartphone, Tablet, Package, ScanLine, Boxes, ShoppingCart, Barcode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { alpha, useTheme } from '@mui/material/styles';

const Signup: React.FC = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [success, setSuccess] = useState(false);
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSuccess(true);
        setTimeout(() => {
            navigate('/login');
        }, 2000);
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
                p: { xs: 1.25, md: 2 }
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
                    <Paper elevation={24} sx={{ borderRadius: 4, p: { xs: 2.25, md: 3 }, maxHeight: { xs: 'none', md: '90dvh' } }}>
                        <Box sx={{ mb: 2, textAlign: 'center' }}>
                            <Typography variant="h4" fontWeight={800} color="primary.main" gutterBottom>
                                Join ItemHive
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Create an account to start managing your inventory.
                            </Typography>
                        </Box>

                        {success && (
                            <Alert severity="success" sx={{ mb: 1.5, borderRadius: 2 }}>
                                Account created successfully! Redirecting to login...
                            </Alert>
                        )}

                        <form onSubmit={handleSubmit}>
                            <TextField
                                fullWidth
                                label="Full Name"
                                variant="outlined"
                                margin="dense"
                                required
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <User size={20} color="#64748b" />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            <TextField
                                fullWidth
                                label="Email Address"
                                variant="outlined"
                                margin="dense"
                                required
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Mail size={20} color="#64748b" />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            <TextField
                                select
                                fullWidth
                                label="Role"
                                variant="outlined"
                                margin="dense"
                                defaultValue="user"
                                required
                            >
                                <MenuItem value="admin">Administrator (Manager)</MenuItem>
                                <MenuItem value="user">Staff Member (Consumption only)</MenuItem>
                            </TextField>
                            <TextField
                                fullWidth
                                label="Password"
                                type={showPassword ? 'text' : 'password'}
                                variant="outlined"
                                margin="dense"
                                required
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
                                startIcon={<UserPlus size={20} />}
                                sx={{ py: 1.5, borderRadius: 2, fontSize: '1rem', fontWeight: 700, boxShadow: '0 10px 18px -8px rgba(14, 165, 165, 0.55)' }}
                            >
                                Create Account
                            </Button>
                        </form>

                        <Box sx={{ mt: 2, textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary">
                                Already have an account? <Button variant="text" onClick={() => navigate('/login')} sx={{ fontWeight: 700 }}>Sign In</Button>
                            </Typography>
                        </Box>
                    </Paper>
                </motion.div>
            </Container>
        </Box>
    );
};

export default Signup;
