/** Page names used in feature files, mapped to app routes. */
export const ROUTES = Object.freeze({
  Login: '/login',
  Signup: '/signup',
  'My Claims': '/claims',
  'Submit Claim': '/claims/new',
  'Admin Dashboard': '/admin/dashboard',
  'Admin Claims': '/admin/claims',
  'Admin Users': '/admin/users',
});

export function routeFor(pageName) {
  const route = ROUTES[pageName];
  if (!route) {
    throw new Error(`Unknown page "${pageName}". Add it to utils/routes.js. Known: ${Object.keys(ROUTES).join(', ')}`);
  }
  return route;
}
