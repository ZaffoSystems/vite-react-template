// src/worker/credentials.ts
import { Hono } from "hono";
import { Env } from "../types";

const credentialsRouter = new Hono<{ Bindings: Env }>();

credentialsRouter.post("/api/credentials", async (c) => {
  const { label, value } = await c.req.json<{ label: string; value: string }>();
  if (!label || !value) {
    return c.json({ error: "Label and value required" }, 400);
  }
  // Store securely in KV
  await c.env.CREDENTIALS_KV.put(label, value);
  return c.json({ success: true });
});

export default credentialsRouter;
