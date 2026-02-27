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
import { Mail, Lock, Eye, EyeOff, UserPlus, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const Signup: React.FC = () => {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [success, setSuccess] = useState(false);

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
                    <Paper elevation={24} sx={{ borderRadius: 4, p: 4 }}>
                        <Box sx={{ mb: 4, textAlign: 'center' }}>
                            <Typography variant="h4" fontWeight={800} color="primary.main" gutterBottom>
                                Join ItemHive
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Create an account to start managing your inventory.
                            </Typography>
                        </Box>

                        {success && (
                            <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
                                Account created successfully! Redirecting to login...
                            </Alert>
                        )}

                        <form onSubmit={handleSubmit}>
                            <TextField
                                fullWidth
                                label="Full Name"
                                variant="outlined"
                                margin="normal"
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
                                margin="normal"
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
                                margin="normal"
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
                                margin="normal"
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
                                sx={{ mb: 3 }}
                            />

                            <Button
                                fullWidth
                                variant="contained"
                                size="large"
                                type="submit"
                                startIcon={<UserPlus size={20} />}
                                sx={{ py: 1.5, borderRadius: 2, fontSize: '1rem', fontWeight: 700 }}
                            >
                                Create Account
                            </Button>
                        </form>

                        <Box sx={{ mt: 4, textAlign: 'center' }}>
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
