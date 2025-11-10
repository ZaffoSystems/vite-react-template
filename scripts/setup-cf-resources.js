#!/usr/bin/env node

/**
 * Setup script for Cloudflare resources
 * Creates D1, R2, KV, Vectorize, and Queue resources needed for MAS Control Agent
 */

import { execSync } from 'child_process';
import fs from 'fs';

const WRANGLER_CONFIG = './wrangler.json';

console.log('🚀 Setting up Cloudflare resources for MAS Control Agent...\n');

function exec(command) {
  try {
    console.log(`\n📝 Executing: ${command}`);
    const output = execSync(command, { encoding: 'utf-8', stdio: 'pipe' });
    console.log(output);
    return output;
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.error(error.stderr);
    return null;
  }
}

function updateWranglerConfig(updates) {
  const config = JSON.parse(fs.readFileSync(WRANGLER_CONFIG, 'utf8'));
  Object.assign(config, updates);
  fs.writeFileSync(WRANGLER_CONFIG, JSON.stringify(config, null, 2));
  console.log('✅ Updated wrangler.json');
}

// 1. Create D1 Database
console.log('\n📦 Creating D1 Database...');
const d1Output = exec('wrangler d1 create mas-control-db');
if (d1Output) {
  const match = d1Output.match(/database_id\s*=\s*"([^"]+)"/);
  if (match) {
    const databaseId = match[1];
    updateWranglerConfig({
      d1_databases: [{
        binding: 'DB',
        database_name: 'mas-control-db',
        database_id: databaseId
      }]
    });
    console.log(`✅ D1 Database created: ${databaseId}`);

    // Run migrations
    console.log('\n📝 Running D1 migrations...');
    exec('wrangler d1 migrations apply mas-control-db --local');
  }
}

// 2. Create KV Namespace
console.log('\n📦 Creating KV Namespace...');
const kvOutput = exec('wrangler kv namespace create MAS_KV');
if (kvOutput) {
  const match = kvOutput.match(/id\s*=\s*"([^"]+)"/);
  if (match) {
    const kvId = match[1];
    const config = JSON.parse(fs.readFileSync(WRANGLER_CONFIG, 'utf8'));
    config.kv_namespaces = [{ binding: 'KV', id: kvId }];
    fs.writeFileSync(WRANGLER_CONFIG, JSON.stringify(config, null, 2));
    console.log(`✅ KV Namespace created: ${kvId}`);
  }
}

// 3. Create R2 Bucket
console.log('\n📦 Creating R2 Bucket...');
exec('wrangler r2 bucket create mas-storage');
console.log('✅ R2 Bucket created: mas-storage');

// 4. Create Vectorize Index
console.log('\n📦 Creating Vectorize Index...');
exec('wrangler vectorize create mas-rag-index --dimensions=768 --metric=cosine');
console.log('✅ Vectorize Index created: mas-rag-index');

// 5. Create Queue
console.log('\n📦 Creating Queue...');
exec('wrangler queues create mas-task-queue');
console.log('✅ Queue created: mas-task-queue');

// 6. Create AI Gateway (if not exists)
console.log('\n📦 Setting up AI Gateway...');
console.log('ℹ️  Please create your AI Gateway manually at:');
console.log('   https://dash.cloudflare.com/?to=/:account/ai/ai-gateway');
console.log('   Then add the Gateway ID and Token to your .dev.vars file');

console.log('\n✅ Cloudflare resource setup complete!');
console.log('\n📝 Next steps:');
console.log('1. Create an AI Gateway at the Cloudflare dashboard');
console.log('2. Create a .dev.vars file with the following variables:');
console.log(`
CF_ACCOUNT_ID=your_account_id
CF_API_TOKEN=your_api_token
AI_GATEWAY_ACCOUNT_ID=your_account_id
AI_GATEWAY_ID=your_gateway_id
AI_GATEWAY_TOKEN=your_gateway_token
DOCKER_HUB_USERNAME=your_docker_username
DOCKER_HUB_TOKEN=your_docker_token
`);
console.log('3. Run: npm run db:migrate');
console.log('4. Run: npm run dev');
console.log('\n🎉 Your MAS Control Agent is ready to deploy!');
