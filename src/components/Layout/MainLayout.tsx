import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import ModernLoader from '../Common/ModernLoader';

import React, { useState, useEffect } from 'react';
import { Box, CssBaseline } from '@mui/material';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { Outlet } from 'react-router-dom';
import ScrollToTopFab from '../Common/ScrollToTopFab';

const MainLayout: React.FC = () => {
    const [initiallyLoading, setInitiallyLoading] = useState(true);
    const [initialRequestStarted, setInitialRequestStarted] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const { isSidebarCollapsed } = useSelector((state: RootState) => state.theme);
    const { loading: productsLoading } = useSelector((state: RootState) => state.inventory);
    const { loading: transactionsLoading } = useSelector((state: RootState) => state.transactions);
    const { loading: settingsLoading } = useSelector((state: RootState) => state.settings);

    const drawerWidth = 260;
    const collapsedWidth = 80;
    const currentWidth = isSidebarCollapsed ? collapsedWidth : drawerWidth;

    const apiLoading = productsLoading || transactionsLoading || settingsLoading;

    useEffect(() => {
        if (apiLoading) setInitialRequestStarted(true);
    }, [apiLoading]);

    // Keep the branded full-page loader through the first post-login data
    // bootstrap. Later requests only cover the page content.
    useEffect(() => {
        if (initialRequestStarted && !apiLoading) setInitiallyLoading(false);
    }, [apiLoading, initialRequestStarted]);

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
            <CssBaseline />
            {/* One consistent app-wide loader for initial data and API refreshes. */}
            {initiallyLoading && <ModernLoader fullPage />}
            <Navbar onMenuClick={handleDrawerToggle} />
            <Sidebar mobileOpen={mobileOpen} onDrawerToggle={handleDrawerToggle} />
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: { xs: 1.5, sm: 2, md: 3 },
                    width: { sm: `calc(100% - ${currentWidth}px)` },
                    // ml: { sm: `${currentWidth}px` },
                    mt: { xs: '56px', sm: '64px' },
                    overflowX: 'hidden',
                    transition: (theme) => theme.transitions.create(['width', 'margin'], {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.enteringScreen,
                    }),
                    position: 'relative',
                }}
            >
                <Outlet />
                {!initiallyLoading && apiLoading && <ModernLoader fullPage={false} />}
            </Box>
            <ScrollToTopFab />
        </Box>
    );
};

export default MainLayout;
