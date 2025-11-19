import { currentUser } from '@clerk/nextjs/server';

/**
 * Check if the current user is authorized as an admin.
 * If ALLOWED_ADMIN_GITHUB_USERNAMES is not set or empty, all authenticated users are considered admins.
 * @returns true if the user is an admin, false otherwise
 */
export async function isAdmin(): Promise<boolean> {
  const user = await currentUser();
  
  if (!user) {
    return false;
  }

  // Check if user is authorized (GitHub username must be in allowed list)
  // If ALLOWED_ADMIN_GITHUB_USERNAMES is not set or empty, allow all authenticated users
  const allowedAdminsStr = process.env.ALLOWED_ADMIN_GITHUB_USERNAMES || '';
  const allowedAdmins = allowedAdminsStr
    .split(',')
    .map(u => u.trim())
    .filter(u => u.length > 0); // Filter out empty strings
  
  return allowedAdmins.length === 0 || allowedAdmins.includes(user.username || '');
}

