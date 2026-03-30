const NAMES = [
  { first: 'Amit', last: 'Cohen', firstHe: 'עמית', lastHe: 'כהן' },
  { first: 'Yael', last: 'Levi', firstHe: 'יעל', lastHe: 'לוי' },
  { first: 'Noam', last: 'Shapira', firstHe: 'נועם', lastHe: 'שפירא' },
  { first: 'Dana', last: 'Mizrahi', firstHe: 'דנה', lastHe: 'מזרחי' },
  { first: 'Oren', last: 'Goldberg', firstHe: 'אורן', lastHe: 'גולדברג' },
  { first: 'Tamar', last: 'Avraham', firstHe: 'תמר', lastHe: 'אברהם' },
  { first: 'Eyal', last: 'Peretz', firstHe: 'אייל', lastHe: 'פרץ' },
  { first: 'Noa', last: 'Friedman', firstHe: 'נועה', lastHe: 'פרידמן' },
  { first: 'Lior', last: 'Katz', firstHe: 'ליאור', lastHe: 'כץ' },
  { first: 'Shira', last: 'Ben-David', firstHe: 'שירה', lastHe: 'בן-דוד' },
  { first: 'Rotem', last: 'Halevi', firstHe: 'רותם', lastHe: 'הלוי' },
  { first: 'Maya', last: 'Stern', firstHe: 'מאיה', lastHe: 'שטרן' },
  { first: 'Gal', last: 'Weiss', firstHe: 'גל', lastHe: 'וייס' },
  { first: 'Tomer', last: 'Rosen', firstHe: 'תומר', lastHe: 'רוזן' },
  { first: 'Yonit', last: 'Carmel', firstHe: 'יונית', lastHe: 'כרמל' },
  { first: 'Ido', last: 'Navon', firstHe: 'עידו', lastHe: 'נבון' },
  { first: 'Hila', last: 'Ashkenazi', firstHe: 'הילה', lastHe: 'אשכנזי' },
  { first: 'Amir', last: 'Dayan', firstHe: 'אמיר', lastHe: 'דיין' },
  { first: 'Michal', last: 'Baruch', firstHe: 'מיכל', lastHe: 'ברוך' },
  { first: 'Ori', last: 'Segal', firstHe: 'אורי', lastHe: 'סגל' },
]

const EMPLOYERS = ['Menora', 'Migdal', 'Harel', 'Phoenix', 'Clal', 'Altshuler Shaham']

const INVESTMENT_TRACKS = ['General', 'Aggressive Growth', 'Conservative', 'S&P 500 Index', 'Bond Focus', 'Balanced']
const BENEFICIARY_RELATIONS = ['Spouse', 'Child', 'Parent', 'Sibling', 'Other']
const BENEFICIARY_RELATIONS_HE = ['בן/בת זוג', 'ילד/ה', 'הורה', 'אח/ות', 'אחר']

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }
function randFloat(min, max) { return Math.round((Math.random() * (max - min) + min) * 100) / 100 }
function randDigits(n) { return Array.from({ length: n }, () => randInt(0, 9)).join('') }
function chance(pct) { return Math.random() * 100 < pct }

