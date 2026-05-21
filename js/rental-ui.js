/** UI for multiple rental property cards. Depends on rental-properties.js */
(function () {
  var listEl = document.getElementById('rental-properties-list');
  var addBtn = document.getElementById('add-rental-property');
  var perPropertyTotalsEl = document.getElementById('rental-per-property-totals');

  if (!listEl || !addBtn) return;

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function buildExpenseFields(property) {
    var html = '';
    RENTAL_PROPERTY_EXPENSE_FIELDS.forEach(function (field) {
      var val = property[field.key] != null ? property[field.key] : '';
      html +=
        '<label class="field"><span>' +
        escapeHtml(field.label) +
        '</span><input type="text" data-money="true" data-rental-field="' +
        field.key +
        '" inputmode="numeric" placeholder="0" value="' +
        escapeHtml(val === 0 ? '0' : val) +
        '" /></label>';
    });
    return html;
  }

  function createPropertyCard(property, index, canRemove) {
    var article = document.createElement('article');
    article.className = 'rental-property';
    article.dataset.rentalIndex = String(index);

    var label = property.label || 'Property ' + (index + 1);
    var gross = property.grossRent != null ? property.grossRent : '';
    var depreciation = property.depreciation != null ? property.depreciation : '';

    article.innerHTML =
      '<header class="rental-property-header">' +
      '<label class="field rental-label-field">' +
      '<span>Property name (optional)</span>' +
      '<input type="text" class="rental-label-input" placeholder="Property ' +
      (index + 1) +
      '" value="' +
      escapeHtml(label) +
      '" />' +
      '</label>' +
      (canRemove
        ? '<button type="button" class="btn-remove-rental">Remove</button>'
        : '') +
      '</header>' +
      '<div class="field-grid two">' +
      '<label class="field"><span>Gross rent</span>' +
      '<input type="text" data-money="true" data-rental-field="grossRent" inputmode="numeric" placeholder="0" value="' +
      escapeHtml(gross === 0 ? '0' : gross) +
      '" /></label>' +
      '<label class="field"><span>Capital works / depreciation (division 43 &amp; 40)</span>' +
      '<input type="text" data-money="true" data-rental-field="depreciation" inputmode="numeric" placeholder="0" value="' +
      escapeHtml(depreciation === 0 ? '0' : depreciation) +
      '" /></label>' +
      '</div>' +
      '<h4 class="subsection-title">Rental expenses</h4>' +
      '<div class="field-grid two">' +
      buildExpenseFields(property) +
      '</div>' +
      '<p class="rental-property-net">Net this property: <strong class="rental-property-net-value">$0</strong></p>';

    var removeBtn = article.querySelector('.btn-remove-rental');
    if (removeBtn) {
      removeBtn.addEventListener('click', function () {
        article.remove();
        reindexPropertyCards();
        window.dispatchEvent(new CustomEvent('tax-form-changed'));
      });
    }

    return article;
  }

  function reindexPropertyCards() {
    listEl.querySelectorAll('.rental-property').forEach(function (card, index) {
      card.dataset.rentalIndex = String(index);
      var removeBtn = card.querySelector('.btn-remove-rental');
      if (index === 0) {
        if (removeBtn) removeBtn.remove();
      } else if (!removeBtn) {
        var header = card.querySelector('.rental-property-header');
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-remove-rental';
        btn.textContent = 'Remove';
        btn.addEventListener('click', function () {
          card.remove();
          reindexPropertyCards();
          window.dispatchEvent(new CustomEvent('tax-form-changed'));
        });
        header.appendChild(btn);
      }
    });
  }

  function readRentalPropertiesFromDom() {
    var properties = [];
    listEl.querySelectorAll('.rental-property').forEach(function (card) {
      var prop = {
        label: (card.querySelector('.rental-label-input') || {}).value || '',
      };
      card.querySelectorAll('[data-rental-field]').forEach(function (input) {
        prop[input.dataset.rentalField] = input.value;
      });
      properties.push(prop);
    });
    return properties;
  }

  function renderRentalProperties(properties) {
    listEl.innerHTML = '';
    var list = properties && properties.length ? properties : [emptyRentalProperty(0)];
    list.forEach(function (prop, index) {
      listEl.appendChild(createPropertyCard(prop, index, false));
    });
    reindexPropertyCards();
  }

  function updatePerPropertyTotals(properties) {
    if (!perPropertyTotalsEl) return;
    if (!properties.length) {
      perPropertyTotalsEl.innerHTML = '';
      return;
    }

    var html = '<h4 class="subsection-title">Per property</h4><ul class="rental-property-summary">';
    properties.forEach(function (prop, i) {
      var name = (prop.label && String(prop.label).trim()) || 'Property ' + (i + 1);
      var net = propertyNet(prop);
      html +=
        '<li><span>' +
        escapeHtml(name) +
        '</span> <strong>' +
        (window.formatAud ? window.formatAud(net) : '$' + net) +
        '</strong></li>';
      var card = listEl.querySelector('[data-rental-index="' + i + '"]');
      if (card) {
        var netEl = card.querySelector('.rental-property-net-value');
        if (netEl) {
          netEl.textContent = window.formatAud ? window.formatAud(net) : '$' + net;
        }
      }
    });
    html += '</ul>';
    perPropertyTotalsEl.innerHTML = html;
  }

  addBtn.addEventListener('click', function () {
    var count = listEl.querySelectorAll('.rental-property').length;
    listEl.appendChild(createPropertyCard(emptyRentalProperty(count), count, true));
    reindexPropertyCards();
    window.dispatchEvent(new CustomEvent('tax-form-changed'));
  });

  window.readRentalPropertiesFromDom = readRentalPropertiesFromDom;
  window.renderRentalProperties = renderRentalProperties;
  window.updatePerPropertyTotals = updatePerPropertyTotals;
  window.initRentalProperties = function (properties) {
    renderRentalProperties(properties);
  };
})();
