'use client';

import { SignOutButton } from '@clerk/nextjs';
import Icon from '@/components/ui/icon';

export default function LogoutButton() {
  return (
    <SignOutButton redirectUrl="/login">
      <button className="btn btn-ghost btn-sm" type="button">
        <Icon name="logout" size={14} /> Logout
      </button>
    </SignOutButton>
  );
}