function randomDate(minYear, maxYear) {
  const y = randInt(minYear, maxYear)
  const m = randInt(1, 12)
  const d = randInt(1, 28)
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function randomBirthDate() {
  const now = new Date()
  const r = Math.random()
  let age
  if (r < 0.3) age = randInt(18, 30)
  else if (r < 0.7) age = randInt(31, 55)
  else age = randInt(56, 75)
  const year = now.getFullYear() - age
  return randomDate(year, year)
}

function generateCommonFields() {
  const name = pick(NAMES)
  const birthDate = randomBirthDate()
  const prefix = pick(['054', '052', '050'])
  const memberName = `${name.first} ${name.last}`
  // Bank account owner: 85% matches member name, 15% mismatch (to sometimes trigger bank validation failure)
  const accountOwner = chance(85) ? memberName : `${pick(NAMES).first} ${pick(NAMES).last}`
  return {
    member_id: randDigits(8),
    member_name: memberName,
    member_name_he: `${name.firstHe} ${name.lastHe}`,
    birth_date: birthDate,
    phone: `${prefix}-${randDigits(7)}`,
    email: `${name.first.toLowerCase()}.${name.last.toLowerCase()}@gmail.com`,
    account_number: randDigits(12),
    account_owner: accountOwner,
    id_photo_confidence: chance(70) ? randInt(90, 99) : chance(50) ? randInt(70, 89) : randInt(30, 69),
  }
}

function generateRandomBeneficiaries(count) {
  const beneficiaries = []
  let remainingPct = 100
  for (let i = 0; i < count; i++) {
    const name = pick(NAMES)
    const relIdx = randInt(0, BENEFICIARY_RELATIONS.length - 1)
    const pct = i === count - 1 ? remainingPct : randInt(10, remainingPct - (count - i - 1) * 10)
    remainingPct -= pct
    beneficiaries.push({
      name: `${name.first} ${name.last}`,
      name_he: `${name.firstHe} ${name.lastHe}`,
      relation: BENEFICIARY_RELATIONS[relIdx],
      relation_he: BENEFICIARY_RELATIONS_HE[relIdx],
      percentage: pct,
      id_number: randDigits(9),
    })
  }
  return beneficiaries
}

// ---- MEMBER DATA GENERATORS BY FUND TYPE + USE CASE ----

export function generateMemberData(fundType, useCase) {
  const common = generateCommonFields()

  if (fundType === 'investment') {
    const balance = randInt(10000, 500000)
    const startMonthsAgo = randInt(1, 30)
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - startMonthsAgo)

    const base = {
      ...common,
      fund_type: 'investment',
      fund_type_he: 'קופת גמל להשקעה',
      use_case: useCase,
      balance,
      start_date: startDate.toISOString().split('T')[0],
      policy_minimum_holding_months: pick([6, 12, 18, 24]),
    }

    if (useCase === 'withdrawal') {
      const withdrawalPct = randFloat(0.5, 1.0)
      return { ...base, withdrawal_amount: Math.round(balance * withdrawalPct) }
    }

    if (useCase === 'fund_transfer') {
      const sourceTrack = pick(INVESTMENT_TRACKS)
      let targetTrack = pick(INVESTMENT_TRACKS)
      while (targetTrack === sourceTrack) targetTrack = pick(INVESTMENT_TRACKS)
      const sourceBalance = Math.round(balance * randFloat(0.3, 0.7))
      const transferPct = randFloat(0.2, 1.0)
      return {
        ...base,
        source_track: sourceTrack,
        target_track: targetTrack,
        source_track_balance: sourceBalance,
        transfer_amount: Math.round(sourceBalance * transferPct),
        transfer_percentage: Math.round(transferPct * 100),
      }
    }

    if (useCase === 'beneficiary_update') {
      const currentCount = randInt(1, 3)
      const newCount = randInt(1, 4)
      const changeReasons = ['Marriage', 'Divorce', 'Birth of child', 'Death of beneficiary', 'Annual review']
      return {
        ...base,
        current_beneficiaries: generateRandomBeneficiaries(currentCount),
        new_beneficiaries: generateRandomBeneficiaries(newCount),
        change_reason: pick(changeReasons),
        notary_verified: chance(70),
        beneficiary_consent_obtained: chance(60),
      }
    }
  }

  if (fundType === 'compensation') {
    const balance = randInt(30000, 300000)
    const gender = pick(['male', 'female'])

    const base = {
      ...common,
      fund_type: 'compensation',
      fund_type_he: 'קופת גמל פיצויים',
      use_case: useCase,
      gender,
      employer: pick(EMPLOYERS),
      balance,
    }

    if (useCase === 'withdrawal') {
      return {
        ...base,
        withdrawal_amount: balance,
        early_withdrawal_allowed: chance(50),
      }
    }

    if (useCase === 'employer_change') {
      const currentEmployer = base.employer
      let newEmployer = pick(EMPLOYERS)
      while (newEmployer === currentEmployer) newEmployer = pick(EMPLOYERS)
      const endDate = new Date()
      endDate.setMonth(endDate.getMonth() - randInt(0, 3))
      const startNewDate = new Date(endDate)
      startNewDate.setDate(startNewDate.getDate() + randInt(1, 45))
      return {
        ...base,
        current_employer: currentEmployer,
        new_employer: newEmployer,
        employment_end_date: endDate.toISOString().split('T')[0],
        new_employment_start_date: startNewDate.toISOString().split('T')[0],
        transfer_balance: balance,
        severance_included: chance(70),
        employer_approval_received: chance(60),
        continuous_employment: chance(50),
        gap_days: randInt(0, 45),
      }
    }

    if (useCase === 'beneficiary_update') {
      const currentCount = randInt(1, 3)
      const newCount = randInt(1, 4)
      return {
        ...base,
        current_beneficiaries: generateRandomBeneficiaries(currentCount),
        new_beneficiaries: generateRandomBeneficiaries(newCount),
        change_reason: pick(['Marriage', 'Divorce', 'Birth of child', 'Death of beneficiary', 'Annual review']),
        notary_verified: chance(70),
        beneficiary_consent_obtained: chance(60),
        employer_notified: chance(80),
      }
    }
  }

  // Study fund
  const generalBalance = randInt(20000, 200000)
  const stockBalance = randInt(20000, 200000)
  const totalBalance = generalBalance + stockBalance
  const liquidityInPast = chance(60)
  const liquidityDate = new Date()
  if (liquidityInPast) {
    liquidityDate.setMonth(liquidityDate.getMonth() - randInt(1, 24))
  } else {
    liquidityDate.setMonth(liquidityDate.getMonth() + randInt(1, 24))
  }

  const base = {
    ...common,
    fund_type: 'study',
    fund_type_he: 'קרן השתלמות',
    use_case: useCase,
    general_track_balance: generalBalance,
    stock_track_balance: stockBalance,
    total_balance: totalBalance,
    liquidity_date: liquidityDate.toISOString().split('T')[0],
  }

  if (useCase === 'withdrawal') {
    const withdrawalPct = randFloat(0.3, 1.0)
    return { ...base, withdrawal_amount: Math.round(totalBalance * withdrawalPct) }
  }

  if (useCase === 'fund_transfer') {
    const currentGeneralPct = Math.round((generalBalance / totalBalance) * 100)
    const targetGeneralPct = randInt(20, 80)
    const rebalanceAmount = Math.abs(Math.round(totalBalance * (targetGeneralPct - currentGeneralPct) / 100))
    return {
      ...base,
      current_general_pct: currentGeneralPct,
      current_stock_pct: 100 - currentGeneralPct,
      target_general_pct: targetGeneralPct,
      target_stock_pct: 100 - targetGeneralPct,
      rebalance_amount: rebalanceAmount,
      rebalance_direction: targetGeneralPct > currentGeneralPct ? 'stock_to_general' : 'general_to_stock',
    }
  }

  if (useCase === 'early_redemption') {
    const redemptionPct = randFloat(0.5, 1.0)
    const reasons = ['Financial hardship', 'Educational expense', 'Medical expense', 'Housing purchase', 'Business investment']
    return {
      ...base,
      redemption_amount: Math.round(totalBalance * redemptionPct),
      redemption_reason: pick(reasons),
      supporting_documents: chance(65),
      tax_aware: chance(80),
      employer_notified: chance(50),
    }
  }

  // Default: withdrawal
  const withdrawalPct = randFloat(0.3, 1.0)
  return { ...base, withdrawal_amount: Math.round(totalBalance * withdrawalPct) }
}

