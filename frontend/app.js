/**
 * Chaprola Expenses - Frontend Application
 *
 * This app demonstrates Chaprola's business data lifecycle:
 * - Query with aggregation (pivot as GROUP BY)
 * - CRUD operations via proxy
 * - Export to PDF/CSV
 */

const CHAPROLA_API = 'https://api.chaprola.org';
const SITE_KEY = 'site_a5e1cae8c6ce82305e66546a5638703e0897300914e816d11178fde15733b974';
const USERID = 'chaprola-expenses';
const PROJECT = 'expenses';

// Category color mapping
const categoryColors = {
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

// Helper: Format currency
function formatCurrency(amount) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(num);
}

// Helper: Get category CSS class
function getCategoryClass(category) {
  return categoryColors[category] || 'default';
}

// Helper: API call to Chaprola
async function chaprolaCall(endpoint, body = {}) {
  try {
    const response = await fetch(`${CHAPROLA_API}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SITE_KEY}`
      },
      body: JSON.stringify({ userid: USERID, project: PROJECT, ...body })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API request failed');
    }
    return await response.json();
  } catch (err) {
    console.error('API Error:', err);
    throw err;
  }
}

// ============ Dashboard ============

async function loadDashboard() {
  try {
    // Load all data via proxy query
    const data = await chaprolaCall('/query', {
      file: 'ledger'
    });

    if (!data.records || data.records.length === 0) {
      showEmptyState();
      return;
    }

    const records = data.records;

    // Calculate summary totals
    let totalAmount = 0;
    let pendingAmount = 0;
    let approvedAmount = 0;
    let pendingCount = 0;
    let approvedCount = 0;

    records.forEach(r => {
      const amount = parseFloat(r.amount) || 0;
      totalAmount += amount;
      if (r.state === 'pending') {
        pendingAmount += amount;
        pendingCount++;
      } else if (r.state === 'approved') {
        approvedAmount += amount;
        approvedCount++;
      }
    });

    // Update summary cards
    document.getElementById('totalAmount').textContent = formatCurrency(totalAmount);
    document.getElementById('totalCount').textContent = `${records.length} expenses`;
    document.getElementById('pendingAmount').textContent = formatCurrency(pendingAmount);
    document.getElementById('pendingCount').textContent = `${pendingCount} expenses`;
    document.getElementById('approvedAmount').textContent = formatCurrency(approvedAmount);
    document.getElementById('approvedCount').textContent = `${approvedCount} expenses`;

    // Calculate category breakdown (pivot simulation)
    const categoryTotals = {};
    records.forEach(r => {
      const cat = r.category;
      const amount = parseFloat(r.amount) || 0;
      if (!categoryTotals[cat]) {
        categoryTotals[cat] = { sum: 0, count: 0 };
      }
      categoryTotals[cat].sum += amount;
      categoryTotals[cat].count++;
    });

    // Sort categories by amount
    const sortedCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1].sum - a[1].sum);

    const maxAmount = sortedCategories[0]?.[1].sum || 1;

    // Render category chart
    const chartContainer = document.getElementById('categoryChart');
    chartContainer.innerHTML = sortedCategories.map(([cat, data]) => {
      const percentage = (data.sum / totalAmount * 100).toFixed(1);
      const barWidth = (data.sum / maxAmount * 100).toFixed(1);
      const colorClass = getCategoryClass(cat);
      return `
        <div class="chart-bar cat-${colorClass}">
          <span class="label">${cat}</span>
          <div class="bar-container">
            <div class="bar" style="width: ${barWidth}%"></div>
          </div>
          <span class="amount">${formatCurrency(data.sum)}</span>
        </div>
      `;
    }).join('');

    // Render category table
    const categoryTable = document.querySelector('#categoryTable tbody');
    categoryTable.innerHTML = sortedCategories.map(([cat, data]) => {
      const percentage = (data.sum / totalAmount * 100).toFixed(1);
      const colorClass = getCategoryClass(cat);
      return `
        <tr class="clickable" onclick="filterByCategory('${cat}')">
          <td><span class="category-badge ${colorClass}">${cat}</span></td>
          <td class="amount">${formatCurrency(data.sum)}</td>
          <td class="number">${data.count}</td>
          <td class="number">${percentage}%</td>
        </tr>
      `;
    }).join('');

    // Calculate monthly cross-tabulation
    const monthlyData = {};
    const months = ['2026-01', '2026-02', '2026-03'];

    records.forEach(r => {
      const cat = r.category;
      const month = r.txmonth;
      const amount = parseFloat(r.amount) || 0;
      if (!monthlyData[cat]) {
        monthlyData[cat] = { '2026-01': 0, '2026-02': 0, '2026-03': 0, total: 0 };
      }
      if (months.includes(month)) {
        monthlyData[cat][month] += amount;
        monthlyData[cat].total += amount;
      }
    });

    // Sort by total
    const sortedMonthly = Object.entries(monthlyData)
      .sort((a, b) => b[1].total - a[1].total);

    // Calculate monthly totals
    const monthTotals = { '2026-01': 0, '2026-02': 0, '2026-03': 0, total: 0 };
    sortedMonthly.forEach(([cat, data]) => {
      months.forEach(m => {
        monthTotals[m] += data[m];
      });
      monthTotals.total += data.total;
    });

    // Render monthly table
    const monthlyTable = document.querySelector('#monthlyTable tbody');
    monthlyTable.innerHTML = sortedMonthly.map(([cat, data]) => {
      const colorClass = getCategoryClass(cat);
      return `
        <tr>
          <td><span class="category-badge ${colorClass}">${cat}</span></td>
          <td class="amount">${formatCurrency(data['2026-01'])}</td>
          <td class="amount">${formatCurrency(data['2026-02'])}</td>
          <td class="amount">${formatCurrency(data['2026-03'])}</td>
          <td class="amount">${formatCurrency(data.total)}</td>
        </tr>
      `;
    }).join('') + `
      <tr class="total-row">
        <td><strong>Total</strong></td>
        <td class="amount"><strong>${formatCurrency(monthTotals['2026-01'])}</strong></td>
        <td class="amount"><strong>${formatCurrency(monthTotals['2026-02'])}</strong></td>
        <td class="amount"><strong>${formatCurrency(monthTotals['2026-03'])}</strong></td>
        <td class="amount"><strong>${formatCurrency(monthTotals.total)}</strong></td>
      </tr>
    `;

  } catch (err) {
    console.error('Failed to load dashboard:', err);
    showError('Failed to load dashboard data. Make sure the proxy server is running.');
  }
}

