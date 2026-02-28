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
    IconButton,
    Tooltip,
} from '@mui/material';
import {
    LayoutDashboard,
    Package,
    History,
    BarChart3,
    Settings,
    Monitor as TerminalIcon,
    ClipboardList,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';

import itemHiveLightLogo from '../../assets/itemhive-light.svg';
import itemHiveDarkLogo from '../../assets/itemhive-dark.svg';

const expandedDrawerWidth = 260;
const collapsedDrawerWidth = 92;

interface SidebarProps {
    mobileOpen: boolean;
    onDrawerToggle: () => void;
    collapsed: boolean;
    onCollapseToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onDrawerToggle, collapsed, onCollapseToggle }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useSelector((state: RootState) => state.auth);
    const drawerWidth = collapsed ? collapsedDrawerWidth : expandedDrawerWidth;

    const menuItems = [
        { text: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/', roles: ['admin', 'user'] },
        { text: 'POS Terminal', icon: <TerminalIcon size={20} />, path: '/pos', roles: ['admin', 'user'] },
        { text: 'Inventory', icon: <Package size={20} />, path: '/inventory', roles: ['admin', 'user'] },
        { text: 'Order Desk', icon: <ClipboardList size={20} />, path: '/orders', roles: ['admin', 'user'] },
        { text: 'Transactions', icon: <History size={20} />, path: '/transactions', roles: ['admin', 'user'] },
        { text: 'Reports', icon: <BarChart3 size={20} />, path: '/reports', roles: ['admin'] },
        { text: 'Settings', icon: <Settings size={20} />, path: '/settings', roles: ['admin', 'user'] },
    ];

    const drawer = (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Toolbar />
            <Box sx={{ px: 1, pt: 0.5, pb: 0.5, display: { xs: 'none', sm: 'flex' }, justifyContent: 'flex-end' }}>
                <Tooltip title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'} placement="right">
                    <IconButton
                        onClick={onCollapseToggle}
                        size="small"
                        sx={{
                            width: 28,
                            height: 28,
                            border: '1px solid',
                            borderColor: 'divider',
                            bgcolor: 'background.paper',
                            boxShadow: '0 6px 14px -10px rgba(0,0,0,0.35)',
                            '&:hover': { bgcolor: 'action.hover' }
                        }}
                    >
                        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                    </IconButton>
                </Tooltip>
            </Box>
            {!collapsed && (
                <Box sx={{ p: 2 }}>
                    <Typography variant="overline" color="text.secondary" fontWeight={700}>
                        Main Menu
                    </Typography>
                </Box>
            )}
            {collapsed && (
                <Box sx={{ p: 1.5 }}>
                    <Divider />
                </Box>
            )}
            <List sx={{ px: collapsed ? 1 : 2 }}>
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
                                        minHeight: 48,
                                        justifyContent: collapsed ? 'center' : 'flex-start',
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
                                    <Tooltip title={collapsed ? item.text : ''} placement="right">
                                        <ListItemIcon
                                            sx={{
                                                minWidth: collapsed ? 0 : 40,
                                                color: isActive ? 'primary.contrastText' : 'text.secondary'
                                            }}
                                        >
                                            {item.icon}
                                        </ListItemIcon>
                                    </Tooltip>
                                    {!collapsed && (
                                        <ListItemText
                                            primary={item.text}
                                            primaryTypographyProps={{
                                                fontSize: '0.9rem',
                                                fontWeight: isActive ? 600 : 500
                                            }}
                                        />
                                    )}
                                </ListItemButton>
                            </ListItem>
                        );
                    })}
            </List>
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
                    '& .MuiDrawer-paper': { boxSizing: 'border-box', width: expandedDrawerWidth },
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
