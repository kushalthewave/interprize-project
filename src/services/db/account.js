/**
 * account.js
 * Deleting an account and everything attached to it.
 *
 * Two places hold a trainee's data once there is a results service: this
 * browser, and the database. "Delete my data" has to mean both, and it has to
 * be honest when it can only manage one of them - a button that quietly
 * leaves the rounds on a server is worse than no button.
 *
 * What the database allows, by policy:
 *   - a trainee may delete their own rows in sessions and profiles
 *   - nobody, not even an admin, may edit a stored round
 *
 * Deleting the profile row cascades to that account's sessions, so one call
 * removes the lot. The sign-in record in auth.users can only be removed with
 * a service key, which never exists in a browser, so the account is reported
 * as "data deleted, sign-in still exists" rather than pretending otherwise.
 */
import { db } from './client.js';

/**
 * @param {object} [o]
 * @param {object} [o.client]
 * @returns {Promise<{server: 'deleted'|'skipped'|'failed', message: string}>}
 */
export async function deleteServerData({ client = db } = {}) {
  if (!client.configured) {
    return { server: 'skipped', message: 'Everything on this computer has been deleted.' };
  }
  if (!client.signedIn) {
    return {
      server: 'skipped',
      message: 'Everything on this computer has been deleted. Nothing was signed in, so there was nothing to remove from your account.',
    };
  }

  try {
    await client.deleteMyData();
    await client.signOut();
    return {
      server: 'deleted',
      message: 'Your account and every round you played have been deleted, here and from your training record.',
    };
  } catch {
    return {
      server: 'failed',
      message: 'Deleted from this computer. Your rounds are still on the training record: we could not reach it just now, so try again when you are back online.',
    };
  }
}