// --- CONTRACT CLAUSES ---

const INSURANCE_COMPANIES = ['Menora Mivtachim', 'Migdal Insurance', 'Harel Insurance', 'The Phoenix', 'Clal Insurance', 'Altshuler Shaham', 'Psagot Provident', 'More Investment House']

const INVESTMENT_WITHDRAWAL_CLAUSES = [
  () => ({
    clause_id: 'CL-1.1',
    category: 'processing',
    title: 'Bank Account Ownership Validation',
    description: 'Destination bank account must be verified and match member records.',
    conditions: [{ field: 'account_owner', operator: '==', value: 'member_name' }],
    consequence: 'block',
  }),
  (data) => {
    const months = data.policy_minimum_holding_months || pick([6, 12, 18, 24])
    return {
      clause_id: 'CL-4.3',
      category: 'eligibility',
      title: 'Minimum Holding Period',
      description: `Funds must be held for at least ${months} months before withdrawal.`,
      conditions: [{ field: 'holding_period_months', operator: '>=', value: months }],
      consequence: 'block',
    }
  },
  () => {
    const threshold = pick([25000, 50000, 100000, 200000])
    return {
      clause_id: 'CL-7.1',
      category: 'financial',
      title: 'Auto-Approval Threshold',
      description: `Withdrawals up to ${threshold.toLocaleString()} ₪ are auto-approved. Above requires supervisor approval.`,
      conditions: [{ field: 'withdrawal_amount', operator: '<=', value: threshold }],
      consequence: 'require_approval',
    }
  },
  () => {
    const maxRequests = pick([1, 2, 3, 5])
    return {
      clause_id: 'CL-5.2',
      category: 'eligibility',
      title: 'Maximum Withdrawals Per Year',
      description: `No more than ${maxRequests} withdrawals per calendar year.`,
      conditions: [{ field: 'recent_withdrawal_count', operator: '<=', value: maxRequests }],
      consequence: 'block',
    }
  },
  () => {
    const minBalance = pick([0, 1000, 5000])
    return {
      clause_id: 'CL-3.8',
      category: 'financial',
      title: 'Minimum Remaining Balance',
      description: `After withdrawal, account must maintain minimum ${minBalance.toLocaleString()} ₪ or be fully withdrawn.`,
      conditions: [{ field: 'remaining_balance', operator: '>=', value: minBalance }],
      consequence: 'block',
    }
  },
  () => {
    const minPct = pick([10, 20, 30])
    return {
      clause_id: 'CL-9.1',
      category: 'withdrawal',
      title: 'Partial Withdrawal Minimum Retention',
      description: `Partial withdrawals must leave minimum ${minPct}% of balance.`,
      conditions: [{ field: 'remaining_balance_pct', operator: '>=', value: minPct }],
      consequence: 'block',
    }
  },
  () => {
    const min = pick([1000, 5000, 10000])
    return {
      clause_id: 'CL-3.1',
      category: 'financial',
      title: 'Minimum Withdrawal Amount',
      description: `Minimum withdrawal amount: ${min.toLocaleString()} ₪.`,
      conditions: [{ field: 'withdrawal_amount', operator: '>=', value: min }],
      consequence: 'block',
    }
  },
]

const INVESTMENT_TRANSFER_CLAUSES = [
  () => {
    const minHold = pick([30, 60, 90])
    return {
      clause_id: 'CL-12.1',
      category: 'eligibility',
      title: 'Track Switch Cooldown',
      description: `Fund transfers between investment tracks require a minimum of ${minHold} days since last track change.`,
      conditions: [{ field: 'days_since_last_transfer', operator: '>=', value: minHold }],
      consequence: 'block',
    }
  },
  () => {
    const maxPct = pick([25, 50, 75])
    return {
      clause_id: 'CL-12.3',
      category: 'financial',
      title: 'Maximum Transfer Percentage',
      description: `Single track transfer limited to ${maxPct}% of source track balance.`,
      conditions: [{ field: 'transfer_percentage', operator: '<=', value: maxPct }],
      consequence: 'block',
    }
  },
  () => {
    const maxTransfers = pick([2, 4, 6])
    return {
      clause_id: 'CL-12.5',
      category: 'eligibility',
      title: 'Annual Transfer Limit',
      description: `Maximum ${maxTransfers} track transfers permitted per calendar year.`,
      conditions: [{ field: 'annual_transfer_count', operator: '<=', value: maxTransfers }],
      consequence: 'block',
    }
  },
  () => {
    const threshold = pick([50000, 100000])
    return {
      clause_id: 'CL-12.7',
      category: 'financial',
      title: 'Large Transfer Approval',
      description: `Track transfers above ${threshold.toLocaleString()} ₪ require supervisor approval and member confirmation.`,
      conditions: [{ field: 'transfer_amount', operator: '<=', value: threshold }],
      consequence: 'require_approval',
    }
  },
]

