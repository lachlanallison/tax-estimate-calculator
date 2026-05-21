(function () {
  var form = document.getElementById('tax-form');
  if (!form) return;

  var toggle = document.getElementById('prorata-toggle');
  var panel = document.getElementById('prorata-panel');
  var backdrop = document.getElementById('prorata-backdrop');
  var closeBtn = document.getElementById('prorata-close');
  var targetSelect = document.getElementById('prorata-target');
  var preview = document.getElementById('prorata-preview');
  var applyBtn = document.getElementById('prorata-apply');
  var scalePanel = document.getElementById('prorata-scale-panel');
  var payrunsPanel = document.getElementById('prorata-payruns-panel');
  var modeInputs = document.querySelectorAll('input[name="prorataMode"]');

  var scaleAmount = document.getElementById('prorata-scale-amount');
  var scaleElapsed = document.getElementById('prorata-scale-elapsed');
  var scaleTotal = document.getElementById('prorata-scale-total');
  var paySofar = document.getElementById('prorata-pay-sofar');
  var payCount = document.getElementById('prorata-pay-count');
  var payEach = document.getElementById('prorata-pay-each');

  var fmt = new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  });

  var fieldRegistry = [];
  var lastMoneyField = null;

  function parseMoney(raw) {
    if (raw == null) return 0;
    var text = String(raw).trim().replace(/[$AUD\s]/gi, '').replace(/,/g, '');
    if (!text) return 0;
    var num = Number(text);
    if (!Number.isFinite(num)) return 0;
    return Math.max(0, typeof roundDollars === 'function' ? roundDollars(num) : Math.round(num));
  }

  function formatMoney(amount) {
    var rounded = typeof roundDollars === 'function' ? roundDollars(amount) : Math.round(amount);
    return fmt.format(rounded);
  }

  function fieldLabel(input) {
    var label = input.closest('label.field');
    if (label) {
      var span = label.querySelector('span');
      if (span && span.textContent) return span.textContent.trim();
    }

    var card = input.closest('.rental-property');
    if (card) {
      var propLabel = card.querySelector('.rental-label-input');
      var propName = propLabel && propLabel.value ? propLabel.value.trim() : '';
      var fieldKey = input.getAttribute('data-rental-field') || 'field';
      var expenseField = null;
      if (typeof RENTAL_PROPERTY_EXPENSE_FIELDS !== 'undefined') {
        for (var i = 0; i < RENTAL_PROPERTY_EXPENSE_FIELDS.length; i++) {
          if (RENTAL_PROPERTY_EXPENSE_FIELDS[i].key === fieldKey) {
            expenseField = RENTAL_PROPERTY_EXPENSE_FIELDS[i].label;
            break;
          }
        }
      }
      var fieldName =
        fieldKey === 'grossRent'
          ? 'Gross rent'
          : fieldKey === 'depreciation'
            ? 'Depreciation'
            : expenseField || fieldKey;
      return (propName || 'Rental property') + ' — ' + fieldName;
    }

    if (input.name) return input.name;
    return 'Amount field';
  }

  function fieldKeyFor(input) {
    if (input.getAttribute('data-rental-field')) {
      var card = input.closest('.rental-property');
      var index = card ? card.getAttribute('data-rental-index') : '0';
      return 'rental:' + index + ':' + input.getAttribute('data-rental-field');
    }
    if (input.name) return 'name:' + input.name;
    return 'id:' + (input.id || Math.random().toString(36).slice(2));
  }

  function rebuildTargetOptions() {
    var previous = targetSelect.value;

    fieldRegistry = [];
    var inputs = form.querySelectorAll(
      'input[data-money="true"]:not(#prorata-scale-amount):not(#prorata-pay-sofar):not(#prorata-pay-each)',
    );

    inputs.forEach(function (input) {
      if (input.closest('#prorata-panel')) return;
      var key = fieldKeyFor(input);
      fieldRegistry.push({ key: key, input: input, label: fieldLabel(input) });
    });

    targetSelect.innerHTML = '';
    fieldRegistry.forEach(function (entry) {
      var option = document.createElement('option');
      option.value = entry.key;
      option.textContent = entry.label;
      targetSelect.appendChild(option);
    });

    if (previous && fieldRegistry.some(function (e) { return e.key === previous; })) {
      targetSelect.value = previous;
    } else if (lastMoneyField) {
      var lastKey = fieldKeyFor(lastMoneyField);
      if (fieldRegistry.some(function (e) { return e.key === lastKey; })) {
        targetSelect.value = lastKey;
      }
    }

    if (!panel.hidden) {
      prefillAmountFromSelectedField();
    }
  }

  function getSelectedInput() {
    var key = targetSelect.value;
    var entry = fieldRegistry.find(function (e) {
      return e.key === key;
    });
    return entry ? entry.input : null;
  }

  function activeMode() {
    var checked = document.querySelector('input[name="prorataMode"]:checked');
    return checked ? checked.value : 'scale';
  }

  function prefillAmountFromSelectedField() {
    var selected = getSelectedInput();
    if (!selected) return;

    var raw = selected.value == null ? '' : String(selected.value).trim();
    var val = parseMoney(raw);
    var amountText = raw !== '' ? String(val) : '';

    if (activeMode() === 'scale') {
      scaleAmount.value = amountText;
    } else {
      paySofar.value = amountText;
    }

    updatePreview();
  }

  function calculateEstimate() {
    if (activeMode() === 'scale') {
      var amount = parseMoney(scaleAmount.value);
      var elapsed = Number(scaleElapsed.value);
      var total = Number(scaleTotal.value);
      if (!Number.isFinite(elapsed) || elapsed <= 0) return 0;
      if (!Number.isFinite(total) || total <= 0) return 0;
      return (amount * total) / elapsed;
    }

    var sofar = parseMoney(paySofar.value);
    var count = Number(payCount.value);
    var each = parseMoney(payEach.value);
    if (!Number.isFinite(count) || count < 0) count = 0;
    return sofar + count * each;
  }

  function updatePreview() {
    preview.textContent = formatMoney(calculateEstimate());
  }

  function syncModePanels() {
    var scale = activeMode() === 'scale';
    scalePanel.hidden = !scale;
    payrunsPanel.hidden = scale;
    prefillAmountFromSelectedField();
  }

  function closePanel() {
    document.body.classList.remove('side-open-prorata');
    toggle.setAttribute('aria-expanded', 'false');
    window.setTimeout(function () {
      panel.hidden = true;
      backdrop.hidden = true;
    }, 220);
    toggle.focus();
  }

  function openPanel() {
    if (typeof window.closeProfilePanel === 'function') {
      window.closeProfilePanel();
    }

    panel.hidden = false;
    backdrop.hidden = false;

    rebuildTargetOptions();
    if (lastMoneyField) {
      var lastKey = fieldKeyFor(lastMoneyField);
      if (fieldRegistry.some(function (e) { return e.key === lastKey; })) {
        targetSelect.value = lastKey;
      }
    }
    prefillAmountFromSelectedField();

    requestAnimationFrame(function () {
      document.body.classList.add('side-open-prorata');
    });
    toggle.setAttribute('aria-expanded', 'true');
    syncModePanels();
    if (activeMode() === 'scale') scaleAmount.focus();
    else paySofar.focus();
  }

  function applyToField() {
    var input = getSelectedInput();
    if (!input) return;

    var value = calculateEstimate();
    if (!Number.isFinite(value) || value < 0) return;

    var rounded = typeof roundDollars === 'function' ? roundDollars(value) : Math.round(value);
    input.value = String(rounded);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    window.dispatchEvent(new CustomEvent('tax-form-changed'));

    closePanel();
    input.focus();
    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  toggle.addEventListener('click', function () {
    if (panel.hidden) openPanel();
    else closePanel();
  });

  closeBtn.addEventListener('click', closePanel);
  backdrop.addEventListener('click', closePanel);
  applyBtn.addEventListener('click', applyToField);
  targetSelect.addEventListener('change', prefillAmountFromSelectedField);

  modeInputs.forEach(function (input) {
    input.addEventListener('change', syncModePanels);
  });

  [scaleAmount, scaleElapsed, scaleTotal, paySofar, payCount, payEach].forEach(function (el) {
    if (!el) return;
    el.addEventListener('input', updatePreview);
    el.addEventListener('change', updatePreview);
  });

  form.addEventListener('focusin', function (event) {
    if (!(event.target instanceof HTMLInputElement)) return;
    if (event.target.dataset.money !== 'true') return;
    if (event.target.closest('#prorata-panel')) return;
    lastMoneyField = event.target;
    if (panel.hidden) return;
    var key = fieldKeyFor(event.target);
    if (fieldRegistry.some(function (e) { return e.key === key; })) {
      targetSelect.value = key;
      prefillAmountFromSelectedField();
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !panel.hidden) closePanel();
  });

  window.addEventListener('tax-form-changed', function () {
    if (!panel.hidden) rebuildTargetOptions();
  });

  window.closeProrataPanel = closePanel;
  syncModePanels();
})();
