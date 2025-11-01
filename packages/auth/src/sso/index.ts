/**
 * Enterprise SSO Integration (Phase 12 Week 11-12)
 *
 * Exports:
 * - SAMLClient: SAML 2.0 authentication
 * - OAuth2Client: OAuth 2.0 / OIDC authentication
 * - Provider presets: Okta, Azure AD, Google Workspace
 */

// SAML 2.0
export {
  SAMLClient,
  createOktaSAMLConfig,
  createAzureADSAMLConfig,
  type SAMLConfig,
  type SAMLProfile,
  type SAMLAuthRequest,
  type SAMLAuthResponse,
} from './saml';

// OAuth 2.0 / OIDC
export {
  OAuth2Client,
  createOktaOAuth2Config,
  createAzureADOAuth2Config,
  createGoogleOAuth2Config,
  type OAuth2Config,
  type OAuth2Profile,
  type OAuth2Tokens,
  type PKCEChallenge,
} from './oauth2';
