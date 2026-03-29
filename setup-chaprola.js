#!/usr/bin/env node
/**
 * Chaprola Expenses - Setup Script
 *
 * This script initializes the Chaprola backend:
 * 1. Imports seed data (70 expenses across 3 months)
 * 2. Creates indexes for fast lookups
 * 3. Compiles Chaprola programs
 * 4. Publishes reports
 *
 * Run: node setup-chaprola.js
 */

const CHAPROLA_API = 'https://api.chaprola.org';
const USERNAME = process.env.CHAPROLA_USERNAME || 'chaprola-expenses';
const API_KEY = process.env.CHAPROLA_API_KEY;

if (!API_KEY) {
  console.error('Error: CHAPROLA_API_KEY environment variable is required');
  console.error('Set it from .env or export CHAPROLA_API_KEY=chp_...');
  process.exit(1);
}

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${API_KEY}`
};

async function apiCall(endpoint, body) {
  const response = await fetch(`${CHAPROLA_API}${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ userid: USERNAME, ...body })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`${endpoint} failed: ${JSON.stringify(data)}`);
  }
  return data;
}

// Seed data: 70 realistic expenses across January, February, March 2026
const seedData = [
  {"expense_id": "EXP-2026-001", "amount": "1250.00", "category": "Software & Subscriptions", "vendor": "Adobe Creative Cloud", "description": "Annual design suite license", "date": "2026-01-03", "month": "2026-01", "payment": "Credit Card", "status": "approved", "submitted_by": "Sarah Chen"},
  {"expense_id": "EXP-2026-002", "amount": "89.99", "category": "Office Supplies", "vendor": "Staples", "description": "Printer paper and toner cartridges", "date": "2026-01-05", "month": "2026-01", "payment": "Corporate Card", "status": "approved", "submitted_by": "Mike Johnson"},
  {"expense_id": "EXP-2026-003", "amount": "425.00", "category": "Travel", "vendor": "United Airlines", "description": "Flight to Chicago for client meeting", "date": "2026-01-08", "month": "2026-01", "payment": "Corporate Card", "status": "approved", "submitted_by": "Emily Davis"},
  {"expense_id": "EXP-2026-004", "amount": "156.75", "category": "Meals & Entertainment", "vendor": "The Capital Grille", "description": "Client dinner - quarterly review", "date": "2026-01-10", "month": "2026-01", "payment": "Credit Card", "status": "approved", "submitted_by": "Emily Davis"},
  {"expense_id": "EXP-2026-005", "amount": "2499.00", "category": "Equipment", "vendor": "Apple Store", "description": "MacBook Pro for new developer", "date": "2026-01-12", "month": "2026-01", "payment": "Wire Transfer", "status": "approved", "submitted_by": "David Wilson"},
  {"expense_id": "EXP-2026-006", "amount": "75.00", "category": "Training & Education", "vendor": "Udemy Business", "description": "Online course subscription - monthly", "date": "2026-01-15", "month": "2026-01", "payment": "Credit Card", "status": "approved", "submitted_by": "Sarah Chen"},
  {"expense_id": "EXP-2026-007", "amount": "320.50", "category": "Travel", "vendor": "Marriott Hotels", "description": "Hotel stay - Chicago trip", "date": "2026-01-09", "month": "2026-01", "payment": "Corporate Card", "status": "approved", "submitted_by": "Emily Davis"},
  {"expense_id": "EXP-2026-008", "amount": "45.00", "category": "Office Supplies", "vendor": "Amazon Business", "description": "Desk organizers and cables", "date": "2026-01-18", "month": "2026-01", "payment": "Corporate Card", "status": "approved", "submitted_by": "Mike Johnson"},
  {"expense_id": "EXP-2026-009", "amount": "199.00", "category": "Software & Subscriptions", "vendor": "Slack Technologies", "description": "Team collaboration - monthly", "date": "2026-01-20", "month": "2026-01", "payment": "Credit Card", "status": "approved", "submitted_by": "David Wilson"},
  {"expense_id": "EXP-2026-010", "amount": "850.00", "category": "Marketing", "vendor": "Google Ads", "description": "Search advertising campaign", "date": "2026-01-22", "month": "2026-01", "payment": "Credit Card", "status": "approved", "submitted_by": "Lisa Park"},
  {"expense_id": "EXP-2026-011", "amount": "67.50", "category": "Meals & Entertainment", "vendor": "Panera Bread", "description": "Team lunch meeting", "date": "2026-01-23", "month": "2026-01", "payment": "Corporate Card", "status": "approved", "submitted_by": "Mike Johnson"},
  {"expense_id": "EXP-2026-012", "amount": "1200.00", "category": "Professional Services", "vendor": "Smith & Associates", "description": "Legal consultation - contract review", "date": "2026-01-25", "month": "2026-01", "payment": "Check", "status": "approved", "submitted_by": "David Wilson"},
  {"expense_id": "EXP-2026-013", "amount": "299.00", "category": "Software & Subscriptions", "vendor": "GitHub Enterprise", "description": "Code repository - monthly", "date": "2026-01-27", "month": "2026-01", "payment": "Credit Card", "status": "approved", "submitted_by": "Sarah Chen"},
  {"expense_id": "EXP-2026-014", "amount": "125.00", "category": "Utilities", "vendor": "Comcast Business", "description": "Internet service - office", "date": "2026-01-28", "month": "2026-01", "payment": "ACH", "status": "approved", "submitted_by": "David Wilson"},
  {"expense_id": "EXP-2026-015", "amount": "450.00", "category": "Marketing", "vendor": "Facebook Ads", "description": "Social media campaign", "date": "2026-01-29", "month": "2026-01", "payment": "Credit Card", "status": "approved", "submitted_by": "Lisa Park"},
  {"expense_id": "EXP-2026-016", "amount": "88.25", "category": "Travel", "vendor": "Uber Business", "description": "Client transportation - January", "date": "2026-01-30", "month": "2026-01", "payment": "Corporate Card", "status": "approved", "submitted_by": "Emily Davis"},
  {"expense_id": "EXP-2026-017", "amount": "560.00", "category": "Equipment", "vendor": "Dell Technologies", "description": "External monitors x2", "date": "2026-01-31", "month": "2026-01", "payment": "Credit Card", "status": "approved", "submitted_by": "Mike Johnson"},
  {"expense_id": "EXP-2026-018", "amount": "175.00", "category": "Training & Education", "vendor": "AWS Training", "description": "Cloud certification prep course", "date": "2026-01-15", "month": "2026-01", "payment": "Credit Card", "status": "approved", "submitted_by": "David Wilson"},
  {"expense_id": "EXP-2026-019", "amount": "95.00", "category": "Office Supplies", "vendor": "Office Depot", "description": "Ergonomic keyboard", "date": "2026-01-20", "month": "2026-01", "payment": "Corporate Card", "status": "approved", "submitted_by": "Sarah Chen"},
  {"expense_id": "EXP-2026-020", "amount": "230.00", "category": "Professional Services", "vendor": "QuickBooks", "description": "Accounting software - quarterly", "date": "2026-01-25", "month": "2026-01", "payment": "Credit Card", "status": "approved", "submitted_by": "Lisa Park"},
  {"expense_id": "EXP-2026-021", "amount": "599.00", "category": "Travel", "vendor": "Delta Airlines", "description": "Flight to NYC for conference", "date": "2026-02-02", "month": "2026-02", "payment": "Corporate Card", "status": "approved", "submitted_by": "Sarah Chen"},
  {"expense_id": "EXP-2026-022", "amount": "1850.00", "category": "Training & Education", "vendor": "Tech Conference Inc", "description": "Annual developer conference tickets x2", "date": "2026-02-03", "month": "2026-02", "payment": "Credit Card", "status": "approved", "submitted_by": "David Wilson"},
  {"expense_id": "EXP-2026-023", "amount": "112.50", "category": "Meals & Entertainment", "vendor": "Blue Hill Restaurant", "description": "Client lunch - partnership discussion", "date": "2026-02-05", "month": "2026-02", "payment": "Corporate Card", "status": "approved", "submitted_by": "Emily Davis"},
  {"expense_id": "EXP-2026-024", "amount": "199.00", "category": "Software & Subscriptions", "vendor": "Slack Technologies", "description": "Team collaboration - monthly", "date": "2026-02-07", "month": "2026-02", "payment": "Credit Card", "status": "approved", "submitted_by": "David Wilson"},
  {"expense_id": "EXP-2026-025", "amount": "720.00", "category": "Marketing", "vendor": "LinkedIn Ads", "description": "B2B advertising campaign", "date": "2026-02-10", "month": "2026-02", "payment": "Credit Card", "status": "approved", "submitted_by": "Lisa Park"},
  {"expense_id": "EXP-2026-026", "amount": "389.00", "category": "Travel", "vendor": "Hilton Hotels", "description": "Hotel stay - NYC conference", "date": "2026-02-04", "month": "2026-02", "payment": "Corporate Card", "status": "approved", "submitted_by": "Sarah Chen"},
  {"expense_id": "EXP-2026-027", "amount": "75.00", "category": "Training & Education", "vendor": "Udemy Business", "description": "Online course subscription - monthly", "date": "2026-02-12", "month": "2026-02", "payment": "Credit Card", "status": "approved", "submitted_by": "Sarah Chen"},
  {"expense_id": "EXP-2026-028", "amount": "1599.00", "category": "Equipment", "vendor": "Herman Miller", "description": "Ergonomic office chair", "date": "2026-02-14", "month": "2026-02", "payment": "Credit Card", "status": "approved", "submitted_by": "Mike Johnson"},
  {"expense_id": "EXP-2026-029", "amount": "56.80", "category": "Office Supplies", "vendor": "Staples", "description": "Notebooks and pens for team", "date": "2026-02-15", "month": "2026-02", "payment": "Corporate Card", "status": "approved", "submitted_by": "Mike Johnson"},
  {"expense_id": "EXP-2026-030", "amount": "850.00", "category": "Marketing", "vendor": "Google Ads", "description": "Search advertising campaign", "date": "2026-02-18", "month": "2026-02", "payment": "Credit Card", "status": "approved", "submitted_by": "Lisa Park"},
  {"expense_id": "EXP-2026-031", "amount": "245.00", "category": "Meals & Entertainment", "vendor": "Morton's Steakhouse", "description": "Team celebration dinner", "date": "2026-02-20", "month": "2026-02", "payment": "Corporate Card", "status": "approved", "submitted_by": "David Wilson"},
  {"expense_id": "EXP-2026-032", "amount": "125.00", "category": "Utilities", "vendor": "Comcast Business", "description": "Internet service - office", "date": "2026-02-22", "month": "2026-02", "payment": "ACH", "status": "approved", "submitted_by": "David Wilson"},
  {"expense_id": "EXP-2026-033", "amount": "299.00", "category": "Software & Subscriptions", "vendor": "GitHub Enterprise", "description": "Code repository - monthly", "date": "2026-02-24", "month": "2026-02", "payment": "Credit Card", "status": "approved", "submitted_by": "Sarah Chen"},
  {"expense_id": "EXP-2026-034", "amount": "480.00", "category": "Professional Services", "vendor": "HR Consulting Group", "description": "Hiring process consultation", "date": "2026-02-25", "month": "2026-02", "payment": "Check", "status": "approved", "submitted_by": "Emily Davis"},
  {"expense_id": "EXP-2026-035", "amount": "92.00", "category": "Travel", "vendor": "Uber Business", "description": "Client transportation - February", "date": "2026-02-26", "month": "2026-02", "payment": "Corporate Card", "status": "approved", "submitted_by": "Emily Davis"},
  {"expense_id": "EXP-2026-036", "amount": "185.00", "category": "Office Supplies", "vendor": "Amazon Business", "description": "Webcams for video conferencing", "date": "2026-02-27", "month": "2026-02", "payment": "Corporate Card", "status": "approved", "submitted_by": "Mike Johnson"},
  {"expense_id": "EXP-2026-037", "amount": "42.50", "category": "Meals & Entertainment", "vendor": "Chipotle", "description": "Working lunch - project deadline", "date": "2026-02-28", "month": "2026-02", "payment": "Corporate Card", "status": "approved", "submitted_by": "Sarah Chen"},
  {"expense_id": "EXP-2026-038", "amount": "350.00", "category": "Marketing", "vendor": "Canva Pro", "description": "Design tool annual subscription", "date": "2026-02-15", "month": "2026-02", "payment": "Credit Card", "status": "approved", "submitted_by": "Lisa Park"},
  {"expense_id": "EXP-2026-039", "amount": "799.00", "category": "Equipment", "vendor": "Logitech", "description": "Conference room setup - camera + speaker", "date": "2026-02-20", "month": "2026-02", "payment": "Credit Card", "status": "pending", "submitted_by": "David Wilson"},
  {"expense_id": "EXP-2026-040", "amount": "165.00", "category": "Professional Services", "vendor": "Notary Services Inc", "description": "Document notarization", "date": "2026-02-22", "month": "2026-02", "payment": "Check", "status": "approved", "submitted_by": "Emily Davis"},
  {"expense_id": "EXP-2026-041", "amount": "475.00", "category": "Travel", "vendor": "Southwest Airlines", "description": "Flight to Austin for training", "date": "2026-03-02", "month": "2026-03", "payment": "Corporate Card", "status": "approved", "submitted_by": "Mike Johnson"},
  {"expense_id": "EXP-2026-042", "amount": "199.00", "category": "Software & Subscriptions", "vendor": "Slack Technologies", "description": "Team collaboration - monthly", "date": "2026-03-03", "month": "2026-03", "payment": "Credit Card", "status": "approved", "submitted_by": "David Wilson"},
  {"expense_id": "EXP-2026-043", "amount": "890.00", "category": "Marketing", "vendor": "Google Ads", "description": "Search advertising - Q1 push", "date": "2026-03-05", "month": "2026-03", "payment": "Credit Card", "status": "approved", "submitted_by": "Lisa Park"},
  {"expense_id": "EXP-2026-044", "amount": "268.00", "category": "Travel", "vendor": "Hyatt Hotels", "description": "Hotel stay - Austin training", "date": "2026-03-03", "month": "2026-03", "payment": "Corporate Card", "status": "approved", "submitted_by": "Mike Johnson"},
  {"expense_id": "EXP-2026-045", "amount": "78.90", "category": "Meals & Entertainment", "vendor": "Franklin BBQ", "description": "Team lunch - Austin", "date": "2026-03-04", "month": "2026-03", "payment": "Corporate Card", "status": "approved", "submitted_by": "Mike Johnson"},
  {"expense_id": "EXP-2026-046", "amount": "1299.00", "category": "Equipment", "vendor": "Apple Store", "description": "iPad Pro for presentations", "date": "2026-03-07", "month": "2026-03", "payment": "Credit Card", "status": "approved", "submitted_by": "Emily Davis"},
  {"expense_id": "EXP-2026-047", "amount": "75.00", "category": "Training & Education", "vendor": "Udemy Business", "description": "Online course subscription - monthly", "date": "2026-03-10", "month": "2026-03", "payment": "Credit Card", "status": "approved", "submitted_by": "Sarah Chen"},
  {"expense_id": "EXP-2026-048", "amount": "520.00", "category": "Marketing", "vendor": "Facebook Ads", "description": "Product launch campaign", "date": "2026-03-12", "month": "2026-03", "payment": "Credit Card", "status": "approved", "submitted_by": "Lisa Park"},
  {"expense_id": "EXP-2026-049", "amount": "125.00", "category": "Utilities", "vendor": "Comcast Business", "description": "Internet service - office", "date": "2026-03-14", "month": "2026-03", "payment": "ACH", "status": "approved", "submitted_by": "David Wilson"},
  {"expense_id": "EXP-2026-050", "amount": "299.00", "category": "Software & Subscriptions", "vendor": "GitHub Enterprise", "description": "Code repository - monthly", "date": "2026-03-15", "month": "2026-03", "payment": "Credit Card", "status": "approved", "submitted_by": "Sarah Chen"},
  {"expense_id": "EXP-2026-051", "amount": "156.25", "category": "Meals & Entertainment", "vendor": "Ruth's Chris", "description": "Client dinner - contract signing", "date": "2026-03-17", "month": "2026-03", "payment": "Corporate Card", "status": "approved", "submitted_by": "Emily Davis"},
  {"expense_id": "EXP-2026-052", "amount": "68.00", "category": "Office Supplies", "vendor": "Staples", "description": "Printer supplies", "date": "2026-03-18", "month": "2026-03", "payment": "Corporate Card", "status": "approved", "submitted_by": "Mike Johnson"},
  {"expense_id": "EXP-2026-053", "amount": "2200.00", "category": "Professional Services", "vendor": "Marketing Agency LLC", "description": "Brand strategy consultation", "date": "2026-03-19", "month": "2026-03", "payment": "Wire Transfer", "status": "pending", "submitted_by": "Lisa Park"},
  {"expense_id": "EXP-2026-054", "amount": "380.00", "category": "Travel", "vendor": "American Airlines", "description": "Flight to Denver for sales meeting", "date": "2026-03-20", "month": "2026-03", "payment": "Corporate Card", "status": "approved", "submitted_by": "Emily Davis"},
  {"expense_id": "EXP-2026-055", "amount": "95.00", "category": "Travel", "vendor": "Uber Business", "description": "Client transportation - March", "date": "2026-03-21", "month": "2026-03", "payment": "Corporate Card", "status": "approved", "submitted_by": "Emily Davis"},
  {"expense_id": "EXP-2026-056", "amount": "445.00", "category": "Training & Education", "vendor": "Coursera for Business", "description": "Team learning platform - quarterly", "date": "2026-03-22", "month": "2026-03", "payment": "Credit Card", "status": "approved", "submitted_by": "David Wilson"},
  {"expense_id": "EXP-2026-057", "amount": "189.00", "category": "Travel", "vendor": "The Oxford Hotel", "description": "Hotel stay - Denver meeting", "date": "2026-03-21", "month": "2026-03", "payment": "Corporate Card", "status": "approved", "submitted_by": "Emily Davis"},
  {"expense_id": "EXP-2026-058", "amount": "850.00", "category": "Equipment", "vendor": "Synology", "description": "NAS storage for backups", "date": "2026-03-23", "month": "2026-03", "payment": "Credit Card", "status": "approved", "submitted_by": "David Wilson"},
  {"expense_id": "EXP-2026-059", "amount": "112.00", "category": "Office Supplies", "vendor": "Amazon Business", "description": "Standing desk converter", "date": "2026-03-24", "month": "2026-03", "payment": "Corporate Card", "status": "approved", "submitted_by": "Sarah Chen"},
  {"expense_id": "EXP-2026-060", "amount": "650.00", "category": "Marketing", "vendor": "LinkedIn Ads", "description": "Recruiting campaign", "date": "2026-03-25", "month": "2026-03", "payment": "Credit Card", "status": "pending", "submitted_by": "Lisa Park"},
  {"expense_id": "EXP-2026-061", "amount": "89.50", "category": "Meals & Entertainment", "vendor": "Local Kitchen", "description": "Team offsite lunch", "date": "2026-03-26", "month": "2026-03", "payment": "Corporate Card", "status": "approved", "submitted_by": "Mike Johnson"},
  {"expense_id": "EXP-2026-062", "amount": "175.00", "category": "Professional Services", "vendor": "IT Support Co", "description": "Network troubleshooting", "date": "2026-03-26", "month": "2026-03", "payment": "Check", "status": "approved", "submitted_by": "David Wilson"},
  {"expense_id": "EXP-2026-063", "amount": "299.00", "category": "Software & Subscriptions", "vendor": "Figma", "description": "Design collaboration tool - monthly", "date": "2026-03-27", "month": "2026-03", "payment": "Credit Card", "status": "approved", "submitted_by": "Sarah Chen"},
  {"expense_id": "EXP-2026-064", "amount": "1450.00", "category": "Equipment", "vendor": "LG Electronics", "description": "4K monitors for design team x2", "date": "2026-03-27", "month": "2026-03", "payment": "Credit Card", "status": "pending", "submitted_by": "Sarah Chen"},
  {"expense_id": "EXP-2026-065", "amount": "55.00", "category": "Meals & Entertainment", "vendor": "Starbucks Reserve", "description": "Client coffee meeting", "date": "2026-03-28", "month": "2026-03", "payment": "Corporate Card", "status": "approved", "submitted_by": "Emily Davis"},
  {"expense_id": "EXP-2026-066", "amount": "420.00", "category": "Travel", "vendor": "Enterprise Rent-A-Car", "description": "Car rental - client visits", "date": "2026-03-10", "month": "2026-03", "payment": "Corporate Card", "status": "approved", "submitted_by": "Mike Johnson"},
  {"expense_id": "EXP-2026-067", "amount": "85.00", "category": "Office Supplies", "vendor": "Office Depot", "description": "Filing supplies and labels", "date": "2026-03-15", "month": "2026-03", "payment": "Corporate Card", "status": "approved", "submitted_by": "Mike Johnson"},
  {"expense_id": "EXP-2026-068", "amount": "750.00", "category": "Professional Services", "vendor": "Accounting Plus", "description": "Tax preparation assistance", "date": "2026-03-20", "month": "2026-03", "payment": "Check", "status": "approved", "submitted_by": "David Wilson"},
  {"expense_id": "EXP-2026-069", "amount": "320.00", "category": "Training & Education", "vendor": "LinkedIn Learning", "description": "Team subscription - quarterly", "date": "2026-03-25", "month": "2026-03", "payment": "Credit Card", "status": "approved", "submitted_by": "Sarah Chen"},
  {"expense_id": "EXP-2026-070", "amount": "1100.00", "category": "Marketing", "vendor": "Trade Show Expo", "description": "Booth registration - upcoming show", "date": "2026-03-28", "month": "2026-03", "payment": "Wire Transfer", "status": "pending", "submitted_by": "Lisa Park"}
];

