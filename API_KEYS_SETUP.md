# API Keys Setup Guide

This guide explains how to obtain and configure API keys for the extended MCP server capabilities.

## Required for Full Functionality

### 1. E2B (Code Execution) 📦

**Purpose**: Secure code execution in sandboxed environments

**Setup**:
1. Visit https://e2b.dev
2. Sign up for a free account (includes free tier)
3. Navigate to Dashboard → API Keys
4. Create a new API key
5. Set in Cloudflare:
   ```bash
   wrangler secret put E2B_API_KEY
   ```

**Free Tier**: 100 hours/month of sandbox usage

---

### 2. Firecrawl (Web Scraping) 🕷️

**Purpose**: Advanced web scraping and content extraction

**Setup**:
1. Visit https://firecrawl.dev
2. Create an account
3. Get your API key from the dashboard
4. Set in Cloudflare:
   ```bash
   wrangler secret put FIRECRAWL_API_KEY
   ```

**Free Tier**: 500 credits/month

---

### 3. Brave Search (Web Search) 🔍

**Purpose**: Privacy-focused web search

**Setup**:
1. Visit https://brave.com/search/api/
2. Sign up for Brave Search API
3. Get your API key
4. Set in Cloudflare:
   ```bash
   wrangler secret put BRAVE_API_KEY
   ```

**Free Tier**: 2,000 queries/month

---

## Cloudflare Services (No Additional Setup)

All 15 Cloudflare MCP servers work automatically with your Wrangler authentication:

✅ Documentation  
✅ Workers Bindings  
✅ Workers Builds  
✅ Observability  
✅ Radar  
✅ Container  
✅ Browser Rendering  
✅ Logpush  
✅ AI Gateway  
✅ AI Search  
✅ Audit Logs  
✅ DNS Analytics  
✅ DEX  
✅ CASB  
✅ GraphQL  

---

## Setting Secrets

### Production (Remote)

```bash
# Set each secret (you'll be prompted to enter the value)
wrangler secret put E2B_API_KEY
wrangler secret put FIRECRAWL_API_KEY
wrangler secret put BRAVE_API_KEY

# Verify secrets are set
wrangler secret list
```

### Local Development

Create a `.dev.vars` file in your project root:

```env
# .dev.vars (DO NOT COMMIT TO GIT)
E2B_API_KEY=your-e2b-key-here
FIRECRAWL_API_KEY=your-firecrawl-key-here
BRAVE_API_KEY=your-brave-key-here
```

Add to `.gitignore`:
```
.dev.vars
```

---

## Optional Services

These MCP servers work without API keys but with limited functionality:

### Context7
- **No API key needed**
- Provides up-to-date documentation
- Works out of the box

### Sequential Thinking
- **No API key needed**
- Provides structured problem-solving
- Built-in capability

### Filesystem
- **No API key needed**
- File system operations
- Sandboxed in Workers environment

---

## Testing Your Setup

After setting up API keys, test each service:

```bash
# Start dev server
npm run dev

# Test E2B
curl -X POST http://localhost:8787/api/test/e2b \
  -H "Content-Type: application/json" \
  -d '{"code": "print('Hello from E2B!')'"}'

# Test Firecrawl
curl -X POST http://localhost:8787/api/test/firecrawl \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'

# Test Brave Search
curl -X POST http://localhost:8787/api/test/brave \
  -H "Content-Type: application/json" \
  -d '{"query": "cloudflare workers"}'
```

---

## Troubleshooting

### "API key not found" error

1. Verify secrets are set:
   ```bash
   wrangler secret list
   ```

2. For local dev, check `.dev.vars` exists and has correct keys

3. Restart dev server after setting secrets

### Rate limiting

If you hit rate limits:
- **E2B**: Upgrade plan or wait for reset
- **Firecrawl**: Credits reset monthly
- **Brave Search**: 2,000 queries/month on free tier

### Secret not updating

If you need to update a secret:
```bash
# Delete old secret
wrangler secret delete E2B_API_KEY

# Add new secret
wrangler secret put E2B_API_KEY
```

---

## Security Best Practices

✅ **Never commit API keys** to version control  
✅ **Use Wrangler secrets** for production  
✅ **Use `.dev.vars`** for local development  
✅ **Rotate keys regularly** for security  
✅ **Monitor usage** in each service's dashboard  
✅ **Set up billing alerts** to avoid surprise charges  

---

## Cost Estimates

With free tiers:
- **E2B**: $0/month (100 hours free)
- **Firecrawl**: $0/month (500 credits free)
- **Brave Search**: $0/month (2,000 queries free)
- **Cloudflare Workers**: ~$5/month (Workers Paid plan for D1, Vectorize)

**Total**: ~$5/month for full functionality

Paid plans available if you exceed free tiers.