const INVESTMENT_BENEFICIARY_CLAUSES = [
  () => ({
    clause_id: 'CL-15.1',
    category: 'processing',
    title: 'Beneficiary Percentage Validation',
    description: 'Total beneficiary allocation must equal exactly 100%.',
    conditions: [{ field: 'total_beneficiary_percentage', operator: '==', value: 100 }],
    consequence: 'block',
  }),
  () => ({
    clause_id: 'CL-15.3',
    category: 'processing',
    title: 'Notary Verification Requirement',
    description: 'Beneficiary changes must be notarized or verified by an authorized representative.',
    conditions: [{ field: 'notary_verified', operator: '==', value: true }],
    consequence: 'block',
  }),
  () => {
    const days = pick([7, 14, 30])
    return {
      clause_id: 'CL-15.5',
      category: 'processing',
      title: 'Cooling-Off Period for Beneficiary Changes',
      description: `Beneficiary changes take effect after a ${days}-day cooling-off period. Member can cancel during this period.`,
      conditions: [{ field: 'cooling_off_days', operator: '>=', value: days }],
      consequence: 'notify',
    }
  },
  () => ({
    clause_id: 'CL-15.7',
    category: 'processing',
    title: 'Existing Beneficiary Consent',
    description: 'Removed beneficiaries must be notified. Consent from existing beneficiaries recommended.',
    conditions: [{ field: 'beneficiary_consent_obtained', operator: '==', value: true }],
    consequence: 'require_approval',
  }),
]

const COMPENSATION_WITHDRAWAL_CLAUSES = [
  (data) => {
    const age = data?.gender === 'female' ? pick([60, 62, 64]) : pick([65, 67])
    const gender = data?.gender || 'male'
    return {
      clause_id: 'CL-4.3',
      category: 'eligibility',
      title: 'Retirement Age Gate',
      description: `Standard withdrawal requires retirement age: ${gender} ${age}.`,
      conditions: [{ field: 'age', operator: '>=', value: age }],
      consequence: 'block',
    }
  },
  () => {
    const taxRate = pick([25, 30, 35])
    const fee = pick([3, 5, 7])
    return {
      clause_id: 'CL-6.2',
      category: 'penalties',
      title: 'Early Withdrawal Penalties',
      description: `Pre-maturity withdrawals incur ${taxRate}% income tax + ${fee}% early withdrawal fee.`,
      conditions: [{ field: 'is_early_withdrawal', operator: '==', value: true }],
      consequence: 'apply_fee',
      tax_rate: taxRate,
      fee_rate: fee,
    }
  },
  () => {
    const threshold = pick([50, 75, 100])
    return {
      clause_id: 'CL-8.1',
      category: 'financial',
      title: 'Employer Consent Requirement',
      description: `Withdrawals exceeding ${threshold}% of compensation balance require employer written consent.`,
      conditions: [{ field: 'withdrawal_percentage', operator: '<=', value: threshold }],
      consequence: 'require_approval',
    }
  },
  () => ({
    clause_id: 'CL-2.5',
    category: 'withdrawal',
    title: 'Early Withdrawal Eligibility',
    description: 'Early withdrawal (pre-retirement) allowed only if contract permits. If yes, subject to tax clause.',
    conditions: [{ field: 'early_withdrawal_allowed', operator: '==', value: true }],
    consequence: 'block',
  }),
]

const COMPENSATION_EMPLOYER_CHANGE_CLAUSES = [
  () => {
    const maxGap = pick([30, 45, 60])
    return {
      clause_id: 'CL-20.1',
      category: 'eligibility',
      title: 'Employment Gap Limit',
      description: `Employer transfer must occur within ${maxGap} days of termination to maintain continuous coverage.`,
      conditions: [{ field: 'gap_days', operator: '<=', value: maxGap }],
      consequence: 'block',
    }
  },
  () => ({
    clause_id: 'CL-20.3',
    category: 'processing',
    title: 'Previous Employer Approval',
    description: 'Transfer of compensation funds requires written approval from previous employer.',
    conditions: [{ field: 'employer_approval_received', operator: '==', value: true }],
    consequence: 'block',
  }),
  () => ({
    clause_id: 'CL-20.5',
    category: 'processing',
    title: 'Severance Continuity',
    description: 'If severance is included, continuous employment must be verified to maintain severance rights.',
    conditions: [{ field: 'continuous_employment', operator: '==', value: true }],
    consequence: 'require_approval',
  }),
  () => {
    const minBalance = pick([5000, 10000])
    return {
      clause_id: 'CL-20.7',
      category: 'financial',
      title: 'Minimum Transfer Balance',
      description: `Employer change transfers must include a minimum balance of ${minBalance.toLocaleString()} ₪.`,
      conditions: [{ field: 'transfer_balance', operator: '>=', value: minBalance }],
      consequence: 'block',
    }
  },
]

