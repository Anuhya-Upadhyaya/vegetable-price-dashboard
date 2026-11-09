# FreshFlow customer information and notifications patch

This patch adds:
- One customer/business profile per approved portal user (editable by that user).
- Optional browser geolocation capture; address entry remains available without location permission.
- Admin customer-profile listing in the existing Admin Dashboard.
- Persistent in-app notifications with unread counts and read actions for users and admins.
- Admin in-app notifications when a customer profile is submitted/updated and when a price-correction request is submitted.
- User in-app notification when an admin approves/rejects a price-correction request.
- Optional SMTP email alert to the configured admin email for customer profile submissions/updates.

## Apply
Copy the folders/files in this patch into the matching locations in your existing project, allowing the listed source files to be replaced. Keep a backup of your current files first.

## Database migration
From the backend environment, run:
`alembic upgrade head`

The migration follows the existing revision `d2e6a8b14c90` and creates `customer_profiles` and `notifications`.

## Optional email setup
Use `backend/.env.example` as a reference. Add the SMTP variables to your private `backend/.env`:
- SMTP_HOST
- SMTP_PORT
- SMTP_USERNAME
- SMTP_PASSWORD
- SMTP_FROM_EMAIL
- SMTP_USE_TLS
- ADMIN_NOTIFICATION_EMAIL

Do not commit or share `backend/.env`. Email delivery is supplementary; the profile and in-app notification are saved even when SMTP is unavailable.

## Important
- This is a source patch, not a full project replacement.
- No `.env`, Git history, node_modules, build output, or virtual environment is included.
- Python source files passed `compileall`.
- A frontend production build could not be run in this environment because npm dependency installation timed out and Vite was not available. Run `npm ci` then `npm run build` in your project environment before testing.
