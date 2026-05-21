/**
 * ATO-sourced rate tables for Australian individual tax estimates.
 * Sources (verify when updating):
 * - https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents
 * - https://www.ato.gov.au/tax-rates-and-codes/tax-rates-foreign-residents
 * - Medicare levy reduction thresholds (individual tax return instructions)
 * - https://www.ato.gov.au/Rates/HELP,-TSL-and-SFSS-repayment-thresholds-and-rates/
 * - Medicare levy surcharge instructions (M2)
 */

/** @typedef {{ upTo: number, base: number, rate: number }} TaxBracket */

/**
 * @typedef {object} TaxYearRates
 * @property {string} label
 * @property {TaxBracket[]} resident
 * @property {TaxBracket[]} nonResident
 * @property {{ levyRate: number, shadeInRate: number, single: { standard: { lower: number, upper: number }, sapto: { lower: number, upper: number } } }} medicareLevy
 * @property {{ single: { tiers: { threshold: number, rate: number }[] }, familyBase: number, perDependentChild: number }} mls
 * @property {{ type: 'flat', brackets: { min: number, rate: number }[] } | { type: 'marginal', brackets: { upTo: number, base: number, rate: number }[], topRate: number }} help
 */

/** @type {Record<string, TaxYearRates>} */
// eslint-disable-next-line no-var
var TAX_YEARS = {
  '2022-23': {
    label: '2022–23',
    resident: [
      { upTo: 18200, base: 0, rate: 0 },
      { upTo: 45000, base: 0, rate: 0.19 },
      { upTo: 120000, base: 5092, rate: 0.325 },
      { upTo: 180000, base: 29467, rate: 0.37 },
      { upTo: Infinity, base: 51667, rate: 0.45 },
    ],
    nonResident: [
      { upTo: 120000, base: 0, rate: 0.325 },
      { upTo: 180000, base: 39000, rate: 0.37 },
      { upTo: Infinity, base: 61200, rate: 0.45 },
    ],
    medicareLevy: {
      levyRate: 0.02,
      shadeInRate: 0.1,
      single: {
        standard: { lower: 23365, upper: 29227 },
        sapto: { lower: 36918, upper: 46148 },
      },
    },
    mls: {
      single: {
        tiers: [
          { threshold: 90000, rate: 0 },
          { threshold: 105000, rate: 0.01 },
          { threshold: 140000, rate: 0.0125 },
          { threshold: Infinity, rate: 0.015 },
        ],
      },
      familyBase: 180000,
      perDependentChild: 1500,
    },
    help: {
      type: 'flat',
      brackets: [
        { min: 51550, rate: 0.01 },
        { min: 59518, rate: 0.02 },
        { min: 63089, rate: 0.025 },
        { min: 66875, rate: 0.03 },
        { min: 70888, rate: 0.035 },
        { min: 75140, rate: 0.04 },
        { min: 79649, rate: 0.045 },
        { min: 84429, rate: 0.05 },
        { min: 89554, rate: 0.055 },
        { min: 95027, rate: 0.06 },
        { min: 100900, rate: 0.065 },
        { min: 107165, rate: 0.07 },
        { min: 113848, rate: 0.075 },
        { min: 120970, rate: 0.08 },
        { min: 128550, rate: 0.085 },
        { min: 136602, rate: 0.09 },
        { min: 145178, rate: 0.095 },
        { min: 154282, rate: 0.1 },
      ],
    },
  },
  '2023-24': {
    label: '2023–24',
    resident: [
      { upTo: 18200, base: 0, rate: 0 },
      { upTo: 45000, base: 0, rate: 0.19 },
      { upTo: 120000, base: 5092, rate: 0.325 },
      { upTo: 180000, base: 29467, rate: 0.37 },
      { upTo: Infinity, base: 51667, rate: 0.45 },
    ],
    nonResident: [
      { upTo: 120000, base: 0, rate: 0.325 },
      { upTo: 180000, base: 39000, rate: 0.37 },
      { upTo: Infinity, base: 61200, rate: 0.45 },
    ],
    medicareLevy: {
      levyRate: 0.02,
      shadeInRate: 0.1,
      single: {
        standard: { lower: 24276, upper: 30338 },
        sapto: { lower: 38402, upper: 48003 },
      },
    },
    mls: {
      single: {
        tiers: [
          { threshold: 93000, rate: 0 },
          { threshold: 108000, rate: 0.01 },
          { threshold: 144000, rate: 0.0125 },
          { threshold: Infinity, rate: 0.015 },
        ],
      },
      familyBase: 186000,
      perDependentChild: 1500,
    },
    help: {
      type: 'flat',
      brackets: [
        { min: 51550, rate: 0.01 },
        { min: 59518, rate: 0.02 },
        { min: 63089, rate: 0.025 },
        { min: 66875, rate: 0.03 },
        { min: 70888, rate: 0.035 },
        { min: 75140, rate: 0.04 },
        { min: 79649, rate: 0.045 },
        { min: 84429, rate: 0.05 },
        { min: 89554, rate: 0.055 },
        { min: 95027, rate: 0.06 },
        { min: 100900, rate: 0.065 },
        { min: 107165, rate: 0.07 },
        { min: 113848, rate: 0.075 },
        { min: 120970, rate: 0.08 },
        { min: 128550, rate: 0.085 },
        { min: 136602, rate: 0.09 },
        { min: 145178, rate: 0.095 },
        { min: 154282, rate: 0.1 },
      ],
    },
  },
  '2024-25': {
    label: '2024–25',
    // Stage 3 resident rates (same brackets as 2025–26 per ATO from 1 July 2024)
    resident: [
      { upTo: 18200, base: 0, rate: 0 },
      { upTo: 45000, base: 0, rate: 0.16 },
      { upTo: 135000, base: 4288, rate: 0.3 },
      { upTo: 190000, base: 31288, rate: 0.37 },
      { upTo: Infinity, base: 51638, rate: 0.45 },
    ],
    nonResident: [
      { upTo: 135000, base: 0, rate: 0.3 },
      { upTo: 190000, base: 40500, rate: 0.37 },
      { upTo: Infinity, base: 60850, rate: 0.45 },
    ],
    medicareLevy: {
      levyRate: 0.02,
      shadeInRate: 0.1,
      single: {
        standard: { lower: 27222, upper: 34027 },
        sapto: { lower: 43020, upper: 53775 },
      },
    },
    mls: {
      single: {
        tiers: [
          { threshold: 97000, rate: 0 },
          { threshold: 113000, rate: 0.01 },
          { threshold: 151000, rate: 0.0125 },
          { threshold: Infinity, rate: 0.015 },
        ],
      },
      familyBase: 194000,
      perDependentChild: 1500,
    },
    help: {
      type: 'flat',
      brackets: [
        { min: 54435, rate: 0.01 },
        { min: 62850, rate: 0.02 },
        { min: 66620, rate: 0.025 },
        { min: 70618, rate: 0.03 },
        { min: 74855, rate: 0.035 },
        { min: 79346, rate: 0.04 },
        { min: 84107, rate: 0.045 },
        { min: 89154, rate: 0.05 },
        { min: 94592, rate: 0.055 },
        { min: 100431, rate: 0.06 },
        { min: 106680, rate: 0.065 },
        { min: 113348, rate: 0.07 },
        { min: 120450, rate: 0.075 },
        { min: 127994, rate: 0.08 },
        { min: 136013, rate: 0.085 },
        { min: 144523, rate: 0.09 },
        { min: 153550, rate: 0.095 },
        { min: 163095, rate: 0.1 },
      ],
    },
  },
  '2025-26': {
    label: '2025–26',
    resident: [
      { upTo: 18200, base: 0, rate: 0 },
      { upTo: 45000, base: 0, rate: 0.16 },
      { upTo: 135000, base: 4288, rate: 0.3 },
      { upTo: 190000, base: 31288, rate: 0.37 },
      { upTo: Infinity, base: 51638, rate: 0.45 },
    ],
    nonResident: [
      { upTo: 135000, base: 0, rate: 0.3 },
      { upTo: 190000, base: 40500, rate: 0.37 },
      { upTo: Infinity, base: 60850, rate: 0.45 },
    ],
    medicareLevy: {
      levyRate: 0.02,
      shadeInRate: 0.1,
      single: {
        standard: { lower: 27222, upper: 34027 },
        sapto: { lower: 43020, upper: 53775 },
      },
    },
    mls: {
      single: {
        tiers: [
          { threshold: 97000, rate: 0 },
          { threshold: 113000, rate: 0.01 },
          { threshold: 151000, rate: 0.0125 },
          { threshold: Infinity, rate: 0.015 },
        ],
      },
      familyBase: 194000,
      perDependentChild: 1500,
    },
    help: {
      type: 'marginal',
      brackets: [
        { upTo: 67000, base: 0, rate: 0 },
        { upTo: 125000, base: 0, rate: 0.15 },
        { upTo: 179285, base: 8700, rate: 0.17 },
      ],
      topRate: 0.1,
    },
  },
};

var DEFAULT_TAX_YEAR = '2024-25';