const COMPENSATION_BENEFICIARY_CLAUSES = [
  () => ({
    clause_id: 'CL-15.1',
    category: 'processing',
    title: 'Beneficiary Percentage Validation',
    description: 'Total beneficiary allocation must equal exactly 100%.',
    conditions: [{ field: 'total_beneficiary_percentage', operator: '==', value: 100 }],
    consequence: 'block',
  }),
  () => ({
    clause_id: 'CL-15.3',
    category: 'processing',
    title: 'Notary Verification Requirement',
    description: 'Beneficiary changes must be notarized or verified by an authorized representative.',
    conditions: [{ field: 'notary_verified', operator: '==', value: true }],
    consequence: 'block',
  }),
  () => ({
    clause_id: 'CL-15.9',
    category: 'processing',
    title: 'Employer Notification',
    description: 'For compensation funds, the employer must be notified of beneficiary changes within 14 days.',
    conditions: [{ field: 'employer_notified', operator: '==', value: true }],
    consequence: 'require_approval',
  }),
  () => ({
    clause_id: 'CL-15.7',
    category: 'processing',
    title: 'Existing Beneficiary Consent',
    description: 'Removed beneficiaries must be notified. Consent from existing beneficiaries recommended.',
    conditions: [{ field: 'beneficiary_consent_obtained', operator: '==', value: true }],
    consequence: 'require_approval',
  }),
]

const STUDY_WITHDRAWAL_CLAUSES = [
  () => ({
    clause_id: 'CL-4.3',
    category: 'withdrawal',
    title: 'Liquidity Gate',
    description: 'Withdrawals only permitted after liquidity date. Track allocation must be proportional.',
    conditions: [{ field: 'liquidity_date', operator: '<=', value: 'today' }],
    consequence: 'block',
  }),
  () => {
    const deviation = pick([5, 10, 15])
    return {
      clause_id: 'CL-7.4',
      category: 'withdrawal',
      title: 'Track Allocation Rule',
      description: `Withdrawals must maintain proportional allocation across investment tracks (max ${deviation}% deviation).`,
      conditions: [{ field: 'track_deviation', operator: '<=', value: deviation }],
      consequence: 'block',
    }
  },
  () => {
    const min = pick([5000, 10000, 20000])
    return {
      clause_id: 'CL-3.1',
      category: 'financial',
      title: 'Minimum Withdrawal Amount',
      description: `Minimum withdrawal amount: ${min.toLocaleString()} ₪.`,
      conditions: [{ field: 'withdrawal_amount', operator: '>=', value: min }],
      consequence: 'block',
    }
  },
  () => ({
    clause_id: 'CL-11.2',
    category: 'withdrawal',
    title: 'Educational Purpose Clause',
    description: 'Pre-liquidity withdrawals permitted only for accredited educational expenses with documentation.',
    conditions: [{ field: 'has_education_docs', operator: '==', value: true }],
    consequence: 'require_approval',
  }),
]

const STUDY_REBALANCE_CLAUSES = [
  () => {
    const maxDeviation = pick([10, 20, 30])
    return {
      clause_id: 'CL-25.1',
      category: 'financial',
      title: 'Maximum Rebalance Shift',
      description: `Single rebalance operation cannot shift allocation by more than ${maxDeviation}% between tracks.`,
      conditions: [{ field: 'allocation_shift', operator: '<=', value: maxDeviation }],
      consequence: 'block',
    }
  },
  () => {
    const minDays = pick([30, 60, 90])
    return {
      clause_id: 'CL-25.3',
      category: 'eligibility',
      title: 'Rebalance Frequency Limit',
      description: `Track rebalancing permitted only once every ${minDays} days.`,
      conditions: [{ field: 'days_since_last_rebalance', operator: '>=', value: minDays }],
      consequence: 'block',
    }
  },
  () => ({
    clause_id: 'CL-25.5',
    category: 'processing',
    title: 'Market Hours Restriction',
    description: 'Track rebalancing requests must be submitted during market hours (09:00-17:30 IST).',
    conditions: [{ field: 'request_hour', operator: 'between', value: [9, 17.5] }],
    consequence: 'notify',
  }),
  () => {
    const threshold = pick([50000, 100000])
    return {
      clause_id: 'CL-25.7',
      category: 'financial',
      title: 'Large Rebalance Approval',
      description: `Rebalance operations moving more than ${threshold.toLocaleString()} ₪ require supervisor approval.`,
      conditions: [{ field: 'rebalance_amount', operator: '<=', value: threshold }],
      consequence: 'require_approval',
    }
  },
]

const STUDY_EARLY_REDEMPTION_CLAUSES = [
  () => ({
    clause_id: 'CL-30.1',
    category: 'withdrawal',
    title: 'Pre-Liquidity Redemption Gate',
    description: 'Early redemption before liquidity date requires documented qualifying reason.',
    conditions: [{ field: 'supporting_documents', operator: '==', value: true }],
    consequence: 'block',
  }),
  () => {
    const taxRate = pick([25, 30, 35])
    return {
      clause_id: 'CL-30.3',
      category: 'penalties',
      title: 'Early Redemption Tax',
      description: `Early redemption subject to ${taxRate}% capital gains tax on accrued profits.`,
      conditions: [{ field: 'is_early_redemption', operator: '==', value: true }],
      consequence: 'apply_fee',
      tax_rate: taxRate,
    }
  },
  () => {
    const validReasons = ['Financial hardship', 'Educational expense', 'Medical expense']
    return {
      clause_id: 'CL-30.5',
      category: 'eligibility',
      title: 'Qualifying Reason Verification',
      description: `Early redemption permitted only for qualifying reasons: ${validReasons.join(', ')}.`,
      conditions: [{ field: 'redemption_reason', operator: 'in', value: validReasons }],
      consequence: 'block',
    }
  },
  () => ({
    clause_id: 'CL-30.7',
    category: 'processing',
    title: 'Employer Notification for Early Redemption',
    description: 'Employer must be notified of early redemption within 7 business days.',
    conditions: [{ field: 'employer_notified', operator: '==', value: true }],
    consequence: 'require_approval',
  }),
]

