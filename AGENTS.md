Create modularly to keep the codebase maintainable and scalable.

Do not use emojis in this project.

Always write short, clear comments that explain purpose and behavior in layman terms when comments are needed.

Treat the database as the source of truth for lifecycle, counters, payments, balances, and other state-sensitive flows.

Keep UI, server actions, and database rules aligned so one scenario does not behave differently from another in production.

Prefer SQL migrations for database contract changes and keep db/schema.ts updated manually whenever schema-related code changes are introduced.

When database changes are made, provide the SQL migration file for manual execution.

For mobile post grids and thumbnails, keep the surface minimal: hide caption text and action buttons on small screens, and reveal full interaction details on the single post page.

For mobile media badges, prefer icon-only treatment when space is constrained.

After meaningful code changes, verify with diagnostics and run a production build when the change touches integrated app behavior.
