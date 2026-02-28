import React from 'react';
import {
    AppBar,
    Toolbar,
    Typography,
    IconButton,
    Box,
    Avatar,
    Menu,
    MenuItem,
    Tooltip,
    Badge,
    Button
} from '@mui/material';
import {
    Menu as MenuIcon,
    Bell as NotificationsIcon,
    Sun,
    Moon
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { logout } from '../../features/auth/authSlice';
import { toggleDarkMode, setDarkMode } from '../../features/theme/themeSlice';
import { useNavigate } from 'react-router-dom';
import itemHiveLightLogo from '../../assets/itemhive-light.svg';
import itemHiveDarkLogo from '../../assets/itemhive-dark.svg';

interface NavbarProps {
    onMenuClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user } = useSelector((state: RootState) => state.auth);
    const { mode } = useSelector((state: RootState) => state.theme);
    const { transactions } = useSelector((state: RootState) => state.transactions);
    const { orders } = useSelector((state: RootState) => state.orders);
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const [notifAnchorEl, setNotifAnchorEl] = React.useState<null | HTMLElement>(null);

    const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleNotifOpen = (event: React.MouseEvent<HTMLElement>) => {
        setNotifAnchorEl(event.currentTarget);
    };

    const handleNotifClose = () => {
        setNotifAnchorEl(null);
    };

    const handleLogout = () => {
        dispatch(logout());
        navigate('/login');
        handleClose();
    };

    const handleThemeToggle = () => {
        dispatch(toggleDarkMode());
    };

    const recentNotifications = [
        ...orders.slice(0, 2).map((order) => ({
            id: `order-${order.id}`,
            title: `Order ${order.status === 'fulfilled' ? 'fulfilled' : 'rejected'}`,
            detail: `${order.productName} • ${order.quantity} units`,
            time: new Date(order.timestamp).toLocaleString(),
        })),
        ...transactions.slice(0, 2).map((tx) => ({
            id: `tx-${tx.id}`,
            title: tx.type === 'addition' ? 'Stock Added' : 'Stock Reduced',
            detail: `${tx.productName} • ${tx.amount} units`,
            time: new Date(tx.timestamp).toLocaleString(),
        }))
    ].slice(0, 4);

    return (
        <AppBar
            position="fixed"
            sx={{
                zIndex: (theme) => theme.zIndex.drawer + 1,
                backgroundColor: 'background.paper',
                color: 'text.primary',
                boxShadow: 'none',
                borderBottom: '1px solid',
                borderColor: 'divider',
            }}
        >
            <Toolbar>
                <IconButton
                    color="inherit"
                    aria-label="open drawer"
                    edge="start"
                    onClick={onMenuClick}
                    sx={{ mr: 2, display: { sm: 'none' } }}
                >
                    <MenuIcon size={20} />
                </IconButton>

                <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                    <Box
                        component="img"
                        src={mode === 'light' ? itemHiveLightLogo : itemHiveDarkLogo}
                        alt="ItemHive logo"
                        sx={{
                            height: 38,
                            width: 'auto',
                            objectFit: 'contain'
                        }}
                    />
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                        sx={{
                            display: { xs: 'none', md: 'flex' },
                            alignItems: 'center',
                            position: 'relative',
                            borderRadius: 999,
                            p: 0.3,
                            bgcolor: 'action.hover',
                            border: '1px solid',
                            borderColor: 'divider',
                            minWidth: 170,
                            height: 36,
                            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)',
                        }}
                    >
                        <Box
                            sx={{
                                position: 'absolute',
                                top: 4,
                                left: mode === 'light' ? 6 : 'calc(50% + 2px)',
                                width: 'calc(50% - 8px)',
                                height: 28,
                                borderRadius: 999,
                                bgcolor: 'background.paper',
                                boxShadow: '0 6px 12px -10px rgba(15, 23, 42, 0.5)',
                                transition: 'all 0.25s ease',
                                border: '1px solid',
                                borderColor: 'divider',
                            }}
                        />
                        <Button
                            onClick={() => dispatch(setDarkMode('light'))}
                            startIcon={<Sun size={16} />}
                            sx={{
                                flex: 1,
                                height: 28,
                                zIndex: 1,
                                color: mode === 'light' ? 'text.primary' : 'text.secondary',
                                fontWeight: 700,
                                textTransform: 'none',
                                borderRadius: 999,
                            }}
                        >
                            Light
                        </Button>
                        <Button
                            onClick={() => dispatch(setDarkMode('dark'))}
                            startIcon={<Moon size={16} />}
                            sx={{
                                flex: 1,
                                height: 28,
                                zIndex: 1,
                                color: mode === 'dark' ? 'text.primary' : 'text.secondary',
                                fontWeight: 700,
                                textTransform: 'none',
                                borderRadius: 999,
                            }}
                        >
                            Dark
                        </Button>
                    </Box>

                    <IconButton color="inherit" onClick={handleThemeToggle} sx={{ display: { xs: 'inline-flex', md: 'none' } }}>
                        {mode === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                    </IconButton>

                    <IconButton color="inherit" onClick={handleNotifOpen}>
                        <Badge badgeContent={recentNotifications.length} color="secondary">
                            <NotificationsIcon size={20} />
                        </Badge>
                    </IconButton>

                    <Tooltip title="Profile settings">
                        <IconButton onClick={handleMenu} sx={{ p: 0.5, ml: 1 }}>
                            <Avatar
                                alt={user?.username}
                                sx={{
                                    width: 35,
                                    height: 35,
                                    bgcolor: 'primary.main',
                                    fontSize: '0.9rem',
                                    fontWeight: 600
                                }}
                            >
                                {user?.username?.charAt(0).toUpperCase()}
                            </Avatar>
                        </IconButton>
                    </Tooltip>

                    <Menu
                        id="menu-appbar"
                        anchorEl={anchorEl}
                        anchorOrigin={{
                            vertical: 'bottom',
                            horizontal: 'right',
                        }}
                        keepMounted
                        transformOrigin={{
                            vertical: 'top',
                            horizontal: 'right',
                        }}
                        open={Boolean(anchorEl)}
                        onClose={handleClose}
                    >
                        <Box sx={{ px: 2, py: 1 }}>
                            <Typography variant="subtitle2">{user?.username}</Typography>
                            <Typography variant="caption" color="text.secondary">
                                {user?.role === 'admin' ? 'Administrator' : 'Staff Member'}
                            </Typography>
                        </Box>
                        <MenuItem onClick={handleClose}>Profile</MenuItem>
                        <MenuItem onClick={handleClose}>Settings</MenuItem>
                        <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>Logout</MenuItem>
                    </Menu>

                    <Menu
                        id="menu-notifications"
                        anchorEl={notifAnchorEl}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                        open={Boolean(notifAnchorEl)}
                        onClose={handleNotifClose}
                        PaperProps={{ sx: { width: 320, p: 0.5 } }}
                    >
                        <Box sx={{ px: 2, py: 1 }}>
                            <Typography variant="subtitle2">Notifications</Typography>
                            <Typography variant="caption" color="text.secondary">
                                Latest order and stock updates
                            </Typography>
                        </Box>
                        {recentNotifications.length === 0 ? (
                            <Box sx={{ px: 2, py: 2, color: 'text.secondary' }}>
                                No notifications yet.
                            </Box>
                        ) : (
                            recentNotifications.map((n) => (
                                <MenuItem key={n.id} onClick={handleNotifClose} sx={{ alignItems: 'flex-start', gap: 1 }}>
                                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main', mt: 0.8 }} />
                                    <Box>
                                        <Typography variant="body2" fontWeight={700}>{n.title}</Typography>
                                        <Typography variant="caption" color="text.secondary">{n.detail}</Typography>
                                        <Typography variant="caption" color="text.secondary" display="block">{n.time}</Typography>
                                    </Box>
                                </MenuItem>
                            ))
                        )}
                        <Box sx={{ px: 2, py: 1 }}>
                            <Button fullWidth variant="text" onClick={handleNotifClose}>
                                Close
                            </Button>
                        </Box>
                    </Menu>
                </Box>
            </Toolbar>
        </AppBar>
    );
};


export default Navbar;