// HITL-triggering clauses — at least one always included
const HITL_CLAUSES = [
  () => {
    const threshold = pick([100000, 200000, 500000])
    return {
      clause_id: 'CL-HITL-1',
      category: 'financial',
      title: 'High-Value Compliance Review',
      description: `Withdrawals exceeding ${threshold.toLocaleString()} ₪ require manual compliance review.`,
      conditions: [{ field: 'withdrawal_amount', operator: '>', value: threshold }],
      consequence: 'require_hitl',
    }
  },
  () => ({
    clause_id: 'CL-HITL-2',
    category: 'processing',
    title: 'Identity Verification Failure Review',
    description: 'Identity verification failures must be reviewed by a human operator before re-attempting.',
    conditions: [{ field: 'id_photo_confidence', operator: '<', value: pick([85, 90, 95]) }],
    consequence: 'require_hitl',
  }),
  () => {
    const maxRequests = pick([2, 3])
    const days = pick([90, 180])
    return {
      clause_id: 'CL-HITL-3',
      category: 'eligibility',
      title: 'Fraud Review',
      description: `Members with more than ${maxRequests} withdrawal requests in the past ${days} days require fraud review.`,
      conditions: [{ field: 'recent_withdrawal_count', operator: '>', value: maxRequests }],
      consequence: 'require_hitl',
    }
  },
  () => {
    const years = pick([5, 10])
    return {
      clause_id: 'CL-HITL-4',
      category: 'processing',
      title: 'Account Reconciliation Review',
      description: `First-time withdrawals from accounts older than ${years} years require account reconciliation review.`,
      conditions: [{ field: 'account_age_years', operator: '>', value: years }],
      consequence: 'require_hitl',
    }
  },
]

// Clause selection map
const CLAUSE_MAP = {
  investment: {
    withdrawal: INVESTMENT_WITHDRAWAL_CLAUSES,
    fund_transfer: INVESTMENT_TRANSFER_CLAUSES,
    beneficiary_update: INVESTMENT_BENEFICIARY_CLAUSES,
  },
  compensation: {
    withdrawal: COMPENSATION_WITHDRAWAL_CLAUSES,
    employer_change: COMPENSATION_EMPLOYER_CHANGE_CLAUSES,
    beneficiary_update: COMPENSATION_BENEFICIARY_CLAUSES,
  },
  study: {
    withdrawal: STUDY_WITHDRAWAL_CLAUSES,
    fund_transfer: STUDY_REBALANCE_CLAUSES,
    early_redemption: STUDY_EARLY_REDEMPTION_CLAUSES,
  },
}

// SLA clause — always included in every generated contract
function generateSlaClause() {
  const slaDays = pick([3, 5, 7])
  const complexDays = pick([10, 14, 21])
  return {
    clause_id: 'SLA-1',
    category: 'sla',
    title: 'Processing Time SLA',
    description: `Standard requests processed within ${slaDays} business days. Complex requests (human review, high-value) processed within ${complexDays} business days.`,
    conditions: [],
    consequence: 'notify',
    sla_business_days: slaDays,
    sla_complex_business_days: complexDays,
  }
}

// Identity verification clause
function generateIdVerificationClause() {
  const confidence = pick([85, 90, 95])
  return {
    clause_id: 'CL-ID-1',
    category: 'processing',
    title: 'Identity Verification Level',
    description: `Withdrawals require identity verification with minimum confidence of ${confidence}%.`,
    conditions: [{ field: 'id_photo_confidence', operator: '>=', value: confidence }],
    consequence: 'block',
    confidence_threshold: confidence,
  }
}

export function generateContract(fundType, useCase, memberData) {
  const pool = CLAUSE_MAP[fundType]?.[useCase] || CLAUSE_MAP[fundType]?.withdrawal || []
  const count = randInt(3, Math.min(5, pool.length))
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  const clauses = shuffled.slice(0, count).map(fn => fn(memberData))

  // Always include SLA clause
  clauses.push(generateSlaClause())

  // Always include at least one HITL clause
  const hitlShuffled = [...HITL_CLAUSES].sort(() => Math.random() - 0.5)
  clauses.push(hitlShuffled[0](memberData))

  // Sometimes include identity verification clause
  if (chance(60)) clauses.push(generateIdVerificationClause())

  const fundTypeLabels = { investment: 'Investment Provident Fund', compensation: 'Compensation Fund', study: 'Study Fund' }

  const effectiveDate = new Date()
  effectiveDate.setFullYear(effectiveDate.getFullYear() - randInt(1, 5))
  const expiryDate = new Date()
  expiryDate.setFullYear(expiryDate.getFullYear() + randInt(1, 10))

  return {
    contract_id: `CTR-2024-${randDigits(4)}`,
    customer_name: memberData.member_name,
    fund_type: fundTypeLabels[fundType] || fundType,
    insurance_company: pick(INSURANCE_COMPANIES),
    effective_date: effectiveDate.toISOString().split('T')[0],
    expiry_date: expiryDate.toISOString().split('T')[0],
    clauses,
  }
}

// --- REGULATIONS ---

