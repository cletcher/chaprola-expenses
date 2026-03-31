#!/usr/bin/env node
/**
 * Chaprola Expenses - Setup Script
 *
 * This script initializes the Chaprola backend:
 * 1. Imports seed data (70 expenses across 3 txmonths)
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
  {"expensecode": "EXP-2026-001", "amount": "1250.00", "category": "Software & Subscriptions", "company": "Adobe Creative Cloud", "detail": "Annual design suite license", "txdate": "2026-01-03", "txmonth": "2026-01", "method": "Credit Card", "state": "approved", "submitter": "Sarah Chen"},
  {"expensecode": "EXP-2026-002", "amount": "89.99", "category": "Office Supplies", "company": "Staples", "detail": "Printer paper and toner cartridges", "txdate": "2026-01-05", "txmonth": "2026-01", "method": "Corporate Card", "state": "approved", "submitter": "Mike Johnson"},
  {"expensecode": "EXP-2026-003", "amount": "425.00", "category": "Travel", "company": "United Airlines", "detail": "Flight to Chicago for client meeting", "txdate": "2026-01-08", "txmonth": "2026-01", "method": "Corporate Card", "state": "approved", "submitter": "Emily Davis"},
  {"expensecode": "EXP-2026-004", "amount": "156.75", "category": "Meals & Entertainment", "company": "The Capital Grille", "detail": "Client dinner - quarterly review", "txdate": "2026-01-10", "txmonth": "2026-01", "method": "Credit Card", "state": "approved", "submitter": "Emily Davis"},
  {"expensecode": "EXP-2026-005", "amount": "2499.00", "category": "Equipment", "company": "Apple Store", "detail": "MacBook Pro for new developer", "txdate": "2026-01-12", "txmonth": "2026-01", "method": "Wire Transfer", "state": "approved", "submitter": "David Wilson"},
  {"expensecode": "EXP-2026-006", "amount": "75.00", "category": "Training & Education", "company": "Udemy Business", "detail": "Online course subscription - txmonthly", "txdate": "2026-01-15", "txmonth": "2026-01", "method": "Credit Card", "state": "approved", "submitter": "Sarah Chen"},
  {"expensecode": "EXP-2026-007", "amount": "320.50", "category": "Travel", "company": "Marriott Hotels", "detail": "Hotel stay - Chicago trip", "txdate": "2026-01-09", "txmonth": "2026-01", "method": "Corporate Card", "state": "approved", "submitter": "Emily Davis"},
  {"expensecode": "EXP-2026-008", "amount": "45.00", "category": "Office Supplies", "company": "Amazon Business", "detail": "Desk organizers and cables", "txdate": "2026-01-18", "txmonth": "2026-01", "method": "Corporate Card", "state": "approved", "submitter": "Mike Johnson"},
  {"expensecode": "EXP-2026-009", "amount": "199.00", "category": "Software & Subscriptions", "company": "Slack Technologies", "detail": "Team collaboration - txmonthly", "txdate": "2026-01-20", "txmonth": "2026-01", "method": "Credit Card", "state": "approved", "submitter": "David Wilson"},
  {"expensecode": "EXP-2026-010", "amount": "850.00", "category": "Marketing", "company": "Google Ads", "detail": "Search advertising campaign", "txdate": "2026-01-22", "txmonth": "2026-01", "method": "Credit Card", "state": "approved", "submitter": "Lisa Park"},
  {"expensecode": "EXP-2026-011", "amount": "67.50", "category": "Meals & Entertainment", "company": "Panera Bread", "detail": "Team lunch meeting", "txdate": "2026-01-23", "txmonth": "2026-01", "method": "Corporate Card", "state": "approved", "submitter": "Mike Johnson"},
  {"expensecode": "EXP-2026-012", "amount": "1200.00", "category": "Professional Services", "company": "Smith & Associates", "detail": "Legal consultation - contract review", "txdate": "2026-01-25", "txmonth": "2026-01", "method": "Check", "state": "approved", "submitter": "David Wilson"},
  {"expensecode": "EXP-2026-013", "amount": "299.00", "category": "Software & Subscriptions", "company": "GitHub Enterprise", "detail": "Code repository - txmonthly", "txdate": "2026-01-27", "txmonth": "2026-01", "method": "Credit Card", "state": "approved", "submitter": "Sarah Chen"},
  {"expensecode": "EXP-2026-014", "amount": "125.00", "category": "Utilities", "company": "Comcast Business", "detail": "Internet service - office", "txdate": "2026-01-28", "txmonth": "2026-01", "method": "ACH", "state": "approved", "submitter": "David Wilson"},
  {"expensecode": "EXP-2026-015", "amount": "450.00", "category": "Marketing", "company": "Facebook Ads", "detail": "Social media campaign", "txdate": "2026-01-29", "txmonth": "2026-01", "method": "Credit Card", "state": "approved", "submitter": "Lisa Park"},
  {"expensecode": "EXP-2026-016", "amount": "88.25", "category": "Travel", "company": "Uber Business", "detail": "Client transportation - January", "txdate": "2026-01-30", "txmonth": "2026-01", "method": "Corporate Card", "state": "approved", "submitter": "Emily Davis"},
  {"expensecode": "EXP-2026-017", "amount": "560.00", "category": "Equipment", "company": "Dell Technologies", "detail": "External monitors x2", "txdate": "2026-01-31", "txmonth": "2026-01", "method": "Credit Card", "state": "approved", "submitter": "Mike Johnson"},
  {"expensecode": "EXP-2026-018", "amount": "175.00", "category": "Training & Education", "company": "AWS Training", "detail": "Cloud certification prep course", "txdate": "2026-01-15", "txmonth": "2026-01", "method": "Credit Card", "state": "approved", "submitter": "David Wilson"},
  {"expensecode": "EXP-2026-019", "amount": "95.00", "category": "Office Supplies", "company": "Office Depot", "detail": "Ergonomic keyboard", "txdate": "2026-01-20", "txmonth": "2026-01", "method": "Corporate Card", "state": "approved", "submitter": "Sarah Chen"},
  {"expensecode": "EXP-2026-020", "amount": "230.00", "category": "Professional Services", "company": "QuickBooks", "detail": "Accounting software - quarterly", "txdate": "2026-01-25", "txmonth": "2026-01", "method": "Credit Card", "state": "approved", "submitter": "Lisa Park"},
  {"expensecode": "EXP-2026-021", "amount": "599.00", "category": "Travel", "company": "Delta Airlines", "detail": "Flight to NYC for conference", "txdate": "2026-02-02", "txmonth": "2026-02", "method": "Corporate Card", "state": "approved", "submitter": "Sarah Chen"},
  {"expensecode": "EXP-2026-022", "amount": "1850.00", "category": "Training & Education", "company": "Tech Conference Inc", "detail": "Annual developer conference tickets x2", "txdate": "2026-02-03", "txmonth": "2026-02", "method": "Credit Card", "state": "approved", "submitter": "David Wilson"},
  {"expensecode": "EXP-2026-023", "amount": "112.50", "category": "Meals & Entertainment", "company": "Blue Hill Restaurant", "detail": "Client lunch - partnership discussion", "txdate": "2026-02-05", "txmonth": "2026-02", "method": "Corporate Card", "state": "approved", "submitter": "Emily Davis"},
  {"expensecode": "EXP-2026-024", "amount": "199.00", "category": "Software & Subscriptions", "company": "Slack Technologies", "detail": "Team collaboration - txmonthly", "txdate": "2026-02-07", "txmonth": "2026-02", "method": "Credit Card", "state": "approved", "submitter": "David Wilson"},
  {"expensecode": "EXP-2026-025", "amount": "720.00", "category": "Marketing", "company": "LinkedIn Ads", "detail": "B2B advertising campaign", "txdate": "2026-02-10", "txmonth": "2026-02", "method": "Credit Card", "state": "approved", "submitter": "Lisa Park"},
  {"expensecode": "EXP-2026-026", "amount": "389.00", "category": "Travel", "company": "Hilton Hotels", "detail": "Hotel stay - NYC conference", "txdate": "2026-02-04", "txmonth": "2026-02", "method": "Corporate Card", "state": "approved", "submitter": "Sarah Chen"},
  {"expensecode": "EXP-2026-027", "amount": "75.00", "category": "Training & Education", "company": "Udemy Business", "detail": "Online course subscription - txmonthly", "txdate": "2026-02-12", "txmonth": "2026-02", "method": "Credit Card", "state": "approved", "submitter": "Sarah Chen"},
  {"expensecode": "EXP-2026-028", "amount": "1599.00", "category": "Equipment", "company": "Herman Miller", "detail": "Ergonomic office chair", "txdate": "2026-02-14", "txmonth": "2026-02", "method": "Credit Card", "state": "approved", "submitter": "Mike Johnson"},
  {"expensecode": "EXP-2026-029", "amount": "56.80", "category": "Office Supplies", "company": "Staples", "detail": "Notebooks and pens for team", "txdate": "2026-02-15", "txmonth": "2026-02", "method": "Corporate Card", "state": "approved", "submitter": "Mike Johnson"},
  {"expensecode": "EXP-2026-030", "amount": "850.00", "category": "Marketing", "company": "Google Ads", "detail": "Search advertising campaign", "txdate": "2026-02-18", "txmonth": "2026-02", "method": "Credit Card", "state": "approved", "submitter": "Lisa Park"},
  {"expensecode": "EXP-2026-031", "amount": "245.00", "category": "Meals & Entertainment", "company": "Morton's Steakhouse", "detail": "Team celebration dinner", "txdate": "2026-02-20", "txmonth": "2026-02", "method": "Corporate Card", "state": "approved", "submitter": "David Wilson"},
  {"expensecode": "EXP-2026-032", "amount": "125.00", "category": "Utilities", "company": "Comcast Business", "detail": "Internet service - office", "txdate": "2026-02-22", "txmonth": "2026-02", "method": "ACH", "state": "approved", "submitter": "David Wilson"},
  {"expensecode": "EXP-2026-033", "amount": "299.00", "category": "Software & Subscriptions", "company": "GitHub Enterprise", "detail": "Code repository - txmonthly", "txdate": "2026-02-24", "txmonth": "2026-02", "method": "Credit Card", "state": "approved", "submitter": "Sarah Chen"},
  {"expensecode": "EXP-2026-034", "amount": "480.00", "category": "Professional Services", "company": "HR Consulting Group", "detail": "Hiring process consultation", "txdate": "2026-02-25", "txmonth": "2026-02", "method": "Check", "state": "approved", "submitter": "Emily Davis"},
  {"expensecode": "EXP-2026-035", "amount": "92.00", "category": "Travel", "company": "Uber Business", "detail": "Client transportation - February", "txdate": "2026-02-26", "txmonth": "2026-02", "method": "Corporate Card", "state": "approved", "submitter": "Emily Davis"},
  {"expensecode": "EXP-2026-036", "amount": "185.00", "category": "Office Supplies", "company": "Amazon Business", "detail": "Webcams for video conferencing", "txdate": "2026-02-27", "txmonth": "2026-02", "method": "Corporate Card", "state": "approved", "submitter": "Mike Johnson"},
  {"expensecode": "EXP-2026-037", "amount": "42.50", "category": "Meals & Entertainment", "company": "Chipotle", "detail": "Working lunch - project deadline", "txdate": "2026-02-28", "txmonth": "2026-02", "method": "Corporate Card", "state": "approved", "submitter": "Sarah Chen"},
  {"expensecode": "EXP-2026-038", "amount": "350.00", "category": "Marketing", "company": "Canva Pro", "detail": "Design tool annual subscription", "txdate": "2026-02-15", "txmonth": "2026-02", "method": "Credit Card", "state": "approved", "submitter": "Lisa Park"},
  {"expensecode": "EXP-2026-039", "amount": "799.00", "category": "Equipment", "company": "Logitech", "detail": "Conference room setup - camera + speaker", "txdate": "2026-02-20", "txmonth": "2026-02", "method": "Credit Card", "state": "pending", "submitter": "David Wilson"},
  {"expensecode": "EXP-2026-040", "amount": "165.00", "category": "Professional Services", "company": "Notary Services Inc", "detail": "Document notarization", "txdate": "2026-02-22", "txmonth": "2026-02", "method": "Check", "state": "approved", "submitter": "Emily Davis"},
  {"expensecode": "EXP-2026-041", "amount": "475.00", "category": "Travel", "company": "Southwest Airlines", "detail": "Flight to Austin for training", "txdate": "2026-03-02", "txmonth": "2026-03", "method": "Corporate Card", "state": "approved", "submitter": "Mike Johnson"},
  {"expensecode": "EXP-2026-042", "amount": "199.00", "category": "Software & Subscriptions", "company": "Slack Technologies", "detail": "Team collaboration - txmonthly", "txdate": "2026-03-03", "txmonth": "2026-03", "method": "Credit Card", "state": "approved", "submitter": "David Wilson"},
  {"expensecode": "EXP-2026-043", "amount": "890.00", "category": "Marketing", "company": "Google Ads", "detail": "Search advertising - Q1 push", "txdate": "2026-03-05", "txmonth": "2026-03", "method": "Credit Card", "state": "approved", "submitter": "Lisa Park"},
  {"expensecode": "EXP-2026-044", "amount": "268.00", "category": "Travel", "company": "Hyatt Hotels", "detail": "Hotel stay - Austin training", "txdate": "2026-03-03", "txmonth": "2026-03", "method": "Corporate Card", "state": "approved", "submitter": "Mike Johnson"},
  {"expensecode": "EXP-2026-045", "amount": "78.90", "category": "Meals & Entertainment", "company": "Franklin BBQ", "detail": "Team lunch - Austin", "txdate": "2026-03-04", "txmonth": "2026-03", "method": "Corporate Card", "state": "approved", "submitter": "Mike Johnson"},
  {"expensecode": "EXP-2026-046", "amount": "1299.00", "category": "Equipment", "company": "Apple Store", "detail": "iPad Pro for presentations", "txdate": "2026-03-07", "txmonth": "2026-03", "method": "Credit Card", "state": "approved", "submitter": "Emily Davis"},
  {"expensecode": "EXP-2026-047", "amount": "75.00", "category": "Training & Education", "company": "Udemy Business", "detail": "Online course subscription - txmonthly", "txdate": "2026-03-10", "txmonth": "2026-03", "method": "Credit Card", "state": "approved", "submitter": "Sarah Chen"},
  {"expensecode": "EXP-2026-048", "amount": "520.00", "category": "Marketing", "company": "Facebook Ads", "detail": "Product launch campaign", "txdate": "2026-03-12", "txmonth": "2026-03", "method": "Credit Card", "state": "approved", "submitter": "Lisa Park"},
  {"expensecode": "EXP-2026-049", "amount": "125.00", "category": "Utilities", "company": "Comcast Business", "detail": "Internet service - office", "txdate": "2026-03-14", "txmonth": "2026-03", "method": "ACH", "state": "approved", "submitter": "David Wilson"},
  {"expensecode": "EXP-2026-050", "amount": "299.00", "category": "Software & Subscriptions", "company": "GitHub Enterprise", "detail": "Code repository - txmonthly", "txdate": "2026-03-15", "txmonth": "2026-03", "method": "Credit Card", "state": "approved", "submitter": "Sarah Chen"},
  {"expensecode": "EXP-2026-051", "amount": "156.25", "category": "Meals & Entertainment", "company": "Ruth's Chris", "detail": "Client dinner - contract signing", "txdate": "2026-03-17", "txmonth": "2026-03", "method": "Corporate Card", "state": "approved", "submitter": "Emily Davis"},
  {"expensecode": "EXP-2026-052", "amount": "68.00", "category": "Office Supplies", "company": "Staples", "detail": "Printer supplies", "txdate": "2026-03-18", "txmonth": "2026-03", "method": "Corporate Card", "state": "approved", "submitter": "Mike Johnson"},
  {"expensecode": "EXP-2026-053", "amount": "2200.00", "category": "Professional Services", "company": "Marketing Agency LLC", "detail": "Brand strategy consultation", "txdate": "2026-03-19", "txmonth": "2026-03", "method": "Wire Transfer", "state": "pending", "submitter": "Lisa Park"},
  {"expensecode": "EXP-2026-054", "amount": "380.00", "category": "Travel", "company": "American Airlines", "detail": "Flight to Denver for sales meeting", "txdate": "2026-03-20", "txmonth": "2026-03", "method": "Corporate Card", "state": "approved", "submitter": "Emily Davis"},
  {"expensecode": "EXP-2026-055", "amount": "95.00", "category": "Travel", "company": "Uber Business", "detail": "Client transportation - March", "txdate": "2026-03-21", "txmonth": "2026-03", "method": "Corporate Card", "state": "approved", "submitter": "Emily Davis"},
  {"expensecode": "EXP-2026-056", "amount": "445.00", "category": "Training & Education", "company": "Coursera for Business", "detail": "Team learning platform - quarterly", "txdate": "2026-03-22", "txmonth": "2026-03", "method": "Credit Card", "state": "approved", "submitter": "David Wilson"},
  {"expensecode": "EXP-2026-057", "amount": "189.00", "category": "Travel", "company": "The Oxford Hotel", "detail": "Hotel stay - Denver meeting", "txdate": "2026-03-21", "txmonth": "2026-03", "method": "Corporate Card", "state": "approved", "submitter": "Emily Davis"},
  {"expensecode": "EXP-2026-058", "amount": "850.00", "category": "Equipment", "company": "Synology", "detail": "NAS storage for backups", "txdate": "2026-03-23", "txmonth": "2026-03", "method": "Credit Card", "state": "approved", "submitter": "David Wilson"},
  {"expensecode": "EXP-2026-059", "amount": "112.00", "category": "Office Supplies", "company": "Amazon Business", "detail": "Standing desk converter", "txdate": "2026-03-24", "txmonth": "2026-03", "method": "Corporate Card", "state": "approved", "submitter": "Sarah Chen"},
  {"expensecode": "EXP-2026-060", "amount": "650.00", "category": "Marketing", "company": "LinkedIn Ads", "detail": "Recruiting campaign", "txdate": "2026-03-25", "txmonth": "2026-03", "method": "Credit Card", "state": "pending", "submitter": "Lisa Park"},
  {"expensecode": "EXP-2026-061", "amount": "89.50", "category": "Meals & Entertainment", "company": "Local Kitchen", "detail": "Team offsite lunch", "txdate": "2026-03-26", "txmonth": "2026-03", "method": "Corporate Card", "state": "approved", "submitter": "Mike Johnson"},
  {"expensecode": "EXP-2026-062", "amount": "175.00", "category": "Professional Services", "company": "IT Support Co", "detail": "Network troubleshooting", "txdate": "2026-03-26", "txmonth": "2026-03", "method": "Check", "state": "approved", "submitter": "David Wilson"},
  {"expensecode": "EXP-2026-063", "amount": "299.00", "category": "Software & Subscriptions", "company": "Figma", "detail": "Design collaboration tool - txmonthly", "txdate": "2026-03-27", "txmonth": "2026-03", "method": "Credit Card", "state": "approved", "submitter": "Sarah Chen"},
  {"expensecode": "EXP-2026-064", "amount": "1450.00", "category": "Equipment", "company": "LG Electronics", "detail": "4K monitors for design team x2", "txdate": "2026-03-27", "txmonth": "2026-03", "method": "Credit Card", "state": "pending", "submitter": "Sarah Chen"},
  {"expensecode": "EXP-2026-065", "amount": "55.00", "category": "Meals & Entertainment", "company": "Starbucks Reserve", "detail": "Client coffee meeting", "txdate": "2026-03-28", "txmonth": "2026-03", "method": "Corporate Card", "state": "approved", "submitter": "Emily Davis"},
  {"expensecode": "EXP-2026-066", "amount": "420.00", "category": "Travel", "company": "Enterprise Rent-A-Car", "detail": "Car rental - client visits", "txdate": "2026-03-10", "txmonth": "2026-03", "method": "Corporate Card", "state": "approved", "submitter": "Mike Johnson"},
  {"expensecode": "EXP-2026-067", "amount": "85.00", "category": "Office Supplies", "company": "Office Depot", "detail": "Filing supplies and labels", "txdate": "2026-03-15", "txmonth": "2026-03", "method": "Corporate Card", "state": "approved", "submitter": "Mike Johnson"},
  {"expensecode": "EXP-2026-068", "amount": "750.00", "category": "Professional Services", "company": "Accounting Plus", "detail": "Tax preparation assistance", "txdate": "2026-03-20", "txmonth": "2026-03", "method": "Check", "state": "approved", "submitter": "David Wilson"},
  {"expensecode": "EXP-2026-069", "amount": "320.00", "category": "Training & Education", "company": "LinkedIn Learning", "detail": "Team subscription - quarterly", "txdate": "2026-03-25", "txmonth": "2026-03", "method": "Credit Card", "state": "approved", "submitter": "Sarah Chen"},
  {"expensecode": "EXP-2026-070", "amount": "1100.00", "category": "Marketing", "company": "Trade Show Expo", "detail": "Booth registration - upcoming show", "txdate": "2026-03-28", "txmonth": "2026-03", "method": "Wire Transfer", "state": "pending", "submitter": "Lisa Park"}
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

  // MONTHLY.CS - Cross-tabulation by category and txmonth
  MONTHLY: `// MONTHLY.CS - Monthly spending cross-tabulation
// Uses pivot via /query endpoint with row=category, column=txmonth
// Actual txmonthly data comes from /query with pivot
MOVE "Monthly Report - Use /query with pivot" U.1 50
PRINT 0
END`,

  // DETAIL.CS - Parameterized detail report
  DETAIL: `// DETAIL.CS - Parameterized expense detail report
// Accepts PARAM.category and/or PARAM.txmonth for filtering
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
    MOVE PARAM.category U.200 30
    MOVE P.category U.100 30
    IF EQUAL U.200 U.100 30 GOTO 150
    IF EQUAL "" U.200 1 GOTO 150
    GOTO 300
150 MOVE PARAM.txmonth U.210 7
    MOVE P.txmonth U.100 7
    IF EQUAL U.210 U.100 7 GOTO 200
    IF EQUAL "" U.210 1 GOTO 200
    GOTO 300
200 MOVE BLANKS U.1 132
    MOVE P.txdate U.1 10
    GET amt FROM P.amount
    PUT amt INTO U.12 12 D 2
    MOVE P.category U.25 25
    MOVE P.company U.51 40
    MOVE P.state U.92 10
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
    MOVE P.state U.100 10
    IF EQUAL "pending" U.100 7 GOTO 150
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
  const indexFields = ['category', 'txmonth', 'state', 'submitter'];
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
