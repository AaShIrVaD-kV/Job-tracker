# Microsoft OneDrive setup for AI Job Tracker

This project uses delegated Microsoft OAuth and the Microsoft Graph API to keep the workbook in OneDrive as the cloud source of truth.

## 1. Create the Microsoft Entra app registration

1. Sign in to the Microsoft Entra admin center.
2. Go to App registrations.
3. Select New registration.
4. Give the app a name such as `AI Job Tracker`.
5. Choose the supported account type that matches your use case:
   - Personal Microsoft account: select `Accounts in any organizational directory (Any Microsoft Entra ID tenant - Multitenant) and personal Microsoft accounts` if needed, or `Personal Microsoft accounts only` when appropriate.
   - Work or school account: select the relevant organization-only or multi-tenant option.
6. Save the registration.

## 2. Configure redirect URI

In the app registration, add a redirect URI for the backend callback endpoint.

Use the deployed backend URL:

https://ai-job-tracker-backend-sddu.onrender.com/auth/microsoft/callback

If the Render URL changes, use the actual deployed URL instead.

## 3. Add Microsoft Graph delegated permissions

In the app registration, under API permissions, add the delegated permissions required by this implementation:

- Files.ReadWrite
- User.Read
- openid
- profile
- offline_access

Only request the permissions actually required by the app. For a personal OneDrive scenario, delegated user authentication is required. Do not use app-only client credentials for a user-owned OneDrive file.

## 4. Collect the values for Render

From the app registration, copy:

- Client ID
- Tenant ID
- Client secret

The app registration also shows the tenant ID value you should set in `MICROSOFT_TENANT_ID`.

If the configuration is for a personal Microsoft account or multi-account environment, use `common` when appropriate.

## 5. Enter the values in Render

In the Render service environment variables, add the following:

- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `MICROSOFT_TENANT_ID`
- `MICROSOFT_REDIRECT_URI=https://ai-job-tracker-backend-sddu.onrender.com/auth/microsoft/callback`
- `MICROSOFT_SCOPES=Files.ReadWrite,User.Read,offline_access,openid,profile`
- `FRONTEND_URL=https://your-vercel-app.vercel.app`
- `APP_URL=https://ai-job-tracker-backend-sddu.onrender.com`
- `EXCEL_FILE_NAME=AI_Job_Tracker.xlsx`
- `EXCEL_FOLDER_PATH=` (leave blank for OneDrive root)
- `EXCEL_SHARE_PERMISSION=view`

Do not commit actual secrets into the repository.

## 6. Account type notes

- Personal OneDrive: use delegated user authentication and the correct Microsoft account type during app registration.
- Work or school OneDrive: the app can use the Microsoft Entra tenant associated with the organization.
- If a sharing policy blocks anonymous links, the backend will report that restriction instead of pretending the link was generated.

## 7. Verification

After the env vars are set, test the login flow:

1. Open the frontend.
2. Click Connect OneDrive.
3. Sign in with your Microsoft account.
4. Grant the requested permissions.
5. Check the backend `/auth/microsoft/status` endpoint and confirm it reports connected.

The app should then find or create `AI_Job_Tracker.xlsx` in the configured OneDrive location and keep it as the source of truth.
