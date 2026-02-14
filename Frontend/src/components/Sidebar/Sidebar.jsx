import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { styled, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import MuiDrawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import CssBaseline from '@mui/material/CssBaseline';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import LogoutIcon from '@mui/icons-material/Logout';
import authService from '../../shared/lib/authService';
import logo from '../../shared/assets/logo.png';
import { getMenuItems } from './menuConfig';
import { getPermissionRole, getPermissionRoleLabel } from '../../shared/permissions/roleUtils';

const drawerWidth = 260; // Slightly wider for better spacing

const openedMixin = (theme) => ({
    width: drawerWidth,
    transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.enteringScreen,
    }),
    overflowX: 'visible',
});

const closedMixin = (theme) => ({
    transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
    }),
    overflowX: 'visible',
    width: `calc(${theme.spacing(7)} + 1px)`,
    [theme.breakpoints.up('sm')]: {
        width: `calc(${theme.spacing(9)} + 1px)`, // Wider closed state
    },
});

const DrawerHeader = styled('div')(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center', // Centered logo
    padding: theme.spacing(0, 1),
    minHeight: 80, // Taller header
    ...theme.mixins.toolbar,
}));

const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(
    ({ theme, open }) => ({
        width: drawerWidth,
        flexShrink: 0,
        whiteSpace: 'nowrap',
        boxSizing: 'border-box',
        ...(open && {
            ...openedMixin(theme),
            '& .MuiDrawer-paper': openedMixin(theme),
        }),
        ...(!open && {
            ...closedMixin(theme),
            '& .MuiDrawer-paper': closedMixin(theme),
        }),
    }),
);