const WITHDRAWAL_REGULATIONS = [
  () => {
    const threshold = pick([30000, 50000])
    const confidence = pick([85, 90, 95])
    const maxWithdrawals = pick([2, 3])
    const days = pick([90, 180])
    return {
      regulation_id: 'REG-2024-07',
      authority: 'Israel Securities Authority',
      title: 'AML Verification Requirements',
      requirements: [
        `All withdrawals above ${threshold.toLocaleString()} ₪ must include identity verification with confidence score above ${confidence}%.`,
        `Transactions flagged for manual AML review if member has more than ${maxWithdrawals} large withdrawals in ${days} days.`,
      ],
      effective_date: '2024-07-01',
      confidence_threshold: confidence,
      amount_threshold: threshold,
    }
  },
  () => {
    const minorAge = pick([21, 25])
    const seniorAge = pick([80, 85])
    return {
      regulation_id: 'ISA-DIR-445',
      authority: 'Ministry of Finance',
      title: 'Beneficiary Protection',
      requirements: [
        `For members under age ${minorAge}, withdrawal requests must be co-signed by a registered guardian.`,
        `Members above age ${seniorAge} require additional capacity verification.`,
      ],
      effective_date: '2024-01-15',
      minor_age: minorAge,
      senior_age: seniorAge,
    }
  },
  () => {
    const threshold = pick([50000, 100000])
    return {
      regulation_id: 'TAX-856-2024',
      authority: 'Ministry of Finance',
      title: 'Tax Reporting Threshold',
      requirements: [
        `Withdrawals exceeding ${threshold.toLocaleString()} ₪ in a calendar year trigger automatic tax authority reporting via form 856.`,
      ],
      effective_date: '2024-01-01',
      tax_threshold: threshold,
    }
  },
  () => {
    const confidence = pick([90, 95])
    const year = pick([2024, 2025])
    const days = pick([5, 10])
    return {
      regulation_id: `ISA-DID-${year}`,
      authority: 'Israel Securities Authority',
      title: 'Digital Identity Standards',
      requirements: [
        `Electronic identity verification must achieve minimum confidence of ${confidence}% per ISA Digital Identity Directive ${year}.`,
        `Failed verifications must offer in-person alternative within ${days} business days.`,
      ],
      effective_date: `${year}-03-01`,
      confidence_threshold: confidence,
      in_person_days: days,
    }
  },
  () => {
    const standard = pick([3, 5, 7])
    const complex = pick([10, 14, 21])
    return {
      regulation_id: 'REG-SLA-2024',
      authority: 'Capital Market Authority',
      title: 'Processing Time SLA',
      requirements: [
        `Fund managers must process standard withdrawal requests within ${standard} business days.`,
        `Complex cases requiring human review: ${complex} business days.`,
      ],
      effective_date: '2024-06-01',
      standard_days: standard,
      complex_days: complex,
    }
  },
  () => {
    const maxPartial = pick([3, 5])
    const minPct = pick([10, 20])
    return {
      regulation_id: 'REG-PWL-2024',
      authority: 'Bank of Israel',
      title: 'Partial Withdrawal Limits',
      requirements: [
        `Partial withdrawals limited to ${maxPartial} per calendar year per account.`,
        `Each partial withdrawal minimum ${minPct}% of total balance.`,
      ],
      effective_date: '2024-04-01',
      max_partial: maxPartial,
      min_percentage: minPct,
    }
  },
]

const TRANSFER_REGULATIONS = [
  () => ({
    regulation_id: 'ISA-TRF-2024',
    authority: 'Israel Securities Authority',
    title: 'Fund Transfer Transparency',
    requirements: [
      'All inter-track transfers must be logged with source/target track names and amounts.',
      'Member must receive written confirmation of transfer within 2 business days.',
    ],
    effective_date: '2024-02-01',
  }),
  () => {
    const confidence = pick([85, 90])
    return {
      regulation_id: 'ISA-DID-2024',
      authority: 'Israel Securities Authority',
      title: 'Digital Identity for Transfers',
      requirements: [
        `Identity verification with minimum ${confidence}% confidence required for fund transfers.`,
        'Failed verifications must offer in-person alternative within 5 business days.',
      ],
      effective_date: '2024-03-01',
      confidence_threshold: confidence,
    }
  },
  () => ({
    regulation_id: 'REG-INV-2024',
    authority: 'Capital Market Authority',
    title: 'Investment Suitability Check',
    requirements: [
      'Track transfers must be reviewed for suitability based on member risk profile.',
      'Members over age 60 transferring to aggressive tracks require additional risk acknowledgment.',
    ],
    effective_date: '2024-05-01',
  }),
]

const BENEFICIARY_REGULATIONS = [
  () => ({
    regulation_id: 'REG-BEN-2024',
    authority: 'Ministry of Finance',
    title: 'Beneficiary Registration Requirements',
    requirements: [
      'All beneficiaries must be identified with valid ID number and full name.',
      'Beneficiary changes must be documented and stored for a minimum of 7 years.',
    ],
    effective_date: '2024-01-01',
  }),
  () => {
    const confidence = pick([85, 90, 95])
    return {
      regulation_id: 'ISA-DID-2024',
      authority: 'Israel Securities Authority',
      title: 'Digital Identity for Beneficiary Changes',
      requirements: [
        `Identity verification with minimum ${confidence}% confidence required for beneficiary modifications.`,
        'Changes affecting more than 50% of allocation require enhanced verification.',
      ],
      effective_date: '2024-03-01',
      confidence_threshold: confidence,
    }
  },
  () => ({
    regulation_id: 'REG-PROT-2024',
    authority: 'Capital Market Authority',
    title: 'Minor Beneficiary Protection',
    requirements: [
      'If any beneficiary is a minor (under 18), a legal guardian must co-sign the change.',
      'Beneficiary changes removing minors require court approval or notarized documentation.',
    ],
    effective_date: '2024-04-01',
  }),
]

