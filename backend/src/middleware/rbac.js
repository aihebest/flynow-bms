/**
 * rbac.js — Role-Based Access Control middleware.
 *
 * Roles are defined as App Roles in Microsoft Entra ID and come in
 * the decoded JWT as req.user.roles[].
 *
 * Role hierarchy (highest → lowest):
 *   BMS.Admin     → Managing Director / System Admin (full access)
 *   BMS.Manager   → Branch Manager (all modules + approvals)
 *   BMS.Finance   → Finance Officer
 *   BMS.HR        → HR / Admin
 *   BMS.Visa      → Visa Processing Officer
 *   BMS.Sales     → Sales & Reservations Officer
 */

const ROLES = {
  ADMIN:   'BMS.Admin',
  MANAGER: 'BMS.Manager',
  FINANCE: 'BMS.Finance',
  HR:      'BMS.HR',
  VISA:    'BMS.Visa',
  SALES:   'BMS.Sales',
};

// Role inheritance — higher roles include all lower permissions
const ROLE_HIERARCHY = {
  [ROLES.ADMIN]:   [ROLES.ADMIN, ROLES.MANAGER, ROLES.FINANCE, ROLES.HR, ROLES.VISA, ROLES.SALES],
  [ROLES.MANAGER]: [ROLES.MANAGER, ROLES.FINANCE, ROLES.HR, ROLES.VISA, ROLES.SALES],
  [ROLES.FINANCE]: [ROLES.FINANCE],
  [ROLES.HR]:      [ROLES.HR],
  [ROLES.VISA]:    [ROLES.VISA, ROLES.SALES],
  [ROLES.SALES]:   [ROLES.SALES],
};

/**
 * Returns true if the user holds at least one of the required roles
 * (accounting for role hierarchy).
 */
function userHasRole(userRoles, requiredRoles) {
  const expanded = userRoles.flatMap((r) => ROLE_HIERARCHY[r] || [r]);
  return requiredRoles.some((req) => expanded.includes(req));
}

/**
 * Middleware factory: requireRole(...roles)
 *
 * Usage:
 *   router.get('/invoices', authenticate, requireRole(ROLES.FINANCE, ROLES.ADMIN), handler)
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!userHasRole(req.user.roles, roles)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: roles,
        held: req.user.roles,
      });
    }
    next();
  };
}

module.exports = { requireRole, ROLES };
