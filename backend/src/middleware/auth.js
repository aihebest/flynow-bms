/**
 * auth.js — Validates Microsoft Entra ID (Azure AD) JWT tokens.
 *
 * Staff authenticate via MSAL in the frontend. The acquired access token
 * is sent as  Authorization: Bearer <token>  on every API request.
 * This middleware validates the token against Entra ID's public JWKS endpoint,
 * then looks up the staff record in the DB to get their role and internal ID.
 *
 * Role source: the staff table (not Entra ID App Roles). This means
 * any authenticated @flynowtravels.com user with a staff record can log in
 * without requiring Azure App Role assignments per user.
 */
const jwt    = require('jsonwebtoken');
const jwksRsa = require('jwks-rsa');
const logger  = require('../config/logger');
const { query } = require('../config/database');

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
 * Middleware: authenticate — validates the Entra ID bearer token,
 * then enriches req.user with role and dbId from the staff table.
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
    async (err, decoded) => {
      if (err) {
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

      try {
        // Look up staff record by Entra OID — this is the source of truth for role
        const staffRes = await query(
          'SELECT id, role, is_active FROM staff WHERE entra_oid = $1',
          [decoded.oid]
        );

        if (!staffRes.rows.length) {
          logger.warn('Authenticated user has no staff record', { oid: decoded.oid, email: decoded.preferred_username });
          return res.status(403).json({
            error: 'Your account is not set up in the BMS yet. Please contact your administrator.',
          });
        }

        const staff = staffRes.rows[0];

        if (!staff.is_active) {
          return res.status(403).json({ error: 'Your account has been deactivated. Please contact your administrator.' });
        }

        // Attach user info — roles come from DB, not JWT claims
        req.user = {
          oid:   decoded.oid,
          email: decoded.preferred_username || decoded.upn || decoded.email,
          name:  decoded.name,
          roles: [staff.role],   // e.g. ['BMS.Sales'], ['BMS.Admin']
          dbId:  staff.id,       // internal UUID used by controllers for created_by / audit
        };

        next();
      } catch (dbErr) {
        logger.error('DB lookup failed in authenticate middleware', { error: dbErr.message });
        next(dbErr);
      }
    }
  );
}

module.exports = { authenticate };