const EMPLOYER_CHANGE_REGULATIONS = [
  () => ({
    regulation_id: 'REG-EMP-2024',
    authority: 'Ministry of Finance',
    title: 'Employer Transfer Compliance',
    requirements: [
      'Compensation fund transfers between employers must be completed within 90 days of employment change.',
      'Both previous and new employers must confirm the transfer in writing.',
    ],
    effective_date: '2024-01-01',
  }),
  () => ({
    regulation_id: 'ISA-COMP-2024',
    authority: 'Israel Securities Authority',
    title: 'Compensation Fund Portability',
    requirements: [
      'Members have the right to transfer compensation funds to any licensed fund manager.',
      'Transfer fees may not exceed 0.5% of transferred balance.',
    ],
    effective_date: '2024-06-01',
  }),
  () => {
    const confidence = pick([85, 90])
    return {
      regulation_id: 'ISA-DID-2024',
      authority: 'Israel Securities Authority',
      title: 'Digital Identity for Employer Changes',
      requirements: [
        `Identity verification with minimum ${confidence}% confidence required for employer change requests.`,
        'Both member and employer representative identities must be verified.',
      ],
      effective_date: '2024-03-01',
      confidence_threshold: confidence,
    }
  },
]

const EARLY_REDEMPTION_REGULATIONS = [
  () => ({
    regulation_id: 'REG-ER-2024',
    authority: 'Ministry of Finance',
    title: 'Early Redemption Tax Treatment',
    requirements: [
      'Early redemptions are subject to capital gains tax as per Income Tax Ordinance Section 9(7a).',
      'Tax-exempt redemptions are limited to qualifying educational expenses only.',
    ],
    effective_date: '2024-01-01',
  }),
  () => {
    const confidence = pick([90, 95])
    return {
      regulation_id: 'ISA-DID-2024',
      authority: 'Israel Securities Authority',
      title: 'Digital Identity for Redemptions',
      requirements: [
        `Identity verification with minimum ${confidence}% confidence required for early redemptions.`,
        'Failed verifications must offer in-person alternative within 5 business days.',
      ],
      effective_date: '2024-03-01',
      confidence_threshold: confidence,
    }
  },
  () => ({
    regulation_id: 'REG-DOC-2024',
    authority: 'Capital Market Authority',
    title: 'Documentation Requirements',
    requirements: [
      'Early redemption requests must include supporting documentation for the qualifying reason.',
      'All documents must be verified by an authorized representative within 10 business days.',
    ],
    effective_date: '2024-05-01',
  }),
]

const REGULATION_MAP = {
  withdrawal: WITHDRAWAL_REGULATIONS,
  fund_transfer: TRANSFER_REGULATIONS,
  beneficiary_update: BENEFICIARY_REGULATIONS,
  employer_change: EMPLOYER_CHANGE_REGULATIONS,
  early_redemption: EARLY_REDEMPTION_REGULATIONS,
}

export function generateRegulations(useCase) {
  const pool = REGULATION_MAP[useCase] || WITHDRAWAL_REGULATIONS
  const count = randInt(2, Math.min(3, pool.length))
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count).map(fn => fn())
}

// --- FUND TYPES & USE CASES ---

export const FUND_TYPES = [
  { id: 'investment', label: 'Investment Provident Fund', labelHe: 'קופת גמל להשקעה' },
  { id: 'compensation', label: 'Compensation Fund', labelHe: 'קופת גמל פיצויים' },
  { id: 'study', label: 'Study Fund', labelHe: 'קרן השתלמות' },
]

export const USE_CASES = {
  investment: [
    { id: 'withdrawal', label: 'Withdrawal', labelHe: 'משיכה', icon: '💰' },
    { id: 'fund_transfer', label: 'Fund Transfer', labelHe: 'העברה בין מסלולים', icon: '🔄' },
    { id: 'beneficiary_update', label: 'Beneficiary Update', labelHe: 'עדכון מוטבים', icon: '👤' },
  ],
  compensation: [
    { id: 'withdrawal', label: 'Withdrawal', labelHe: 'משיכה', icon: '💰' },
    { id: 'employer_change', label: 'Employer Change', labelHe: 'החלפת מעסיק', icon: '🏢' },
    { id: 'beneficiary_update', label: 'Beneficiary Update', labelHe: 'עדכון מוטבים', icon: '👤' },
  ],
  study: [
    { id: 'withdrawal', label: 'Withdrawal', labelHe: 'משיכה', icon: '💰' },
    { id: 'fund_transfer', label: 'Track Rebalance', labelHe: 'איזון מחדש בין מסלולים', icon: '⚖️' },
    { id: 'early_redemption', label: 'Early Redemption', labelHe: 'פדיון מוקדם', icon: '⏰' },
  ],
}

export function getUseCaseLabel(fundType, useCase) {
  const uc = USE_CASES[fundType]?.find(u => u.id === useCase)
  return uc ? `${uc.icon} ${uc.labelHe} — ${uc.label}` : useCase
}
