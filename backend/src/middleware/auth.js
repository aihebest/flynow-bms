/**
 * auth.js — Validates Microsoft Entra ID (Azure AD) JWT tokens.
 *
 * Staff authenticate via MSAL in the frontend. The acquired access token
 * is sent as  Authorization: Bearer <token>  on every API request.
 * This middleware validates the token against Entra ID's public JWKS endpoint.
 */
const jwt    = require('jsonwebtoken');
const jwksRsa = require('jwks-rsa');
const logger  = require('../config/logger');

const TENANT_ID = process.env.AZURE_TENANT_ID;
const AUDIENCE  = process.env.JWT_AUDIENCE; // api://your-backend-app-client-id

// JWKS client — caches signing keys from Entra ID
const jwksClient = jwksRsa({
  jwksUri: `https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys`,
  cache: true,
  cacheMaxAge: 600000, // 10 minutes
  rateLimit: true,
});

function getSigningKey(header, callback) {
  jwksClient.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key.getPublicKey());
  });
}

/**
 * Middleware: authenticate — validates the Entra ID bearer token.
 * Attaches decoded token payload to req.user on success.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No authorization token provided' });
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(
    token,
    getSigningKey,
    {
      audience: AUDIENCE,
      issuer: [
        `https://login.microsoftonline.com/${TENANT_ID}/v2.0`,
        `https://sts.windows.net/${TENANT_ID}/`,
      ],
      algorithms: ['RS256'],
    },
    (err, decoded) => {
      if (err) {
        // Decode without verification so we can log the actual audience & issuer
        const raw = jwt.decode(token, { complete: true });
        logger.warn('Token validation failed', {
          jwtError:    err.name,
          jwtMessage:  err.message,
          tokenAud:    raw?.payload?.aud,
          tokenIss:    raw?.payload?.iss,
          tokenScp:    raw?.payload?.scp,
          expectedAud: AUDIENCE,
        });
        return res.status(401).json({ error: 'Invalid or expired token', detail: err.message });
      }

      // Attach user info extracted from the token
      req.user = {
        oid:   decoded.oid,            // Entra ID object ID (stable unique identifier)
        email: decoded.preferred_username || decoded.upn || decoded.email,
        name:  decoded.name,
        roles: decoded.roles || [],    // App roles assigned in Entra ID
      };

      next();
    }
  );
}

module.exports = { authenticate };
