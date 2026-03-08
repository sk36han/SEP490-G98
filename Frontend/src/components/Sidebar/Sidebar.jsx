import React, { useEffect, useMemo, useState } from 'react';
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
import Collapse from '@mui/material/Collapse';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import authService from '../../shared/lib/authService';
import logo from '../../shared/assets/logo.png';
import { getMenuItems } from './menuConfig';
import { getPermissionRole, getRawRoleFromUser } from '../../shared/permissions/roleUtils';

// ── Design tokens ────────────────────────────────────────────────
const SIDEBAR_WIDTH_OPEN     = 260;
const SIDEBAR_WIDTH_CLOSED   = 72;
const HEADER_H               = 56;
const ITEM_H                 = 44;   // parent item height
const SUB_H                  = 38;   // submenu item height
const ICON_SZ                = 18;   // icon px
const ICON_STROKE            = 2;    // stroke-width
const ITEM_PX                = 1.75; // 14px horizontal padding on item button
const ICON_GAP               = 12;   // px gap between icon and label
const LIST_PX                = 2;    // 16px outer list padding
const ITEM_RADIUS            = 10;   // parent pill radius
const SUB_RADIUS             = 8;    // submenu pill radius
const ITEM_MB                = 0.5;  // 4px gap between parent items
const SUB_MB                 = 0.25; // 2px gap between sub items
const SUB_INDENT             = 20;   // px left indent for submenu
const GROUP_GAP              = 20;   // px gap between groups (no label)
const SECTION_LABEL_PB       = 10;   // px below section label

const openedMixin = (theme) => ({
    width: SIDEBAR_WIDTH_OPEN,
    transition: theme.transitions.create('width', {
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        duration: 240,
    }),
    overflowX: 'hidden',
});

const closedMixin = (theme) => ({
    width: SIDEBAR_WIDTH_CLOSED,
    transition: theme.transitions.create('width', {
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        duration: 240,
    }),
    overflowX: 'hidden',
});

