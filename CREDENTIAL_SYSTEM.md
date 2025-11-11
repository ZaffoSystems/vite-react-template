# Credential Management System

## Overview

The Ultra Multi-Agent MCP System now includes a comprehensive credential management system that allows users to upload, store, and manage API keys and secrets through the UI. Credentials are securely stored in Cloudflare KV and can be dynamically distributed to agents by the MetaAgent (Master Control Agent).

## Features

### ✅ Implemented

1. **UI-Based Credential Upload**
   - Secure form for uploading credentials with label and value
   - Password-masked input for secret values
   - Real-time status feedback

2. **Credential Storage**
   - Secure storage in Cloudflare `CREDENTIALS_KV` namespace
   - Separate storage for credential values and metadata
   - Values never exposed in API responses (except internal agent access)

3. **Credential Listing**
   - View all stored credentials (labels only, not values)
   - See creation dates and usage information
   - Track which agents use which credentials

4. **CRUD Operations**
   - `POST /api/credentials` - Upload new credential
   - `GET /api/credentials` - List all credentials (metadata only)
   - `GET /api/credentials/:label` - Retrieve specific credential (for agents)
   - `DELETE /api/credentials/:label` - Delete credential
   - `POST /api/credentials/:label/usage` - Track usage by agent

5. **Agent Integration**
   - `CredentialManager` utility class for agents
   - Methods to retrieve credentials by label
   - Automatic credential-to-MCP-server mapping
   - Usage tracking when agents access credentials

6. **Frontend Integration**
   - Tabbed interface (Agents / Credentials)
   - Credential upload form
   - Credential list with delete functionality
   - Integrated into main App.tsx

## Architecture

### Storage Structure

Credentials are stored in KV with two types of entries:

```
cred:{label}  → actual credential value (string)
meta:{label}  → metadata (JSON)
```

**Metadata Structure:**
```typescript
{
  label: string,
  createdAt: string,
  updatedAt: string,
  usedBy: string[]  // Array of agent IDs
}
```

### File Structure

```
src/
├── worker/
│   └── credentials.ts           # API routes for credential CRUD
├── react-app/
│   ├── App.tsx                  # Main UI with tabs and credential listing
│   └── CredentialManager.tsx    # Upload form component
├── lib/
│   └── CredentialManager.ts     # Utility for agents to access credentials
├── types.ts                     # Type definitions
└── index.ts                     # Main router (mounts credential routes)
```

## Usage

### For Users

1. **Upload a Credential:**
   - Navigate to the "Credentials" tab
   - Enter a label (e.g., `E2B_API_KEY`, `GITHUB_TOKEN`)
   - Enter the secret value
   - Click "Save Credential"

2. **View Credentials:**
   - See all stored credentials in the table
   - View creation dates and usage counts
   - Delete credentials as needed

3. **Create Agents with Credentials:**
   - Create agents via natural language
   - MetaAgent automatically retrieves necessary credentials
   - Credentials are injected into agents that need them

### For Agents (Programmatic)

```typescript
import { CredentialManager } from '../lib/CredentialManager';

// In your agent's Durable Object
const credManager = new CredentialManager(this.env);

// Get a single credential
const apiKey = await credManager.getCredential('E2B_API_KEY');

// Get multiple credentials
const creds = await credManager.getCredentials(['GITHUB_TOKEN', 'E2B_API_KEY']);

// Get credentials for an MCP server
const e2bCreds = await credManager.getCredentialsForMCPServer('e2b');

// Track usage
await credManager.trackUsage('E2B_API_KEY', this.agentId);

// Check if all required credentials exist
const { allPresent, missing } = await credManager.checkRequiredCredentials(['e2b', 'firecrawl']);
```

## Credential-to-MCP-Server Mapping

The system automatically maps MCP servers to their required credentials:

| MCP Server | Required Credentials |
|-----------|---------------------|
| `e2b`, `e2b-sandbox` | `E2B_API_KEY` |
| `firecrawl` | `FIRECRAWL_API_KEY` |
| `brave-search` | `BRAVE_API_KEY` |
| `github` | `GITHUB_TOKEN` |
| `docker` | `DOCKER_HOST` |
| `ssh` | `SSH_HOST`, `SSH_USER` |

## API Endpoints

### Upload Credential
```bash
POST /api/credentials
Content-Type: application/json

{
  "label": "E2B_API_KEY",
  "value": "your-secret-key-here"
}
```

