import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define which routes should be protected (require authentication)
const isProtectedRoute = createRouteMatcher(['/admin(.*)']);

// Clerk middleware must run on all routes to set up auth context
// This allows currentUser() and auth() to work in server components
export default clerkMiddleware(async (auth, req) => {
  // Protect admin routes - require authentication
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
  // For other routes, middleware still runs to set up auth context
  // but doesn't require authentication
});

export const config = {
  // Match all routes except Next.js internals and static files
  // This ensures Clerk middleware runs on all pages and API routes
  matcher: [
    // Skip Next.js internals, static files, and image optimization
    '/((?!_next/static|_next/image|favicon.ico).*)',
    // Include API routes
    '/(api|trpc)(.*)',
  ],
};

