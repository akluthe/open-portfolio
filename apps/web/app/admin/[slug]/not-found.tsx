export default function AdminNotFound() {
  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Admin Not Found</h1>
      </div>
      <p>The admin editing feature is not available.</p>
      <a href="/r/main" className="admin-link">
        View Public Resume →
      </a>
    </div>
  );
}

