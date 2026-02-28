import React, { useState } from 'react';
import { Box, CssBaseline, Toolbar, Fab, Fade } from '@mui/material';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { ChevronUp } from 'lucide-react';

const MainLayout: React.FC = () => {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const { mode } = useSelector((state: RootState) => state.theme);

    React.useEffect(() => {
        const root = document.documentElement;
        root.setAttribute('data-theme', mode);
        root.style.setProperty('--scrollbar-track', mode === 'light' ? '#e2e8f0' : '#0f172a');
        root.style.setProperty('--scrollbar-thumb', mode === 'light' ? '#0ea5a5' : '#14b8a6');
        root.style.setProperty('--scrollbar-thumb-hover', mode === 'light' ? '#0f766e' : '#2dd4bf');
    }, [mode]);

    React.useEffect(() => {
        const handleScroll = () => setShowScrollTop(window.scrollY > 280);
        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const handleSidebarCollapseToggle = () => {
        setSidebarCollapsed((prev) => !prev);
    };

    const sidebarWidth = sidebarCollapsed ? 92 : 260;
    const handleScrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

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
            <Sidebar
                mobileOpen={mobileOpen}
                onDrawerToggle={handleDrawerToggle}
                collapsed={sidebarCollapsed}
                onCollapseToggle={handleSidebarCollapseToggle}
            />
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: { xs: 2, sm: 3 },
                    width: { sm: `calc(100% - ${sidebarWidth}px)` },
                    transition: 'all 0.3s ease',
                }}
            >
                <Toolbar />
                <Outlet />
            </Box>
            <Fade in={showScrollTop}>
                <Fab
                    color="primary"
                    size="medium"
                    aria-label="scroll back to top"
                    onClick={handleScrollTop}
                    sx={{
                        position: 'fixed',
                        right: { xs: 16, sm: 24 },
                        bottom: { xs: 20, sm: 28 },
                        zIndex: (theme) => theme.zIndex.tooltip,
                    }}
                >
                    <ChevronUp size={20} />
                </Fab>
            </Fade>
        </Box>
    );
};

export default MainLayout;
