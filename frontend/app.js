/**
 * Chaprola Expenses — Frontend
 *
 * Static app, deployed to chaprola.org/apps/chaprola-expenses/...
 * All API calls go direct to api.chaprola.org with an origin-locked site key.
 * No proxy, no server, no admin credentials in the browser.
 *
 * The site key is restricted by the backend to:
 *   - allowed origins: https://chaprola.org
 *   - allowed endpoints: /query, /insert-record, /update-record, /export-report, /report
 * Stolen, it does nothing useful from any other origin.
 */

const API_BASE = 'https://api.chaprola.org';
const SITE_KEY = 'site_aa64a450feb5139c4607cb7c3ebd8011a78952a433d42213fffb33b8843c5f1c';
const USERID = 'chaprola-expenses';
const PROJECT = 'expenses';

const CATEGORY_COLORS = {
  'Software & Subscriptions': 'software',
  'Office Supplies': 'office',
  'Travel': 'travel',
  'Meals & Entertainment': 'meals',
  'Equipment': 'equipment',
  'Training & Education': 'training',
  'Marketing': 'marketing',
  'Professional Services': 'professional',
  'Utilities': 'utilities'
};

// ---------- helpers ----------

function esc(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCurrency(amount) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (!isFinite(num)) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
}

function getCategoryClass(category) {
  return CATEGORY_COLORS[category] || 'default';
}

function monthLabel(yyyymm) {
  if (!yyyymm || yyyymm.length !== 7) return yyyymm || '';
  const [y, m] = yyyymm.split('-');
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const idx = parseInt(m, 10) - 1;
  return names[idx] ? `${names[idx]} ${y}` : yyyymm;
}

