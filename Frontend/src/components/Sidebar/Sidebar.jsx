import React, { useState } from 'react';
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
import Tooltip from '@mui/material/Tooltip';
import authService from '../../shared/lib/authService';
import logo from '../../shared/assets/logo.png';
import { getMenuItems } from './menuConfig';
import { getPermissionRole, getRawRoleFromUser } from '../../shared/permissions/roleUtils';

// ── Design tokens ────────────────────────────────────────────────
const SIDEBAR_WIDTH_OPEN = 260;
const SIDEBAR_WIDTH_CLOSED = 72;
const HEADER_H = 56;
const ITEM_H = 44;
const SUB_H = 38;
const ICON_SZ = 18;
const ICON_STROKE = 2;
const ITEM_PX = 1.75;
const ICON_GAP = 12;
const LIST_PX = 2;
const ITEM_RADIUS = 10;
const SUB_RADIUS = 8;
const SUB_MB = 0.25;
const SUB_INDENT = 20;

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

const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(({ theme, open }) => ({
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
}));

const matchesPath = (pathname, targetPath) => {
    if (!pathname || !targetPath) return false;
    return pathname === targetPath || pathname.startsWith(`${targetPath}/`);
};

const getExtraMatchPaths = (item) => {
    if (item.id === 'products-mgmt') {
        return ['/items'];
    }
    if (item.id === 'inventory-mgmt') {
        return [
            '/inventory',
            '/inventory/create',
            '/inventory/:id',
            '/inventory/adjustments',
            '/inventory/adjustments/create',
            '/inventory/adjustments/:id',
            '/inventory/stocktakes',
            '/inventory/stocktakes/create',
            '/inventory/stocktakes/:id',
            '/inventory/stocktakes/report/:id',
        ];
    }
    if (item.id === 'good-delivery-notes-mgmt') {
        return ['/release-request', '/release-request/create', '/goods-delivery-notes', '/goods-delivery-notes/create'];
    }
    if (item.id === 'goods-delivery-notes-mgmt') {
        return ['/goods-delivery-notes', '/goods-delivery-notes/create'];
    }
    return [];
};

const isItemMatched = (item, pathname) => {
    if (!item) return false;

    if (item.path && matchesPath(pathname, item.path)) {
        return true;
    }

    if (Array.isArray(item.children) && item.children.some((child) => matchesPath(pathname, child.path))) {
        return true;
    }

    return getExtraMatchPaths(item).some((path) => matchesPath(pathname, path));
};

