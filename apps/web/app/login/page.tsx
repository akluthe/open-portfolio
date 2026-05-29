import { SignIn } from '@clerk/nextjs';

// A sign-in page is inherently dynamic — don't prerender it at build (which would
// require a valid Clerk publishable key just to compile).
export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <div className="login-page">
      <div className="login-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <SignIn 
          routing="path"
          path="/login"
          signUpUrl="/sign-up"
          afterSignInUrl="/admin/main"
        />
      </div>
    </div>
  );
}

