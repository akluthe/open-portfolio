import { SignIn } from '@clerk/nextjs';

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

