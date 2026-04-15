// ===== Data Storage =====
const MEDICINES_KEY = 'mt_medicines';
const LOG_KEY = 'mt_log';

function loadMedicines() {
  try {
    return JSON.parse(localStorage.getItem(MEDICINES_KEY)) || [];
  } catch {
    return [];
  }
}

function saveMedicines(list) {
  localStorage.setItem(MEDICINES_KEY, JSON.stringify(list));
}

function loadLog() {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY)) || [];
  } catch {
    return [];
  }
}

function saveLog(list) {
  localStorage.setItem(LOG_KEY, JSON.stringify(list));
}

// ===== Utilities =====
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatDatetime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateOnly(isoString) {
  const d = new Date(isoString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function localDatetimeValue(date) {
  const d = date || new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ===== Colour swatches =====
const PALETTE = [
  '#e53e3e', '#dd6b20', '#d69e2e', '#38a169',
  '#3182ce', '#805ad5', '#d53f8c', '#2c7a7b',
  '#2d3748', '#718096',
];

// ===== Toast =====
let toastTimer;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

// ===== Tab switching =====
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });
}

// ===== Medicines Tab =====
let editingMedicineId = null;

function renderMedicines() {
  const medicines = loadMedicines();
  const container = document.getElementById('medicine-list');

  // Keep the add-form select in sync
  populateMedicineSelect();
  updateStats();

  if (!medicines.length) {
    container.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
        </svg>
        <p>No medicines added yet. Add one above!</p>
      </div>`;
    return;
  }

  container.innerHTML = medicines.map(m => `
    <div class="medicine-card" data-id="${escapeHtml(m.id)}">
      <div class="medicine-color-bar" style="background:${escapeHtml(m.color)}"></div>
      <div class="medicine-card-body">
        <div class="medicine-card-info">
          <div class="medicine-card-name">${escapeHtml(m.name)}</div>
          <div class="medicine-meta">
            ${m.dosage ? `<span>💊 ${escapeHtml(m.dosage)}</span>` : ''}
            ${m.timing ? `<span>⏰ ${escapeHtml(m.timing)}</span>` : ''}
            ${m.notes ? `<span>📝 ${escapeHtml(m.notes)}</span>` : ''}
          </div>
        </div>
        <div class="medicine-card-actions">
          <button class="btn btn-ghost btn-sm" onclick="editMedicine('${escapeHtml(m.id)}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteMedicine('${escapeHtml(m.id)}')">Delete</button>
        </div>
      </div>
    </div>
  `).join('');
}

function initMedicineForm() {
  const form = document.getElementById('medicine-form');
  const colorInput = document.getElementById('med-color');
  const swatchContainer = document.getElementById('color-swatches');

  // Render swatches
  swatchContainer.innerHTML = PALETTE.map(c => `
    <div class="swatch" data-color="${c}" style="background:${c}" title="${c}"></div>
  `).join('');

  swatchContainer.querySelectorAll('.swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      colorInput.value = swatch.dataset.color;
      updateSwatchSelection(swatch.dataset.color);
    });
  });

  colorInput.addEventListener('input', () => updateSwatchSelection(colorInput.value));

  // Set default colour
  colorInput.value = PALETTE[4];
  updateSwatchSelection(PALETTE[4]);

  form.addEventListener('submit', e => {
    e.preventDefault();
    saveMedicineForm();
  });

  document.getElementById('med-cancel').addEventListener('click', resetMedicineForm);
}

function updateSwatchSelection(color) {
  document.querySelectorAll('#color-swatches .swatch').forEach(s => {
    s.classList.toggle('selected', s.dataset.color.toLowerCase() === color.toLowerCase());
  });
}

function saveMedicineForm() {
  const name = document.getElementById('med-name').value.trim();
  const color = document.getElementById('med-color').value;
  const dosage = document.getElementById('med-dosage').value.trim();
  const timing = document.getElementById('med-timing').value.trim();
  const notes = document.getElementById('med-info').value.trim();

  if (!name) {
    showToast('Please enter a medicine name.');
    return;
  }

  const medicines = loadMedicines();

  if (editingMedicineId) {
    const idx = medicines.findIndex(m => m.id === editingMedicineId);
    if (idx !== -1) {
      medicines[idx] = { ...medicines[idx], name, color, dosage, timing, notes };
      showToast(`"${name}" updated.`);
    }
  } else {
    medicines.push({ id: uid(), name, color, dosage, timing, notes });
    showToast(`"${name}" added.`);
  }

  saveMedicines(medicines);
  resetMedicineForm();
  renderMedicines();
  renderLog();
}

function resetMedicineForm() {
  editingMedicineId = null;
  document.getElementById('medicine-form').reset();
  document.getElementById('med-color').value = PALETTE[4];
  updateSwatchSelection(PALETTE[4]);
  document.getElementById('med-form-title').textContent = 'Add Medicine';
  document.getElementById('med-submit').textContent = 'Add Medicine';
  document.getElementById('med-cancel').style.display = 'none';
}

function editMedicine(id) {
  const m = loadMedicines().find(m => m.id === id);
  if (!m) return;
  editingMedicineId = id;

  document.getElementById('med-name').value = m.name;
  document.getElementById('med-color').value = m.color;
  document.getElementById('med-dosage').value = m.dosage || '';
  document.getElementById('med-timing').value = m.timing || '';
  document.getElementById('med-info').value = m.notes || '';
  updateSwatchSelection(m.color);

  document.getElementById('med-form-title').textContent = 'Edit Medicine';
  document.getElementById('med-submit').textContent = 'Save Changes';
  document.getElementById('med-cancel').style.display = '';

  document.getElementById('med-name').scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.getElementById('med-name').focus();
}

function deleteMedicine(id) {
  const medicines = loadMedicines();
  const m = medicines.find(m => m.id === id);
  if (!m) return;
  if (!confirm(`Delete "${m.name}"? All log entries for this medicine will also be removed.`)) return;

  saveMedicines(medicines.filter(m => m.id !== id));
  const log = loadLog().filter(e => e.medicineId !== id);
  saveLog(log);
  showToast(`"${m.name}" deleted.`);
  renderMedicines();
  renderLog();
}

// ===== Log Tab =====
let editingLogId = null;

function populateMedicineSelect(selectId = 'log-medicine') {
  const select = document.getElementById(selectId);
  if (!select) return;
  const medicines = loadMedicines();
  const current = select.value;
  select.innerHTML = '<option value="">— Select a medicine —</option>' +
    medicines.map(m => `<option value="${escapeHtml(m.id)}">${escapeHtml(m.name)}</option>`).join('');
  if (current) select.value = current;
}

function initLogForm() {
  const form = document.getElementById('log-form');
  document.getElementById('log-datetime').value = localDatetimeValue();

  form.addEventListener('submit', e => {
    e.preventDefault();
    saveLogForm();
  });

  document.getElementById('log-cancel').addEventListener('click', resetLogForm);
}

function saveLogForm() {
  const medicineId = document.getElementById('log-medicine').value;
  const datetime = document.getElementById('log-datetime').value;
  const notes = document.getElementById('log-notes').value.trim();

  if (!medicineId) { showToast('Please select a medicine.'); return; }
  if (!datetime) { showToast('Please select a date and time.'); return; }

  const medicines = loadMedicines();
  const med = medicines.find(m => m.id === medicineId);
  if (!med) { showToast('Medicine not found.'); return; }

  const log = loadLog();

  if (editingLogId) {
    const idx = log.findIndex(e => e.id === editingLogId);
    if (idx !== -1) {
      log[idx] = { ...log[idx], medicineId, datetime, notes };
      showToast('Entry updated.');
    }
  } else {
    log.push({ id: uid(), medicineId, datetime, notes });
    showToast(`Logged ${med.name}.`);
  }

  saveLog(log);
  resetLogForm();
  renderLog();
  updateStats();
}

function resetLogForm() {
  editingLogId = null;
  document.getElementById('log-form').reset();
  document.getElementById('log-datetime').value = localDatetimeValue();
  document.getElementById('log-form-title').textContent = 'Log a Dose';
  document.getElementById('log-submit').textContent = 'Log Dose';
  document.getElementById('log-cancel').style.display = 'none';
}

function editLogEntry(id) {
  const entry = loadLog().find(e => e.id === id);
  if (!entry) return;
  editingLogId = id;

  populateMedicineSelect('log-medicine');
  document.getElementById('log-medicine').value = entry.medicineId;
  document.getElementById('log-datetime').value = entry.datetime;
  document.getElementById('log-notes').value = entry.notes || '';

  document.getElementById('log-form-title').textContent = 'Edit Log Entry';
  document.getElementById('log-submit').textContent = 'Save Changes';
  document.getElementById('log-cancel').style.display = '';

  // Switch to log tab if needed
  document.querySelector('[data-tab="tab-log"]').click();
  document.getElementById('log-medicine').scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.getElementById('log-medicine').focus();
}

function deleteLogEntry(id) {
  if (!confirm('Delete this log entry?')) return;
  const log = loadLog().filter(e => e.id !== id);
  saveLog(log);
  showToast('Entry deleted.');
  renderLog();
  updateStats();
}

function renderLog() {
  const medicines = loadMedicines();
  const medicineMap = Object.fromEntries(medicines.map(m => [m.id, m]));
  const log = loadLog().slice().sort((a, b) => new Date(b.datetime) - new Date(a.datetime));

  const container = document.getElementById('log-list');

  // Filters
  const filterMed = document.getElementById('filter-medicine')?.value || '';
  const filterDate = document.getElementById('filter-date')?.value || '';

  const filtered = log.filter(e => {
    if (filterMed && e.medicineId !== filterMed) return false;
    if (filterDate && !e.datetime.startsWith(filterDate)) return false;
    return true;
  });

  if (!filtered.length) {
    container.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
          <rect x="9" y="3" width="6" height="4" rx="1"/>
          <path d="M9 12h6M9 16h4"/>
        </svg>
        <p>${log.length ? 'No entries match your filters.' : 'No doses logged yet. Record one above!'}</p>
      </div>`;
    return;
  }

  // Group by date
  const groups = {};
  filtered.forEach(e => {
    const dateKey = e.datetime.slice(0, 10);
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(e);
  });

  let html = '';
  Object.keys(groups).sort((a, b) => b.localeCompare(a)).forEach(dateKey => {
    html += `<div class="date-group-header">${escapeHtml(formatDateOnly(dateKey + 'T12:00:00'))}</div>`;
    groups[dateKey].forEach(e => {
      const med = medicineMap[e.medicineId];
      if (!med) return;
      const time = new Date(e.datetime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
      html += `
        <div class="log-entry" data-id="${escapeHtml(e.id)}">
          <div class="log-color-bar" style="background:${escapeHtml(med.color)}"></div>
          <div class="log-entry-body">
            <div class="log-entry-info">
              <div class="log-medicine-name">${escapeHtml(med.name)}</div>
              <div class="log-datetime">🕒 ${escapeHtml(time)}</div>
              ${med.dosage ? `<span class="log-dosage-badge" style="background:${escapeHtml(med.color)}">${escapeHtml(med.dosage)}</span>` : ''}
              ${e.notes ? `<div class="log-notes">${escapeHtml(e.notes)}</div>` : ''}
            </div>
            <div class="log-entry-actions">
              <button class="btn btn-ghost btn-sm" onclick="editLogEntry('${escapeHtml(e.id)}')">Edit</button>
              <button class="btn btn-danger btn-sm" onclick="deleteLogEntry('${escapeHtml(e.id)}')">Delete</button>
            </div>
          </div>
        </div>`;
    });
  });

  container.innerHTML = html;
}

function initLogFilters() {
  const filterMed = document.getElementById('filter-medicine');
  const filterDate = document.getElementById('filter-date');

  filterMed.addEventListener('change', renderLog);
  filterDate.addEventListener('change', renderLog);
  document.getElementById('clear-filters').addEventListener('click', () => {
    filterMed.value = '';
    filterDate.value = '';
    renderLog();
  });
}

function populateFilterSelect() {
  const select = document.getElementById('filter-medicine');
  const medicines = loadMedicines();
  const current = select.value;
  select.innerHTML = '<option value="">All medicines</option>' +
    medicines.map(m => `<option value="${escapeHtml(m.id)}">${escapeHtml(m.name)}</option>`).join('');
  if (current) select.value = current;
}

// ===== Stats =====
function updateStats() {
  const log = loadLog();
  const medicines = loadMedicines();

  document.getElementById('stat-total').textContent = log.length;
  document.getElementById('stat-medicines').textContent = medicines.length;

  // Doses today
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = log.filter(e => e.datetime.startsWith(today)).length;
  document.getElementById('stat-today').textContent = todayCount;

  // Repopulate filter select when stats refresh
  populateFilterSelect();
}

// ===== Seed sample data (first-time only) =====
function maybeSeedData() {
  if (loadMedicines().length > 0) return;

  const medicines = [
    { id: uid(), name: 'Ibuprofen', color: '#e53e3e', dosage: '400mg', timing: 'Every 8 hours with food', notes: 'Anti-inflammatory / pain relief' },
    { id: uid(), name: 'Vitamin D', color: '#d69e2e', dosage: '1000 IU', timing: 'Once daily with breakfast', notes: 'Supplement' },
    { id: uid(), name: 'Amoxicillin', color: '#38a169', dosage: '500mg', timing: 'Every 8 hours', notes: 'Complete full course' },
  ];
  saveMedicines(medicines);

  const now = new Date();
  const h = d => { const t = new Date(d); return t.toISOString().slice(0, 16); };
  const log = [
    { id: uid(), medicineId: medicines[1].id, datetime: h(new Date(now - 2 * 60 * 60 * 1000)), notes: '' },
    { id: uid(), medicineId: medicines[2].id, datetime: h(new Date(now - 5 * 60 * 60 * 1000)), notes: 'Day 3 of course' },
    { id: uid(), medicineId: medicines[0].id, datetime: h(new Date(now - 26 * 60 * 60 * 1000)), notes: 'Headache' },
  ];
  saveLog(log);
}

// ===== Bootstrap =====
document.addEventListener('DOMContentLoaded', () => {
  maybeSeedData();
  initTabs();
  initMedicineForm();
  initLogForm();
  initLogFilters();
  renderMedicines();
  renderLog();
  updateStats();
});
