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
import Tooltip from '@mui/material/Tooltip';
import authService from '../../shared/lib/authService';
import logo from '../../shared/assets/logo.png';
import { getMenuItems } from './menuConfig';
import { getPermissionRole, getPermissionRoleLabel, getRawRoleFromUser } from '../../shared/permissions/roleUtils';

const drawerWidth = 240; // Thu nhỏ từ 260

const openedMixin = (theme) => ({
    width: drawerWidth,
    transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
    }),
    overflowX: 'visible',
});

const closedMixin = (theme) => ({
    transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.easeIn,
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

const isUserMgmtPath = (pathname) =>
    pathname === '/admin/users' || pathname.startsWith('/admin/users/');

const isProductsPath = (pathname) =>
    pathname === '/products' || pathname.startsWith('/items/');

const isPurchaseOrdersPath = (pathname) =>
    pathname === '/purchase-orders' || pathname.startsWith('/purchase-orders/');

const Sidebar = () => {
    const [open, setOpen] = useState(true);
    const [userMgmtCollapsed, setUserMgmtCollapsed] = useState(false);
    const [productsCollapsed, setProductsCollapsed] = useState(false);
    const [purchaseOrdersCollapsed, setPurchaseOrdersCollapsed] = useState(false);
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

    // Rời trang quản lý người dùng / vật tư / đơn mua → reset collapsed để lần sau vào lại section sẽ mở
    useEffect(() => {
        if (!isUserMgmtPath(pathname)) {
            const id = setTimeout(() => setUserMgmtCollapsed(false), 0);
            return () => clearTimeout(id);
        }
    }, [pathname]);
    useEffect(() => {
        if (!isProductsPath(pathname)) {
            const id = setTimeout(() => setProductsCollapsed(false), 0);
            return () => clearTimeout(id);
        }
    }, [pathname]);
    useEffect(() => {
        if (!isPurchaseOrdersPath(pathname)) {
            const id = setTimeout(() => setPurchaseOrdersCollapsed(false), 0);
            return () => clearTimeout(id);
        }
    }, [pathname]);

    const isOnUserMgmtPath = () => isUserMgmtPath(pathname);
    const isOnProductsPath = () => isProductsPath(pathname);
    const isOnPurchaseOrdersPath = () => isPurchaseOrdersPath(pathname);

    const isGroupExpanded = (item) => {
        if (!item.id) return false;
        if (item.id === 'user-mgmt') {
            return isOnUserMgmtPath() && !userMgmtCollapsed;
        }
        if (item.id === 'products-mgmt') {
            return isOnProductsPath() && !productsCollapsed;
        }
        if (item.id === 'purchase-orders-mgmt') {
            return isOnPurchaseOrdersPath() && !purchaseOrdersCollapsed;
        }
        return false;
    };

    const handleDrawerOpen = () => {
        setOpen(true);
    };

    const handleDrawerClose = () => {
        setOpen(false);
    };

    const handleParentClick = (item) => {
        const onUserMgmt = item.id === 'user-mgmt' && isOnUserMgmtPath();
        const onProducts = item.id === 'products-mgmt' && isOnProductsPath();
        const onPurchaseOrders = item.id === 'purchase-orders-mgmt' && isOnPurchaseOrdersPath();
        if (onUserMgmt) {
            setUserMgmtCollapsed((prev) => !prev);
        } else if (onProducts) {
            setProductsCollapsed((prev) => !prev);
        } else if (onPurchaseOrders) {
            setPurchaseOrdersCollapsed((prev) => !prev);
        } else {
            navigate(item.path);
            setUserMgmtCollapsed(false);
            setProductsCollapsed(false);
            setPurchaseOrdersCollapsed(false);
        }
    };

    const handleChildClick = (child) => {
        navigate(child.path, { state: child.state ?? undefined });
    };

    const isParentActive = (item) => {
        if (!item.children) return location.pathname === item.path;
        if (item.id === 'products-mgmt' && isProductsPath(pathname)) return true;
        if (item.id === 'purchase-orders-mgmt' && isPurchaseOrdersPath(pathname)) return true;
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
                        backgroundColor: '#f8fafc',
                        backdropFilter: 'blur(12px)',
                        borderRight: '1px solid rgba(0, 0, 0, 0.08)',
                        boxShadow: '4px 0 20px rgba(0,0,0,0.05)',
                        overflow: 'visible'
                    }
                }}
            >
                <DrawerHeader sx={{ overflow: 'hidden' }}>
                    {open ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', transition: 'all 0.3s' }}>
                            <img src={logo} alt="Logo" style={{ height: 40, maxWidth: '100%', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }} />
                        </Box>
                    ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', overflow: 'hidden' }}>
                            <img src={logo} alt="Logo" style={{ height: 28, maxWidth: 36, width: 'auto', objectFit: 'contain' }} />
                        </Box>
                    )}
                </DrawerHeader>
                <Divider sx={{ borderColor: 'rgba(0,0,0,0.06)' }} />

                {/* Toggle Button – hourglass shape (concave-convex) */}
                <IconButton
                    onClick={open ? handleDrawerClose : handleDrawerOpen}
                    sx={{
                        position: 'absolute',
                        right: -20,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        zIndex: 1202,
                        backgroundColor: '#f8fafc',
                        width: 20,
                        height: 56,
                        borderRadius: '0 50% 50% 0',
                        border: '1px solid rgba(0,0,0,0.08)',
                        borderLeft: 'none',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '2px 0 8px rgba(0,0,0,0.08)',
                        '&:hover': {
                            backgroundColor: '#e2e8f0',
                            width: 24,
                        },
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                    size="small"
                >
                    {open ? <ChevronLeftIcon sx={{ fontSize: 14, color: 'rgba(0,0,0,0.6)' }} /> : <ChevronRightIcon sx={{ fontSize: 14, color: 'rgba(0,0,0,0.6)' }} />}
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
                                                secondary={item.sublabel}
                                                primaryTypographyProps={{
                                                    fontWeight: parentActive ? 600 : 500,
                                                    fontSize: '0.875rem'
                                                }}
                                                secondaryTypographyProps={{
                                                    fontSize: '0.7rem',
                                                    color: parentActive ? 'rgba(255,255,255,0.8)' : 'text.disabled'
                                                }}
                                                sx={{ 
                                                    opacity: open ? 1 : 0,
                                                    transition: 'opacity 0.3s'
                                                }}
                                            />
                                        </ListItemButton>
                                    </Tooltip>
                                    {open && (
                                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                            <List
                                                component="div"
                                                disablePadding
                                                sx={{
                                                    mt: 0.75,
                                                    ml: 2,
                                                    mr: 1,
                                                    pl: 1,
                                                    pr: 0.5,
                                                    py: 1,
                                                    borderRadius: 1.5,
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
                                                            sx={{ mb: 0.5, '&:last-child': { mb: 0 } }}
                                                        >
                                                            <ListItemButton
                                                                sx={{
                                                                    borderRadius: 1.5,
                                                                    py: 0.5,
                                                                    pl: 1.5,
                                                                    minHeight: 28,
                                                                    transition: 'all 0.2s ease',
                                                                    ...(childActive
                                                                        ? {
                                                                            backgroundColor: 'transparent',
                                                                            color: 'primary.main',
                                                                            fontWeight: 700,
                                                                            '&:hover': {
                                                                                backgroundColor: 'rgba(0, 0, 0, 0.02)',
                                                                            },
                                                                        }
                                                                        : {
                                                                            color: 'text.secondary',
                                                                            backgroundColor: 'transparent',
                                                                            fontWeight: 400,
                                                                            '&:hover': {
                                                                                backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                                                                color: 'text.primary',
                                                                            },
                                                                        }),
                                                                }}
                                                                onClick={() => handleChildClick(child)}
                                                            >
                                                                <ListItemText
                                                                    primary={child.label}
                                                                    primaryTypographyProps={{ fontSize: '0.75rem' }}
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
                                            secondary={item.sublabel}
                                            primaryTypographyProps={{
                                                fontWeight: location.pathname === item.path ? 600 : 500,
                                                fontSize: '0.875rem'
                                            }}
                                            secondaryTypographyProps={{
                                                fontSize: '0.7rem',
                                                color: location.pathname === item.path ? 'rgba(255,255,255,0.8)' : 'text.secondary'
                                            }}
                                            sx={{ 
                                                opacity: open ? 1 : 0,
                                                transition: 'opacity 0.3s'
                                            }}
                                        />
                                    </ListItemButton>
                                </Tooltip>
                            </ListItem>
                        );
                    })}
                </List>
            </Drawer>
        </Box>
    );
};

export default Sidebar;
