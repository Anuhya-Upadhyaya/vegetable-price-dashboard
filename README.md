# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


## Price-entry correction requests (new)

The correction workflow allows a signed-in user to propose a correction to their own saved price entry. The original price and notes are stored as a snapshot in `price_correction_requests`. A request remains pending until an administrator approves or rejects it. Only an approval applies the proposed price/notes to the live price entry. The request keeps the original values, reason, decision, reviewer and timestamps for traceability.

### Apply the database migration

From PowerShell:

```powershell
cd E:\Anuhya\vegetable-price-dashboard\backend
.\.venv\Scripts\Activate.ps1
alembic current
alembic upgrade head
alembic current
```

Back up PostgreSQL before applying migrations. Confirm the migration finishes successfully before starting the app.

### Use the feature

- User portal: in “Your previous entries”, select **Request correction**, enter the proposed price and reason, and submit. The entry remains unchanged while the request is pending.
- Admin portal: open **Price corrections** from the admin sidebar. Review the original/proposed values and reason, add an optional note, then approve or reject.
- User portal: review the status and admin note in “Correction request history”.

The backend checks ownership, requires an approved authenticated account, rejects duplicate pending requests for an entry, and prevents a request from being reviewed more than once.

Note: the `.env` file is intentionally not included in this ZIP. Keep your existing local `.env` file and never commit secrets to Git.
