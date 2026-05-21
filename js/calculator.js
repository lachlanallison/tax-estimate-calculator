/** Round to whole dollars (ATO return amounts). */
function roundDollars(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value);
}

/**
 * @param {number} income
 * @param {import('./rates.js').TaxBracket[]} brackets
 */
function calculateBracketTax(income, brackets) {
  const taxable = Math.max(0, income);
  if (taxable === 0) return 0;

  let previousCap = 0;
  for (const bracket of brackets) {
    if (taxable <= bracket.upTo) {
      return roundDollars(bracket.base + (taxable - previousCap) * bracket.rate);
    }
    previousCap = bracket.upTo;
  }
  return 0;
}

/**
 * Medicare levy for a single individual (no family reduction).
 * ATO shade-in: 10% of taxable income minus 10% of lower threshold.
 */
function calculateMedicareLevy(taxableIncome, medicareConfig, saptoEligible) {
  const income = Math.max(0, taxableIncome);
  const thresholds = saptoEligible
    ? medicareConfig.single.sapto
    : medicareConfig.single.standard;

  if (income <= thresholds.lower) return 0;
  if (income > thresholds.upper) {
    return roundDollars(income * medicareConfig.levyRate);
  }

  const shadeIn =
    income * medicareConfig.shadeInRate - thresholds.lower * medicareConfig.shadeInRate;
  return roundDollars(Math.max(0, shadeIn));
}

/** MLS rate from tier thresholds (income tested). */
function mlsRateForIncome(income, tierThresholds) {
  let rate = tierThresholds[tierThresholds.length - 1].rate;
  for (const tier of tierThresholds) {
    if (income <= tier.threshold) {
      rate = tier.rate;
      break;
    }
  }
  return rate;
}

/**
 * Income for MLS purposes (simplified: taxable income).
 * Full ATO definition also includes RFB, RESC, and net investment loss.
 */
function calculateMls(incomeForMls, mlsConfig, familyStatus, dependentChildren) {
  if (familyStatus === 'family') {
    const base = mlsConfig.familyBase + Math.max(0, dependentChildren) * mlsConfig.perDependentChild;
    const tiers = [
      { threshold: base, rate: 0 },
      { threshold: base + 16000, rate: 0.01 },
      { threshold: base + 54000, rate: 0.0125 },
      { threshold: Infinity, rate: 0.015 },
    ];
    const rate = mlsRateForIncome(incomeForMls, tiers);
    return { rate, amount: roundDollars(incomeForMls * rate) };
  }

  const rate = mlsRateForIncome(incomeForMls, mlsConfig.single.tiers);
  return { rate, amount: roundDollars(incomeForMls * rate) };
}

/**
 * @param {number} repaymentIncome
 * @param {import('./rates.js').TaxYearRates['help']} helpConfig
 */
function calculateHelpRepayment(repaymentIncome, helpConfig) {
  const income = Math.max(0, repaymentIncome);
  if (helpConfig.type === 'flat') {
    let rate = 0;
    for (const bracket of helpConfig.brackets) {
      if (income >= bracket.min) rate = bracket.rate;
    }
    return roundDollars(income * rate);
  }

  const nilCap = helpConfig.brackets[0].upTo;
  if (income <= nilCap) return 0;

  const tier1 = helpConfig.brackets[1];
  if (income <= tier1.upTo) {
    return roundDollars((income - nilCap) * tier1.rate);
  }

  const tier2 = helpConfig.brackets[2];
  const tier1Amount = (tier1.upTo - nilCap) * tier1.rate;
  if (income <= tier2.upTo) {
    return roundDollars(tier1Amount + (income - tier1.upTo) * tier2.rate);
  }

  return roundDollars(income * helpConfig.topRate);
}

/**
 * @param {Record<string, unknown>} raw
 */
