#!/usr/bin/env node
/**
 * Chaprola Expenses — backend bootstrap
 *
 * One-time setup script for a fresh Chaprola account. Run with an admin key
 * (chp_...) in CHAPROLA_API_KEY. Reads CS source and seed data from the
 * chaprola/ directory so the repo is the source of truth.
 *
 * Usage:
 *   export CHAPROLA_API_KEY=chp_your_key_here
 *   node setup-chaprola.js
 */

const fs = require('fs');
const path = require('path');

const CHAPROLA_API = 'https://api.chaprola.org';
const USERNAME = process.env.CHAPROLA_USERNAME || 'chaprola-expenses';
const API_KEY = process.env.CHAPROLA_API_KEY;
const PROJECT = 'expenses';

if (!API_KEY) {
  console.error('Error: CHAPROLA_API_KEY environment variable is required');
  process.exit(1);
}

const sourceDir = path.join(__dirname, 'chaprola');

async function apiCall(endpoint, body) {
  const response = await fetch(`${CHAPROLA_API}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({ userid: USERNAME, ...body })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`${endpoint} failed: ${JSON.stringify(data)}`);
  }
  return data;
}

async function step(label, fn) {
  process.stdout.write(`${label} ... `);
  try {
    const result = await fn();
    console.log('ok');
    return result;
  } catch (err) {
    console.log('FAILED');
    console.error(`  ${err.message}`);
    throw err;
  }
}

async function main() {
  console.log(`=== Chaprola Expenses setup for ${USERNAME} ===\n`);

  // 1. Import seed ledger
  const seedPath = path.join(sourceDir, 'seed-ledger.json');
  const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

  await step(`Import ${seedData.length} seed records`, () =>
    apiCall('/import', { project: PROJECT, name: 'ledger', data: seedData })
  );

  // 2. Widen fields that Chaprola auto-sized too tightly from the seed's
  //    longest-value-per-column heuristic. expensecode needs headroom for
  //    runtime-generated IDs; amount needs headroom for larger purchases;
  //    company and submitter need headroom for longer real-world values.
  await step('Widen ledger fields via /alter', () =>
    apiCall('/alter', {
      project: PROJECT,
      name: 'ledger',
      alter: [
        { field: 'expensecode', width: 20 },
        { field: 'amount',      width: 12 },
        { field: 'company',     width: 60 },
        { field: 'submitter',   width: 40 }
      ]
    })
  );

  // 3. Build indexes on the frequently-filtered fields so /query and the
  //    CS programs that filter on these fields stay O(log n).
  for (const field of ['category', 'txmonth', 'state', 'submitter']) {
    await step(`Index ledger.${field}`, () =>
      apiCall('/index', { project: PROJECT, file: 'ledger', field })
    );
  }

  // 4. Compile every .CS program found in chaprola/, matching by name.
  const csFiles = fs.readdirSync(sourceDir).filter(f => f.endsWith('.CS'));
  for (const file of csFiles) {
    const name = file.replace(/\.CS$/, '');
    const source = fs.readFileSync(path.join(sourceDir, file), 'utf8');
    await step(`Compile ${name}`, () =>
      apiCall('/compile', { project: PROJECT, name, source, primary_format: 'ledger' })
    );
  }

  // 5. Upload each accompanying .DS intent file.
  const dsFiles = fs.readdirSync(sourceDir).filter(f => f.endsWith('.DS'));
  for (const file of dsFiles) {
    const name = file.replace(/\.DS$/, '');
    const text = fs.readFileSync(path.join(sourceDir, file), 'utf8');
    await step(`Upload intent ${name}.DS`, () =>
      apiCall('/intent', { project: PROJECT, name, text })
    );
  }

  // 6. Publish DETAIL as a public read-only report so /report?name=DETAIL
  //    works for any visitor. SUMMARY stays unpublished; it's consumed by
  //    the scheduled job, not by direct report callers.
  await step('Publish DETAIL as public report', () =>
    apiCall('/publish', {
      project: PROJECT,
      name: 'DETAIL',
      primary_file: 'ledger',
      acl: 'public'
    })
  );

  console.log('\n=== Setup complete ===\n');
  console.log('Next steps:');
  console.log('  1. Create a site key scoped to your deploy origin:');
  console.log('     POST /create-site-key with allowed_origins=["https://your-origin"]');
  console.log('     (NOT a path — browser Origin headers are scheme+host only.)');
  console.log('  2. Paste the site key into frontend/app.js (SITE_KEY constant).');
  console.log('  3. Deploy the frontend via /app/deploy/inline.');
  console.log('  4. (Optional) POST /schedule for the weekly SUMMARY:');
  console.log('     cron="0 9 * * 1", endpoint="/report", body={project, name:"SUMMARY", primary_file:"ledger"}');
  console.log('');
  console.log(`Public report URL: ${CHAPROLA_API}/report?userid=${USERNAME}&project=${PROJECT}&name=DETAIL`);
}

main().catch(err => {
  console.error('\nSetup failed:', err.message);
  process.exit(1);
});
