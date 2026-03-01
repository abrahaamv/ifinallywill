/**
 * Authentication service for managing Supabase tokens with auto-refresh
 * Includes .env file persistence so refreshed tokens survive restarts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../.env');

interface TokenState {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
}

class AuthService {
    private state: TokenState;
    private supabaseUrl: string;
    private supabaseAnonKey: string;
    private refreshPromise: Promise<void> | null = null;

    constructor() {
        this.supabaseUrl = process.env.SUPABASE_URL || 'https://hoirqrkdgbmvpwutwuwj.supabase.co';
        this.supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

        this.state = {
            accessToken: process.env.USER_TOKEN || '',
            refreshToken: process.env.REFRESH_TOKEN || '',
            expiresAt: parseInt(process.env.TOKEN_EXPIRES_AT || '0', 10),
        };

        console.log('[Auth] Initialized with token expiring at:', new Date(this.state.expiresAt * 1000).toISOString());

        // Watch for .env file changes
        this.setupFileWatcher();
    }

    /**
     * Setup file watcher for .env
     */
    private setupFileWatcher(): void {
        try {
            fs.watch(envPath, (eventType) => {
                if (eventType === 'change') {
                    console.log('[Auth] .env file changed, reloading tokens...');
                    this.loadTokensFromEnv();
                }
            });
        } catch (error) {
            console.warn('[Auth] Failed to setup file watcher:', error);
        }
    }

    /**
     * Load tokens directly from .env file
     */
    private loadTokensFromEnv(): void {
        try {
            if (!fs.existsSync(envPath)) return;

            const envContent = fs.readFileSync(envPath, 'utf-8');
            const userTokenMatch = envContent.match(/USER_TOKEN=(.*)/);
            const refreshTokenMatch = envContent.match(/REFRESH_TOKEN=(.*)/);
            const expiresAtMatch = envContent.match(/TOKEN_EXPIRES_AT=(.*)/);

            if (userTokenMatch || refreshTokenMatch || expiresAtMatch) {
                const newState = { ...this.state };
                if (userTokenMatch) newState.accessToken = userTokenMatch[1].trim();
                if (refreshTokenMatch) newState.refreshToken = refreshTokenMatch[1].trim();
                if (expiresAtMatch) newState.expiresAt = parseInt(expiresAtMatch[1].trim(), 10);

                // Only update if something actually changed
                if (newState.accessToken !== this.state.accessToken ||
                    newState.refreshToken !== this.state.refreshToken) {
                    this.state = newState;
                    console.log('[Auth] Tokens reloaded from .env');
                }
            }
        } catch (error) {
            console.error('[Auth] Error loading tokens from .env:', error);
        }
    }

    /**
     * Get valid access token, refreshing if needed
     */
    async getAccessToken(): Promise<string> {
        // Check if token is expired or about to expire (5 min buffer)
        const now = Math.floor(Date.now() / 1000);
        const bufferSeconds = 300; // 5 minutes

        if (this.state.expiresAt > 0 && now >= this.state.expiresAt - bufferSeconds) {
            console.log('[Auth] Token expired or expiring soon, refreshing...');
            await this.refreshTokens();
        }

        return this.state.accessToken;
    }

    /**
     * Get the refresh token
     */
    getRefreshToken(): string {
        return this.state.refreshToken;
    }

    /**
     * Check if tokens are configured
     */
    isConfigured(): boolean {
        return Boolean(this.state.accessToken && this.supabaseAnonKey);
    }

    /**
     * Refresh the access token using the refresh token
     */
    async refreshTokens(): Promise<void> {
        // Prevent concurrent refresh calls
        if (this.refreshPromise) {
            return this.refreshPromise;
        }

        this.refreshPromise = this._doRefresh();

        try {
            await this.refreshPromise;
        } finally {
            this.refreshPromise = null;
        }
    }

    private async _doRefresh(): Promise<void> {
        if (!this.state.refreshToken) {
            console.warn('[Auth] No refresh token available, cannot refresh');
            return;
        }

        try {
            const endpoint = `${this.supabaseUrl}/auth/v1/token?grant_type=refresh_token`;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': this.supabaseAnonKey,
                },
                body: JSON.stringify({
                    refresh_token: this.state.refreshToken,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();

                // If token already used, try to reload from disk - maybe another process (like the agent or shell script) updated it
                if (errorText.includes('refresh_token_already_used')) {
                    console.warn('[Auth] Refresh token already used. Attempting to reload from .env before retrying...');
                    this.loadTokensFromEnv();
                }

                throw new Error(`Token refresh failed (${response.status}): ${errorText}`);
            }

            const data = await response.json() as any;

            // Update state with new tokens
            this.state = {
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
                expiresAt: data.expires_at || (Math.floor(Date.now() / 1000) + (data.expires_in || 3600)),
            };

            console.log('[Auth] Token refreshed successfully, new expiry:', new Date(this.state.expiresAt * 1000).toISOString());

            // Persist to .env file so tokens survive restarts
            await this.persistTokensToEnv();
        } catch (error) {
            console.error('[Auth] Token refresh failed:', error);
            throw error;
        }
    }

    /**
     * Persist current tokens to .env file
     */
    private async persistTokensToEnv(): Promise<void> {
        try {
            const envContent = fs.readFileSync(envPath, 'utf-8');

            // Update USER_TOKEN
            let newEnvContent = envContent.replace(
                /USER_TOKEN=.*/,
                `USER_TOKEN=${this.state.accessToken}`
            );

            // Update REFRESH_TOKEN
            newEnvContent = newEnvContent.replace(
                /REFRESH_TOKEN=.*/,
                `REFRESH_TOKEN=${this.state.refreshToken}`
            );

            // Update TOKEN_EXPIRES_AT
            newEnvContent = newEnvContent.replace(
                /TOKEN_EXPIRES_AT=.*/,
                `TOKEN_EXPIRES_AT=${this.state.expiresAt}`
            );

            fs.writeFileSync(envPath, newEnvContent);
            console.log('[Auth] Tokens persisted to .env file');
        } catch (error) {
            console.warn('[Auth] Failed to persist tokens to .env:', error);
            // Non-fatal - tokens still work in memory
        }
    }

    /**
     * Force refresh tokens
     */
    async forceRefresh(): Promise<{ accessToken: string; refreshToken: string; expiresAt: number }> {
        await this.refreshTokens();
        return {
            accessToken: this.state.accessToken,
            refreshToken: this.state.refreshToken,
            expiresAt: this.state.expiresAt,
        };
    }

    /**
     * Get current token info for debugging
     */
    getTokenInfo(): { hasAccessToken: boolean; hasRefreshToken: boolean; expiresAt: number; isExpired: boolean } {
        const now = Math.floor(Date.now() / 1000);
        return {
            hasAccessToken: Boolean(this.state.accessToken),
            hasRefreshToken: Boolean(this.state.refreshToken),
            expiresAt: this.state.expiresAt,
            isExpired: this.state.expiresAt > 0 && now >= this.state.expiresAt,
        };
    }

    /**
     * Inject tokens directly (for manual recovery)
     */
    async injectTokens(tokens: {
        accessToken: string;
        refreshToken: string;
        providerToken?: string;
        expiresAt: number;
    }): Promise<void> {
        console.log('[Auth] Injecting new tokens...');

        this.state = {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: tokens.expiresAt,
        };

        // Also update PROVIDER_TOKEN in .env if provided
        if (tokens.providerToken) {
            try {
                const envContent = fs.readFileSync(envPath, 'utf-8');
                let newEnvContent = envContent.replace(
                    /PROVIDER_TOKEN=.*/,
                    `PROVIDER_TOKEN=${tokens.providerToken}`
                );
                fs.writeFileSync(envPath, newEnvContent);
            } catch (error) {
                console.warn('[Auth] Failed to update PROVIDER_TOKEN:', error);
            }
        }

        // Persist to .env
        await this.persistTokensToEnv();

        console.log('[Auth] Tokens injected successfully, new expiry:', new Date(this.state.expiresAt * 1000).toISOString());
    }
}

// Singleton instance
export const authService = new AuthService();