async function api(endpoint, body) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SITE_KEY}`
    },
    body: JSON.stringify({ userid: USERID, project: PROJECT, ...body })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg = data.error || data.message || `${endpoint} failed (${response.status})`;
    throw new Error(msg);
  }
  return data;
}

function showError(message) {
  const content = document.querySelector('.content');
  if (!content) return;
  const alert = document.createElement('div');
  alert.className = 'alert alert-error';
  alert.textContent = message;
  content.prepend(alert);
}

function showSuccess(message) {
  const content = document.querySelector('.content');
  if (!content) return;
  const alert = document.createElement('div');
  alert.className = 'alert alert-success';
  alert.textContent = message;
  content.prepend(alert);
}

// Build a 14-char expensecode that fits the 20-char field with headroom.
// Format: EXP-YYMMDD-NNNN where NNNN is a random 4-digit suffix.
function generateExpenseCode() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const suffix = String(Math.floor(1000 + Math.random() * 9000));
  return `EXP-${yy}${mm}${dd}-${suffix}`;
}

// ---------- dashboard ----------

async function loadDashboard() {
  try {
    // Five parallel pivots. All aggregation happens server-side in Chaprola's
    // /query pivot — this is the whole point of the app: "GROUP BY on a
    // database I didn't have to provision."
    const pivotBody = (p) => ({ file: 'ledger', pivot: p });
    const [stateSums, stateCounts, catSums, catCounts, monthly] = await Promise.all([
      api('/query', pivotBody({ row: 'state', column: '', value: 'amount', aggregate: 'sum' })),
      api('/query', pivotBody({ row: 'state', column: '', value: 'state', aggregate: 'count' })),
      api('/query', pivotBody({ row: 'category', column: '', value: 'amount', aggregate: 'sum' })),
      api('/query', pivotBody({ row: 'category', column: '', value: 'category', aggregate: 'count' })),
      api('/query', pivotBody({ row: 'category', column: 'txmonth', value: 'amount', aggregate: 'sum' }))
    ]);

    renderSummaryCards(stateSums.pivot, stateCounts.pivot);
    renderCategoryBreakdown(catSums.pivot, catCounts.pivot);
    renderMonthlyCrosstab(monthly.pivot);
  } catch (err) {
    console.error('Dashboard load failed', err);
    showError(`Failed to load dashboard: ${err.message}`);
  }
}

// Pivot helper: build a { rowLabel -> value } map from a simple
// (single-column) pivot response.
function pivotSingleColumnMap(pivot) {
  const out = {};
  if (!pivot || !Array.isArray(pivot.rows)) return out;
  pivot.rows.forEach((row, i) => {
    const cell = Array.isArray(pivot.values) && Array.isArray(pivot.values[i]) ? pivot.values[i][0] : 0;
    out[row] = parseFloat(cell) || 0;
  });
  return out;
}

function renderSummaryCards(sumsPivot, countsPivot) {
  const sums = pivotSingleColumnMap(sumsPivot);
  const counts = pivotSingleColumnMap(countsPivot);

  const totalAmount = Object.values(sums).reduce((a, b) => a + b, 0);
  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);

  setText('totalAmount', formatCurrency(totalAmount));
  setText('totalCount', `${totalCount} expenses`);
  setText('pendingAmount', formatCurrency(sums['pending'] || 0));
  setText('pendingCount', `${counts['pending'] || 0} expenses`);
  setText('approvedAmount', formatCurrency(sums['approved'] || 0));
  setText('approvedCount', `${counts['approved'] || 0} expenses`);
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function renderCategoryBreakdown(sumsPivot, countsPivot) {
  const sums = pivotSingleColumnMap(sumsPivot);
  const counts = pivotSingleColumnMap(countsPivot);

  const entries = Object.entries(sums)
    .map(([cat, sum]) => ({ cat, sum, count: counts[cat] || 0 }))
    .sort((a, b) => b.sum - a.sum);

  const total = entries.reduce((s, e) => s + e.sum, 0);
  const max = entries.length ? entries[0].sum : 1;

  const chart = document.getElementById('categoryChart');
  const tbody = document.querySelector('#categoryTable tbody');
  if (!chart || !tbody) return;

  chart.innerHTML = '';
  tbody.innerHTML = '';

  entries.forEach(({ cat, sum, count }) => {
    const pct = total > 0 ? (sum / total * 100).toFixed(1) : '0.0';
    const barWidth = max > 0 ? (sum / max * 100).toFixed(1) : '0.0';
    const colorClass = getCategoryClass(cat);

    const bar = document.createElement('div');
    bar.className = `chart-bar cat-${colorClass}`;
    bar.innerHTML = `
      <span class="label">${esc(cat)}</span>
      <div class="bar-container">
        <div class="bar" style="width: ${barWidth}%"></div>
      </div>
      <span class="amount">${formatCurrency(sum)}</span>
    `;
    chart.appendChild(bar);

    const tr = document.createElement('tr');
    tr.className = 'clickable';
    tr.dataset.category = cat;
    tr.innerHTML = `
      <td><span class="category-badge ${colorClass}">${esc(cat)}</span></td>
      <td class="amount">${formatCurrency(sum)}</td>
      <td class="number">${count}</td>
      <td class="number">${pct}%</td>
    `;
    tbody.appendChild(tr);
  });

  tbody.addEventListener('click', (event) => {
    const row = event.target.closest('tr[data-category]');
    if (!row) return;
    window.location.href = `list.html?category=${encodeURIComponent(row.dataset.category)}`;
  });
}

function renderMonthlyCrosstab(pivot) {
  if (!pivot || !Array.isArray(pivot.rows)) return;

  const rowLabels = pivot.rows;
  const colLabels = pivot.columns || [];
  const values = pivot.values || [];
  const rowTotals = pivot.row_totals || [];
  const colTotals = pivot.column_totals || [];
  const grandTotal = (colTotals.length ? colTotals.reduce((a, b) => a + b, 0) : 0);

  // Sort rows by row total, descending
  const order = rowLabels
    .map((_, i) => i)
    .sort((a, b) => (rowTotals[b] || 0) - (rowTotals[a] || 0));

  const table = document.getElementById('monthlyTable');
  if (!table) return;

  const thead = table.querySelector('thead');
  thead.innerHTML = '';
  const headRow = document.createElement('tr');
  headRow.innerHTML = `<th>Category</th>${colLabels.map(c => `<th>${esc(monthLabel(c))}</th>`).join('')}<th>Total</th>`;
  thead.appendChild(headRow);

  const tbody = table.querySelector('tbody');
  tbody.innerHTML = '';

  order.forEach(i => {
    const cat = rowLabels[i];
    const colorClass = getCategoryClass(cat);
    const row = values[i] || [];
    const cells = colLabels.map((_, j) => `<td class="amount">${formatCurrency(row[j] || 0)}</td>`).join('');
    const rowTotal = rowTotals[i] || 0;
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><span class="category-badge ${colorClass}">${esc(cat)}</span></td>${cells}<td class="amount">${formatCurrency(rowTotal)}</td>`;
    tbody.appendChild(tr);
  });

  const totalRow = document.createElement('tr');
  totalRow.className = 'total-row';
  const totalCells = colLabels.map((_, j) => `<td class="amount"><strong>${formatCurrency(colTotals[j] || 0)}</strong></td>`).join('');
  totalRow.innerHTML = `<td><strong>Total</strong></td>${totalCells}<td class="amount"><strong>${formatCurrency(grandTotal)}</strong></td>`;
  tbody.appendChild(totalRow);
}