const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(
    ({ theme, open }) => ({
        width: SIDEBAR_WIDTH_OPEN,
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

const isSuppliersPath = (pathname) =>
    pathname === '/suppliers' || pathname.startsWith('/suppliers/');

const getSectionLabel = (item) => {
    if (item.id === 'purchase-orders-mgmt' || item.path?.startsWith('/purchase-orders')) {
        return null;
    }
    return 'Danh mục';
};

const Sidebar = () => {
    const theme = useTheme();
    const [open, setOpen] = useState(true);
    const [userMgmtCollapsed, setUserMgmtCollapsed] = useState(false);
    const [productsCollapsed, setProductsCollapsed] = useState(false);
    const [purchaseOrdersCollapsed, setPurchaseOrdersCollapsed] = useState(false);
    const [suppliersCollapsed, setSuppliersCollapsed] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();
    const pathname = location.pathname;

    const userInfo = authService.getUser();
    const roleFromBackend = getRawRoleFromUser(userInfo);
    const permissionRole = getPermissionRole(roleFromBackend);
    const menuItems = getMenuItems(permissionRole);

    const sectionLabels = useMemo(() => menuItems.map(getSectionLabel), [menuItems]);

    useEffect(() => {
        if (!isUserMgmtPath(pathname)) {
            const id = setTimeout(() => setUserMgmtCollapsed(false), 0);
            return () => clearTimeout(id);
        }
        return undefined;
    }, [pathname]);

    useEffect(() => {
        if (!isProductsPath(pathname)) {
            const id = setTimeout(() => setProductsCollapsed(false), 0);
            return () => clearTimeout(id);
        }
        return undefined;
    }, [pathname]);

    useEffect(() => {
        if (!isPurchaseOrdersPath(pathname)) {
            const id = setTimeout(() => setPurchaseOrdersCollapsed(false), 0);
            return () => clearTimeout(id);
        }
        return undefined;
    }, [pathname]);

    useEffect(() => {
        if (!isSuppliersPath(pathname)) {
            const id = setTimeout(() => setSuppliersCollapsed(false), 0);
            return () => clearTimeout(id);
        }
        return undefined;
    }, [pathname]);

    const isOnUserMgmtPath = () => isUserMgmtPath(pathname);
    const isOnProductsPath = () => isProductsPath(pathname);
    const isOnPurchaseOrdersPath = () => isPurchaseOrdersPath(pathname);
    const isOnSuppliersPath = () => isSuppliersPath(pathname);

    const isGroupExpanded = (item) => {
        if (!item.id) return false;
        if (item.id === 'user-mgmt') return isOnUserMgmtPath() && !userMgmtCollapsed;
        if (item.id === 'products-mgmt') return isOnProductsPath() && !productsCollapsed;
        if (item.id === 'purchase-orders-mgmt') return isOnPurchaseOrdersPath() && !purchaseOrdersCollapsed;
        if (item.id === 'suppliers-mgmt') return isOnSuppliersPath() && !suppliersCollapsed;
        return false;
    };

    const handleParentClick = (item) => {
        const onUserMgmt      = item.id === 'user-mgmt'            && isOnUserMgmtPath();
        const onProducts      = item.id === 'products-mgmt'        && isOnProductsPath();
        const onPurchaseOrders = item.id === 'purchase-orders-mgmt' && isOnPurchaseOrdersPath();
        const onSuppliers     = item.id === 'suppliers-mgmt'       && isOnSuppliersPath();

        if (onUserMgmt)       { setUserMgmtCollapsed((p) => !p);      return; }
        if (onProducts)       { setProductsCollapsed((p) => !p);       return; }
        if (onPurchaseOrders) { setPurchaseOrdersCollapsed((p) => !p); return; }
        if (onSuppliers)      { setSuppliersCollapsed((p) => !p);      return; }

        navigate(item.path);
        setUserMgmtCollapsed(false);
        setProductsCollapsed(false);
        setPurchaseOrdersCollapsed(false);
        setSuppliersCollapsed(false);
    };

    const handleChildClick = (child) => {
        navigate(child.path, { state: child.state ?? undefined });
    };

    const isParentActive = (item) => {
        if (!item.children) return pathname === item.path;
        if (item.id === 'products-mgmt'        && isProductsPath(pathname))       return true;
        if (item.id === 'purchase-orders-mgmt' && isPurchaseOrdersPath(pathname)) return true;
        if (item.id === 'suppliers-mgmt'       && isSuppliersPath(pathname))      return true;
        return item.children.some((c) => pathname === c.path);
    };

    const isChildActive = (child) => {
        if (child.state?.openCreate) return pathname === child.path && location.state?.openCreate;
        return pathname === child.path;
    };

    // Clone icon with consistent size + stroke
    const icon = (node) =>
        React.isValidElement(node)
            ? React.cloneElement(node, { size: ICON_SZ, strokeWidth: ICON_STROKE })
            : node;

    // ── Color palette — ocean blue ─────────────────────────────────
    const ACCENT        = '#0284c7';                       // active text / icon
    const TXT           = '#4b6a88';                       // default label — ocean blue-gray
    const TXT_HOVER     = '#1e3a5f';                       // hover label — deep ocean
    const TXT_MUTED     = 'rgba(75,106,136,0.55)';         // submenu default
    const TXT_MUTED_HVR = '#4b6a88';                       // submenu hover
    const CAPTION       = 'rgba(75,106,136,0.55)';         // section caption
    const ICN           = 'rgba(75,106,136,0.72)';         // icon default — ocean blue-gray
    const DIVIDER_CLR   = 'rgba(2,132,199,0.10)';          // subtle ocean divider
    const HOVER_BG      = 'rgba(2,132,199,0.06)';          // hover background — ocean tint
    const SUB_HOVER_BG  = 'rgba(2,132,199,0.06)';
    const ACTIVE_PILL   = 'rgba(2,132,199,0.10)';          // active pill fill
    const ACTIVE_BAR    = '#0284c7';                       // 2px bar inside active pill
    const BTN_CLR       = 'rgba(75,106,136,0.55)';         // toggle icon colour

    return (
        <Box sx={{ display: 'flex' }}>
            <CssBaseline />
            <Drawer
                variant="permanent"
                open={open}
                PaperProps={{
                    sx: {
                        background: '#FFFFFF',
                        borderRight: `1px solid ${DIVIDER_CLR}`,
                        boxShadow: 'none',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                    },
                }}
            >
                {/* ── Header ────────────────────────────────────────── */}
                <Box
                    sx={{
                        height: HEADER_H,
                        minHeight: HEADER_H,
                        px: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: open ? 'space-between' : 'center',
                        flexShrink: 0,
                        position: 'relative',
                    }}
                >
                    {/* Logo */}
                    <Box sx={{ display: 'flex', alignItems: 'center', overflow: 'hidden', minWidth: 0 }}>
                        {open
                            ? <img src={logo} alt="Logo" style={{ height: 26, maxWidth: 118, objectFit: 'contain' }} />
                            : <img src={logo} alt="Logo" style={{ height: 22, width: 22, objectFit: 'contain' }} />
                        }
                    </Box>

                    {/* Toggle arrow — same button for both states, no border/bg */}
                    <Tooltip title={open ? 'Thu gọn' : 'Mở rộng'} placement="right">
                        <IconButton
                            onClick={() => setOpen((prev) => !prev)}
                            size="small"
                            sx={{
                                flexShrink: 0,
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                color: BTN_CLR,
                                bgcolor: 'transparent',
                                '&:hover': {
                                    bgcolor: HOVER_BG,
                                    color: TXT,
                                },
                                transition: 'background-color 0.15s, color 0.15s',
                            }}
                        >
                            {open
                                ? <ChevronLeftIcon sx={{ fontSize: 17 }} />
                                : <ChevronRightIcon sx={{ fontSize: 17 }} />
                            }
                        </IconButton>
                    </Tooltip>
                </Box>

                <Divider sx={{ borderColor: DIVIDER_CLR }} />

                {/* ── Nav list ───────────────────────────────────────── */}
                <List
                    sx={{
                        px: `${LIST_PX * 8}px`,   // 16px
                        pt: '12px',
                        pb: '16px',
                        flex: 1,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        '&::-webkit-scrollbar': { width: 0 },
                    }}
                >
                    {menuItems.map((item, index) => {
                        const hasChildren   = Array.isArray(item.children) && item.children.length > 0;
                        const parentActive  = isParentActive(item);
                        const expanded      = open && isGroupExpanded(item);
                        const hasActiveChild = hasChildren && item.children.some((c) => isChildActive(c));

                        const currentSection  = sectionLabels[index];
                        const prevSection     = sectionLabels[index - 1];
                        const showLabel       = open && Boolean(currentSection) && (index === 0 || currentSection !== prevSection);
                        const isGroupBreak    = index > 0 && prevSection !== null && currentSection === null;

                        // ── Parent state derivations ─────────────────
                        // Parent with active child: NO background fill — only semibold text
                        // Parent without children (leaf) that is active: gets full pill
                        const isLeafActive    = parentActive && !hasChildren;
                                        const parentBg        = isLeafActive ? ACTIVE_PILL   : 'transparent';
                                        const parentHoverBg   = isLeafActive ? 'rgba(2,132,199,0.16)' : HOVER_BG;
                                        const parentTxtColor  = isLeafActive
                                            ? ACCENT
                                            : (parentActive && hasActiveChild)
                                                ? TXT_HOVER
                                                : TXT;
                                        const parentIconColor = isLeafActive
                                            ? ACCENT
                                            : (parentActive && hasActiveChild) ? TXT : ICN;
                                        const parentWeight    = (parentActive) ? 600 : 500;

                        return (
                            <React.Fragment key={item.id || item.path}>

                                {/* Section label — muted caption */}
                                {showLabel && (
                                    <Box sx={{ mt: index === 0 ? '10px' : '16px', mb: '6px' }}>
                                        <Typography
                                            sx={{
                                                px: '4px',
                                                fontSize: '11px',
                                                lineHeight: 1,
                                                fontWeight: 600,
                                                color: CAPTION,
                                                letterSpacing: '0.08em',
                                                textTransform: 'uppercase',
                                                userSelect: 'none',
                                            }}
                                        >
                                            {currentSection}
                                        </Typography>
                                    </Box>
                                )}

                                {/* ── Parent row ─────────────────────────── */}
                                <ListItem
                                    disablePadding
                                    sx={{ display: 'block', mb: '4px' }}
                                >
                                    <Tooltip title={!open ? item.label : ''} placement="right" arrow>
                                        <ListItemButton
                                            onClick={() => (hasChildren ? handleParentClick(item) : navigate(item.path))}
                                            sx={{
                                                height: `${ITEM_H}px`,
                                                px: `${ITEM_PX * 8}px`,
                                                borderRadius: `${ITEM_RADIUS}px`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: open ? 'flex-start' : 'center',
                                                gap: open ? `${ICON_GAP}px` : 0,
                                                bgcolor: parentBg,
                                                color: parentTxtColor,
                                                '&:hover': {
                                                    bgcolor: parentHoverBg,
                                                    color: isLeafActive ? ACCENT : TXT_HOVER,
                                                },
                                                    '&.Mui-focusVisible': { outline: `2px solid rgba(2,132,199,0.30)`, outlineOffset: 2 },
                                                transition: 'background-color 0.15s, color 0.15s',
                                            }}
                                        >
                                            {/* Icon slot — fixed 18×18 */}
                                            <Box
                                                sx={{
                                                    width: `${ICON_SZ}px`,
                                                    height: `${ICON_SZ}px`,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0,
                                                    color: parentIconColor,
                                                    transition: 'color 0.15s',
                                                }}
                                            >
                                                {icon(item.icon)}
                                            </Box>

                                            {/* Label */}
                                            {open && (
                                                <Box
                                                    component="span"
                                                    sx={{
                                                        flex: 1,
                                                        fontSize: '13.5px',
                                                        lineHeight: '20px',
                                                        fontWeight: parentWeight,
                                                        color: 'inherit',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    {item.label}
                                                </Box>
                                            )}
                                        </ListItemButton>
                                    </Tooltip>

                                    {/* ── Submenu ──────────────────────────── */}
                                    {open && hasChildren && (
                                        <Collapse in={expanded} timeout={200} unmountOnExit>
                                            <List
                                                disablePadding
                                                sx={{
                                                    mt: '8px',
                                                    mb: '4px',
                                                    pl: `${SUB_INDENT}px`,
                                                }}
                                            >
                                                {item.children.map((child, ci) => {
                                                    const childActive = isChildActive(child);
                                                    return (
                                                        <ListItem
                                                            key={child.path + (child.state?.openCreate ? '-create' : `-${ci}`)}
                                                            disablePadding
                                                            sx={{ display: 'block', mb: `${SUB_MB * 8}px` }}
                                                        >
                                                            <ListItemButton
                                                                onClick={() => handleChildClick(child)}
                                                                sx={{
                                                                    height: `${SUB_H}px`,
                                                                    pl: '10px',
                                                                    pr: '10px',
                                                                    borderRadius: `${SUB_RADIUS}px`,
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '8px',
                                                    bgcolor: 'transparent',
                                                    color: childActive ? ACCENT : TXT_MUTED,
                                                    '&:hover': {
                                                        bgcolor: SUB_HOVER_BG,
                                                        color: childActive ? ACCENT : TXT_MUTED_HVR,
                                                    },
                                                    '&.Mui-focusVisible': { outline: `2px solid rgba(2,132,199,0.28)`, outlineOffset: 1 },
                                                                    transition: 'background-color 0.15s, color 0.15s',
                                                                }}
                                                            >
                                                                {/* 2px accent bar inside active pill */}
                                                                {childActive && (
                                                                    <Box
                                                                        sx={{
                                                                            flexShrink: 0,
                                                                            width: '2px',
                                                                            height: '14px',
                                                                            borderRadius: '2px',
                                                                            bgcolor: ACTIVE_BAR,
                                                                        }}
                                                                    />
                                                                )}

                                                                <Box
                                                                    component="span"
                                                                    sx={{
                                                                        fontSize: '13px',
                                                                        lineHeight: '18px',
                                                                        fontWeight: childActive ? 500 : 400,
                                                                        color: 'inherit',
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                        whiteSpace: 'nowrap',
                                                                    }}
                                                                >
                                                                    {child.label}
                                                                </Box>
                                                            </ListItemButton>
                                                        </ListItem>
                                                    );
                                                })}
                                            </List>
                                        </Collapse>
                                    )}
                                </ListItem>
                            </React.Fragment>
                        );
                    })}
                </List>
            </Drawer>
        </Box>
    );
};

export default Sidebar;
