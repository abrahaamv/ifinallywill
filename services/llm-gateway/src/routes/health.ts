/**
 * Health check route
 */

import { Router, Request, Response } from 'express';
import { authService } from '../services/auth.js';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
    const tokenInfo = authService.getTokenInfo();

    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        service: 'claude-code-proxy',
        auth: {
            hasAccessToken: tokenInfo.hasAccessToken,
            hasRefreshToken: tokenInfo.hasRefreshToken,
            isExpired: tokenInfo.isExpired,
            expiresAt: tokenInfo.expiresAt > 0
                ? new Date(tokenInfo.expiresAt * 1000).toISOString()
                : null,
        },
    });
});

// Refresh token endpoint
router.post('/refresh-token', async (_req: Request, res: Response) => {
    try {
        const result = await authService.forceRefresh();
        res.json({
            success: true,
            expiresAt: new Date(result.expiresAt * 1000).toISOString(),
            message: 'Token refreshed successfully',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to refresh token',
        });
    }
});

// Get token info
router.get('/token-info', (_req: Request, res: Response) => {
    const tokenInfo = authService.getTokenInfo();
    res.json({
        ...tokenInfo,
        expiresAtFormatted: tokenInfo.expiresAt > 0
            ? new Date(tokenInfo.expiresAt * 1000).toISOString()
            : null,
        secondsUntilExpiry: tokenInfo.expiresAt > 0
            ? tokenInfo.expiresAt - Math.floor(Date.now() / 1000)
            : null,
    });
});

/**
 * Inject fresh tokens directly
 * POST /inject-tokens
 * Body: {
 *   access_token: string,
 *   refresh_token: string,
 *   provider_token?: string,
 *   expires_at: number (unix timestamp)
 * }
 */
router.post('/inject-tokens', async (req: Request, res: Response) => {
    try {
        const { access_token, refresh_token, provider_token, expires_at, expires_in } = req.body;

        if (!access_token || !refresh_token) {
            res.status(400).json({
                success: false,
                error: 'access_token and refresh_token are required',
            });
            return;
        }

        // Calculate expires_at if only expires_in is provided
        const expiresAt = expires_at || (expires_in
            ? Math.floor(Date.now() / 1000) + expires_in
            : Math.floor(Date.now() / 1000) + 3600);

        // Import the tokens into the auth service
        await authService.injectTokens({
            accessToken: access_token,
            refreshToken: refresh_token,
            providerToken: provider_token,
            expiresAt: expiresAt,
        });

        const tokenInfo = authService.getTokenInfo();

        res.json({
            success: true,
            message: 'Tokens injected successfully',
            expiresAt: new Date(tokenInfo.expiresAt * 1000).toISOString(),
            secondsUntilExpiry: tokenInfo.expiresAt - Math.floor(Date.now() / 1000),
        });
    } catch (error) {
        console.error('[inject-tokens] Error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to inject tokens',
        });
    }
});

export default router;
