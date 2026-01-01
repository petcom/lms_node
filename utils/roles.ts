import { UserRole } from '../types/auth';

/**
 * Role Constants
 * Centralized definition of all system roles
 * Use these constants throughout the application for consistency
 */
export const ROLES: Record<'GLOBAL_ADMIN' | 'STAFF' | 'LEARNER', UserRole> = {
  GLOBAL_ADMIN: 'global-admin',
  STAFF: 'staff',
  LEARNER: 'learner',
} as const;

/**
 * Role hierarchy (higher number = more permissions)
 * Used for hierarchical access control
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  learner: 1,
  staff: 2,
  'global-admin': 3,
};

/**
 * Permission type
 */
export type Permission =
  | 'manage_users'
  | 'manage_staff'
  | 'manage_learners'
  | 'manage_academic_years'
  | 'manage_academic_terms'
  | 'manage_programs'
  | 'manage_subjects'
  | 'manage_class_levels'
  | 'manage_year_groups'
  | 'view_all_exams'
  | 'publish_results'
  | 'suspend_users'
  | 'withdraw_users'
  | 'create_exams'
  | 'update_own_exams'
  | 'delete_own_exams'
  | 'create_questions'
  | 'update_own_questions'
  | 'view_assigned_learners'
  | 'grade_exams'
  | 'take_exams'
  | 'view_own_results'
  | 'view_own_profile'
  | 'update_own_profile';

/**
 * Role permissions mapping
 * Defines what actions each role can perform
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  'global-admin': [
    'manage_users',
    'manage_staff',
    'manage_learners',
    'manage_academic_years',
    'manage_academic_terms',
    'manage_programs',
    'manage_subjects',
    'manage_class_levels',
    'manage_year_groups',
    'view_all_exams',
    'publish_results',
    'suspend_users',
    'withdraw_users',
  ],
  staff: [
    'create_exams',
    'update_own_exams',
    'delete_own_exams',
    'create_questions',
    'update_own_questions',
    'view_assigned_learners',
    'grade_exams',
    'view_own_profile',
    'update_own_profile',
  ],
  learner: ['take_exams', 'view_own_results', 'view_own_profile', 'update_own_profile'],
};

/**
 * Check if a role has a specific permission
 * @param role - The role to check
 * @param permission - The permission to check for
 * @returns True if role has permission
 */
export const hasPermission = (role: UserRole, permission: Permission): boolean => {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
};

/**
 * Check if a role has higher or equal hierarchy than another role
 * @param role - The role to check
 * @param targetRole - The role to compare against
 * @returns True if role has higher or equal hierarchy
 */
export const hasHigherOrEqualRole = (role: UserRole, targetRole: UserRole): boolean => {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[targetRole];
};

/**
 * Get all valid role values
 * @returns Array of valid roles
 */
export const getAllRoles = (): UserRole[] => {
  return Object.values(ROLES);
};

/**
 * Validate if a string is a valid role
 * @param role - The role to validate
 * @returns True if valid role
 */
export const isValidRole = (role: string): role is UserRole => {
  return getAllRoles().includes(role as UserRole);
};