// ---------- add expense ----------

async function submitExpense(event) {
  event.preventDefault();
  const form = event.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  const originalLabel = submitBtn.textContent;
  submitBtn.textContent = 'Saving...';

  try {
    const formData = new FormData(form);
    const txdate = formData.get('txdate');
    const record = {
      expensecode: generateExpenseCode(),
      amount: parseFloat(formData.get('amount')).toFixed(2),
      category: formData.get('category'),
      company: formData.get('company'),
      detail: formData.get('detail'),
      txdate: txdate,
      txmonth: txdate.substring(0, 7),
      method: formData.get('method'),
      state: 'pending',
      submitter: formData.get('submitter') || 'Web User'
    };

    await api('/insert-record', { file: 'ledger', record });

    showSuccess('Expense submitted!');
    setTimeout(() => { window.location.href = 'list.html'; }, 1200);
  } catch (err) {
    showError(`Failed to submit: ${err.message}`);
    submitBtn.disabled = false;
    submitBtn.textContent = originalLabel;
  }
}

// ---------- expense list ----------

let allExpenses = [];
const listFilters = { category: '', month: '', status: '', search: '' };
let currentPage = 1;
const pageSize = 20;

async function loadExpenseList() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('category')) {
      listFilters.category = params.get('category');
      const el = document.getElementById('filterCategory');
      if (el) el.value = listFilters.category;
    }
    if (params.get('month')) {
      listFilters.month = params.get('month');
    }

    const data = await api('/query', {
      file: 'ledger',
      order_by: [{ field: 'txdate', dir: 'desc' }]
    });

    allExpenses = data.records || [];
    populateMonthFilter(allExpenses);

    const monthEl = document.getElementById('filterMonth');
    if (monthEl && listFilters.month) monthEl.value = listFilters.month;

    renderExpenseList();
  } catch (err) {
    console.error('List load failed', err);
    showError(`Failed to load expenses: ${err.message}`);
  }
}

function populateMonthFilter(expenses) {
  const select = document.getElementById('filterMonth');
  if (!select) return;
  const months = Array.from(new Set(expenses.map(e => e.txmonth).filter(Boolean))).sort().reverse();
  select.innerHTML = '<option value="">All Months</option>';
  months.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = monthLabel(m);
    select.appendChild(opt);
  });
}

function applyFilters() {
  listFilters.category = document.getElementById('filterCategory').value;
  listFilters.month = document.getElementById('filterMonth').value;
  listFilters.status = document.getElementById('filterStatus').value;
  listFilters.search = document.getElementById('filterSearch').value.toLowerCase();
  currentPage = 1;
  renderExpenseList();
}

