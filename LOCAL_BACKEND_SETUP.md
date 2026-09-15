# Running the ItemHive Backend Locally

This guide keeps local MongoDB workarounds outside the application source so the same code can be deployed safely.

## Normal local setup

1. Open PowerShell in `D:\itemHive\backend`.
2. Install dependencies if needed:

   ```powershell
   npm install
   ```

3. Ensure `backend\.env` contains the normal Atlas SRV connection string:

   ```dotenv
   MONGODB_URI=mongodb+srv://<username>:<url-encoded-password>@<cluster-host>/<database>?retryWrites=true&w=majority
   ```

4. In MongoDB Atlas, allow the current public IP under **Network Access**.
5. Start the backend:

   ```powershell
   npm run dev
   ```

6. Confirm the API and database status:

   ```powershell
   Invoke-WebRequest -UseBasicParsing http://127.0.0.1:5050/health |
     Select-Object -ExpandProperty Content
   ```

   The response should contain `"database":"Connected"`.

The Vite frontend uses `http://localhost:5050/api` when `.env.local` contains:

```dotenv
VITE_API_URL=http://localhost:5050/api
```

## If login reports a buffering timeout

An error such as `users.findOne() buffering timed out` means the backend started without a MongoDB connection. Check the backend console and health endpoint before changing login code.

Test the Atlas SRV record and database port:

```powershell
Resolve-DnsName -Type SRV _mongodb._tcp.<cluster-host>
Test-NetConnection <resolved-shard-host> -Port 27017
```

If the SRV lookup fails with `querySrv ECONNREFUSED` but the shard port is reachable, use a temporary direct connection string only in the current PowerShell session. Do not modify `db.ts` and do not commit credentials.

```powershell
$env:MONGODB_URI = 'mongodb://<username>:<url-encoded-password>@<shard-00>:27017,<shard-01>:27017,<shard-02>:27017/<database>?tls=true&authSource=admin&retryWrites=true&w=majority'
npm run dev
```

Get the shard hostnames from the Atlas connection information or the SRV lookup result. Keep all replica members in the direct URI.

When local testing is finished, close the backend and clear the temporary variable:

```powershell
Remove-Item Env:MONGODB_URI
```

## Before deployment

- Keep the application source on the normal `mongodb+srv://` connection path.
- Configure `MONGODB_URI`, JWT secrets, and `CLIENT_URL` in the hosting provider's environment settings.
- Never commit a password, JWT secret, direct-host workaround, or production `.env` change.
- Build the backend before deployment:

  ```powershell
  npm run build
  ```

- After deployment, verify `/health` reports `database: Connected` before testing login or POS workflows.
