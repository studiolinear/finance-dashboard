let DATA = null;
let dirty = false;

const $ = (id) => document.getElementById(id);
const fmtMoney = (n) => '$' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function initials(name) {
  return (name || '')
    .trim()
    .split(/\s+/)
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function parseProgress(planText) {
  if (!planText) return 0;
  const pctMatch = planText.match(/(\d+)\s*%/);
  if (pctMatch) return Math.min(100, parseInt(pctMatch[1], 10));
  const fracMatch = planText.match(/(\d+)\s*of\s*(\d+)/i);
  if (fracMatch) {
    const n = parseInt(fracMatch[1], 10);
    const d = parseInt(fracMatch[2], 10);
    if (d > 0) return Math.min(100, Math.round((n / d) * 100));
  }
  return 0;
}

function statusClass(status) {
  if (status === 'PAID') return '';
  if (status === 'OVERDUE') return 'status-overdue';
  return 'status-awaiting';
}

async function loadData() {
  const res = await fetch('/api/dashboard');
  DATA = await res.json();
  render();
}

function render() {
  renderHeader();
  renderRows();
  recompute();
}

function renderHeader() {
  const h = DATA.header;
  $('companyName').textContent = h.companyName;
  $('badge').textContent = h.badge;
  $('title').textContent = h.title;
  $('month').textContent = h.month;
  $('reportDate').textContent = h.reportDate;
  $('tagline').textContent = h.tagline;
  if (h.logoUrl) {
    $('logoImg').src = h.logoUrl;
    $('logoImg').style.display = 'block';
    $('logoPlaceholder').style.display = 'none';
  } else {
    $('logoImg').style.display = 'none';
    $('logoPlaceholder').style.display = 'block';
  }
}

function renderRows() {
  const tbody = $('clientRows');
  const tpl = $('rowTemplate');
  tbody.innerHTML = '';
  DATA.clients.forEach((client) => {
    const row = tpl.content.firstElementChild.cloneNode(true);
    row.dataset.id = client.id;

    row.querySelector('.avatar').textContent = initials(client.name);
    row.querySelector('[data-field="name"]').textContent = client.name;
    row.querySelector('[data-field="paymentPlan"]').textContent = client.paymentPlan;
    row.querySelector('.progress-fill').style.width = parseProgress(client.paymentPlan) + '%';
    row.querySelector('[data-field="invoiceNumber"]').textContent = client.invoiceNumber;
    row.querySelector('[data-field="amount"]').textContent = (Number(client.amount) || 0).toFixed(2);
    row.querySelector('[data-field="invoiceDate"]').textContent = client.invoiceDate;
    row.querySelector('[data-field="dueDate"]').textContent = client.dueDate;
    row.querySelector('[data-field="paymentDate"]').textContent = client.paymentDate;

    const select = row.querySelector('.status-select');
    select.value = client.status;
    select.className = 'status-select ' + statusClass(client.status);
    select.addEventListener('change', () => {
      client.status = select.value;
      select.className = 'status-select ' + statusClass(select.value);
      markDirty();
      recompute();
    });

    row.querySelectorAll('.editable').forEach((el) => {
      el.addEventListener('input', () => {
        const field = el.dataset.field;
        let val = el.textContent.trim();
        if (field === 'amount') {
          const num = parseFloat(val.replace(/[^0-9.\-]/g, '')) || 0;
          client.amount = num;
        } else {
          client[field] = val;
        }
        if (field === 'name') row.querySelector('.avatar').textContent = initials(val);
        if (field === 'paymentPlan') row.querySelector('.progress-fill').style.width = parseProgress(val) + '%';
        markDirty();
        recompute();
      });
    });

    row.querySelector('.btn-remove').addEventListener('click', () => {
      DATA.clients = DATA.clients.filter(c => c.id !== client.id);
      markDirty();
      render();
    });

    tbody.appendChild(row);
  });
}

function recompute() {
  const clients = DATA.clients;
  const totalBilled = clients.reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const collected = clients.filter(c => c.status === 'PAID').reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const outstanding = totalBilled - collected;
  const rate = totalBilled > 0 ? (collected / totalBilled) * 100 : 0;
  const paidCount = clients.filter(c => c.status === 'PAID').length;
  const overdueCount = clients.filter(c => c.status === 'OVERDUE').length;
  const awaitingCount = clients.filter(c => c.status === 'AWAITING CONTRACT' || c.status === 'PENDING').length;

  $('statBilled').textContent = fmtMoney(totalBilled);
  $('statCollected').textContent = fmtMoney(collected);
  $('statCollectedPct').textContent = rate.toFixed(1) + '%';
  $('statOutstanding').textContent = fmtMoney(outstanding);
  $('statOutstandingPct').textContent = (100 - rate).toFixed(1) + '%';
  $('statRate').textContent = rate.toFixed(1) + '%';
  $('statRateSub').textContent = `${paidCount} of ${clients.length} paid`;

  $('donutPct').textContent = rate.toFixed(1) + '%';
  $('donut').style.background = `conic-gradient(var(--red) ${rate * 3.6}deg, var(--gray-line) 0deg)`;
  $('legendCollected').textContent = fmtMoney(collected);
  $('legendOutstanding').textContent = fmtMoney(outstanding);

  $('sumPaid').textContent = paidCount;
  $('sumOverdue').textContent = overdueCount;
  $('sumAwaiting').textContent = awaitingCount;
  $('sumOutstandingAmt').textContent = fmtMoney(outstanding);
}

function markDirty() {
  dirty = true;
  $('saveStatus').textContent = 'Unsaved changes';
}

async function saveAll() {
  // pull header contenteditable values back into DATA
  DATA.header.companyName = $('companyName').textContent.trim();
  DATA.header.badge = $('badge').textContent.trim();
  DATA.header.title = $('title').textContent.trim();
  DATA.header.month = $('month').textContent.trim();
  DATA.header.reportDate = $('reportDate').textContent.trim();
  DATA.header.tagline = $('tagline').textContent.trim();

  $('saveStatus').textContent = 'Saving…';
  const res = await fetch('/api/dashboard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(DATA)
  });
  if (res.ok) {
    dirty = false;
    $('saveStatus').textContent = 'All changes saved';
  } else {
    $('saveStatus').textContent = 'Save failed — try again';
  }
}

