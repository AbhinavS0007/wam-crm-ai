export const ROLES = Object.freeze({
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  STAFF: 'staff',
});

export const ROLE_VALUES = Object.freeze(Object.values(ROLES));

export const isKnownRole = (role) => ROLE_VALUES.includes(role);