function renderExpenseList() {
  const filtered = allExpenses.filter(exp => {
    if (listFilters.category && exp.category !== listFilters.category) return false;
    if (listFilters.month && exp.txmonth !== listFilters.month) return false;
    if (listFilters.status && exp.state !== listFilters.status) return false;
    if (listFilters.search) {
      const hay = `${exp.company || ''} ${exp.detail || ''} ${exp.submitter || ''}`.toLowerCase();
      if (!hay.includes(listFilters.search)) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);

  const tbody = document.querySelector('#expenseTable tbody');
  tbody.innerHTML = '';

  if (pageRows.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="7" class="empty-state">No expenses match your filters</td>';
    tbody.appendChild(tr);
  } else {
    pageRows.forEach(exp => {
      const colorClass = getCategoryClass(exp.category);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${esc(exp.txdate)}</td>
        <td><span class="category-badge ${colorClass}">${esc(exp.category)}</span></td>
        <td>${esc(exp.company)}</td>
        <td>${esc(exp.detail)}</td>
        <td class="amount">${formatCurrency(exp.amount)}</td>
        <td><span class="status-badge ${esc(exp.state)}">${esc(exp.state)}</span></td>
        <td><button class="btn btn-sm btn-secondary" data-action="edit" data-code="${esc(exp.expensecode)}">Edit</button></td>
      `;
      tbody.appendChild(tr);
    });
  }

  renderPagination(totalPages);

  const count = document.getElementById('expenseCount');
  if (count) count.textContent = `${filtered.length} expense${filtered.length !== 1 ? 's' : ''}`;
}

function renderPagination(totalPages) {
  const pagination = document.getElementById('pagination');
  if (!pagination) return;
  pagination.innerHTML = '';
  if (totalPages <= 1) return;

  const prev = document.createElement('button');
  prev.textContent = 'Prev';
  prev.disabled = currentPage === 1;
  prev.addEventListener('click', () => { currentPage--; renderExpenseList(); });
  pagination.appendChild(prev);

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.textContent = String(i);
    if (i === currentPage) btn.className = 'active';
    btn.addEventListener('click', () => { currentPage = i; renderExpenseList(); });
    pagination.appendChild(btn);
  }

  const next = document.createElement('button');
  next.textContent = 'Next';
  next.disabled = currentPage === totalPages;
  next.addEventListener('click', () => { currentPage++; renderExpenseList(); });
  pagination.appendChild(next);
}

function attachListActions() {
  const table = document.getElementById('expenseTable');
  if (!table) return;
  table.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-action="edit"]');
    if (!btn) return;
    openEditModal(btn.dataset.code);
  });
}

function openEditModal(expenseCode) {
  const expense = allExpenses.find(e => e.expensecode === expenseCode);
  if (!expense) return;

  document.getElementById('editExpenseId').value = expense.expensecode;
  document.getElementById('editAmount').value = expense.amount;
  document.getElementById('editCategory').value = expense.category;
  document.getElementById('editVendor').value = expense.company;
  document.getElementById('editDescription').value = expense.detail;
  document.getElementById('editTxdate').value = expense.txdate;
  document.getElementById('editMethod').value = expense.method;
  document.getElementById('editState').value = expense.state;

  document.getElementById('editModal').classList.add('active');
}

function closeModal() {
  document.getElementById('editModal').classList.remove('active');
}

async function saveExpense(event) {
  event.preventDefault();
  try {
    const expensecode = document.getElementById('editExpenseId').value;
    const txdate = document.getElementById('editTxdate').value;

    await api('/update-record', {
      file: 'ledger',
      where: { expensecode },
      set: {
        amount: parseFloat(document.getElementById('editAmount').value).toFixed(2),
        category: document.getElementById('editCategory').value,
        company: document.getElementById('editVendor').value,
        detail: document.getElementById('editDescription').value,
        txdate: txdate,
        txmonth: txdate.substring(0, 7),
        method: document.getElementById('editMethod').value,
        state: document.getElementById('editState').value
      }
    });

    closeModal();
    showSuccess('Expense updated');
    loadExpenseList();
  } catch (err) {
    showError(`Failed to update: ${err.message}`);
  }
}

// ---------- review (approve/reject pending) ----------

async function loadReviewList() {
  try {
    const data = await api('/query', {
      file: 'ledger',
      where: [{ field: 'state', op: 'eq', value: 'pending' }],
      order_by: [{ field: 'txdate', dir: 'desc' }]
    });
    renderReviewList(data.records || []);
  } catch (err) {
    console.error('Review load failed', err);
    showError(`Failed to load pending expenses: ${err.message}`);
  }
}

function renderReviewList(rows) {
  const tbody = document.querySelector('#reviewTable tbody');
  const count = document.getElementById('pendingCountLabel');
  if (!tbody) return;

  tbody.innerHTML = '';
  if (count) count.textContent = `${rows.length} pending expense${rows.length !== 1 ? 's' : ''}`;

  if (rows.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="7" class="empty-state">No expenses awaiting review. Nice.</td>';
    tbody.appendChild(tr);
    return;
  }

  rows.forEach(exp => {
    const colorClass = getCategoryClass(exp.category);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${esc(exp.txdate)}</td>
      <td><span class="category-badge ${colorClass}">${esc(exp.category)}</span></td>
      <td>${esc(exp.company)}</td>
      <td>${esc(exp.detail)}</td>
      <td class="amount">${formatCurrency(exp.amount)}</td>
      <td>${esc(exp.submitter)}</td>
      <td>
        <button class="btn btn-sm btn-primary" data-action="approve" data-code="${esc(exp.expensecode)}">Approve</button>
        <button class="btn btn-sm btn-secondary" data-action="reject" data-code="${esc(exp.expensecode)}">Reject</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function attachReviewActions() {
  const table = document.getElementById('reviewTable');
  if (!table) return;
  table.addEventListener('click', async (event) => {
    const btn = event.target.closest('button[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const code = btn.dataset.code;
    if (action === 'approve') await setExpenseState(code, 'approved', btn);
    else if (action === 'reject') await setExpenseState(code, 'rejected', btn);
  });
}

async function setExpenseState(expensecode, newState, btn) {
  btn.disabled = true;
  try {
    await api('/update-record', {
      file: 'ledger',
      where: { expensecode },
      set: { state: newState }
    });
    showSuccess(`Expense ${newState}`);
    loadReviewList();
  } catch (err) {
    showError(`Failed: ${err.message}`);
    btn.disabled = false;
  }
}

// ---------- export ----------

async function exportData() {
  const startDate = document.getElementById('exportStartDate').value;
  const endDate = document.getElementById('exportEndDate').value;
  const format = document.querySelector('.export-option.selected')?.dataset.format || 'csv';

  const btn = document.getElementById('exportBtn');
  btn.disabled = true;
  const originalLabel = btn.textContent;
  btn.textContent = 'Generating...';

  try {
    // Build a WHERE clause for the date range when the caller provides one.
    // Chaprola /query WHERE is an array of {field, op, value} objects.
    const where = [];
    if (startDate) where.push({ field: 'txdate', op: 'ge', value: startDate });
    if (endDate) where.push({ field: 'txdate', op: 'le', value: endDate });

    const body = {
      file: 'ledger',
      order_by: [{ field: 'txdate', dir: 'asc' }]
    };
    if (where.length) body.where = where;

    const data = await api('/query', body);
    const records = data.records || [];
    if (records.length === 0) {
      showError('No expenses match the selected date range.');
      return;
    }

    const columns = ['txdate', 'category', 'company', 'detail', 'amount', 'state', 'submitter'];
    const filename = `expenses-${startDate || 'all'}-to-${endDate || 'now'}.${format}`;

    let blob;
    if (format === 'json') {
      blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
    } else {
      blob = new Blob([recordsToCsv(records, columns)], { type: 'text/csv' });
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showSuccess(`Exported ${records.length} expenses as ${format.toUpperCase()}`);
  } catch (err) {
    showError(`Export failed: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
}

function recordsToCsv(records, columns) {
  const escapeCell = (v) => {
    const s = v == null ? '' : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = columns.join(',');
  const rows = records.map(r => columns.map(c => escapeCell(r[c])).join(','));
  return [header, ...rows].join('\n') + '\n';
}

function selectFormat(format) {
  document.querySelectorAll('.export-option').forEach(el => el.classList.remove('selected'));
  const chosen = document.querySelector(`.export-option[data-format="${format}"]`);
  if (chosen) chosen.classList.add('selected');
}

// ---------- page wiring ----------

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('categoryChart')) {
    loadDashboard();
  }
  if (document.getElementById('expenseTable')) {
    attachListActions();
    loadExpenseList();
    ['filterCategory', 'filterMonth', 'filterStatus'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', applyFilters);
    });
    const search = document.getElementById('filterSearch');
    if (search) search.addEventListener('input', applyFilters);
  }
  if (document.getElementById('reviewTable')) {
    attachReviewActions();
    loadReviewList();
  }
  const addForm = document.getElementById('addExpenseForm');
  if (addForm) {
    addForm.addEventListener('submit', submitExpense);
    const txdate = document.getElementById('txdate');
    if (txdate && !txdate.value) txdate.valueAsDate = new Date();
  }
  const editForm = document.getElementById('editExpenseForm');
  if (editForm) editForm.addEventListener('submit', saveExpense);
  const modalClose = document.getElementById('editModalClose');
  if (modalClose) modalClose.addEventListener('click', closeModal);
  const modalCancel = document.getElementById('editModalCancel');
  if (modalCancel) modalCancel.addEventListener('click', closeModal);
  const modalOverlay = document.getElementById('editModal');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });
  }
  document.querySelectorAll('.export-option').forEach(el => {
    el.addEventListener('click', () => selectFormat(el.dataset.format));
  });
  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) exportBtn.addEventListener('click', exportData);
});
