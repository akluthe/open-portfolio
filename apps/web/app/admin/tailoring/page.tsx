import { notFound } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { isAdmin } from '@/lib/admin-auth';
import { listProfiles } from '@/lib/profile-api';
import TailoringCreateForm from '@/components/admin/tailoring-create-form';
import LogoutButton from '@/components/admin/logout-button';

export default async function AdminTailoringListPage() {
  const user = await currentUser();

  if (!user) {
    notFound();
  }

  const isAuthorized = await isAdmin();

  if (!isAuthorized) {
    return (
      <div className="admin-page">
        <div className="admin-error">
          <h1>Access Denied</h1>
          <p>Your GitHub account ({user.username}) is not authorized to access the admin panel.</p>
          <p>Please contact the administrator to request access.</p>
        </div>
      </div>
    );
  }

  const profiles = await listProfiles();

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>Tailorings</h1>
          <p className="admin-user-info">
            Named overlays on a master resume — each gets its own public view and PDF.
          </p>
        </div>
        <div className="admin-header-actions">
          <LogoutButton />
        </div>
      </div>

      <section className="admin-section">
        <h2>Existing</h2>
        {profiles.length === 0 ? (
          <p className="admin-user-info">No tailorings yet. Create one below.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {profiles.map((profile) => (
              <li key={profile.slug} className="admin-entry">
                <div className="admin-entry-header">
                  <div>
                    <strong>{profile.name}</strong>
                    <p className="admin-user-info">
                      <code>{profile.slug}</code> · based on <code>{profile.baseSlug}</code>
                    </p>
                  </div>
                  <div className="admin-header-actions">
                    <a href={`/t/${profile.slug}`} className="admin-link">
                      View →
                    </a>
                    <a href={`/admin/tailoring/${profile.slug}`} className="admin-link">
                      Edit →
                    </a>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <TailoringCreateForm />
    </div>
  );
}