// Chaprola source programs
const programs = {
  // DASHBOARD.CS - Category breakdown with sum and count
  DASHBOARD: `// DASHBOARD.CS - Category spending breakdown
// Uses pivot via /query endpoint - this is a stub for documentation
// Actual dashboard data comes from /query with pivot
MOVE "Dashboard Report - Use /query with pivot" U.1 50
PRINT 0
END`,

  // MONTHLY.CS - Cross-tabulation by category and month
  MONTHLY: `// MONTHLY.CS - Monthly spending cross-tabulation
// Uses pivot via /query endpoint with row=category, column=month
// Actual monthly data comes from /query with pivot
MOVE "Monthly Report - Use /query with pivot" U.1 50
PRINT 0
END`,

  // DETAIL.CS - Parameterized detail report
  DETAIL: `// DETAIL.CS - Parameterized expense detail report
// Accepts PARAM.category and/or PARAM.month for filtering
DEFINE VARIABLE rec R41
DEFINE VARIABLE amt R42

MOVE "EXPENSE DETAIL REPORT" U.1 30
PRINT 0
MOVE "=====================" U.1 30
PRINT 0
MOVE BLANKS U.1 132
PRINT 0

LET rec = 1
100 SEEK rec
    IF EOF GOTO 900

    // Check category filter if provided
    MOVE P.category U.100 30
    IF EQUAL "" PARAM.category GOTO 150
    IF EQUAL PARAM.category U.100 GOTO 150
    GOTO 300

150 // Check month filter if provided
    MOVE P.month U.100 7
    IF EQUAL "" PARAM.month GOTO 200
    IF EQUAL PARAM.month U.100 GOTO 200
    GOTO 300

200 // Output this record
    MOVE BLANKS U.1 132
    MOVE P.date U.1 10
    GET amt FROM P.amount
    PUT amt INTO U.12 12 D 2
    MOVE P.category U.25 25
    MOVE P.vendor U.51 40
    MOVE P.status U.92 10
    PRINT 0

300 LET rec = rec + 1
    GOTO 100

900 END`,

  // SUMMARY.CS - Weekly summary for email
  SUMMARY: `// SUMMARY.CS - Weekly expense summary
DEFINE VARIABLE rec R41
DEFINE VARIABLE total R42
DEFINE VARIABLE count R43
DEFINE VARIABLE amt R44
DEFINE VARIABLE pending R45
DEFINE VARIABLE pendcount R46

LET total = 0
LET count = 0
LET pending = 0
LET pendcount = 0

MOVE "WEEKLY EXPENSE SUMMARY" U.1 30
PRINT 0
MOVE "======================" U.1 30
PRINT 0
MOVE BLANKS U.1 80
PRINT 0

LET rec = 1
100 SEEK rec
    IF EOF GOTO 200
    GET amt FROM P.amount
    LET total = total + amt
    LET count = count + 1

    // Check if pending
    MOVE P.status U.100 10
    IF EQUAL "pending" U.100 GOTO 150
    GOTO 180

150 LET pending = pending + amt
    LET pendcount = pendcount + 1

180 LET rec = rec + 1
    GOTO 100

200 MOVE BLANKS U.1 80
    MOVE "Total Expenses:" U.1 20
    PUT count INTO U.21 6 I 0
    PRINT 0

    MOVE BLANKS U.1 80
    MOVE "Total Amount:" U.1 20
    PUT total INTO U.21 15 D 2
    PRINT 0

    MOVE BLANKS U.1 80
    MOVE "Pending Count:" U.1 20
    PUT pendcount INTO U.21 6 I 0
    PRINT 0

    MOVE BLANKS U.1 80
    MOVE "Pending Amount:" U.1 20
    PUT pending INTO U.21 15 D 2
    PRINT 0

    END`
};

