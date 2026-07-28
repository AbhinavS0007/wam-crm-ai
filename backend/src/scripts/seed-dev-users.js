/**
 * Dev-only helper: seeds one user per assignable role (admin, manager, staff) so each role can
 * be signed into immediately and compared side by side.
 *
 * Passwords are well-known development values and `mustChangePassword` is false, so these
 * accounts log straight in. That is exactly why this must never touch production.
 *
 * Usage: node src/scripts/seed-dev-users.js [organizationSlug]
 */
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { ACCOUNT_ACCESS_MODES } from '../constants/account-access-modes.js';
import { ROLES } from '../constants/roles.js';
import { findOrganizationBySlug } from '../modules/organizations/organization.repository.js';
import { createOrganizationUser } from '../modules/users/user-management.service.js';
import {
  findUserByEmailInOrganization,
  listUsersByOrganization,
} from '../modules/users/user.repository.js';

const slug = process.argv[2] ?? process.env.SEED_ORGANIZATION_SLUG ?? 'vistaar-media';

const DEV_PASSWORD = 'DevPassword123!';

const DEV_USERS = [
  { name: 'Dev Admin', email: 'admin.dev@example.com', role: ROLES.ADMIN },
  { name: 'Dev Manager', email: 'manager.dev@example.com', role: ROLES.MANAGER },
  { name: 'Dev Staff', email: 'staff.dev@example.com', role: ROLES.STAFF },
];

const assertNotProduction = () => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed development users while NODE_ENV=production.');
  }
};

/**
 * The user-management service refuses to act on the super admin and on the actor themselves,
 * so seed as an existing admin/super-admin of the organization.
 */
const resolveActor = async (organizationId) => {
  const users = await listUsersByOrganization({ organizationId, limit: 100, skip: 0 });

  const actor =
    users.find((user) => user.role === ROLES.SUPER_ADMIN) ??
    users.find((user) => user.role === ROLES.ADMIN);

  if (!actor) {
    throw new Error('No super admin or admin found. Run "npm run seed:super-admin" first.');
  }

  return actor;
};

const run = async () => {
  assertNotProduction();

  await connectDatabase();

  const organization = await findOrganizationBySlug(slug);

  if (!organization) {
    throw new Error(`Organization "${slug}" was not found.`);
  }

  const actor = await resolveActor(organization._id);

  const results = [];

  for (const devUser of DEV_USERS) {
    const existing = await findUserByEmailInOrganization({
      organizationId: organization._id,
      email: devUser.email,
    });

    if (existing) {
      results.push({ ...devUser, password: '(unchanged)', status: 'already exists' });
      continue;
    }

    await createOrganizationUser({
      organizationId: organization._id,
      actor,
      userData: {
        name: devUser.name,
        email: devUser.email,
        password: DEV_PASSWORD,
        role: devUser.role,
        permissionOverrides: { allow: [], deny: [] },
        accountAccessMode: ACCOUNT_ACCESS_MODES.ALL,
        accountAccess: [],
        // Dev logins should not be interrupted by the forced-change screen.
        mustChangePassword: false,
      },
      requestContext: { requestId: null, ipAddress: null, userAgent: 'seed-dev-users' },
    });

    results.push({ ...devUser, password: DEV_PASSWORD, status: 'created' });
  }

  console.log(`Dev users for organization "${slug}" (sign in with slug "${slug}"):`);
  console.table(results);
};

run()
  .catch((error) => {
    console.error('Dev user seed failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