function calculateEstimate(raw) {
  const taxYearKey = String(raw.taxYear || '2024-25');
  const year = TAX_YEARS[taxYearKey];
  if (!year) throw new Error(`Unknown tax year: ${taxYearKey}`);

  const residency = raw.residency === 'non-resident' ? 'non-resident' : 'resident';
  const num = (key) => roundDollars(Number(raw[key]) || 0);

  const salary = num('salary');
  const interest = num('interest');
  const frankedDividends = num('frankedDividends');
  const unfrankedDividends = num('unfrankedDividends');
  const frankingCredits = num('frankingCredits');
  const rentalProperties = normalizeRentalProperties(raw);
  const rentalTotals = aggregateRentals(rentalProperties);
  const grossRent = rentalTotals.gross;
  const rentalExpenseTotal = rentalTotals.expenses;
  const rentalDepreciation = rentalTotals.depreciation;
  const governmentPayments = num('governmentPayments');
  const capitalGains = num('capitalGains');
  const businessIncome = num('businessIncome');
  const foreignIncome = num('foreignIncome');

  const netRental = rentalTotals.net;
  const rentalDeductions = rentalExpenseTotal + rentalDepreciation;

  const grossIncome =
    salary +
    interest +
    frankedDividends +
    unfrankedDividends +
    grossRent +
    governmentPayments +
    capitalGains +
    businessIncome +
    foreignIncome;

  const deductionBreakdown = {
    car: num('deductionCar'),
    travel: num('deductionTravel'),
    clothing: num('deductionClothing'),
    education: num('deductionEducation'),
    workOther: num('deductionWorkOther') + num('deductionOther'),
    lowValuePool: num('deductionLowValuePool'),
    interest: num('deductionInterest'),
    dividends: num('deductionDividends'),
    donations: num('deductionDonations'),
    taxAffairs: num('deductionTaxAffairs'),
    foreignPension: num('deductionForeignPension'),
    personalSuper: num('deductionPersonalSuper'),
    projectPool: num('deductionProjectPool'),
    forestry: num('deductionForestry'),
    otherNec: num('deductionOtherNec') + num('deductionIncomeProtection'),
    rental: rentalDeductions,
  };

  const deductions = Object.keys(deductionBreakdown).reduce(function (sum, key) {
    return sum + deductionBreakdown[key];
  }, 0);

  const taxableIncome = Math.max(0, grossIncome - deductions);

  const brackets = residency === 'resident' ? year.resident : year.nonResident;
  const incomeTax = calculateBracketTax(taxableIncome, brackets);

  let medicareLevy = 0;
  if (residency === 'resident') {
    medicareLevy = calculateMedicareLevy(
      taxableIncome,
      year.medicareLevy,
      Boolean(raw.saptoEligible),
    );
  }

  const incomeForMls = taxableIncome;
  const familyStatus = raw.mlsFamilyStatus === 'family' ? 'family' : 'single';
  const dependentChildren = Number(raw.mlsDependentChildren) || 0;
  const hasHospitalCover = Boolean(raw.hasHospitalCover);
  const hasHelpDebt = Boolean(raw.hasHelpDebt);

  let mls = { rate: 0, amount: 0 };
  if (residency === 'resident' && !hasHospitalCover) {
    mls = calculateMls(incomeForMls, year.mls, familyStatus, dependentChildren);
  }

  const repaymentIncome = taxableIncome;
  const helpRepayment = hasHelpDebt ? calculateHelpRepayment(repaymentIncome, year.help) : 0;

  const grossTax = incomeTax + medicareLevy + mls.amount + helpRepayment;

  const taxOffsetFranking = frankingCredits;
  const taxAfterOffsets = Math.max(0, grossTax - taxOffsetFranking);
  const refundableOffset = Math.max(0, taxOffsetFranking - grossTax);

  const paygWithheld = num('paygWithheld') + num('paygWithheldOther');
  const paygInstalments = num('paygInstalments');
  const totalCredits = paygWithheld + paygInstalments + refundableOffset;
  const amountPayable = taxAfterOffsets;
  const refundOrOwing = totalCredits - amountPayable;

  return {
    taxYear: taxYearKey,
    taxYearLabel: year.label,
    residency,
    grossIncome,
    grossRent,
    netRental,
    rentalDeductions,
    rentalExpenseTotal,
    rentalPropertyCount: rentalTotals.count,
    rentalProperties,
    totalDeductions: deductions,
    deductionBreakdown,
    taxableIncome,
    incomeTax,
    medicareLevy,
    medicareLevySurcharge: mls.amount,
    mlsRate: mls.rate,
    helpRepayment,
    grossTax,
    frankingCredits,
    taxAfterOffsets,
    refundableFranking: refundableOffset,
    totalTaxPayable: amountPayable,
    paygWithheld,
    paygInstalments,
    totalCredits,
    refundOrOwing,
    breakdown: {
      salary,
      interest,
      frankedDividends,
      unfrankedDividends,
      grossRent,
      governmentPayments,
      capitalGains,
      businessIncome,
      foreignIncome,
    },
  };
}

window.calculateEstimate = calculateEstimate;
window.roundDollars = roundDollars;
