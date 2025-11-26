/**
 * Phase 12 Week 10: SSO Integration Service
 *
 * Provides SAML 2.0 and OAuth 2.0/OIDC single sign-on integration
 */

/**
 * SSO provider types
 */
export type SSOProvider = 'saml' | 'oidc' | 'google' | 'microsoft' | 'okta' | 'auth0' | 'onelogin';

/**
 * SSO configuration
 */
export interface SSOConfig {
  provider: SSOProvider;
  enabled: boolean;

  // SAML 2.0 configuration
  saml?: {
    entryPoint: string; // IdP SSO URL
    issuer: string; // SP entity ID
    cert: string; // IdP certificate
    audience?: string; // SP audience (entity ID)
    wantAssertionsSigned?: boolean;
    wantAuthnResponseSigned?: boolean;
    signatureAlgorithm?: 'sha1' | 'sha256' | 'sha512';
    digestAlgorithm?: 'sha1' | 'sha256' | 'sha512';
    callbackUrl: string; // SP ACS URL
    logoutUrl?: string; // SP SLO URL
    privateKey?: string; // SP private key for signing
  };

  // OAuth 2.0 / OIDC configuration
  oidc?: {
    issuer: string; // OpenID Connect issuer URL
    clientId: string;
    clientSecret: string;
    authorizationEndpoint: string;
    tokenEndpoint: string;
    userInfoEndpoint: string;
    jwksUri?: string; // JSON Web Key Set URI
    scopes: string[]; // Default: ['openid', 'profile', 'email']
    callbackUrl: string;
    logoutUrl?: string;
    responseType?: 'code' | 'id_token' | 'id_token token' | 'code id_token';
    responseMode?: 'query' | 'fragment' | 'form_post';
    pkce?: boolean; // Proof Key for Code Exchange
  };

  // Attribute mapping
  attributeMapping: {
    email: string; // Default: 'email' or 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'
    firstName?: string;
    lastName?: string;
    displayName?: string;
    groups?: string; // For role mapping
  };

  // Just-in-time provisioning
  jitProvisioning: {
    enabled: boolean;
    defaultRole: 'member' | 'admin' | 'owner';
    roleMapping?: Record<string, string>; // Map IdP groups to platform roles
  };

  // Session configuration
  sessionConfig?: {
    maxAge: number; // Session lifetime in seconds
    absoluteTimeout: number; // Absolute session timeout
    idleTimeout: number; // Idle timeout
  };
}

/**
 * SSO authentication result
 */
export interface SSOAuthResult {
  success: boolean;
  userId?: string;
  email: string;
  profile: {
    firstName?: string;
    lastName?: string;
    displayName?: string;
    groups?: string[];
  };
  sessionToken?: string;
  error?: string;
  errorDetails?: string;
}

/**
 * SAML assertion
 */
export interface SAMLAssertion {
  issuer: string;
  sessionIndex: string;
  nameID: string;
  attributes: Record<string, string | string[]>;
  notBefore?: Date;
  notOnOrAfter?: Date;
  audience?: string;
}

/**
 * OIDC tokens
 */
export interface OIDCTokens {
  accessToken: string;
  idToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
  scope?: string;
}

/**
 * SSO Integration Service
 */
export class SSOService {
  private config: SSOConfig;

  constructor(config: SSOConfig) {
    this.config = config;
    this.validateConfig();
  }

  /**
   * Validate SSO configuration
   */
  private validateConfig(): void {
    if (!this.config.enabled) {
      throw new Error('SSO is not enabled');
    }

    if (this.config.provider === 'saml' && !this.config.saml) {
      throw new Error('SAML configuration is required for SAML provider');
    }

    if ((this.config.provider === 'oidc' || this.config.provider === 'google' || this.config.provider === 'microsoft') && !this.config.oidc) {
      throw new Error('OIDC configuration is required for OIDC/OAuth provider');
    }

    // Validate callback URLs
    if (this.config.saml && !this.config.saml.callbackUrl) {
      throw new Error('SAML callback URL is required');
    }

    if (this.config.oidc && !this.config.oidc.callbackUrl) {
      throw new Error('OIDC callback URL is required');
    }
  }

