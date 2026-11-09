# Multi-tenant setup

## Roles and account boundaries

- `master_admin` is a PredictAI platform operator. It has no `account_id`, can list and create customer accounts, and can use the account selector to operate within one account or inspect all accounts.
- `admin` and `user` always belong to one account. Their account scope comes from their authenticated user record; a client-supplied `X-Account-ID` cannot grant access to another account.
- The migration assigns the existing installation's users, equipment, service orders, and thermographic images to the initial `TESTE` account.

## Deployment steps

1. Apply SQL migrations `001` through `013` to the configured PostgreSQL database. This project currently keeps migrations as SQL files; the migration runner is an operational step.
2. From `backend`, activate the virtual environment and run `python -m scripts.create_master_admin`. The command prompts for the PredictAI master user's name, email, and password. It refuses to create another master when one already exists.
3. Start the API and frontend, then sign in as the master. Use **Contas** to create a customer account and its first account administrator in one transaction.
4. The master can select a specific account in the top bar. With **Todas as contas** selected, lists and dashboards aggregate across accounts; creating a user, equipment, or service order requires selecting one account.

## API scope

The frontend sends `X-Account-ID` for a selected master account. The API validates that account is active. For a tenant user, the API derives scope from the authenticated user and rejects a mismatched header. Repository queries enforce that scope for users, equipment, service orders/checklists, thermographic images, and dashboard summaries. Thermal alarms email administrators assigned to the equipment's own account.
