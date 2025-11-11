#!/bin/bash
# Fix all TypeScript "unknown" type errors

# real-integrations.ts
sed -i 's/const data = await response\.json();/const data = await response.json() as any;/g' src/worker/lib/real-integrations.ts
sed -i 's/const tokenData = await tokenResponse\.json();/const tokenData = await tokenResponse.json() as any;/g' src/worker/lib/real-integrations.ts

# ai-gateway.ts
sed -i 's/const data = await res\.json();/const data = await res.json() as any;/g' src/worker/lib/ai-gateway.ts

# settings.ts
sed -i 's/const ghData = await ghRes\.json();/const ghData = await ghRes.json() as any;/g' src/worker/routes/settings.ts
sed -i 's/const slackData = await slackRes\.json();/const slackData = await slackRes.json() as any;/g' src/worker/routes/settings.ts

# orchestrator.ts
sed -i 's/const memory = await memoryResponse\.json();/const memory = await memoryResponse.json() as any;/g' src/worker/agents/orchestrator.ts

# rag-system.ts  
sed -i '177s/match\.metadata/match.metadata!/g' src/worker/lib/rag-system.ts
sed -i '179s/match\.metadata/match.metadata!/g' src/worker/lib/rag-system.ts

echo "Type fixes applied"
