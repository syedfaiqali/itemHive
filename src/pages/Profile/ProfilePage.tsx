import React, { useRef, useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Avatar,
    Chip,
    Divider,
    TextField,
    Button,
    Stack,
    Alert
} from '@mui/material';
import { Camera, Save } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { updateProfile } from '../../features/auth/authSlice';

const ProfilePage: React.FC = () => {
    const dispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [name, setName] = useState(user?.username || '');
    const [photoUrl, setPhotoUrl] = useState(user?.photoUrl || '');
    const [saved, setSaved] = useState(false);

    const roleLabel = user?.role === 'admin' ? 'Administrator' : 'Staff Member';

    if (!user) {
        return null;
    }

    const handlePickPhoto = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result;
            if (typeof result === 'string') {
                setPhotoUrl(result);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleSaveProfile = () => {
        const trimmedName = name.trim();
        if (!trimmedName) return;

        dispatch(updateProfile({ username: trimmedName, photoUrl }));
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    return (
        <Box>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" fontWeight={800}>Profile</Typography>
                <Typography variant="body2" color="text.secondary">
                    Manage your name and profile photo.
                </Typography>
            </Box>

            {saved && (
                <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
                    Profile updated successfully.
                </Alert>
            )}

            <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 7 }}>
                    <Card>
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mb: 2 }}>
                                <Avatar
                                    src={photoUrl || user.photoUrl}
                                    sx={{
                                        width: 72,
                                        height: 72,
                                        bgcolor: 'primary.main',
                                        fontSize: '1.8rem',
                                        fontWeight: 700
                                    }}
                                >
                                    {(name || user.username)?.charAt(0).toUpperCase()}
                                </Avatar>
                                <Box>
                                    <Typography variant="h5" fontWeight={800}>{name || user.username}</Typography>
                                    <Chip
                                        label={roleLabel}
                                        size="small"
                                        color={user.role === 'admin' ? 'primary' : 'default'}
                                        sx={{ mt: 0.5, fontWeight: 700 }}
                                    />
                                </Box>
                            </Box>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
                                <Button variant="outlined" startIcon={<Camera size={16} />} onClick={handlePickPhoto}>
                                    Change Photo
                                </Button>
                                <Button variant="contained" startIcon={<Save size={16} />} onClick={handleSaveProfile}>
                                    Save Profile
                                </Button>
                            </Stack>
                            <TextField
                                fullWidth
                                label="Display Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                sx={{ mb: 2 }}
                            />
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                            />
                            <Divider sx={{ my: 2 }} />
                            <Grid container spacing={2.5}>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Typography variant="caption" color="text.secondary">USER ID</Typography>
                                    <Typography variant="body1" fontWeight={700}>{user.id}</Typography>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Typography variant="caption" color="text.secondary">USER NAME</Typography>
                                    <Typography variant="body1" fontWeight={700}>{name || user.username}</Typography>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Typography variant="caption" color="text.secondary">ROLE</Typography>
                                    <Typography variant="body1" fontWeight={700}>{roleLabel}</Typography>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Typography variant="caption" color="text.secondary">STATUS</Typography>
                                    <Typography variant="body1" fontWeight={700}>Active</Typography>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default ProfilePage;