### List All Credentials (Metadata Only)
```bash
GET /api/credentials

Response:
{
  "credentials": [
    {
      "label": "E2B_API_KEY",
      "createdAt": "2025-11-11T14:00:00Z",
      "updatedAt": "2025-11-11T14:00:00Z",
      "usedBy": ["agent-123", "agent-456"]
    }
  ]
}
```

### Get Specific Credential (Internal Use)
```bash
GET /api/credentials/E2B_API_KEY

Response:
{
  "label": "E2B_API_KEY",
  "value": "your-secret-key-here"
}
```

### Delete Credential
```bash
DELETE /api/credentials/E2B_API_KEY

Response:
{
  "success": true,
  "label": "E2B_API_KEY"
}
```

### Track Usage
```bash
POST /api/credentials/E2B_API_KEY/usage
Content-Type: application/json

{
  "agentId": "agent-123"
}
```

## Setup Instructions

### 1. Create KV Namespace

```bash
# Create production namespace
wrangler kv:namespace create CREDENTIALS_KV

# Create preview namespace for development
wrangler kv:namespace create CREDENTIALS_KV --preview
```

### 2. Update wrangler.toml

Replace placeholder IDs in `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "CREDENTIALS_KV"
id = "<ID_FROM_STEP_1>"
preview_id = "<PREVIEW_ID_FROM_STEP_1>"
```

### 3. Deploy

```bash
npm run build
npm run deploy
```

### 4. Upload Credentials

- Visit your deployed application
- Navigate to the "Credentials" tab
- Upload your API keys and secrets

## Security Considerations

### ✅ Current Security Measures

1. **No Value Exposure:** Credential values are never returned in list endpoints
2. **Password Input:** UI uses password-type inputs to hide secrets during entry
3. **Separate Storage:** Values and metadata stored separately
4. **Usage Tracking:** System tracks which agents access which credentials

### 🔒 Recommended Enhancements

1. **Authentication:** Add user authentication to credential upload/delete endpoints
2. **Encryption:** Encrypt credential values at rest using Web Crypto API
3. **Access Control:** Implement RBAC to restrict which agents can access which credentials
4. **Audit Logging:** Log all credential access to D1 audit_logs table
5. **Rotation:** Implement credential rotation and expiration
6. **Rate Limiting:** Add rate limiting to prevent abuse

## MetaAgent Integration

The MetaAgent (Master Control Agent) can now:

1. **Retrieve credentials when creating agents**
   ```typescript
   const credManager = new CredentialManager(this.env);
   const agentCredentials = await credManager.getCredentialsForMCPServer('e2b');
   ```

2. **Inject credentials into agent configurations**
   ```typescript
   const agentConfig = {
     ...baseConfig,
     credentials: agentCredentials
   };
   ```

3. **Check for missing credentials before agent creation**
   ```typescript
   const { allPresent, missing } = await credManager.checkRequiredCredentials(
     agent.mcpServers
   );
   if (!allPresent) {
     return { error: `Missing credentials: ${missing.join(', ')}` };
   }
   ```

4. **Track credential usage**
   ```typescript
   await credManager.trackUsage('E2B_API_KEY', agentId);
   ```

## Future Enhancements

- [ ] Credential templates for common MCP servers
- [ ] Bulk credential upload (JSON import)
- [ ] Credential sharing between agents
- [ ] Credential validation before storage
- [ ] Webhook notifications on credential access
- [ ] Credential health checks (test if keys still work)
- [ ] Version history for credential updates
- [ ] Emergency credential revocation

## Troubleshooting

### Credentials not appearing
- Ensure CREDENTIALS_KV namespace is created and bound in wrangler.toml
- Check browser console for API errors
- Verify deployment was successful

### Agents can't access credentials
- Ensure CredentialManager is imported in agent files
- Check that credential labels match exactly
- Verify KV binding is available in Durable Object context

### Delete not working
- Check that DELETE endpoint is not blocked by CORS
- Verify user has proper permissions (when auth is added)

## Related Files

- `wrangler.toml` - CREDENTIALS_KV binding configuration
- `src/types.ts` - Credential type definitions
- `src/worker/credentials.ts` - API implementation
- `src/lib/CredentialManager.ts` - Agent utility
- `src/react-app/CredentialManager.tsx` - Upload UI
- `src/react-app/App.tsx` - Main UI integration
- `src/index.ts` - Router configuration

## Support

For issues or questions about the credential system:
- Check the troubleshooting section above
- Review the implementation status in IMPLEMENTATION_STATUS.md
- Open an issue on GitHub
