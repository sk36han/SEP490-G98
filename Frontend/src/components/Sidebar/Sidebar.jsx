import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import MuiDrawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import CssBaseline from '@mui/material/CssBaseline';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import Collapse from '@mui/material/Collapse';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import LogoutIcon from '@mui/icons-material/Logout';
import authService from '../../shared/lib/authService';
import logo from '../../shared/assets/logo.png';
import { getMenuItems } from './menuConfig';
import { getPermissionRole, getPermissionRoleLabel, getRawRoleFromUser } from '../../shared/permissions/roleUtils';

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
    const [open, setOpen] = useState(true);
    const [userMgmtCollapsed, setUserMgmtCollapsed] = useState(false);
    const [productsCollapsed, setProductsCollapsed] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const pathname = location.pathname;

    const userInfo = authService.getUser();
    const roleFromBackend = getRawRoleFromUser(userInfo);

    const user = {
        name: String(userInfo?.fullName ?? userInfo?.FullName ?? 'User').slice(0, 100),
        role: roleFromBackend,
        permissionRole: getPermissionRole(roleFromBackend),
        email: userInfo?.email ?? userInfo?.Email ?? '',
        avatar: userInfo?.avatar
    };

    const menuItems = getMenuItems(user.permissionRole);

    // Kiểm tra path hiện tại có thuộc một nhóm menu (theo id) hay không
    const isPathInGroup = (groupId) => {
        const group = menuItems.find((m) => m.id === groupId);
        if (!group) return false;
        const paths = [
            group.path,
            ...(Array.isArray(group.children) ? group.children.map((c) => c.path) : []),
        ].filter(Boolean);
        return paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
    };

    // Rời trang quản lý người dùng / vật tư → reset collapsed để lần sau vào lại section sẽ mở
    useEffect(() => {
        if (!isPathInGroup('user-mgmt')) {
            const id = setTimeout(() => setUserMgmtCollapsed(false), 0);
            return () => clearTimeout(id);
        }
    }, [pathname, menuItems]);
    useEffect(() => {
        if (!isPathInGroup('products-mgmt')) {
            const id = setTimeout(() => setProductsCollapsed(false), 0);
            return () => clearTimeout(id);
        }
    }, [pathname, menuItems]);

    const isGroupExpanded = (item) => {
        if (!item.id) return false;
        if (item.id === 'user-mgmt') {
            return isPathInGroup('user-mgmt') && !userMgmtCollapsed;
        }
        if (item.id === 'products-mgmt') {
            return isPathInGroup('products-mgmt') && !productsCollapsed;
        }
        return false;
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

    const handleParentClick = (item) => {
        const onUserMgmt = item.id === 'user-mgmt' && isPathInGroup('user-mgmt');
        const onProducts = item.id === 'products-mgmt' && isPathInGroup('products-mgmt');
        if (onUserMgmt) {
            setUserMgmtCollapsed((prev) => !prev);
        } else if (onProducts) {
            setProductsCollapsed((prev) => !prev);
        } else {
            navigate(item.path);
            setUserMgmtCollapsed(false);
            setProductsCollapsed(false);
        }
    };

    const handleChildClick = (child) => {
        navigate(child.path, { state: child.state ?? undefined });
    };

    const isParentActive = (item) => {
        if (!item.children) return location.pathname === item.path;
        if (item.id === 'user-mgmt' || item.id === 'products-mgmt') {
            return isPathInGroup(item.id);
        }
        return item.children.some((c) => location.pathname === c.path);
    };

    const isChildActive = (child) => {
        if (child.state?.openCreate) return location.pathname === child.path && location.state?.openCreate;
        return location.pathname === child.path;
    };

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

                {/* Floating Toggle Button – căn giữa theo chiều dọc */}
                <IconButton
                    onClick={open ? handleDrawerClose : handleDrawerOpen}
                    sx={{
                        position: 'absolute',
                        right: -14,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        zIndex: 1201,
                        backgroundColor: 'white',
                        border: '1px solid rgba(0,0,0,0.1)',
                        width: 28,
                        height: 28,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        '&:hover': {
                            backgroundColor: '#f5f5f5',
                            transform: 'translateY(-50%) scale(1.1)'
                        },
                        transition: 'all 0.2s'
                    }}
                    size="small"
                >
                    {open ? <ChevronLeftIcon fontSize="small" color="action" /> : <ChevronRightIcon fontSize="small" color="action" />}
                </IconButton>

                <List sx={{ px: 1.5, py: 2 }}>
                    {menuItems.map((item) => {
                        const hasChildren = item.children && item.children.length > 0;
                        const isExpanded = open && isGroupExpanded(item);
                        const parentActive = isParentActive(item);

                        if (hasChildren) {
                            return (
                                <ListItem key={item.id || item.path} disablePadding sx={{ display: 'block', mb: 0.5 }}>
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
                                                ...(parentActive ? {
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
                                            onClick={() => handleParentClick(item)}
                                            selected={parentActive}
                                        >
                                            <ListItemIcon
                                                sx={{
                                                    minWidth: 0,
                                                    mr: open ? 2 : 'auto',
                                                    justifyContent: 'center',
                                                    color: parentActive ? 'white' : 'inherit',
                                                    transition: 'color 0.2s'
                                                }}
                                            >
                                                {item.icon}
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={item.label}
                                                primaryTypographyProps={{
                                                    fontWeight: parentActive ? 600 : 500,
                                                    fontSize: '0.95rem'
                                                }}
                                                sx={{ opacity: open ? 1 : 0 }}
                                            />
                                        </ListItemButton>
                                    </Tooltip>
                                    {open && (
                                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                            <List
                                                component="div"
                                                disablePadding
                                                sx={{
                                                    mt: 1,
                                                    pl: 1.5,
                                                    pr: 0.5,
                                                    py: 1.5,
                                                    borderRadius: 2,
                                                    bgcolor: 'rgba(0, 0, 0, 0.02)',
                                                    borderLeft: '2px solid rgba(14, 165, 233, 0.2)',
                                                }}
                                            >
                                                {item.children.map((child, idx) => {
                                                    const childActive = isChildActive(child);
                                                    return (
                                                        <ListItem
                                                            component="div"
                                                            key={child.path + (child.state?.openCreate ? '-create' : (child.path + idx))}
                                                            disablePadding
                                                            sx={{ mb: 1.25, '&:last-child': { mb: 0 } }}
                                                        >
                                                            <ListItemButton
                                                                sx={{
                                                                    borderRadius: 2,
                                                                    py: 1.25,
                                                                    pl: 2,
                                                                    minHeight: 40,
                                                                    transition: 'all 0.2s ease',
                                                                    ...(childActive
                                                                        ? {
                                                                            backgroundColor: 'rgba(14, 165, 233, 0.14)',
                                                                            color: 'primary.main',
                                                                            fontWeight: 600,
                                                                            '&:hover': {
                                                                                backgroundColor: 'rgba(14, 165, 233, 0.2)',
                                                                            },
                                                                        }
                                                                        : {
                                                                            color: 'text.secondary',
                                                                            backgroundColor: 'transparent',
                                                                            '&:hover': {
                                                                                backgroundColor: 'rgba(0, 0, 0, 0.06)',
                                                                                color: 'primary.main',
                                                                            },
                                                                        }),
                                                                }}
                                                                onClick={() => handleChildClick(child)}
                                                            >
                                                                <ListItemText
                                                                    primary={child.label}
                                                                    primaryTypographyProps={{ fontSize: '0.875rem' }}
                                                                />
                                                            </ListItemButton>
                                                        </ListItem>
                                                    );
                                                })}
                                            </List>
                                        </Collapse>
                                    )}
                                </ListItem>
                            );
                        }

                        return (
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
                        );
                    })}
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
