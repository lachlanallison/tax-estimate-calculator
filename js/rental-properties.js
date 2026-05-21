/** Per-property expense fields (ATO rental schedule lines). */
var RENTAL_PROPERTY_EXPENSE_FIELDS = [
  { key: 'advertising', label: 'Advertising' },
  { key: 'bodyCorp', label: 'Body corporate fees' },
  { key: 'borrowing', label: 'Borrowing expenses' },
  { key: 'cleaning', label: 'Cleaning' },
  { key: 'councilRates', label: 'Council rates' },
  { key: 'gardening', label: 'Gardening / lawn mowing' },
  { key: 'insurance', label: 'Insurance' },
  { key: 'interest', label: 'Interest on loan' },
  { key: 'landTax', label: 'Land tax' },
  { key: 'legal', label: 'Legal fees' },
  { key: 'pestControl', label: 'Pest control' },
  { key: 'agentFees', label: 'Property agent fees / commission' },
  { key: 'repairs', label: 'Repairs and maintenance' },
  { key: 'stationery', label: 'Stationery, telephone, postage' },
  { key: 'travel', label: 'Travel expenses' },
  { key: 'water', label: 'Water charges' },
  { key: 'sundry', label: 'Sundry rental expenses' },
];

var LEGACY_RENTAL_FIELD_MAP = {
  grossRent: 'grossRent',
  rentalDepreciation: 'depreciation',
  rentalAdvertising: 'advertising',
  rentalBodyCorp: 'bodyCorp',
  rentalBorrowing: 'borrowing',
  rentalCleaning: 'cleaning',
  rentalCouncilRates: 'councilRates',
  rentalGardening: 'gardening',
  rentalInsurance: 'insurance',
  rentalInterest: 'interest',
  rentalLandTax: 'landTax',
  rentalLegal: 'legal',
  rentalPestControl: 'pestControl',
  rentalAgentFees: 'agentFees',
  rentalRepairs: 'repairs',
  rentalStationery: 'stationery',
  rentalTravel: 'travel',
  rentalWater: 'water',
  rentalSundry: 'sundry',
};

function propNum(prop, key) {
  return roundDollars(Number(prop[key]) || 0);
}

function emptyRentalProperty(index) {
  return { label: 'Property ' + (index + 1) };
}

function propertyExpenseTotal(prop) {
  var total = 0;
  for (var i = 0; i < RENTAL_PROPERTY_EXPENSE_FIELDS.length; i++) {
    total += propNum(prop, RENTAL_PROPERTY_EXPENSE_FIELDS[i].key);
  }
  return total;
}

function propertyNet(prop) {
  return propNum(prop, 'grossRent') - propertyExpenseTotal(prop) - propNum(prop, 'depreciation');
}

function propertyHasData(prop) {
  if (prop.label && String(prop.label).trim()) return true;
  if (propNum(prop, 'grossRent') > 0 || propNum(prop, 'depreciation') > 0) return true;
  for (var i = 0; i < RENTAL_PROPERTY_EXPENSE_FIELDS.length; i++) {
    if (propNum(prop, RENTAL_PROPERTY_EXPENSE_FIELDS[i].key) > 0) return true;
  }
  return false;
}

function legacyFlatToProperty(raw) {
  var prop = { label: 'Property 1' };
  Object.keys(LEGACY_RENTAL_FIELD_MAP).forEach(function (legacyKey) {
    var val = raw[legacyKey];
    if (val !== '' && val != null && Number(val) !== 0) {
      prop[LEGACY_RENTAL_FIELD_MAP[legacyKey]] = val;
    }
  });
  if (raw.rentalExpenses > 0 && !prop.sundry) {
    prop.sundry = raw.rentalExpenses;
  }
  return prop;
}

function normalizeRentalProperties(raw) {
  if (raw.rentalProperties && Array.isArray(raw.rentalProperties) && raw.rentalProperties.length > 0) {
    return raw.rentalProperties.map(function (p, i) {
      var prop = Object.assign({}, p);
      if (!prop.label) prop.label = 'Property ' + (i + 1);
      return prop;
    });
  }

  var legacy = legacyFlatToProperty(raw || {});
  if (propertyHasData(legacy)) {
    return [legacy];
  }

  return [emptyRentalProperty(0)];
}

function aggregateRentals(properties) {
  var gross = 0;
  var expenses = 0;
  var depreciation = 0;
  var net = 0;

  properties.forEach(function (prop) {
    gross += propNum(prop, 'grossRent');
    expenses += propertyExpenseTotal(prop);
    depreciation += propNum(prop, 'depreciation');
    net += propertyNet(prop);
  });

  return {
    gross: gross,
    expenses: expenses,
    depreciation: depreciation,
    net: net,
    count: properties.length,
  };
}

window.RENTAL_PROPERTY_EXPENSE_FIELDS = RENTAL_PROPERTY_EXPENSE_FIELDS;
window.normalizeRentalProperties = normalizeRentalProperties;
window.aggregateRentals = aggregateRentals;
window.propertyNet = propertyNet;
window.propNum = propNum;
window.propertyExpenseTotal = propertyExpenseTotal;
window.propertyHasData = propertyHasData;
window.emptyRentalProperty = emptyRentalProperty;
