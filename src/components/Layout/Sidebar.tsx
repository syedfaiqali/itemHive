import React from 'react';
import {
    Box,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Toolbar,
    Typography,
    Divider,
    alpha,
    IconButton,
    useTheme
} from '@mui/material';
import {
    LayoutDashboard,
    Package,
    History,
    BarChart3,
    Settings,
    PlusCircle,
    Monitor as TerminalIcon,
    ClipboardList,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../store';
import { toggleSidebar } from '../../features/theme/themeSlice';

const drawerWidth = 260;
const collapsedWidth = 80;

interface SidebarProps {
    mobileOpen: boolean;
    onDrawerToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onDrawerToggle }) => {
    const theme = useTheme();
    const dispatch = useDispatch();
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useSelector((state: RootState) => state.auth);
    const { isSidebarCollapsed } = useSelector((state: RootState) => state.theme);
    const currentWidth = isSidebarCollapsed ? collapsedWidth : drawerWidth;

    const menuItems = [
        { text: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/', roles: ['admin', 'user'] },
        { text: 'POS Terminal', icon: <TerminalIcon size={20} />, path: '/pos', roles: ['admin', 'user'] },
        { text: 'Inventory', icon: <Package size={20} />, path: '/inventory', roles: ['admin', 'user'] },
        { text: 'Add Product', icon: <PlusCircle size={20} />, path: '/inventory/add', roles: ['admin'] },
        { text: 'Order Desk', icon: <ClipboardList size={20} />, path: '/orders', roles: ['admin', 'user'] },
        { text: 'Transactions', icon: <History size={20} />, path: '/transactions', roles: ['admin', 'user'] },
        { text: 'Reports', icon: <BarChart3 size={20} />, path: '/reports', roles: ['admin'] },
        { text: 'Settings', icon: <Settings size={20} />, path: '/settings', roles: ['admin', 'user'] },
    ];

    const drawer = (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <Toolbar sx={{
                px: isSidebarCollapsed ? 2 : 2.5,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
                minHeight: '80px !important'
            }}>
                <Box
                    component="img"
                    src="/favicon.png"
                    alt="Logo"
                    sx={{ width: 32, height: 32, flexShrink: 0, filter: 'drop-shadow(0 4px 8px rgba(14, 165, 165, 0.3))' }}
                />
                {!isSidebarCollapsed && (
                    <Typography
                        variant="h6"
                        fontWeight={900}
                        color="primary.main"
                        noWrap
                        sx={{
                            fontSize: '1.4rem',
                            letterSpacing: -0.5,
                            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                    >
                        ItemHive
                    </Typography>
                )}
            </Toolbar>

            <Box sx={{
                position: 'absolute',
                right: -15,
                top: 75,
                zIndex: 10,
                display: { xs: 'none', sm: 'block' }
            }}>
                <IconButton
                    onClick={() => dispatch(toggleSidebar())}
                    sx={{
                        width: 30,
                        height: 30,
                        bgcolor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                        '&:hover': {
                            bgcolor: 'primary.main',
                            color: 'white',
                            transform: 'scale(1.1)',
                        },
                        transition: 'all 0.2s',
                        color: 'text.secondary',
                        p: 0,
                    }}
                >
                    {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </IconButton>
            </Box>

            <Box sx={{ p: isSidebarCollapsed ? 2 : 3, textAlign: isSidebarCollapsed ? 'center' : 'left' }}>
                <Typography variant="overline" color="text.secondary" fontWeight={800} sx={{ opacity: isSidebarCollapsed ? 0 : 0.6 }}>
                    {isSidebarCollapsed ? '' : 'Main Menu'}
                </Typography>
            </Box>
            <List sx={{ px: 2 }}>
                {menuItems
                    .filter(item => item.roles.includes(user?.role || 'user'))
                    .map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                                <ListItemButton
                                    onClick={() => {
                                        navigate(item.path);
                                        if (mobileOpen) onDrawerToggle();
                                    }}
                                    sx={{
                                        p: isSidebarCollapsed ? 1.5 : 2,
                                        justifyContent: isSidebarCollapsed ? 'center' : 'initial',
                                        borderRadius: 2,
                                        backgroundColor: isActive ? 'primary.main' : 'transparent',
                                        color: isActive ? 'primary.contrastText' : 'text.primary',
                                        '&:hover': {
                                            backgroundColor: isActive ? 'primary.dark' : (theme) => alpha(theme.palette.primary.main, 0.1),
                                            color: isActive ? 'primary.contrastText' : 'primary.main',
                                            '& .MuiListItemIcon-root': {
                                                color: isActive ? 'primary.contrastText' : 'primary.main',
                                            }
                                        },
                                    }}
                                >
                                    <ListItemIcon
                                        sx={{
                                            minWidth: isSidebarCollapsed ? 0 : 40,
                                            mr: isSidebarCollapsed ? 0 : 0,
                                            justifyContent: 'center',
                                            color: isActive ? 'primary.contrastText' : 'text.secondary'
                                        }}
                                    >
                                        {item.icon}
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={item.text}
                                        sx={{ opacity: isSidebarCollapsed ? 0 : 1, width: isSidebarCollapsed ? 0 : 'auto', m: 0 }}
                                        primaryTypographyProps={{
                                            fontSize: '0.9rem',
                                            fontWeight: isActive ? 700 : 600
                                        }}
                                    />
                                </ListItemButton>
                            </ListItem>
                        );
                    })}
            </List>
            <Box sx={{ mt: 'auto', p: 2 }}>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="caption" color="text.secondary" sx={{ px: 2 }}>
                    Account
                </Typography>
            </Box>
        </Box>
    );

    return (
        <Box
            component="nav"
            sx={{
                width: { sm: currentWidth },
                flexShrink: { sm: 0 },
                transition: (theme) => theme.transitions.create('width', {
                    easing: theme.transitions.easing.sharp,
                    duration: theme.transitions.duration.enteringScreen,
                }),
            }}
        >
            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={onDrawerToggle}
                ModalProps={{ keepMounted: true }}
                sx={{
                    display: { xs: 'block', sm: 'none' },
                    '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                }}
            >
                {drawer}
            </Drawer>
            <Drawer
                variant="permanent"
                sx={{
                    display: { xs: 'none', sm: 'block' },
                    '& .MuiDrawer-paper': {
                        boxSizing: 'border-box',
                        width: currentWidth,
                        borderRight: '1px solid',
                        borderColor: 'divider',
                        transition: (theme) => theme.transitions.create('width', {
                            easing: theme.transitions.easing.sharp,
                            duration: theme.transitions.duration.enteringScreen,
                        }),
                        overflow: 'visible'
                    },
                }}
                open
            >
                {drawer}
            </Drawer>
        </Box>
    );
};

export default Sidebar;
