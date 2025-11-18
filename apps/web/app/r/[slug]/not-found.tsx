import Link from 'next/link';

export default function ResumeNotFound() {
  return (
    <article className="resume-shell">
      <h1>Resume not found</h1>
      <p>The requested resume is unavailable. Double-check the slug or update the seed data.</p>
      <p>
        <Link href="/r/main">Go back to /r/main</Link>
      </p>
    </article>
  );
}
