(function () {
  const form = document.getElementById('tax-form');
  const residencySelect = document.getElementById('residency');
  const STORAGE_KEY = 'au-tax-estimate-form-v1';
  const SECTION_STORAGE_KEY = 'au-tax-estimate-sections-v1';
  const PROFILES_KEY = 'au-tax-estimate-profiles-v1';
  const ACTIVE_PROFILE_KEY = 'au-tax-estimate-active-profile-v1';

  if (!form || typeof calculateEstimate !== 'function') {
    const banner = document.createElement('div');
    banner.setAttribute('role', 'alert');
    banner.style.cssText =
      'margin:1rem;padding:1rem;background:#fef2f2;border:2px solid #b91c1c;font-family:system-ui,sans-serif;';
    banner.textContent =
      'Calculator scripts did not load. Open this site via a local server or GitHub Pages (opening index.html directly may block scripts).';
    document.body.prepend(banner);
    return;
  }

  const fmt = new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  });

  let recalcQueued = false;

  function formatAud(amount) {
    return fmt.format(roundDollars(amount));
  }

  function sanitizeMoneyString(raw) {
    if (raw == null) return '';

    let text = String(raw).trim();
    if (!text) return '';

    text = text.replace(/[$AUD\s]/gi, '').replace(/,/g, '');

    if (text.startsWith('(') && text.endsWith(')')) {
      text = text.slice(1, -1);
    }

    const num = Number(text);
    if (!Number.isFinite(num)) return '';

    return String(Math.max(0, roundDollars(num)));
  }

  function normalizeMoneyInput(input) {
    const sanitized = sanitizeMoneyString(input.value);
    if (input.value === sanitized) return false;
    input.value = sanitized;
    return true;
  }

  function isMoneyInput(el) {
    return el instanceof HTMLInputElement && el.dataset.money === 'true';
  }

  function stripInvalidMoneyChars(raw) {
    return String(raw).replace(/[^0-9.,]/g, '');
  }

  const MONEY_ALLOWED_KEYS = new Set([
    'Backspace',
    'Delete',
    'Tab',
    'Escape',
    'Enter',
    'ArrowLeft',
    'ArrowRight',
    'ArrowUp',
    'ArrowDown',
    'Home',
    'End',
  ]);

  function isAllowedMoneyKey(event) {
    if (MONEY_ALLOWED_KEYS.has(event.key)) return true;
    if (event.ctrlKey || event.metaKey) return true;
    if (/^[0-9]$/.test(event.key)) return true;
    if (event.key === ',' || event.key === '.') return true;
    return false;
  }

  function scheduleRecalculate() {
    if (recalcQueued) return;
    recalcQueued = true;
    requestAnimationFrame(function () {
      recalcQueued = false;
      recalculate();
    });
  }

  function attachMoneyInputValidation() {
    form.addEventListener('keydown', function (event) {
      if (!isMoneyInput(event.target) || isAllowedMoneyKey(event)) return;
      event.preventDefault();
    });

    form.addEventListener(
      'input',
      function (event) {
        const input = event.target;
        if (!isMoneyInput(input)) return;

        const cleaned = stripInvalidMoneyChars(input.value);
        if (input.value !== cleaned) {
          input.value = cleaned;
        }
        scheduleRecalculate();
      },
      true,
    );

    form.addEventListener('paste', function (event) {
      if (!isMoneyInput(event.target)) return;

      event.preventDefault();
      event.target.value = sanitizeMoneyString(event.clipboardData.getData('text'));
      scheduleRecalculate();
    });

    form.addEventListener(
      'blur',
      function (event) {
        if (!isMoneyInput(event.target)) return;
        if (normalizeMoneyInput(event.target)) scheduleRecalculate();
      },
      true,
    );
  }

  function readFormData() {
    const data = { taxYear: form.taxYear.value, residency: form.residency.value };

    for (const el of form.elements) {
      if (!el.name) continue;
      if (el.closest('.rental-property')) continue;
      if (el.type === 'checkbox') {
        data[el.name] = el.checked;
      } else if (el.dataset.money === 'true' || el.tagName === 'SELECT') {
        data[el.name] = el.value;
      }
    }

    if (typeof readRentalPropertiesFromDom === 'function') {
      data.rentalProperties = readRentalPropertiesFromDom();
    }

    return data;
  }

  function generateProfileId() {
    return 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function loadProfileStore() {
    try {
      const stored = localStorage.getItem(PROFILES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object' && parsed.profiles) return parsed;
      }
    } catch (err) {
      console.warn('Could not load profiles:', err);
    }
    return { version: 1, profiles: {} };
  }

  function saveProfileStore(store) {
    try {
      localStorage.setItem(PROFILES_KEY, JSON.stringify(store));
    } catch (err) {
      console.warn('Could not save profiles:', err);
    }
  }

  function getActiveProfileId() {
    return localStorage.getItem(ACTIVE_PROFILE_KEY) || '';
  }

  function setActiveProfileId(id) {
    try {
      localStorage.setItem(ACTIVE_PROFILE_KEY, id);
    } catch (err) {
      console.warn('Could not save active profile:', err);
    }
  }

  function migrateToProfilesIfNeeded(store) {
    if (Object.keys(store.profiles).length > 0) return store;

    let data = null;
    let sections = null;
    try {
      const legacy = localStorage.getItem(STORAGE_KEY);
      if (legacy) data = JSON.parse(legacy);
      const legacySections = localStorage.getItem(SECTION_STORAGE_KEY);
      if (legacySections) sections = JSON.parse(legacySections);
    } catch (err) {
      console.warn('Could not migrate legacy form data:', err);
    }

    const id = generateProfileId();
    store.profiles[id] = {
      name: 'Default',
      data: data && typeof data === 'object' ? data : {},
      sections: sections && typeof sections === 'object' ? sections : {},
      updatedAt: new Date().toISOString(),
    };
    setActiveProfileId(id);
    return store;
  }

  function ensureProfilesReady() {
    let store = migrateToProfilesIfNeeded(loadProfileStore());
    if (Object.keys(store.profiles).length === 0) {
      const id = generateProfileId();
      store.profiles[id] = {
        name: 'Default',
        data: {},
        sections: {},
        updatedAt: new Date().toISOString(),
      };
      setActiveProfileId(id);
    }
    const activeId = getActiveProfileId();
    if (!activeId || !store.profiles[activeId]) {
      setActiveProfileId(Object.keys(store.profiles)[0]);
    }
    saveProfileStore(store);
    return store;
  }

  function readSectionState() {
    const state = {};
    document.querySelectorAll('details.collapsible-section[data-section]').forEach(function (el) {
      state[el.dataset.section] = el.open;
    });
    return state;
  }

  function applySectionState(state) {
    if (!state || typeof state !== 'object') return;
    document.querySelectorAll('details.collapsible-section[data-section]').forEach(function (el) {
      const key = el.dataset.section;
      if (key in state) {
        el.open = Boolean(state[key]);
      }
    });
  }

  function saveActiveProfile(data) {
    const store = loadProfileStore();
    const id = getActiveProfileId();
    if (!id || !store.profiles[id]) return;

    store.profiles[id].data = data;
    store.profiles[id].sections = readSectionState();
    store.profiles[id].updatedAt = new Date().toISOString();
    saveProfileStore(store);
  }

  function saveFormToStorage(data) {
    saveActiveProfile(data);
  }

  function saveSectionState() {
    const state = readSectionState();
    const store = loadProfileStore();
    const id = getActiveProfileId();
    if (id && store.profiles[id]) {
      store.profiles[id].sections = state;
      store.profiles[id].updatedAt = new Date().toISOString();
      saveProfileStore(store);
    }
  }

  function autoOpenSectionsIfNeeded(data) {
    const hasRental =
      Number(data.grossRent) > 0 ||
      Number(data.rentalDepreciation) > 0 ||
      Number(data.rentalExpenses) > 0 ||
      (window.RENTAL_EXPENSE_KEYS || []).some(function (key) {
        return Number(data[key]) > 0;
      });

    const deductionPrefixes = ['deduction'];
    const hasDeductions = Object.keys(data).some(function (key) {
      return (
        deductionPrefixes.some(function (p) {
          return key.startsWith(p);
        }) && Number(data[key]) > 0
      );
    });

    const rentalEl = document.querySelector('details[data-section="rental"]');
    const deductionsEl = document.querySelector('details[data-section="deductions"]');
    if (hasRental && rentalEl) rentalEl.open = true;
    if (hasDeductions && deductionsEl) deductionsEl.open = true;
  }

  function attachCollapsibleSections() {
    document.querySelectorAll('details.collapsible-section[data-section]').forEach(function (el) {
      el.addEventListener('toggle', saveSectionState);
    });
  }

  function applyFormData(data) {
    if (!data || typeof data !== 'object') return;

    if (data.deductionOther != null && data.deductionWorkOther == null) {
      data.deductionWorkOther = data.deductionOther;
    }
    if (data.deductionIncomeProtection != null && data.deductionOtherNec == null) {
      data.deductionOtherNec = data.deductionIncomeProtection;
    }

    let rentalProps = data.rentalProperties;
    if (!rentalProps || !rentalProps.length) {
      rentalProps = normalizeRentalProperties(data);
    }

    for (const el of form.elements) {
      if (el.closest('.rental-property')) continue;
      if (!el.name || !(el.name in data)) continue;

      if (el.type === 'checkbox') {
        el.checked = Boolean(data[el.name]);
      } else if (el.dataset.money === 'true') {
        const value = data[el.name];
        el.value = value === '' || value == null ? '' : String(value);
      } else if (el.tagName === 'SELECT') {
        const option = Array.from(el.options).some(function (opt) {
          return opt.value === String(data[el.name]);
        });
        if (option) el.value = String(data[el.name]);
      }
    }

    if (typeof initRentalProperties === 'function') {
      initRentalProperties(rentalProps);
    }

    if (!('taxYear' in data) && form.taxYear) {
      form.taxYear.value = getCurrentAustralianTaxYear();
    }

    autoOpenSectionsIfNeeded(data);
  }

  function loadActiveProfile() {
    const store = ensureProfilesReady();
    const id = getActiveProfileId();
    const profile = store.profiles[id];
    if (!profile) return;

    applyFormData(profile.data || {});
    applySectionState(profile.sections);
  }

  function uniqueProfileName(store, base) {
    const names = Object.values(store.profiles).map(function (profile) {
      return profile.name;
    });
    if (!names.includes(base)) return base;
    var index = 2;
    while (names.includes(base + ' ' + index)) index += 1;
    return base + ' ' + index;
  }

  function resetFormToDefaults() {
    for (const el of form.elements) {
      if (el.closest('.rental-property')) continue;
      if (!el.name) continue;

      if (el.type === 'checkbox') {
        el.checked = false;
      } else if (el.dataset.money === 'true') {
        el.value = '';
      } else if (el.tagName === 'SELECT') {
        if (el.name === 'taxYear') el.value = getCurrentAustralianTaxYear();
        else if (el.name === 'residency') el.value = 'resident';
        else el.selectedIndex = 0;
      }
    }

    if (typeof initRentalProperties === 'function') {
      initRentalProperties([emptyRentalProperty(0)]);
    }

    document.querySelectorAll('details.collapsible-section[data-section]').forEach(function (el) {
      el.open = false;
    });
  }

  function refreshProfileSelect() {
    const select = document.getElementById('profile-select');
    if (!select) return;

    const store = loadProfileStore();
    const activeId = getActiveProfileId();
    select.innerHTML = '';

    Object.keys(store.profiles).forEach(function (id) {
      const profile = store.profiles[id];
      const option = document.createElement('option');
      option.value = id;
      option.textContent = profile.name || 'Unnamed profile';
      select.appendChild(option);
    });

    if (activeId && store.profiles[activeId]) {
      select.value = activeId;
    }

    const toggle = document.getElementById('profile-toggle');
    if (toggle) {
      const activeProfile = activeId && store.profiles[activeId] ? store.profiles[activeId] : null;
      const profileName = activeProfile ? activeProfile.name : 'Default';
      toggle.textContent = 'PROFILES - ' + profileName;
      toggle.setAttribute('aria-label', 'Profiles: ' + profileName);
    }

    const deleteBtn = document.getElementById('profile-delete');
    if (deleteBtn) {
      deleteBtn.disabled = Object.keys(store.profiles).length <= 1;
    }
  }

  function initProfileUi() {
    const select = document.getElementById('profile-select');
    const saveBtn = document.getElementById('profile-save');
    const saveAsBtn = document.getElementById('profile-save-as');
    const newBtn = document.getElementById('profile-new');
    const deleteBtn = document.getElementById('profile-delete');
    const toggle = document.getElementById('profile-toggle');
    const panel = document.getElementById('profile-panel');
    const backdrop = document.getElementById('profile-backdrop');
    const closeBtn = document.getElementById('profile-close');
    if (!select) return;

    function closeProfilePanel() {
      document.body.classList.remove('side-open-profile');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
      window.setTimeout(function () {
        if (panel) panel.hidden = true;
        if (backdrop) backdrop.hidden = true;
      }, 220);
      if (toggle) toggle.focus();
    }

    function openProfilePanel() {
      if (typeof window.closeProrataPanel === 'function') {
        window.closeProrataPanel();
      }
      if (panel) panel.hidden = false;
      if (backdrop) backdrop.hidden = false;
      refreshProfileSelect();
      requestAnimationFrame(function () {
        document.body.classList.add('side-open-profile');
      });
      if (toggle) toggle.setAttribute('aria-expanded', 'true');
      select.focus();
    }

    window.closeProfilePanel = closeProfilePanel;

    if (toggle) {
      toggle.addEventListener('click', function () {
        if (panel && panel.hidden) openProfilePanel();
        else closeProfilePanel();
      });
    }
    if (closeBtn) closeBtn.addEventListener('click', closeProfilePanel);
    if (backdrop) backdrop.addEventListener('click', closeProfilePanel);

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && panel && !panel.hidden) closeProfilePanel();
    });

    refreshProfileSelect();

    select.addEventListener('change', function () {
      const newId = select.value;
      const currentId = getActiveProfileId();
      if (!newId || newId === currentId) return;

      saveActiveProfile(readFormData());
      setActiveProfileId(newId);
      loadActiveProfile();
      setResidencyMode();
      recalculate();
      refreshProfileSelect();
    });

    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        saveActiveProfile(readFormData());
        refreshProfileSelect();
        const original = saveBtn.textContent;
        saveBtn.textContent = 'Saved';
        window.setTimeout(function () {
          saveBtn.textContent = original;
        }, 1200);
      });
    }

    if (saveAsBtn) {
      saveAsBtn.addEventListener('click', function () {
        const name = window.prompt('Name for this profile');
        if (!name || !String(name).trim()) return;

        saveActiveProfile(readFormData());

        const store = loadProfileStore();
        const id = generateProfileId();
        store.profiles[id] = {
          name: String(name).trim(),
          data: readFormData(),
          sections: readSectionState(),
          updatedAt: new Date().toISOString(),
        };
        saveProfileStore(store);
        setActiveProfileId(id);
        refreshProfileSelect();
        recalculate();
      });
    }

    if (newBtn) {
      newBtn.addEventListener('click', function () {
        saveActiveProfile(readFormData());

        const store = loadProfileStore();
        const defaultName = uniqueProfileName(store, 'New profile');
        const name = window.prompt('Name for new profile', defaultName);
        if (name === null) return;

        const trimmed = String(name).trim() || defaultName;
        const id = generateProfileId();
        store.profiles[id] = {
          name: trimmed,
          data: {},
          sections: {},
          updatedAt: new Date().toISOString(),
        };
        saveProfileStore(store);
        setActiveProfileId(id);
        resetFormToDefaults();
        saveActiveProfile(readFormData());
        refreshProfileSelect();
        setResidencyMode();
        recalculate();
      });
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('click', function () {
        const store = loadProfileStore();
        const id = getActiveProfileId();
        const profile = store.profiles[id];
        const ids = Object.keys(store.profiles);
        if (ids.length <= 1 || !profile) return;

        const confirmed = window.confirm('Delete profile “' + profile.name + '”? This cannot be undone.');
        if (!confirmed) return;

        delete store.profiles[id];
        const nextId = ids.find(function (otherId) {
          return otherId !== id;
        });
        saveProfileStore(store);
        setActiveProfileId(nextId);
        refreshProfileSelect();
        loadActiveProfile();
        setResidencyMode();
        recalculate();
      });
    }
  }

  const INCOME_LINE_LABELS = [
    { key: 'salary', label: 'Salary and wages' },
    { key: 'interest', label: 'Gross interest' },
    { key: 'frankedDividends', label: 'Franked dividends' },
    { key: 'unfrankedDividends', label: 'Unfranked dividends' },
    { key: 'governmentPayments', label: 'Government payments' },
    { key: 'capitalGains', label: 'Net capital gain' },
    { key: 'businessIncome', label: 'Business / sole trader (net)' },
    { key: 'foreignIncome', label: 'Foreign income' },
  ];

  const DEDUCTION_LINE_LABELS = [
    { key: 'car', label: 'D1 — Car expenses' },
    { key: 'travel', label: 'D2 — Travel' },
    { key: 'clothing', label: 'D3 — Clothing' },
    { key: 'education', label: 'D4 — Self-education' },
    { key: 'workOther', label: 'D5 — Other work-related' },
    { key: 'lowValuePool', label: 'D6 — Low-value pool' },
    { key: 'interest', label: 'D7 — Interest' },
    { key: 'dividends', label: 'D8 — Dividends' },
    { key: 'donations', label: 'D9 — Donations' },
    { key: 'taxAffairs', label: 'D10 — Tax affairs' },
    { key: 'foreignPension', label: 'D11 — Foreign pension' },
    { key: 'personalSuper', label: 'D12 — Personal super' },
    { key: 'projectPool', label: 'D13 — Project pool' },
    { key: 'forestry', label: 'D14 — Forestry' },
    { key: 'otherNec', label: 'D15 — Other deductions' },
  ];

  function amountFromRaw(raw, key) {
    return roundDollars(Number(raw[key]) || 0);
  }

  function renderSummaryBlock(title, rows) {
    if (!rows.length) return '';

    var html =
      '<section class="summary-block"><h3 class="summary-block-title">' +
      title +
      '</h3><dl class="summary-breakdown">';
    rows.forEach(function (row) {
      var valueText = row.negative ? '−' + formatAud(row.amount) : formatAud(row.amount);
      html +=
        '<div class="row"><dt>' +
        row.label +
        '</dt><dd' +
        (row.negative ? ' class="amount-negative"' : '') +
        '>' +
        valueText +
        '</dd></div>';
    });
    html += '</dl></section>';
    return html;
  }

  function buildSummaryHtml(result, raw) {
    var isResident = result.residency === 'resident';
    var html = '';

    var incomeRows = [];
    INCOME_LINE_LABELS.forEach(function (line) {
      var value = result.breakdown[line.key];
      if (value > 0) incomeRows.push({ label: line.label, amount: value });
    });
    (result.rentalProperties || []).forEach(function (prop, index) {
      if (!propertyHasData(prop)) return;
      var gross = propNum(prop, 'grossRent');
      if (gross > 0) {
        var name = (prop.label && String(prop.label).trim()) || 'Property ' + (index + 1);
        incomeRows.push({ label: name + ' — gross rent', amount: gross });
      }
    });
    html += renderSummaryBlock('Income', incomeRows);

    var deductionRows = [];
    DEDUCTION_LINE_LABELS.forEach(function (line) {
      var value = result.deductionBreakdown[line.key];
      if (value > 0) deductionRows.push({ label: line.label, amount: value, negative: true });
    });
    (result.rentalProperties || []).forEach(function (prop, index) {
      if (!propertyHasData(prop)) return;
      var expenses = propertyExpenseTotal(prop) + propNum(prop, 'depreciation');
      if (expenses > 0) {
        var name = (prop.label && String(prop.label).trim()) || 'Property ' + (index + 1);
        deductionRows.push({ label: name + ' — rental expenses', amount: expenses, negative: true });
      }
    });
    html += renderSummaryBlock('Deductions', deductionRows);

    var totalRows = [];
    if (result.grossIncome > 0 && result.totalDeductions > 0) {
      totalRows.push({ label: 'Gross income', amount: result.grossIncome });
      totalRows.push({ label: 'Total deductions', amount: result.totalDeductions, negative: true });
      totalRows.push({ label: 'Taxable income', amount: result.taxableIncome });
    } else if (result.taxableIncome > 0) {
      totalRows.push({ label: 'Taxable income', amount: result.taxableIncome });
    }
    html += renderSummaryBlock('Totals', totalRows);

    var taxRows = [];
    if (result.incomeTax > 0) taxRows.push({ label: 'Income tax', amount: result.incomeTax });
    if (isResident && result.medicareLevy > 0) {
      taxRows.push({ label: 'Medicare levy', amount: result.medicareLevy });
    }
    if (isResident && result.medicareLevySurcharge > 0) {
      taxRows.push({ label: 'Medicare levy surcharge', amount: result.medicareLevySurcharge });
    }
    if (raw.hasHelpDebt && result.helpRepayment > 0) {
      taxRows.push({ label: 'Study loan repayment', amount: result.helpRepayment });
    }
    var frankingApplied = Math.min(result.frankingCredits, result.grossTax);
    if (frankingApplied > 0) {
      taxRows.push({ label: 'Franking credits applied', amount: frankingApplied, negative: true });
    }
    html += renderSummaryBlock('Tax & offsets', taxRows);

    var withheldRows = [];
    var paygSalary = amountFromRaw(raw, 'paygWithheld');
    var paygOther = amountFromRaw(raw, 'paygWithheldOther');
    var paygInst = amountFromRaw(raw, 'paygInstalments');
    if (paygSalary > 0) withheldRows.push({ label: 'Tax withheld — salary', amount: paygSalary });
    if (paygOther > 0) withheldRows.push({ label: 'Tax withheld — other', amount: paygOther });
    if (paygInst > 0) withheldRows.push({ label: 'PAYG instalments paid', amount: paygInst });
    if (result.refundableFranking > 0) {
      withheldRows.push({ label: 'Refundable franking credit', amount: result.refundableFranking });
    }
    if (withheldRows.length) {
      withheldRows.push({ label: 'Total tax credits', amount: result.totalCredits });
    }
    html += renderSummaryBlock('Tax withheld & credits', withheldRows);

    return html;
  }

  function updateNetRentalDisplay(raw) {
    const properties = normalizeRentalProperties(raw);
    const totals = aggregateRentals(properties);

    const totalExpEl = document.getElementById('rental-expenses-total');
    const netEl = document.getElementById('net-rental-display');
    if (totalExpEl) totalExpEl.textContent = formatAud(totals.expenses);
    if (netEl) netEl.textContent = formatAud(totals.net);

    if (typeof updatePerPropertyTotals === 'function') {
      updatePerPropertyTotals(properties);
    }
  }

  function updateUi(result, raw) {
    const isResident = result.residency === 'resident';

    document.getElementById('total-tax').textContent = formatAud(result.totalTaxPayable);
    document.getElementById('tax-year-label').textContent =
      result.taxYearLabel + ' · ' + (isResident ? 'Australian resident' : 'Foreign resident');

    const summaryEl = document.getElementById('summary-sections');
    if (summaryEl) {
      summaryEl.innerHTML = buildSummaryHtml(result, raw);
    }

    const updatedEl = document.getElementById('last-updated');
    if (updatedEl) {
      updatedEl.textContent = 'Updated ' + new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    const refundEl = document.getElementById('refund-amount');
    const refundLabel = document.getElementById('refund-label');
    const amount = result.refundOrOwing;

    if (amount > 0) {
      refundLabel.textContent = 'Estimated refund';
      refundEl.textContent = formatAud(amount);
      refundEl.className = 'refund-amount positive';
    } else if (amount < 0) {
      refundLabel.textContent = 'Estimated amount owing';
      refundEl.textContent = formatAud(Math.abs(amount));
      refundEl.className = 'refund-amount negative';
    } else {
      refundLabel.textContent = 'Estimated balance';
      refundEl.textContent = formatAud(0);
      refundEl.className = 'refund-amount';
    }
  }

  function setResidencyMode() {
    const isResident = residencySelect.value === 'resident';
    document.body.classList.toggle('non-resident', !isResident);
  }

  function recalculate() {
    const raw = readFormData();
    saveFormToStorage(raw);
    updateNetRentalDisplay(raw);
    setResidencyMode();

    try {
      const result = calculateEstimate(raw);
      updateUi(result, raw);
    } catch (err) {
      console.error(err);
    }
  }

  form.addEventListener('input', scheduleRecalculate);
  form.addEventListener('change', scheduleRecalculate);
  form.addEventListener('keyup', scheduleRecalculate);
  window.addEventListener('tax-form-changed', scheduleRecalculate);

  window.formatAud = formatAud;

  attachMoneyInputValidation();
  attachCollapsibleSections();

  ensureProfilesReady();

  if (typeof initRentalProperties === 'function') {
    initRentalProperties([emptyRentalProperty(0)]);
  }

  loadActiveProfile();
  initProfileUi();
  setResidencyMode();
  recalculate();
})();