function filterByCategory(category) {
  window.location.href = `list.html?category=${encodeURIComponent(category)}`;
}

function showEmptyState() {
  document.querySelector('.content').innerHTML = `
    <div class="empty-state">
      <h4>No Expenses Found</h4>
      <p>Run the setup script to import seed data, or add your first expense.</p>
      <a href="add.html" class="btn btn-primary" style="margin-top: 1rem;">Add Expense</a>
    </div>
  `;
}

function showError(message) {
  const content = document.querySelector('.content');
  const alert = document.createElement('div');
  alert.className = 'alert alert-error';
  alert.textContent = message;
  content.prepend(alert);
}

// ============ Add Expense ============

async function submitExpense(event) {
  event.preventDefault();
  const form = event.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving...';

  try {
    const formData = new FormData(form);
    const txdate = formData.get('txdate');
    const expense = {
      expensecode: `EXP-${Date.now()}`,
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

    await chaprolaCall('/insert-record', {
      file: 'ledger',
      record: expense
    });

    // Show success and redirect
    showSuccess('Expense submitted successfully!');
    setTimeout(() => {
      window.location.href = 'list.html';
    }, 1500);

  } catch (err) {
    showError('Failed to submit expense: ' + err.message);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Expense';
  }
}

function showSuccess(message) {
  const content = document.querySelector('.content');
  const alert = document.createElement('div');
  alert.className = 'alert alert-success';
  alert.textContent = message;
  content.prepend(alert);
}

// ============ Expense List ============

let allExpenses = [];
let currentFilters = {
  category: '',
  month: '',
  status: '',
  search: ''
};
let currentPage = 1;
const pageSize = 20;

async function loadExpenseList() {
  try {
    // Check URL params for initial filters
    const params = new URLSearchParams(window.location.search);
    if (params.get('category')) {
      currentFilters.category = params.get('category');
      document.getElementById('filterCategory').value = currentFilters.category;
    }
    if (params.get('month')) {
      currentFilters.month = params.get('month');
      document.getElementById('filterMonth').value = currentFilters.month;
    }

    const data = await chaprolaCall('/query', {
      file: 'ledger',
      order_by: [{ field: 'txdate', dir: 'desc' }]
    });

    allExpenses = data.records || [];
    renderExpenseList();

  } catch (err) {
    console.error('Failed to load expenses:', err);
    showError('Failed to load expense list. Make sure the proxy server is running.');
  }
}

function applyFilters() {
  currentFilters.category = document.getElementById('filterCategory').value;
  currentFilters.month = document.getElementById('filterMonth').value;
  currentFilters.status = document.getElementById('filterStatus').value;
  currentFilters.search = document.getElementById('filterSearch').value.toLowerCase();
  currentPage = 1;
  renderExpenseList();
}

function renderExpenseList() {
  // Apply filters
  let filtered = allExpenses.filter(exp => {
    if (currentFilters.category && exp.category !== currentFilters.category) return false;
    if (currentFilters.month && exp.txmonth !== currentFilters.month) return false;
    if (currentFilters.status && exp.state !== currentFilters.status) return false;
    if (currentFilters.search) {
      const searchStr = `${exp.company} ${exp.detail} ${exp.submitter}`.toLowerCase();
      if (!searchStr.includes(currentFilters.search)) return false;
    }
    return true;
  });

  // Calculate pagination
  const totalPages = Math.ceil(filtered.length / pageSize);
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const pageExpenses = filtered.slice(start, end);

  // Render table
  const tbody = document.querySelector('#expenseTable tbody');
  if (pageExpenses.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">No expenses match your filters</td>
      </tr>
    `;
  } else {
    tbody.innerHTML = pageExpenses.map(exp => {
      const colorClass = getCategoryClass(exp.category);
      return `
        <tr>
          <td>${exp.txdate}</td>
          <td><span class="category-badge ${colorClass}">${exp.category}</span></td>
          <td>${exp.company}</td>
          <td>${exp.detail}</td>
          <td class="amount">${formatCurrency(exp.amount)}</td>
          <td><span class="status-badge ${exp.state}">${exp.state}</span></td>
          <td>
            <button class="btn btn-sm btn-secondary" onclick="editExpense('${exp.expensecode}')">Edit</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Render pagination
  const pagination = document.getElementById('pagination');
  if (totalPages > 1) {
    let html = `
      <button ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">Prev</button>
    `;
    for (let i = 1; i <= totalPages; i++) {
      html += `<button class="${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
    }
    html += `
      <button ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">Next</button>
    `;
    pagination.innerHTML = html;
  } else {
    pagination.innerHTML = '';
  }

  // Update count
  document.getElementById('expenseCount').textContent = `${filtered.length} expense${filtered.length !== 1 ? 's' : ''}`;
}

function changePage(page) {
  currentPage = page;
  renderExpenseList();
}

async function deleteExpense(expenseId) {
  // Note: /delete-record is not allowed for site keys
  // This functionality is disabled in the frontend-only version
  showError('Delete functionality requires backend proxy (not available with site keys)');
}

function editExpense(expenseId) {
  const expense = allExpenses.find(e => e.expensecode === expenseId);
  if (!expense) return;

  // Populate modal
  document.getElementById('editExpenseId').value = expense.expensecode;
  document.getElementById('editAmount').value = expense.amount;
  document.getElementById('editCategory').value = expense.category;
  document.getElementById('editVendor').value = expense.company;
  document.getElementById('editDescription').value = expense.detail;
  document.getElementById('editTxdate').value = expense.txdate;
  document.getElementById('editMethod').value = expense.method;
  document.getElementById('editState').value = expense.state;

  // Show modal
  document.getElementById('editModal').classList.add('active');
}

function closeModal() {
  document.getElementById('editModal').classList.remove('active');
}

async function saveExpense(event) {
  event.preventDefault();
  const form = event.target;

  try {
    const expenseId = document.getElementById('editExpenseId').value;
    const txdate = document.getElementById('editTxdate').value;

    await chaprolaCall('/update-record', {
      file: 'ledger',
      where: { expensecode: expenseId },
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
    showSuccess('Expense updated successfully');
    loadExpenseList(); // Reload data

  } catch (err) {
    showError('Failed to update expense: ' + err.message);
  }
}

// ============ Export ============

let selectedFormat = 'csv';

function selectFormat(format) {
  selectedFormat = format;
  document.querySelectorAll('.export-option').forEach(el => {
    el.classList.remove('selected');
  });
  document.querySelector(`.export-option[data-format="${format}"]`).classList.add('selected');
}

async function exportData() {
  const startDate = document.getElementById('exportStartDate').value;
  const endDate = document.getElementById('exportEndDate').value;

  try {
    const exportBtn = document.getElementById('exportBtn');
    exportBtn.disabled = true;
    exportBtn.textContent = 'Generating...';

    const result = await chaprolaCall('/export-report', {
      name: 'DETAIL',
      format: selectedFormat,
      startDate,
      endDate
    });

    if (result.download_url) {
      // Trigger download
      window.open(result.download_url, '_blank');
      showSuccess(`Export complete! Downloaded ${selectedFormat.toUpperCase()} file.`);
    } else {
      showError('Export generated but no download URL returned');
    }

    exportBtn.disabled = false;
    exportBtn.textContent = 'Export';

  } catch (err) {
    showError('Export failed: ' + err.message);
    document.getElementById('exportBtn').disabled = false;
    document.getElementById('exportBtn').textContent = 'Export';
  }
}
