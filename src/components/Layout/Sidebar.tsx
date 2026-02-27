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
} from '@mui/material';
import {
    LayoutDashboard,
    Package,
    History,
    BarChart3,
    Settings,
    PlusCircle,
    Monitor as TerminalIcon
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';

const drawerWidth = 260;

interface SidebarProps {
    mobileOpen: boolean;
    onDrawerToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onDrawerToggle }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useSelector((state: RootState) => state.auth);

    const menuItems = [
        { text: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/', roles: ['admin', 'user'] },
        { text: 'POS Terminal', icon: <TerminalIcon size={20} />, path: '/pos', roles: ['admin', 'user'] },
        { text: 'Inventory', icon: <Package size={20} />, path: '/inventory', roles: ['admin', 'user'] },
        { text: 'Add Product', icon: <PlusCircle size={20} />, path: '/inventory/add', roles: ['admin'] },
        { text: 'Transactions', icon: <History size={20} />, path: '/transactions', roles: ['admin', 'user'] },
        { text: 'Reports', icon: <BarChart3 size={20} />, path: '/reports', roles: ['admin'] },
    ];

    const drawer = (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Toolbar />
            <Box sx={{ p: 3 }}>
                <Typography variant="overline" color="text.secondary" fontWeight={700}>
                    Main Menu
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
                                        borderRadius: 2,
                                        backgroundColor: isActive ? 'primary.main' : 'transparent',
                                        color: isActive ? 'primary.contrastText' : 'text.primary',
                                        '&:hover': {
                                            backgroundColor: isActive ? 'primary.dark' : 'rgba(99, 102, 241, 0.08)',
                                            color: isActive ? 'primary.contrastText' : 'primary.main',
                                            '& .MuiListItemIcon-root': {
                                                color: isActive ? 'primary.contrastText' : 'primary.main',
                                            }
                                        },
                                    }}
                                >
                                    <ListItemIcon
                                        sx={{
                                            minWidth: 40,
                                            color: isActive ? 'primary.contrastText' : 'text.secondary'
                                        }}
                                    >
                                        {item.icon}
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={item.text}
                                        primaryTypographyProps={{
                                            fontSize: '0.9rem',
                                            fontWeight: isActive ? 600 : 500
                                        }}
                                    />
                                </ListItemButton>
                            </ListItem>
                        );
                    })}
            </List>
            <Box sx={{ mt: 'auto', p: 2 }}>
                <Divider sx={{ mb: 2 }} />
                <ListItem disablePadding>
                    <ListItemButton sx={{ borderRadius: 2 }}>
                        <ListItemIcon sx={{ minWidth: 40 }}>
                            <Settings size={20} />
                        </ListItemIcon>
                        <ListItemText primary="Settings" primaryTypographyProps={{ fontSize: '0.9rem' }} />
                    </ListItemButton>
                </ListItem>
            </Box>
        </Box>
    );

    return (
        <Box
            component="nav"
            sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
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
                        width: drawerWidth,
                        borderRight: '1px solid',
                        borderColor: 'divider',
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
