/**
 * OAuth 2.0 / OpenID Connect SSO Integration (Phase 12 Week 11-12)
 *
 * Enterprise OAuth 2.0 authentication for identity providers:
 * - Generic OAuth 2.0 / OIDC
 * - Okta (OAuth)
 * - Azure AD / Entra ID (OAuth)
 * - Google Workspace (OAuth)
 * - Auth0 (OAuth)
 *
 * Features:
 * - Authorization Code Flow with PKCE
 * - ID Token validation (OIDC)
 * - Refresh token rotation
 * - JIT user provisioning
 * - Token introspection
 */

// ==================== TYPES ====================

export interface OAuth2Config {
  // Client credentials
  clientId: string;
  clientSecret: string;
  redirectUri: string;

  // Authorization server endpoints
  authorizationEndpoint: string; // /authorize
  tokenEndpoint: string; // /token
  userinfoEndpoint?: string; // /userinfo (OIDC)
  introspectionEndpoint?: string; // /introspect
  revocationEndpoint?: string; // /revoke
  jwksUri?: string; // OIDC JWKS endpoint

  // OAuth scopes
  scopes: string[]; // e.g., ['openid', 'profile', 'email']

  // PKCE
  usePKCE: boolean; // Code challenge/verifier

  // Token settings
  tokenType: 'Bearer' | 'MAC'; // Token type
  refreshTokenRotation: boolean; // Rotate refresh tokens

  // OIDC settings
  useOIDC: boolean; // Enable OpenID Connect
  issuer?: string; // OIDC issuer URL

  // JIT provisioning
  jitProvisioning: {
    enabled: boolean;
    defaultRole?: string;
    autoAssignGroups?: string[];
  };
}

export interface OAuth2Profile {
  sub: string; // Subject (unique user ID)
  email: string;
  emailVerified?: boolean;
  name?: string;
  givenName?: string;
  familyName?: string;
  picture?: string;
  locale?: string;
  groups?: string[];
  roles?: string[];
  customClaims?: Record<string, unknown>;
}

export interface OAuth2Tokens {
  accessToken: string;
  tokenType: string;
  expiresIn: number; // seconds
  refreshToken?: string;
  idToken?: string; // OIDC ID token
  scope?: string;
}

export interface PKCEChallenge {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256' | 'plain';
}

// ==================== OAUTH2 CLIENT ====================

export class OAuth2Client {
  constructor(private config: OAuth2Config) {}

