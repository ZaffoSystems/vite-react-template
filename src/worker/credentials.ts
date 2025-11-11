// src/worker/credentials.ts
import { Hono } from "hono";
import { Env, CredentialMetadata } from "../types";

const credentialsRouter = new Hono<{ Bindings: Env }>();

// Upload/create a new credential
credentialsRouter.post("/api/credentials", async (c) => {
  const { label, value } = await c.req.json<{ label: string; value: string }>();
  
  if (!label || !value) {
    return c.json({ error: "Label and value required" }, 400);
  }
  
  // Store credential value securely in KV
  await c.env.CREDENTIALS_KV.put(`cred:${label}`, value);
  
  // Store metadata separately (without the actual value)
  const metadata: CredentialMetadata = {
    label,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    usedBy: []
  };
  await c.env.CREDENTIALS_KV.put(`meta:${label}`, JSON.stringify(metadata));
  
  return c.json({ success: true, label });
});

// List all credentials (metadata only, no values)
credentialsRouter.get("/api/credentials", async (c) => {
  const list = await c.env.CREDENTIALS_KV.list({ prefix: "meta:" });
  const credentials: CredentialMetadata[] = [];
  
  for (const key of list.keys) {
    const metadataStr = await c.env.CREDENTIALS_KV.get(key.name);
    if (metadataStr) {
      credentials.push(JSON.parse(metadataStr));
    }
  }
  
  return c.json({ credentials });
});

// Get a specific credential value (for internal agent use only)
credentialsRouter.get("/api/credentials/:label", async (c) => {
  const label = c.req.param("label");
  const value = await c.env.CREDENTIALS_KV.get(`cred:${label}`);
  
  if (!value) {
    return c.json({ error: "Credential not found" }, 404);
  }
  
  // TODO: Add authentication/authorization check here
  // Only allow MetaAgent and authorized agents to retrieve values
  
  return c.json({ label, value });
});

// Delete a credential
credentialsRouter.delete("/api/credentials/:label", async (c) => {
  const label = c.req.param("label");
  
  // TODO: Add authentication/authorization check
  
  await c.env.CREDENTIALS_KV.delete(`cred:${label}`);
  await c.env.CREDENTIALS_KV.delete(`meta:${label}`);
  
  return c.json({ success: true, label });
});

// Update credential usage tracking
credentialsRouter.post("/api/credentials/:label/usage", async (c) => {
  const label = c.req.param("label");
  const { agentId } = await c.req.json<{ agentId: string }>();
  
  const metadataStr = await c.env.CREDENTIALS_KV.get(`meta:${label}`);
  if (!metadataStr) {
    return c.json({ error: "Credential not found" }, 404);
  }
  
  const metadata: CredentialMetadata = JSON.parse(metadataStr);
  if (!metadata.usedBy.includes(agentId)) {
    metadata.usedBy.push(agentId);
    metadata.updatedAt = new Date().toISOString();
    await c.env.CREDENTIALS_KV.put(`meta:${label}`, JSON.stringify(metadata));
  }
  
  return c.json({ success: true });
});

export default credentialsRouter;