const Sidebar = () => {
    const theme = useTheme();
    const [open, setOpen] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();

    const userInfo = authService.getUser();
    const roleFromBackend = userInfo?.roleCode || userInfo?.roleName || 'STAFF';

    const user = {
        name: userInfo?.fullName || 'User',
        role: roleFromBackend,
        permissionRole: getPermissionRole(roleFromBackend),
        email: userInfo?.email || '',
        avatar: userInfo?.avatar
    };

    const handleDrawerOpen = () => {
        setOpen(true);
    };

    const handleDrawerClose = () => {
        setOpen(false);
    };

    const handleLogout = () => {
        if (window.confirm('Bạn có chắc muốn đăng xuất?')) {
            authService.logout();
            navigate('/login');
        }
    };

    const menuItems = getMenuItems(user.permissionRole);

    return (
        <Box sx={{ display: 'flex' }}>
            <CssBaseline />
            <Drawer
                variant="permanent"
                open={open}
                PaperProps={{
                    sx: {
                        backgroundColor: 'rgba(255, 255, 255, 0.85)',
                        backdropFilter: 'blur(12px)',
                        borderRight: '1px solid rgba(255, 255, 255, 0.4)',
                        boxShadow: '4px 0 20px rgba(0,0,0,0.05)',
                        overflow: 'visible'
                    }
                }}
            >
                <DrawerHeader sx={{ overflow: 'hidden' }}>
                    {open ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', transition: 'all 0.3s' }}>
                            <img src={logo} alt="Logo" style={{ height: 50, maxWidth: '100%', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }} />
                        </Box>
                    ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', overflow: 'hidden' }}>
                            <img src={logo} alt="Logo" style={{ height: 32, maxWidth: 40, width: 'auto', objectFit: 'contain' }} />
                        </Box>
                    )}
                </DrawerHeader>
                <Divider sx={{ borderColor: 'rgba(0,0,0,0.06)' }} />

                {/* Floating Toggle Button */}
                <IconButton
                    onClick={open ? handleDrawerClose : handleDrawerOpen}
                    sx={{
                        position: 'absolute',
                        right: -14,
                        top: 85, // Position near the top
                        zIndex: 1201,
                        backgroundColor: 'white',
                        border: '1px solid rgba(0,0,0,0.1)',
                        width: 28,
                        height: 28,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        '&:hover': {
                            backgroundColor: '#f5f5f5',
                            transform: 'scale(1.1)'
                        },
                        transition: 'all 0.2s'
                    }}
                    size="small"
                >
                    {open ? <ChevronLeftIcon fontSize="small" color="action" /> : <ChevronRightIcon fontSize="small" color="action" />}
                </IconButton>

                <List sx={{ px: 1.5, py: 2 }}>
                    {menuItems.map((item) => (
                        <ListItem key={item.path} disablePadding sx={{ display: 'block', mb: 0.5 }}>
                            <Tooltip title={!open ? item.label : ''} placement="right" arrow>
                                <ListItemButton
                                    sx={{
                                        minHeight: 50,
                                        justifyContent: open ? 'initial' : 'center',
                                        px: 2.5,
                                        borderRadius: 3,
                                        transition: 'all 0.2s ease-in-out',
                                        position: 'relative',
                                        overflow: 'hidden',
                                        ...(location.pathname === item.path ? {
                                            background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                                            color: 'white',
                                            boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)',
                                            '&:hover': {
                                                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                                                boxShadow: '0 6px 16px rgba(14, 165, 233, 0.4)',
                                            }
                                        } : {
                                            color: 'text.secondary',
                                            '&:hover': {
                                                backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                                color: 'primary.main',
                                                transform: 'translateX(4px)'
                                            }
                                        }),
                                    }}
                                    onClick={() => navigate(item.path)}
                                    selected={location.pathname === item.path}
                                >
                                    <ListItemIcon
                                        sx={{
                                            minWidth: 0,
                                            mr: open ? 2 : 'auto',
                                            justifyContent: 'center',
                                            color: location.pathname === item.path ? 'white' : 'inherit',
                                            transition: 'color 0.2s'
                                        }}
                                    >
                                        {item.icon}
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={item.label}
                                        primaryTypographyProps={{
                                            fontWeight: location.pathname === item.path ? 600 : 500,
                                            fontSize: '0.95rem'
                                        }}
                                        sx={{ opacity: open ? 1 : 0 }}
                                    />
                                </ListItemButton>
                            </Tooltip>
                        </ListItem>
                    ))}
                </List>

                <Box sx={{ mt: 'auto', p: 2 }}>
                    <Box sx={{
                        p: open ? 2 : 1,
                        borderRadius: 3,
                        bgcolor: open ? 'rgba(0,0,0,0.03)' : 'transparent',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: open ? 'flex-start' : 'center',
                        transition: 'all 0.3s'
                    }}>
                        {open && (
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5, width: '100%' }}>
                                <Avatar
                                    src={user.avatar}
                                    alt={user.name}
                                    sx={{
                                        width: 40,
                                        height: 40,
                                        mr: 1.5,
                                        border: '2px solid white',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                    }}
                                >
                                    {user.name.charAt(0)}
                                </Avatar>
                                <Box sx={{ overflow: 'hidden' }}>
                                    <Typography variant="subtitle2" noWrap sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                                        {user.name}
                                    </Typography>
                                    <Typography variant="caption" noWrap sx={{ color: 'text.secondary', display: 'block' }}>
                                        {getPermissionRoleLabel(user.permissionRole)}
                                    </Typography>
                                </Box>
                            </Box>
                        )}

                        <Tooltip title={!open ? "Đăng xuất" : ""} placement="right">
                            <ListItemButton
                                onClick={handleLogout}
                                sx={{
                                    width: '100%',
                                    borderRadius: 2,
                                    justifyContent: open ? 'flex-start' : 'center',
                                    color: 'error.main',
                                    p: 1,
                                    '&:hover': {
                                        bgcolor: 'error.lighter',
                                        backgroundColor: 'rgba(239, 68, 68, 0.08)'
                                    }
                                }}
                            >
                                <ListItemIcon sx={{ color: 'error.main', minWidth: 0, mr: open ? 1.5 : 0 }}>
                                    <LogoutIcon fontSize="small" />
                                </ListItemIcon>
                                {open && <Typography variant="body2" fontWeight="600">Đăng xuất</Typography>}
                            </ListItemButton>
                        </Tooltip>
                    </Box>
                </Box>
            </Drawer>
        </Box>
    );
};

export default Sidebar;
