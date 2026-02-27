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
    Badge
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
import { toggleDarkMode } from '../../features/theme/themeSlice';
import { useNavigate } from 'react-router-dom';

interface NavbarProps {
    onMenuClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user } = useSelector((state: RootState) => state.auth);
    const { mode } = useSelector((state: RootState) => state.theme);
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

    const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = () => {
        dispatch(logout());
        navigate('/login');
        handleClose();
    };

    const handleThemeToggle = () => {
        dispatch(toggleDarkMode());
    };

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
                    <Typography
                        variant="h6"
                        noWrap
                        component="div"
                        className="gradient-text"
                        sx={{
                            fontWeight: 800,
                            letterSpacing: -1,
                            fontSize: '1.5rem'
                        }}
                    >
                        ItemHive
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconButton color="inherit" onClick={handleThemeToggle}>
                        {mode === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                    </IconButton>

                    <IconButton color="inherit">
                        <Badge badgeContent={4} color="secondary">
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
                </Box>
            </Toolbar>
        </AppBar>
    );
};


export default Navbar;