function addClient() {
  const id = 'c' + Date.now();
  DATA.clients.push({
    id,
    name: 'New Client',
    paymentPlan: '1 of 1',
    invoiceNumber: '—',
    amount: 0,
    invoiceDate: '—',
    dueDate: '—',
    paymentDate: '—',
    status: 'PENDING'
  });
  markDirty();
  render();
}

async function uploadLogo(file) {
  const fd = new FormData();
  fd.append('logo', file);
  const res = await fetch('/api/logo', { method: 'POST', body: fd });
  const json = await res.json();
  if (json.logoUrl) {
    DATA.header.logoUrl = json.logoUrl;
    renderHeader();
    $('saveStatus').textContent = 'All changes saved';
  } else {
    alert(json.error || 'Upload failed');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadData();

  $('saveBtn').addEventListener('click', saveAll);
  $('addRowBtn').addEventListener('click', addClient);

  $('logoUpload').addEventListener('click', () => $('logoInput').click());
  $('logoInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) uploadLogo(file);
  });

  document.querySelectorAll('[data-field]').forEach((el) => {
    if (el.tagName === 'H1' || el.tagName === 'H2' || el.tagName === 'DIV' || el.tagName === 'SPAN' || el.tagName === 'FOOTER') {
      el.addEventListener('input', markDirty);
    }
  });

  window.addEventListener('beforeunload', (e) => {
    if (dirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  // Ctrl/Cmd+S to save
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveAll();
    }
  });
});
