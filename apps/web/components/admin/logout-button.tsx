'use client';

import { SignOutButton } from '@clerk/nextjs';

export default function LogoutButton() {
  return (
    <SignOutButton redirectUrl="/login">
      <button className="admin-button-secondary">Logout</button>
    </SignOutButton>
  );
}

