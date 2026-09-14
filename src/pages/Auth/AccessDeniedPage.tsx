import { Alert, Box, Button, Paper, Typography } from '@mui/material';
import { ShieldX } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const AccessDeniedPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const requestedPath = (location.state as { from?: string } | null)?.from;

    return (
        <Box sx={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
            <Paper variant="outlined" sx={{ width: 'min(100%, 560px)', p: { xs: 3, sm: 5 }, textAlign: 'center', borderRadius: 4 }}>
                <ShieldX size={52} />
                <Typography variant="h4" fontWeight={900} sx={{ mt: 2 }}>Access restricted</Typography>
                <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>
                    Your Super Admin has not granted access to this screen{requestedPath ? ` (${requestedPath})` : ''}.
                </Typography>
                <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
                    Contact your Super Admin if this screen is required for your responsibilities.
                </Alert>
                <Button variant="contained" onClick={() => navigate('/profile', { replace: true })}>Go to Profile</Button>
            </Paper>
        </Box>
    );
};

export default AccessDeniedPage;

