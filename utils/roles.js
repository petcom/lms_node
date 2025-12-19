/**
 * Role Constants
 * Centralized definition of all system roles
 * Use these constants throughout the application for consistency
 */

const ROLES = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student'
};

/**
 * Role hierarchy (higher number = more permissions)
 * Used for hierarchical access control
 */
const ROLE_HIERARCHY = {
  [ROLES.STUDENT]: 1,
  [ROLES.TEACHER]: 2,
  [ROLES.ADMIN]: 3
};

/**
 * Role permissions mapping
 * Defines what actions each role can perform
 */
const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    'manage_users',
    'manage_staff',
    'manage_students',
    'manage_academic_years',
    'manage_academic_terms',
    'manage_programs',
    'manage_subjects',
    'manage_class_levels',
    'manage_year_groups',
    'view_all_exams',
    'publish_results',
    'suspend_users',
    'withdraw_users'
  ],
  [ROLES.TEACHER]: [
    'create_exams',
    'update_own_exams',
    'delete_own_exams',
    'create_questions',
    'update_own_questions',
    'view_assigned_students',
    'grade_exams',
    'view_own_profile',
    'update_own_profile'
  ],
  [ROLES.STUDENT]: [
    'take_exams',
    'view_own_results',
    'view_own_profile',
    'update_own_profile'
  ]
};

/**
 * Check if a role has a specific permission
 * @param {string} role - The role to check
 * @param {string} permission - The permission to check for
 * @returns {boolean} - True if role has permission
 */
const hasPermission = (role, permission) => {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
};

/**
 * Check if a role has higher or equal hierarchy than another role
 * @param {string} role - The role to check
 * @param {string} targetRole - The role to compare against
 * @returns {boolean} - True if role has higher or equal hierarchy
 */
const hasHigherOrEqualRole = (role, targetRole) => {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[targetRole];
};

/**
 * Get all valid role values
 * @returns {string[]} - Array of valid roles
 */
const getAllRoles = () => {
  return Object.values(ROLES);
};

/**
 * Validate if a string is a valid role
 * @param {string} role - The role to validate
 * @returns {boolean} - True if valid role
 */
const isValidRole = (role) => {
  return getAllRoles().includes(role);
};

module.exports = {
  ROLES,
  ROLE_HIERARCHY,
  ROLE_PERMISSIONS,
  hasPermission,
  hasHigherOrEqualRole,
  getAllRoles,
  isValidRole
};