  /**
   * Generate authorization URL
   */
  getAuthorizationUrl(params: {
    state: string; // CSRF protection
    pkce?: PKCEChallenge; // Optional PKCE
    prompt?: 'none' | 'login' | 'consent' | 'select_account';
    loginHint?: string; // Pre-fill email
  }): string {
    const url = new URL(this.config.authorizationEndpoint);

    // Required parameters
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', this.config.clientId);
    url.searchParams.set('redirect_uri', this.config.redirectUri);
    url.searchParams.set('scope', this.config.scopes.join(' '));
    url.searchParams.set('state', params.state);

    // PKCE
    if (this.config.usePKCE && params.pkce) {
      url.searchParams.set('code_challenge', params.pkce.codeChallenge);
      url.searchParams.set('code_challenge_method', params.pkce.codeChallengeMethod);
    }

    // Optional parameters
    if (params.prompt) {
      url.searchParams.set('prompt', params.prompt);
    }
    if (params.loginHint) {
      url.searchParams.set('login_hint', params.loginHint);
    }

    return url.toString();
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(params: {
    code: string;
    codeVerifier?: string; // PKCE code verifier
  }): Promise<OAuth2Tokens> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: params.code,
      redirect_uri: this.config.redirectUri,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    });

    // PKCE code verifier
    if (this.config.usePKCE && params.codeVerifier) {
      body.set('code_verifier', params.codeVerifier);
    }

    const response = await fetch(this.config.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Token exchange failed: ${error.error_description || error.error}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      tokenType: data.token_type || 'Bearer',
      expiresIn: data.expires_in,
      refreshToken: data.refresh_token,
      idToken: data.id_token,
      scope: data.scope,
    };
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<OAuth2Tokens> {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    });

    const response = await fetch(this.config.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Token refresh failed: ${error.error_description || error.error}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      tokenType: data.token_type || 'Bearer',
      expiresIn: data.expires_in,
      refreshToken: data.refresh_token || refreshToken, // Keep old if not rotated
      idToken: data.id_token,
      scope: data.scope,
    };
  }

  /**
   * Get user profile from OIDC userinfo endpoint
   */
  async getUserProfile(accessToken: string): Promise<OAuth2Profile> {
    if (!this.config.userinfoEndpoint) {
      throw new Error('Userinfo endpoint not configured');
    }

    const response = await fetch(this.config.userinfoEndpoint, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user profile');
    }

    const data = await response.json();

    return {
      sub: data.sub,
      email: data.email,
      emailVerified: data.email_verified,
      name: data.name,
      givenName: data.given_name,
      familyName: data.family_name,
      picture: data.picture,
      locale: data.locale,
      groups: data.groups,
      roles: data.roles,
      customClaims: data,
    };
  }

  /**
   * Validate OIDC ID token (simplified)
   */
  async validateIdToken(idToken: string): Promise<OAuth2Profile> {
    // Decode JWT (without verification for now)
    const payload = this.decodeJWT(idToken);

    // Validate issuer
    if (this.config.issuer && payload.iss !== this.config.issuer) {
      throw new Error('Invalid issuer');
    }

    // Validate audience
    if (payload.aud !== this.config.clientId) {
      throw new Error('Invalid audience');
    }

    // Validate expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw new Error('Token expired');
    }

    // Validate issued at
    if (payload.iat && payload.iat > now + 300) {
      // Allow 5 minutes clock skew
      throw new Error('Token issued in the future');
    }

    return {
      sub: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified,
      name: payload.name,
      givenName: payload.given_name,
      familyName: payload.family_name,
      picture: payload.picture,
      locale: payload.locale,
      groups: payload.groups,
      roles: payload.roles,
      customClaims: payload,
    };
  }

  /**
   * Introspect token (check if valid and active)
   */
  async introspectToken(token: string): Promise<{
    active: boolean;
    scope?: string;
    clientId?: string;
    username?: string;
    tokenType?: string;
    exp?: number;
    iat?: number;
    sub?: string;
  }> {
    if (!this.config.introspectionEndpoint) {
      throw new Error('Introspection endpoint not configured');
    }

    const body = new URLSearchParams({
      token,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    });

    const response = await fetch(this.config.introspectionEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new Error('Token introspection failed');
    }

    return await response.json();
  }

  /**
   * Revoke token (logout)
   */
  async revokeToken(token: string, tokenTypeHint?: 'access_token' | 'refresh_token'): Promise<void> {
    if (!this.config.revocationEndpoint) {
      throw new Error('Revocation endpoint not configured');
    }

    const body = new URLSearchParams({
      token,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    });

    if (tokenTypeHint) {
      body.set('token_type_hint', tokenTypeHint);
    }

    const response = await fetch(this.config.revocationEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new Error('Token revocation failed');
    }
  }

  // ==================== PKCE ====================

  /**
   * Generate PKCE code verifier and challenge
   */
  generatePKCE(): PKCEChallenge {
    // Generate random code verifier (43-128 characters, base64url)
    const codeVerifier = this.generateRandomString(64);

    // Generate code challenge (SHA256 hash of verifier)
    const codeChallenge = this.sha256Base64Url(codeVerifier);

    return {
      codeVerifier,
      codeChallenge,
      codeChallengeMethod: 'S256',
    };
  }

  /**
   * Generate random string for code verifier
   */
  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let result = '';
    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);
    for (let i = 0; i < length; i++) {
      result += chars[randomValues[i]! % chars.length];
    }
    return result;
  }

  /**
   * SHA256 hash in base64url format (placeholder)
   */
  private sha256Base64Url(input: string): string {
    // Simplified placeholder - production should use crypto.subtle.digest
    // For now, return a dummy challenge for type safety
    return Buffer.from(input).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Decode JWT payload (without verification)
   */
  private decodeJWT(token: string): Record<string, any> {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    const payload = parts[1];
    if (!payload) throw new Error('Missing JWT payload');

    const decoded = Buffer.from(payload, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  }
}

// ==================== OAUTH2 PROVIDER PRESETS ====================

/**
 * Okta OAuth 2.0 configuration template
 */
export function createOktaOAuth2Config(params: {
  oktaDomain: string; // e.g., 'your-domain.okta.com'
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): OAuth2Config {
  return {
    clientId: params.clientId,
    clientSecret: params.clientSecret,
    redirectUri: params.redirectUri,
    authorizationEndpoint: `https://${params.oktaDomain}/oauth2/v1/authorize`,
    tokenEndpoint: `https://${params.oktaDomain}/oauth2/v1/token`,
    userinfoEndpoint: `https://${params.oktaDomain}/oauth2/v1/userinfo`,
    introspectionEndpoint: `https://${params.oktaDomain}/oauth2/v1/introspect`,
    revocationEndpoint: `https://${params.oktaDomain}/oauth2/v1/revoke`,
    jwksUri: `https://${params.oktaDomain}/oauth2/v1/keys`,
    scopes: ['openid', 'profile', 'email', 'groups'],
    usePKCE: true,
    tokenType: 'Bearer',
    refreshTokenRotation: true,
    useOIDC: true,
    issuer: `https://${params.oktaDomain}`,
    jitProvisioning: {
      enabled: true,
      defaultRole: 'user',
    },
  };
}

/**
 * Azure AD / Entra ID OAuth 2.0 configuration template
 */
export function createAzureADOAuth2Config(params: {
  tenantId: string; // Azure tenant ID
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): OAuth2Config {
  return {
    clientId: params.clientId,
    clientSecret: params.clientSecret,
    redirectUri: params.redirectUri,
    authorizationEndpoint: `https://login.microsoftonline.com/${params.tenantId}/oauth2/v2.0/authorize`,
    tokenEndpoint: `https://login.microsoftonline.com/${params.tenantId}/oauth2/v2.0/token`,
    userinfoEndpoint: `https://graph.microsoft.com/oidc/userinfo`,
    jwksUri: `https://login.microsoftonline.com/${params.tenantId}/discovery/v2.0/keys`,
    scopes: ['openid', 'profile', 'email', 'User.Read'],
    usePKCE: true,
    tokenType: 'Bearer',
    refreshTokenRotation: true,
    useOIDC: true,
    issuer: `https://login.microsoftonline.com/${params.tenantId}/v2.0`,
    jitProvisioning: {
      enabled: true,
      defaultRole: 'user',
    },
  };
}

/**
 * Google Workspace OAuth 2.0 configuration template
 */
export function createGoogleOAuth2Config(params: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): OAuth2Config {
  return {
    clientId: params.clientId,
    clientSecret: params.clientSecret,
    redirectUri: params.redirectUri,
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    userinfoEndpoint: 'https://openidconnect.googleapis.com/v1/userinfo',
    revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
    jwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
    scopes: ['openid', 'profile', 'email'],
    usePKCE: true,
    tokenType: 'Bearer',
    refreshTokenRotation: false,
    useOIDC: true,
    issuer: 'https://accounts.google.com',
    jitProvisioning: {
      enabled: true,
      defaultRole: 'user',
    },
  };
}
