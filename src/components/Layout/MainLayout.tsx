import React, { useState } from 'react';
import { Box, CssBaseline, Toolbar } from '@mui/material';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';

const MainLayout: React.FC = () => {
    const [mobileOpen, setMobileOpen] = useState(false);
    const { mode } = useSelector((state: RootState) => state.theme);

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const backgroundStyle = mode === 'light'
        ? 'radial-gradient(circle at 15% 10%, rgba(14, 165, 165, 0.14), transparent 50%), radial-gradient(circle at 85% 0%, rgba(37, 99, 235, 0.12), transparent 45%), linear-gradient(180deg, #f5f7fb 0%, #eef2f7 100%)'
        : 'radial-gradient(circle at 15% 10%, rgba(45, 212, 191, 0.16), transparent 50%), radial-gradient(circle at 85% 0%, rgba(59, 130, 246, 0.14), transparent 45%), linear-gradient(180deg, #0a0f1c 0%, #0f172a 100%)';

    return (
        <Box
            sx={{
                display: 'flex',
                minHeight: '100vh',
                bgcolor: 'background.default',
                backgroundImage: backgroundStyle,
                backgroundAttachment: 'fixed',
            }}
        >
            <CssBaseline />
            <Navbar onMenuClick={handleDrawerToggle} />
            <Sidebar mobileOpen={mobileOpen} onDrawerToggle={handleDrawerToggle} />
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: { xs: 2, sm: 3 },
                    width: { sm: `calc(100% - 260px)` },
                    transition: 'all 0.3s ease',
                }}
            >
                <Toolbar />
                <Outlet />
            </Box>
        </Box>
    );
};

export default MainLayout;