async function setup() {
  console.log('=== Chaprola Expenses Setup ===\n');

  // Step 1: Import seed data
  console.log('1. Importing seed data (70 expenses)...');
  try {
    const importResult = await apiCall('/import', {
      project: 'expenses',
      name: 'ledger',
      data: seedData
    });
    console.log(`   ✓ Imported ${importResult.records} records (${importResult.fields} fields, ${importResult.record_length} bytes/record)\n`);
  } catch (err) {
    console.error(`   ✗ Import failed: ${err.message}\n`);
    process.exit(1);
  }

  // Step 2: Create indexes
  console.log('2. Building indexes...');
  const indexFields = ['category', 'month', 'status', 'submitted_by'];
  for (const field of indexFields) {
    try {
      await apiCall('/index', {
        project: 'expenses',
        file: 'ledger',
        field
      });
      console.log(`   ✓ Indexed: ${field}`);
    } catch (err) {
      console.error(`   ✗ Index ${field} failed: ${err.message}`);
    }
  }
  console.log('');

  // Step 3: Compile programs
  console.log('3. Compiling Chaprola programs...');
  for (const [name, source] of Object.entries(programs)) {
    try {
      const result = await apiCall('/compile', {
        project: 'expenses',
        name,
        source,
        primary_format: 'ledger'
      });
      console.log(`   ✓ Compiled: ${name} (${result.instructions} instructions, ${result.bytes} bytes)`);
    } catch (err) {
      console.error(`   ✗ Compile ${name} failed: ${err.message}`);
    }
  }
  console.log('');

  // Step 4: Publish reports
  console.log('4. Publishing reports...');
  const publishPrograms = ['DASHBOARD', 'MONTHLY', 'DETAIL'];
  for (const name of publishPrograms) {
    try {
      const result = await apiCall('/publish', {
        project: 'expenses',
        name,
        primary_file: 'ledger',
        acl: 'public'
      });
      console.log(`   ✓ Published: ${name}`);
      console.log(`     URL: ${result.report_url}`);
    } catch (err) {
      console.error(`   ✗ Publish ${name} failed: ${err.message}`);
    }
  }
  console.log('');

  console.log('=== Setup Complete ===');
  console.log('\nPublic report URLs:');
  console.log(`  Dashboard: https://api.chaprola.org/report?userid=${USERNAME}&project=expenses&name=DASHBOARD`);
  console.log(`  Monthly:   https://api.chaprola.org/report?userid=${USERNAME}&project=expenses&name=MONTHLY`);
  console.log(`  Detail:    https://api.chaprola.org/report?userid=${USERNAME}&project=expenses&name=DETAIL&category=Travel`);
}

setup().catch(err => {
  console.error('Setup failed:', err);
  process.exit(1);
});
