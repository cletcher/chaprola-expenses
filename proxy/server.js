#!/usr/bin/env node
/**
 * Chaprola Expenses - Proxy Server
 *
 * A thin proxy that holds the API key for write operations.
 * Read operations (queries) go through authenticated endpoints.
 * This keeps the API key out of the browser.
 *
 * Run: node proxy/server.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
}

const CHAPROLA_API = 'https://api.chaprola.org';
const USERNAME = process.env.CHAPROLA_USERNAME || 'chaprola-expenses';
const API_KEY = process.env.CHAPROLA_API_KEY;
const PORT = process.env.PORT || 3000;
const PROJECT = 'expenses';

if (!API_KEY) {
  console.error('Error: CHAPROLA_API_KEY not set');
  console.error('Set it in .env file or as environment variable');
  process.exit(1);
}

// MIME types for static files
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Helper: Make authenticated API call to Chaprola
async function chaprolaCall(endpoint, body) {
  const response = await fetch(`${CHAPROLA_API}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({ userid: USERNAME, project: PROJECT, ...body })
  });
  return {
    status: response.status,
    data: await response.json()
  };
}

// Parse JSON body from request
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

// Serve static files from frontend/
function serveStatic(res, filePath) {
  const frontendPath = path.join(__dirname, '..', 'frontend', filePath);
  const ext = path.extname(frontendPath);
  const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(frontendPath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Server Error');
      }
      return;
    }
    res.writeHead(200, { 'Content-Type': mimeType });
    res.end(content);
  });
}

// API route handlers
const apiRoutes = {
  // Query expenses (with optional filters)
  '/api/query': async (body) => {
    return await chaprolaCall('/query', {
      file: body.file || 'ledger',
      where: body.where,
      select: body.select,
      order_by: body.order_by,
      limit: body.limit,
      aggregate: body.aggregate,
      pivot: body.pivot
    });
  },

  // Insert new expense
  '/api/insert': async (body) => {
    return await chaprolaCall('/insert-record', {
      file: body.file || 'ledger',
      record: body.record
    });
  },

  // Update expense
  '/api/update': async (body) => {
    return await chaprolaCall('/update-record', {
      file: body.file || 'ledger',
      where: body.where,
      set: body.set
    });
  },

  // Delete expense
  '/api/delete': async (body) => {
    return await chaprolaCall('/delete-record', {
      file: body.file || 'ledger',
      where: body.where
    });
  },

  // Export report
  '/api/export-report': async (body) => {
    const result = await chaprolaCall('/export-report', {
      name: body.name || 'DETAIL',
      format: body.format || 'csv',
      primary_file: 'ledger',
      title: 'Expense Report'
    });

    // If successful, get download URL
    if (result.status === 200 && result.data.files_written) {
      const file = result.data.files_written[0];
      const downloadResult = await chaprolaCall('/download', {
        file: file,
        type: 'output'
      });
      return downloadResult;
    }
    return result;
  },

  // Run report (for preview)
  '/api/run': async (body) => {
    return await chaprolaCall('/run', {
      name: body.name,
      primary_file: 'ledger',
      record: body.record || 1
    });
  },

  // Get category breakdown (pivot query)
  '/api/category-breakdown': async (body) => {
    return await chaprolaCall('/query', {
      file: 'ledger',
      pivot: {
        row: 'category',
        values: [
          { field: 'amount', function: 'sum' },
          { field: 'amount', function: 'count' }
        ],
        totals: true
      }
    });
  },

  // Get monthly cross-tabulation
  '/api/monthly-crosstab': async (body) => {
    return await chaprolaCall('/query', {
      file: 'ledger',
      pivot: {
        row: 'category',
        column: 'month',
        values: [{ field: 'amount', function: 'sum' }],
        totals: true,
        grand_total: true
      }
    });
  }
};

// Create HTTP server
const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  // API routes
  if (url.pathname.startsWith('/api/')) {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    const handler = apiRoutes[url.pathname];
    if (!handler) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Endpoint not found' }));
      return;
    }

    try {
      const body = await parseBody(req);
      const result = await handler(body);
      res.writeHead(result.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result.data));
    } catch (err) {
      console.error('API Error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Static files
  let filePath = url.pathname;
  if (filePath === '/') filePath = '/index.html';

  serveStatic(res, filePath);
});

server.listen(PORT, () => {
  console.log(`
  ========================================
  Chaprola Expenses - Proxy Server
  ========================================

  Server running at: http://localhost:${PORT}

  API Endpoints:
    POST /api/query          - Query expenses
    POST /api/insert         - Create expense
    POST /api/update         - Update expense
    POST /api/delete         - Delete expense
    POST /api/export-report  - Export to PDF/CSV/etc
    POST /api/category-breakdown - Category pivot
    POST /api/monthly-crosstab   - Monthly cross-tab

  Static files served from: frontend/

  Press Ctrl+C to stop
  `);
});
