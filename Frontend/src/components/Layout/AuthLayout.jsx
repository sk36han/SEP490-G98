import React from 'react';
import { Box, Card, CardContent, Container, Fade } from '@mui/material';
import backgroundImage from '../../shared/assets/background.jpg';

/**
 * Auth layout with background and card - used for Login, ForgotPassword, ResetPassword
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {number} [props.fadeTimeout=800]
 * @param {string} [props.cardBg='rgba(255, 255, 255, 0.85)']
 */
const AuthLayout = ({ children, fadeTimeout = 800, cardBg = 'rgba(255, 255, 255, 0.85)' }) => {
    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                position: 'relative',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    backdropFilter: 'blur(3px)',
                },
                p: 2,
            }}
        >
            <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
                <Fade in={true} timeout={fadeTimeout}>
                    <Card
                        elevation={24}
                        sx={{
                            borderRadius: 4,
                            background: cardBg,
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                        }}
                    >
                        <CardContent sx={{ p: 5 }}>{children}</CardContent>
                    </Card>
                </Fade>
            </Container>
        </Box>
    );
};

export default AuthLayout;