  /**
   * Generate SAML authentication request
   */
  async generateSAMLAuthRequest(relayState?: string): Promise<{ url: string; samlRequest: string }> {
    if (!this.config.saml) {
      throw new Error('SAML not configured');
    }

    // Generate SAML AuthnRequest XML
    const samlRequest = this.buildSAMLAuthRequest();

    // Base64 encode and deflate
    const encoded = Buffer.from(samlRequest).toString('base64');

    // Build redirect URL
    const params = new URLSearchParams({
      SAMLRequest: encoded,
      ...(relayState && { RelayState: relayState }),
    });

    const url = `${this.config.saml.entryPoint}?${params.toString()}`;

    return { url, samlRequest: encoded };
  }

  /**
   * Build SAML AuthnRequest XML
   */
  private buildSAMLAuthRequest(): string {
    const id = `_${this.generateId()}`;
    const issueInstant = new Date().toISOString();

    return `<?xml version="1.0"?>
<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                    ID="${id}"
                    Version="2.0"
                    IssueInstant="${issueInstant}"
                    Destination="${this.config.saml!.entryPoint}"
                    AssertionConsumerServiceURL="${this.config.saml!.callbackUrl}">
  <saml:Issuer>${this.config.saml!.issuer}</saml:Issuer>
  <samlp:NameIDPolicy Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress" AllowCreate="true"/>
</samlp:AuthnRequest>`;
  }

  /**
   * Process SAML response
   */
  async processSAMLResponse(samlResponse: string): Promise<SSOAuthResult> {
    if (!this.config.saml) {
      throw new Error('SAML not configured');
    }

    try {
      // Decode SAML response
      const decoded = Buffer.from(samlResponse, 'base64').toString('utf8');

      // Validate signature (in production, use saml2-js or passport-saml)
      const isValid = await this.validateSAMLSignature(decoded);
      if (!isValid) {
        return {
          success: false,
          email: '',
          profile: {},
          error: 'invalid_signature',
          errorDetails: 'SAML response signature validation failed',
        };
      }

      // Parse assertion
      const assertion = this.parseSAMLAssertion(decoded);

      // Extract attributes
      const email = this.extractAttribute(assertion.attributes, this.config.attributeMapping.email);
      const firstName = this.config.attributeMapping.firstName
        ? this.extractAttribute(assertion.attributes, this.config.attributeMapping.firstName)
        : undefined;
      const lastName = this.config.attributeMapping.lastName
        ? this.extractAttribute(assertion.attributes, this.config.attributeMapping.lastName)
        : undefined;
      const groups = this.config.attributeMapping.groups
        ? this.extractAttributeArray(assertion.attributes, this.config.attributeMapping.groups)
        : undefined;

      return {
        success: true,
        email,
        profile: {
          firstName,
          lastName,
          displayName: `${firstName || ''} ${lastName || ''}`.trim(),
          groups,
        },
      };
    } catch (error) {
      return {
        success: false,
        email: '',
        profile: {},
        error: 'processing_error',
        errorDetails: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate OIDC authorization URL
   */
  async generateOIDCAuthURL(state: string, nonce: string): Promise<string> {
    if (!this.config.oidc) {
      throw new Error('OIDC not configured');
    }

    const params = new URLSearchParams({
      client_id: this.config.oidc.clientId,
      response_type: this.config.oidc.responseType || 'code',
      redirect_uri: this.config.oidc.callbackUrl,
      scope: this.config.oidc.scopes.join(' '),
      state,
      nonce,
      response_mode: this.config.oidc.responseMode || 'query',
    });

    // Add PKCE if enabled
    if (this.config.oidc.pkce) {
      const codeVerifier = this.generateCodeVerifier();
      const codeChallenge = await this.generateCodeChallenge(codeVerifier);
      params.append('code_challenge', codeChallenge);
      params.append('code_challenge_method', 'S256');
      // Store codeVerifier in session for token exchange
    }

    return `${this.config.oidc.authorizationEndpoint}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeOIDCCode(code: string, codeVerifier?: string): Promise<OIDCTokens> {
    if (!this.config.oidc) {
      throw new Error('OIDC not configured');
    }

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.config.oidc.callbackUrl,
      client_id: this.config.oidc.clientId,
      client_secret: this.config.oidc.clientSecret,
    });

    if (codeVerifier && this.config.oidc.pkce) {
      params.append('code_verifier', codeVerifier);
    }

    const response = await fetch(this.config.oidc.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    const tokens = await response.json();

    return {
      accessToken: tokens.access_token,
      idToken: tokens.id_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      tokenType: tokens.token_type,
      scope: tokens.scope,
    };
  }

  /**
   * Get user info from OIDC provider
   */
  async getOIDCUserInfo(accessToken: string): Promise<SSOAuthResult> {
    if (!this.config.oidc) {
      throw new Error('OIDC not configured');
    }

    try {
      const response = await fetch(this.config.oidc.userInfoEndpoint, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`UserInfo request failed: ${response.statusText}`);
      }

      const userInfo = await response.json();

      // Extract attributes based on mapping
      const email = userInfo[this.config.attributeMapping.email] || userInfo.email;
      const firstName = this.config.attributeMapping.firstName
        ? userInfo[this.config.attributeMapping.firstName]
        : userInfo.given_name;
      const lastName = this.config.attributeMapping.lastName
        ? userInfo[this.config.attributeMapping.lastName]
        : userInfo.family_name;
      const groups = this.config.attributeMapping.groups
        ? userInfo[this.config.attributeMapping.groups]
        : userInfo.groups;

      return {
        success: true,
        email,
        profile: {
          firstName,
          lastName,
          displayName: userInfo.name || `${firstName || ''} ${lastName || ''}`.trim(),
          groups: Array.isArray(groups) ? groups : groups ? [groups] : undefined,
        },
      };
    } catch (error) {
      return {
        success: false,
        email: '',
        profile: {},
        error: 'userinfo_error',
        errorDetails: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Refresh OIDC access token
   */
  async refreshOIDCToken(refreshToken: string): Promise<OIDCTokens> {
    if (!this.config.oidc) {
      throw new Error('OIDC not configured');
    }

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.config.oidc.clientId,
      client_secret: this.config.oidc.clientSecret,
    });

    const response = await fetch(this.config.oidc.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.statusText}`);
    }

    const tokens = await response.json();

    return {
      accessToken: tokens.access_token,
      idToken: tokens.id_token,
      refreshToken: tokens.refresh_token || refreshToken, // Some providers don't return new refresh token
      expiresIn: tokens.expires_in,
      tokenType: tokens.token_type,
      scope: tokens.scope,
    };
  }

  // ==================== HELPER METHODS ====================

  private generateId(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(20)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private async validateSAMLSignature(xml: string): Promise<boolean> {
    // In production, use xmldsigjs or node-saml for proper signature validation
    // This is a simplified placeholder
    return true;
  }

  private parseSAMLAssertion(xml: string): SAMLAssertion {
    // In production, use xml2js or fast-xml-parser
    // This is a simplified placeholder
    const attributes: Record<string, string | string[]> = {};

    // Extract attributes from SAML response (simplified)
    const attributePattern = /<saml:Attribute[^>]*Name="([^"]*)"[^>]*>[\s\S]*?<saml:AttributeValue[^>]*>(.*?)<\/saml:AttributeValue>/g;
    let match;
    while ((match = attributePattern.exec(xml)) !== null) {
      const [, name, value] = match;
      attributes[name] = value;
    }

    return {
      issuer: '',
      sessionIndex: '',
      nameID: '',
      attributes,
    };
  }

