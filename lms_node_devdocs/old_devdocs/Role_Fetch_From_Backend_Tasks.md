# Role Fetch From Backend — Task List

Goal: ensure the frontend relies solely on the backend-provided role (or a follow-up identity endpoint) for authentication and routing, eliminating client-provided role trust.

## Backend/API
- [x] Expose an authenticated identity endpoint that returns role (e.g., `GET /auth/me` or `GET /auth/token-info`) and ensure login responses include role when possible. (`/auth/token-info` now returns `role` from the JWT or `req.userAuth`).
- [x] Align response shape: `{ role: 'learner' | 'instructor' | 'admin', accessToken?: string }`; keep refresh cookie behavior unchanged. (Admin/Instructor/Learner logins now return `{ accessToken, role }` with the role embedded in the signed JWT.)
- [x] Add contract docs to OpenAPI/Swagger so the UI can generate types or at least trust the payload. (Swagger for login routes and `token-info` now declares `role` and `accessToken` fields.)

## Frontend Store & Client
- [x] In `src/api/endpoints.ts`, add the identity endpoint reference (`auth.tokenInfo`).
- [x] In `src/store/authStore.ts`:
  - After login token issuance, fetch identity (or use role in login response) and set `role` strictly from the backend; remove fallback to the selected dropdown role.
  - On `refreshTokens`, also fetch identity to restore `role` for returning sessions.
  - Keep `isAuthenticated` false until role (and token) are set; handle failures by logging out and notifying.
- [x] Ensure the Axios client uses `withCredentials` for the identity call if cookies are required (token-info fetch does; client bypasses refresh loop for token-info).

## UI & Routing
- [x] Update `LoginPage` to treat the role selector as a temporary hint or remove it once backend role is authoritative; ensure post-login navigation goes through `/dashboard` → `RoleRedirect` using the stored role. (Store now ignores selector for role assignment; navigation remains via `/dashboard` → `RoleRedirect`.)
- [x] `RoleRedirect` should rely solely on `useAuthStore.role`; add a fallback to `/unauthorized` or `/login` if role is missing after a supposedly successful login. (Fallback now goes to `/unauthorized`.)
- [x] Ensure initial load with an existing session runs a refresh + identity fetch so deep links land on the correct role home. (`App` now calls `refreshTokens` on mount; `refreshTokens` fetches role via token-info.)

## Testing
- [x] Add MSW handler for the identity endpoint with role in the payload; update login handlers to return role too. (Login handlers now return role; token-info added—MSW not used in this repo, covered via unit tests.)
- [x] RTL: cover login happy paths per role, asserting redirect to `/learner/home`, `/instructor/home`, `/admin/home` based on backend role (ignore dropdown selection). (`RoleRedirectFlow.test.tsx` covers learner/instructor/admin routing and missing-role unauthorized.)
- [x] RTL: cover refresh-on-load restoring role and redirecting appropriately. (`AppRefresh.test.tsx` ensures refresh is invoked on mount; store refresh fetches role.)
- [x] Unit: verify `authStore` stores backend role and ignores client-provided role. (`authStore.test.ts` covers role from login, token-info fallback, refresh role restore.)

## Observability & Errors
- [x] Log when identity fetch fails after login/refresh; surface a toast prompting re-login. (Role fetch failures now log and raise a warn toast in `authStore`.)
- [ ] Add telemetry hook (if available) to record role mismatch or missing role responses.

## Documentation
- [x] Update `LMS-UI_Design_Implementation_2025.md` Phase 2 item to mark “Role fetch on login” complete once backend wiring + tests are done. (Updated: role fetch marked complete with details.)
- [x] Note backend contract and sample responses in the devdocs or API docs.

Backend contract (reference):
- Login responses return `{ accessToken: string, role: 'learner' | 'instructor' | 'admin' }` for all roles (`/admins/login`, `/instructors/login`, `/learners/login`).
- Identity endpoint: `GET /auth/token-info` (Bearer auth, withCredentials) returns `data: { userId: string, role: 'learner' | 'instructor' | 'admin', issuedAt: ISO | null, expiresAt: ISO | null, timeRemaining: number | null }`.