const Sidebar = () => {
    const [open, setOpen] = useState(true);
    const [expandedGroups, setExpandedGroups] = useState({});

    const navigate = useNavigate();
    const location = useLocation();
    const pathname = location.pathname;

    const userInfo = authService.getUser();
    const roleFromBackend = getRawRoleFromUser(userInfo);
    const permissionRole = getPermissionRole(roleFromBackend);
    const menuItems = getMenuItems(permissionRole);

    const isGroupExpanded = (item) => {
        if (!open || !item?.id || !item?.children?.length) return false;
        if (typeof expandedGroups[item.id] === 'boolean') return expandedGroups[item.id];
        return isItemMatched(item, pathname);
    };

    const handleParentClick = (item) => {
        const hasChildren = Array.isArray(item.children) && item.children.length > 0;

        if (!hasChildren) {
            if (item.path) {
                navigate(item.path);
            }
            return;
        }

        if (!open) {
            setOpen(true);
        }

        setExpandedGroups((prev) => ({
            ...prev,
            [item.id]: !isGroupExpanded(item),
        }));
    };

    const handleParentMiddleClick = (e, item) => {
        if (e.button !== 1) return; // Chỉ xử lý chuột giữa
        e.preventDefault();
        if (item.path) {
            window.open(item.path, '_blank', 'noopener,noreferrer');
        }
    };

    const handleChildClick = (child, parentId) => {
        navigate(child.path, { state: child.state ?? undefined });
        if (parentId) {
            setExpandedGroups((prev) => ({
                ...prev,
                [parentId]: true,
            }));
        }
    };

    const handleChildMiddleClick = (e, child) => {
        if (e.button !== 1) return;
        e.preventDefault();
        if (child.path) {
            window.open(child.path, '_blank', 'noopener,noreferrer');
        }
    };

    const isParentActive = (item) => {
        if (!item.children) return matchesPath(pathname, item.path);
        return isItemMatched(item, pathname);
    };

    const isChildActive = (child) => {
        if (pathname !== child.path) return false;

        if (child.state?.openCreate) {
            return !!location.state?.openCreate;
        }

        if (child.state?.approvalStatus != null) {
            return location.state?.approvalStatus === child.state.approvalStatus;
        }

        return !location.state?.approvalStatus && !location.state?.openCreate;
    };

    const icon = (node) =>
        React.isValidElement(node)
            ? React.cloneElement(node, { size: ICON_SZ, strokeWidth: ICON_STROKE })
            : node;

    // ── Color palette — ocean blue ─────────────────────────────────
    const ACCENT = '#0284c7';
    const TXT = '#4b6a88';
    const TXT_HOVER = '#1e3a5f';
    const TXT_MUTED = 'rgba(75,106,136,0.55)';
    const TXT_MUTED_HVR = '#4b6a88';
    const ICN = 'rgba(75,106,136,0.72)';
    const DIVIDER_CLR = 'rgba(2,132,199,0.10)';
    const HOVER_BG = 'rgba(2,132,199,0.06)';
    const SUB_HOVER_BG = 'rgba(2,132,199,0.06)';
    const ACTIVE_PILL = 'rgba(2,132,199,0.10)';
    const ACTIVE_BAR = '#0284c7';
    const BTN_CLR = 'rgba(75,106,136,0.55)';

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
                    <Box sx={{ display: 'flex', alignItems: 'center', overflow: 'hidden', minWidth: 0 }}>
                        {open ? (
                            <img src={logo} alt="Logo" style={{ height: 26, maxWidth: 118, objectFit: 'contain' }} />
                        ) : (
                            <img src={logo} alt="Logo" style={{ height: 22, width: 22, objectFit: 'contain' }} />
                        )}
                    </Box>

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
                            {open ? <ChevronLeftIcon sx={{ fontSize: 17 }} /> : <ChevronRightIcon sx={{ fontSize: 17 }} />}
                        </IconButton>
                    </Tooltip>
                </Box>

                <Divider sx={{ borderColor: DIVIDER_CLR }} />

                <List
                    sx={{
                        px: `${LIST_PX * 8}px`,
                        pt: '12px',
                        pb: '16px',
                        flex: 1,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        '&::-webkit-scrollbar': { width: 0 },
                    }}
                >
                    {menuItems.map((item) => {
                        const hasChildren = Array.isArray(item.children) && item.children.length > 0;
                        const parentActive = isParentActive(item);
                        const expanded = hasChildren && isGroupExpanded(item);
                        const hasActiveChild = hasChildren && item.children.some((c) => isChildActive(c));

                        const isLeafActive = parentActive && !hasChildren;
                        const parentBg = isLeafActive ? ACTIVE_PILL : 'transparent';
                        const parentHoverBg = isLeafActive ? 'rgba(2,132,199,0.16)' : HOVER_BG;
                        const parentTxtColor = isLeafActive
                            ? ACCENT
                            : parentActive && hasActiveChild
                              ? TXT_HOVER
                              : TXT;
                        const parentIconColor = isLeafActive
                            ? ACCENT
                            : parentActive && hasActiveChild
                              ? TXT
                              : ICN;
                        const parentWeight = parentActive ? 600 : 500;

                        return (
                            <React.Fragment key={item.id || item.path}>
                                <ListItem disablePadding sx={{ display: 'block', mb: '4px' }}>
                                    <Tooltip title={!open ? item.label : ''} placement="right" arrow>
                                        <ListItemButton
                                            onClick={() => handleParentClick(item)}
                                            onAuxClick={(e) => handleParentMiddleClick(e, item)}
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
                                                '&.Mui-focusVisible': {
                                                    outline: '2px solid rgba(2,132,199,0.30)',
                                                    outlineOffset: 2,
                                                },
                                                transition: 'background-color 0.15s, color 0.15s',
                                            }}
                                        >
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
                                                                onClick={() => handleChildClick(child, item.id)}
                                                                onAuxClick={(e) => handleChildMiddleClick(e, child)}
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
                                                                    '&.Mui-focusVisible': {
                                                                        outline: '2px solid rgba(2,132,199,0.28)',
                                                                        outlineOffset: 1,
                                                                    },
                                                                    transition: 'background-color 0.15s, color 0.15s',
                                                                }}
                                                            >
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