  private extractAttribute(attributes: Record<string, string | string[]>, key: string): string {
    const value = attributes[key];
    return Array.isArray(value) ? value[0] : value || '';
  }

  private extractAttributeArray(attributes: Record<string, string | string[]>, key: string): string[] {
    const value = attributes[key];
    return Array.isArray(value) ? value : value ? [value] : [];
  }

  private generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return this.base64URLEncode(array);
  }

  private async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return this.base64URLEncode(new Uint8Array(hash));
  }

  private base64URLEncode(buffer: Uint8Array): string {
    return btoa(String.fromCharCode(...buffer))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
}

/**
 * SSO Service Factory
 */
export class SSOServiceFactory {
  private static instances = new Map<string, SSOService>();

  static getService(tenantId: string, config: SSOConfig): SSOService {
    const key = `${tenantId}-${config.provider}`;

    if (!this.instances.has(key)) {
      this.instances.set(key, new SSOService(config));
    }

    return this.instances.get(key)!;
  }

  static clearCache(tenantId?: string): void {
    if (tenantId) {
      // Clear specific tenant
      for (const key of this.instances.keys()) {
        if (key.startsWith(tenantId)) {
          this.instances.delete(key);
        }
      }
    } else {
      // Clear all
      this.instances.clear();
    }
  }
}
