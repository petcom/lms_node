# LMS UI Design & Implementation Plan (2025)

**Goal:** Ship a role-aware, SCORM-capable LMS UI in React (web) with React-Native compatibility in mind. Keep components headless where possible; swap renderers for RN later.

---

## Principles
- Role-first navigation (admin/teacher/student) with shared shell.
- Single API client (Axios) with refresh, retry-once, and logout-on-loop.
- Design system up front: tokens, spacing, typography, color ramps, light/dark.
- Accessibility baked in: focus management, ARIA, contrast, keyboard nav.
- Mobile-friendly: responsive grids, card fallbacks, large tap targets; PWA-ready.
- Observability: surface backend health/metrics; log player/runtime errors.

---

## Architecture Decisions
- **Framework:** React + TypeScript; Vite build. RN-friendly patterns (headless hooks + view components).
- **State:** Lightweight store (Zustand/Context); promote to Redux only if needed for large forms/tables.
- **Forms:** React Hook Form + Zod/Yup (aligned with backend Joi schemas).
- **Data Fetch:** Axios + interceptors (access/refresh, 401 replay once, cancel tokens).
- **Routing:** React Router w/ role guards; public auth vs protected app shell.
- **UI Kit:** Choose one (MUI/Chakra/AntD) + headless table (TanStack) + Recharts/Chart.js.
- **Testing:** Vitest/Jest + RTL; Cypress/Playwright for e2e happy paths; MSW for API mocks.
- **Theming:** Token-driven; single source for colors/spacing/typography; theme switch ready.

---

## Phases with Checklists & Notes

### Phase 1 — Foundations & Shell
- [ ] Bootstrap app (Vite, TS), alias paths, absolute imports.
- [ ] Theme and design tokens; pick UI kit + charts lib.
- [ ] Global styles: typography scale, spacing, breakpoints, focus ring.
- [ ] Routing skeleton: public (login/forgot/reset) + protected shell.
- [ ] Auth store + Axios client with refresh/blacklist handling.
- [ ] Notification layer (toasts, inline errors) and error boundary.
- [ ] Accessibility baseline (landmarks, skip links, keyboard nav).
- [ ] Testing harness (unit/component) + MSW mocks.

Notes: Add `.env` mapping for API base; set up MSW to mirror auth/SCORM endpoints.

### Phase 2 — Auth & Account Flows
- [ ] Screens: Login, Forgot/Reset Password, Change Password (in-app).
- [ ] Password strength meter aligned to backend rules; inline validation.
- [ ] Session expiry UX (refresh retry once, then logout); logout-all support.
- [ ] Role fetch on login → route to proper dashboard.
- [ ] Loading/empty/error states for all auth forms.

Notes: Use backend validate-password endpoint for live feedback.

### Phase 3 — Student Experience (MVP)
- [ ] Dashboard: My Courses/SCORM packages list (filters, search, pagination).
- [ ] Cards/table: title, status, progress %, last accessed, due date.
- [ ] Actions: Launch, Resume, View Attempts.
- [ ] Attempt history drawer: score, status, duration, timestamps.
- [ ] SCORM Player shell (iframe): header, status/time, fullscreen, exit/suspend, resume.
- [ ] Progress widgets: completion %, latest score, time spent.

Notes: Preflight assignment check before launch; ensure player is touch-friendly.

### Phase 4 — Teacher Experience
- [ ] Teacher dashboard: class/section tiles with completion/pass snapshots.
- [ ] Package library: upload (drag/drop), publish/unpublish, version/status.
- [ ] Assignment flow: select package → pick students/classes → due dates → confirm.
- [ ] Attempts & grading view: per-student attempts, override/remarks (if allowed).
- [ ] Analytics: completion, score distribution, time spent (charts) + exports.

Notes: Optimistic assignment UI; surface validation warnings from backend.

### Phase 5 — Admin Experience
- [ ] User management: CRUD admins/teachers/students; suspend/withdraw.
- [ ] Academic structure: programs, subjects, class levels, terms.
- [ ] System SCORM registry: filters by status/subject/owner.
- [ ] Platform health tiles: storage, active sessions, error rates (wire to /health, /metrics).
- [ ] Permissions matrix UI for SCORM capabilities.

Notes: Add confirmation dialogs for destructive actions; include audit-friendly activity logs.

### Phase 6 — Reporting & Exports
- [ ] Reports: student progress, package analytics, attempts detail, completion rates, score distribution, time analytics, interactions.
- [ ] Filters: date range, package, student, class/program; server-side pagination.
- [ ] Export UX: CSV/JSON/XLSX with progress + error states; link to downloads.
- [ ] Deep links from charts to detail tables.

Notes: Debounce filters; persist filter state per user; skeleton-load charts.

### Phase 7 — Quality, A11y, Performance, Mobile
- [ ] Responsive sweeps: nav collapse, tables→cards, tap targets.
- [ ] A11y: ARIA labels, focus traps in modals/drawers, contrast checks.
- [ ] Performance: route-based code splitting, lazy charts, memoized lists, virtualized tables.
- [ ] PWA shell readiness (manifest/icons); abstract headless hooks to ease RN port.
- [ ] E2E critical paths: login, launch SCORM, assignment, upload, export.

Notes: Define perf budgets (bundle size, TTI); add Lighthouse/Axe checks in CI.

### Phase 8 — Delivery & Hardening
- [ ] UAT checklists per role; sign-off criteria.
- [ ] Feature flags for risky areas (player, exports).
- [ ] Front-end logging for player/runtime errors; surface backend health in UI.
- [ ] Release playbook and rollback steps.

Notes: Smoke test before deploy; ensure versioned API base URL support.

---

## Cross-Cutting Components & Reuse
- Shell: role-aware nav, breadcrumbs, user menu, notifications tray.
- Tables: headless + UI kit styling; pagination, sorting, filtering, column hiding.
- Forms: shared field components (text, select, date, file, password with meter), inline errors.
- Charts: shared wrappers with loading/empty/error states and theming.
- Modals/Drawers: standard header/body/footer, focus management, ESC/overlay close.
- Layout: responsive grid/container system with spacing tokens.

---

## Data & API Integration Map (high level)
- Auth: login/refresh/logout, password reset/change, token-info.
- Users: admin/teacher/student CRUD, profile fetch/update.
- Academics: programs, subjects, class levels, terms.
- SCORM: packages (list/detail/upload/publish/assign), content, player launch, runtime, attempts, reports/analytics, exports.
- Health/Monitoring: /health, /metrics for dashboard tiles.

---

## Testing Strategy
- Unit: utilities, hooks, renderless logic.
- Component: forms, tables, charts, player shell.
- E2E: auth flows, student launch/resume SCORM, teacher upload/assign, admin user CRUD, exports.
- Accessibility: Axe/Lighthouse checks in CI; keyboard nav smoke tests.

---

## Risks & Mitigations
- Token refresh loops → single-flight refresh, backoff, force-logout on repeat 401.
- Large SCORM payloads → visible loading/reconnect banner; preflight assignment.
- Role drift → centralize guards; add route-level tests.
- Mobile UX gaps → early responsive testing; avoid hover-only interactions.

---

## Definition of Done (per feature)
- Loading, empty, and error states implemented.
- A11y: focus order, ARIA labels, contrast, keyboard paths.
- Responsive at mobile/tablet/desktop breakpoints.
- Tests: unit + component, and e2e where critical.
- Copy centralized (for future i18n).
