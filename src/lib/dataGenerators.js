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
    titleHe: 'אימות בעלות על חשבון בנק',
    description: 'Destination bank account must be verified and match member records.',
    descriptionHe: 'יש לאמת את חשבון הבנק של היעד ולוודא התאמה לרשומות העמית.',
    conditions: [{ field: 'account_owner', operator: '==', value: 'member_name' }],
    consequence: 'block',
  }),
  (data) => {
    const months = data.policy_minimum_holding_months || pick([6, 12, 18, 24])
    return {
      clause_id: 'CL-4.3',
      category: 'eligibility',
      title: 'Minimum Holding Period',
      titleHe: 'תקופת החזקה מינימלית',
      description: `Funds must be held for at least ${months} months before withdrawal.`,
      descriptionHe: `יש להחזיק את הכספים לפחות ${months} חודשים לפני משיכה.`,
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
      titleHe: 'סף אישור אוטומטי',
      description: `Withdrawals up to ${threshold.toLocaleString()} ₪ are auto-approved. Above requires supervisor approval.`,
      descriptionHe: `משיכות עד ${threshold.toLocaleString()} ₪ מאושרות אוטומטית. מעל לכך נדרש אישור מנהל.`,
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
      titleHe: 'מספר משיכות מרבי בשנה',
      description: `No more than ${maxRequests} withdrawals per calendar year.`,
      descriptionHe: `לא יותר מ-${maxRequests} משיכות בשנה קלנדרית.`,
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
      titleHe: 'יתרה מינימלית נדרשת',
      description: `After withdrawal, account must maintain minimum ${minBalance.toLocaleString()} ₪ or be fully withdrawn.`,
      descriptionHe: `לאחר משיכה, על החשבון לשמור על יתרה מינימלית של ${minBalance.toLocaleString()} ₪ או להימשך במלואו.`,
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
      titleHe: 'שימור מינימלי במשיכה חלקית',
      description: `Partial withdrawals must leave minimum ${minPct}% of balance.`,
      descriptionHe: `משיכה חלקית חייבת להשאיר לפחות ${minPct}% מהיתרה.`,
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
      titleHe: 'סכום משיכה מינימלי',
      description: `Minimum withdrawal amount: ${min.toLocaleString()} ₪.`,
      descriptionHe: `סכום משיכה מינימלי: ${min.toLocaleString()} ₪.`,
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
      titleHe: 'תקופת צינון להחלפת מסלול',
      description: `Fund transfers between investment tracks require a minimum of ${minHold} days since last track change.`,
      descriptionHe: `העברה בין מסלולי השקעה מחייבת מינימום ${minHold} ימים מאז החלפת המסלול האחרונה.`,
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
      titleHe: 'אחוז העברה מרבי',
      description: `Single track transfer limited to ${maxPct}% of source track balance.`,
      descriptionHe: `העברה בודדת מוגבלת ל-${maxPct}% מיתרת מסלול המקור.`,
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
      titleHe: 'מגבלת העברות שנתית',
      description: `Maximum ${maxTransfers} track transfers permitted per calendar year.`,
      descriptionHe: `מותרות עד ${maxTransfers} העברות בין מסלולים בשנה קלנדרית.`,
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
      titleHe: 'אישור העברה גדולה',
      description: `Track transfers above ${threshold.toLocaleString()} ₪ require supervisor approval and member confirmation.`,
      descriptionHe: `העברות בין מסלולים מעל ${threshold.toLocaleString()} ₪ מחייבות אישור מנהל ואישור העמית.`,
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
    titleHe: 'אימות אחוזי מוטבים',
    description: 'Total beneficiary allocation must equal exactly 100%.',
    descriptionHe: 'סך הקצאת המוטבים חייב להיות בדיוק 100%.',
    conditions: [{ field: 'total_beneficiary_percentage', operator: '==', value: 100 }],
    consequence: 'block',
  }),
  () => ({
    clause_id: 'CL-15.3',
    category: 'processing',
    title: 'Notary Verification Requirement',
    titleHe: 'דרישת אימות נוטריוני',
    description: 'Beneficiary changes must be notarized or verified by an authorized representative.',
    descriptionHe: 'שינויי מוטבים חייבים להיות מאומתים על ידי נוטריון או נציג מורשה.',
    conditions: [{ field: 'notary_verified', operator: '==', value: true }],
    consequence: 'block',
  }),
  () => {
    const days = pick([7, 14, 30])
    return {
      clause_id: 'CL-15.5',
      category: 'processing',
      title: 'Cooling-Off Period for Beneficiary Changes',
      titleHe: 'תקופת צינון לשינוי מוטבים',
      description: `Beneficiary changes take effect after a ${days}-day cooling-off period. Member can cancel during this period.`,
      descriptionHe: `שינויי מוטבים נכנסים לתוקף לאחר תקופת צינון של ${days} ימים. העמית רשאי לבטל במהלך תקופה זו.`,
      conditions: [{ field: 'cooling_off_days', operator: '>=', value: days }],
      consequence: 'notify',
    }
  },
  () => ({
    clause_id: 'CL-15.7',
    category: 'processing',
    title: 'Existing Beneficiary Consent',
    titleHe: 'הסכמת מוטבים קיימים',
    description: 'Removed beneficiaries must be notified. Consent from existing beneficiaries recommended.',
    descriptionHe: 'יש להודיע למוטבים שהוסרו. מומלצת הסכמה ממוטבים קיימים.',
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
      titleHe: 'תנאי גיל פרישה',
      description: `Standard withdrawal requires retirement age: ${gender} ${age}.`,
      descriptionHe: `משיכה רגילה מחייבת גיל פרישה: ${gender === 'female' ? 'נקבה' : 'זכר'} ${age}.`,
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
      titleHe: 'קנסות משיכה מוקדמת',
      description: `Pre-maturity withdrawals incur ${taxRate}% income tax + ${fee}% early withdrawal fee.`,
      descriptionHe: `משיכות לפני מועד הפירעון כוללות ${taxRate}% מס הכנסה + ${fee}% עמלת משיכה מוקדמת.`,
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
      titleHe: 'דרישת הסכמת מעסיק',
      description: `Withdrawals exceeding ${threshold}% of compensation balance require employer written consent.`,
      descriptionHe: `משיכות העולות על ${threshold}% מיתרת הפיצויים מחייבות הסכמה בכתב מהמעסיק.`,
      conditions: [{ field: 'withdrawal_percentage', operator: '<=', value: threshold }],
      consequence: 'require_approval',
    }
  },
  () => ({
    clause_id: 'CL-2.5',
    category: 'withdrawal',
    title: 'Early Withdrawal Eligibility',
    titleHe: 'זכאות למשיכה מוקדמת',
    description: 'Early withdrawal (pre-retirement) allowed only if contract permits. If yes, subject to tax clause.',
    descriptionHe: 'משיכה מוקדמת (לפני פרישה) מותרת רק אם הפוליסה מתירה. במקרה זה, כפופה לסעיף המס.',
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
      titleHe: 'מגבלת פער תעסוקתי',
      description: `Employer transfer must occur within ${maxGap} days of termination to maintain continuous coverage.`,
      descriptionHe: `העברת מעסיק חייבת להתבצע תוך ${maxGap} ימים מסיום העסקה לשמירת רציפות הכיסוי.`,
      conditions: [{ field: 'gap_days', operator: '<=', value: maxGap }],
      consequence: 'block',
    }
  },
  () => ({
    clause_id: 'CL-20.3',
    category: 'processing',
    title: 'Previous Employer Approval',
    titleHe: 'אישור מעסיק קודם',
    description: 'Transfer of compensation funds requires written approval from previous employer.',
    descriptionHe: 'העברת כספי פיצויים מחייבת אישור בכתב מהמעסיק הקודם.',
    conditions: [{ field: 'employer_approval_received', operator: '==', value: true }],
    consequence: 'block',
  }),
  () => ({
    clause_id: 'CL-20.5',
    category: 'processing',
    title: 'Severance Continuity',
    titleHe: 'רציפות פיצויים',
    description: 'If severance is included, continuous employment must be verified to maintain severance rights.',
    descriptionHe: 'אם כלולים פיצויים, יש לאמת רציפות העסקה לשמירת זכויות הפיצויים.',
    conditions: [{ field: 'continuous_employment', operator: '==', value: true }],
    consequence: 'require_approval',
  }),
  () => {
    const minBalance = pick([5000, 10000])
    return {
      clause_id: 'CL-20.7',
      category: 'financial',
      title: 'Minimum Transfer Balance',
      titleHe: 'יתרת העברה מינימלית',
      description: `Employer change transfers must include a minimum balance of ${minBalance.toLocaleString()} ₪.`,
      descriptionHe: `העברות בעקבות החלפת מעסיק חייבות לכלול יתרה מינימלית של ${minBalance.toLocaleString()} ₪.`,
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
    titleHe: 'אימות אחוזי מוטבים',
    description: 'Total beneficiary allocation must equal exactly 100%.',
    descriptionHe: 'סך הקצאת המוטבים חייב להיות בדיוק 100%.',
    conditions: [{ field: 'total_beneficiary_percentage', operator: '==', value: 100 }],
    consequence: 'block',
  }),
  () => ({
    clause_id: 'CL-15.3',
    category: 'processing',
    title: 'Notary Verification Requirement',
    titleHe: 'דרישת אימות נוטריוני',
    description: 'Beneficiary changes must be notarized or verified by an authorized representative.',
    descriptionHe: 'שינויי מוטבים חייבים להיות מאומתים על ידי נוטריון או נציג מורשה.',
    conditions: [{ field: 'notary_verified', operator: '==', value: true }],
    consequence: 'block',
  }),
  () => ({
    clause_id: 'CL-15.9',
    category: 'processing',
    title: 'Employer Notification',
    titleHe: 'הודעה למעסיק',
    description: 'For compensation funds, the employer must be notified of beneficiary changes within 14 days.',
    descriptionHe: 'בקופות פיצויים, יש להודיע למעסיק על שינויי מוטבים תוך 14 ימים.',
    conditions: [{ field: 'employer_notified', operator: '==', value: true }],
    consequence: 'require_approval',
  }),
  () => ({
    clause_id: 'CL-15.7',
    category: 'processing',
    title: 'Existing Beneficiary Consent',
    titleHe: 'הסכמת מוטבים קיימים',
    description: 'Removed beneficiaries must be notified. Consent from existing beneficiaries recommended.',
    descriptionHe: 'יש להודיע למוטבים שהוסרו. מומלצת הסכמה ממוטבים קיימים.',
    conditions: [{ field: 'beneficiary_consent_obtained', operator: '==', value: true }],
    consequence: 'require_approval',
  }),
]

const STUDY_WITHDRAWAL_CLAUSES = [
  () => ({
    clause_id: 'CL-4.3',
    category: 'withdrawal',
    title: 'Liquidity Gate',
    titleHe: 'תנאי נזילות',
    description: 'Withdrawals only permitted after liquidity date. Track allocation must be proportional.',
    descriptionHe: 'משיכות מותרות רק לאחר תאריך הנזילות. הקצאת המסלולים חייבת להיות יחסית.',
    conditions: [{ field: 'liquidity_date', operator: '<=', value: 'today' }],
    consequence: 'block',
  }),
  () => {
    const deviation = pick([5, 10, 15])
    return {
      clause_id: 'CL-7.4',
      category: 'withdrawal',
      title: 'Track Allocation Rule',
      titleHe: 'כלל הקצאת מסלולים',
      description: `Withdrawals must maintain proportional allocation across investment tracks (max ${deviation}% deviation).`,
      descriptionHe: `משיכות חייבות לשמור על הקצאה יחסית בין מסלולי ההשקעה (סטייה מרבית ${deviation}%).`,
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
      titleHe: 'סכום משיכה מינימלי',
      description: `Minimum withdrawal amount: ${min.toLocaleString()} ₪.`,
      descriptionHe: `סכום משיכה מינימלי: ${min.toLocaleString()} ₪.`,
      conditions: [{ field: 'withdrawal_amount', operator: '>=', value: min }],
      consequence: 'block',
    }
  },
  () => ({
    clause_id: 'CL-11.2',
    category: 'withdrawal',
    title: 'Educational Purpose Clause',
    titleHe: 'סעיף מטרה לימודית',
    description: 'Pre-liquidity withdrawals permitted only for accredited educational expenses with documentation.',
    descriptionHe: 'משיכות לפני מועד הנזילות מותרות רק עבור הוצאות לימוד מוכרות בצירוף תיעוד.',
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
      titleHe: 'שינוי מרבי באיזון מחדש',
      description: `Single rebalance operation cannot shift allocation by more than ${maxDeviation}% between tracks.`,
      descriptionHe: `פעולת איזון מחדש בודדת אינה יכולה לשנות הקצאה ביותר מ-${maxDeviation}% בין מסלולים.`,
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
      titleHe: 'מגבלת תדירות איזון מחדש',
      description: `Track rebalancing permitted only once every ${minDays} days.`,
      descriptionHe: `איזון מחדש בין מסלולים מותר פעם אחת בלבד כל ${minDays} ימים.`,
      conditions: [{ field: 'days_since_last_rebalance', operator: '>=', value: minDays }],
      consequence: 'block',
    }
  },
  () => ({
    clause_id: 'CL-25.5',
    category: 'processing',
    title: 'Market Hours Restriction',
    titleHe: 'הגבלת שעות מסחר',
    description: 'Track rebalancing requests must be submitted during market hours (09:00-17:30 IST).',
    descriptionHe: 'בקשות איזון מחדש בין מסלולים חייבות להיות מוגשות בשעות המסחר (09:00-17:30 שעון ישראל).',
    conditions: [{ field: 'request_hour', operator: 'between', value: [9, 17.5] }],
    consequence: 'notify',
  }),
  () => {
    const threshold = pick([50000, 100000])
    return {
      clause_id: 'CL-25.7',
      category: 'financial',
      title: 'Large Rebalance Approval',
      titleHe: 'אישור איזון מחדש גדול',
      description: `Rebalance operations moving more than ${threshold.toLocaleString()} ₪ require supervisor approval.`,
      descriptionHe: `פעולות איזון מחדש המעבירות יותר מ-${threshold.toLocaleString()} ₪ מחייבות אישור מנהל.`,
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
    titleHe: 'תנאי פדיון לפני נזילות',
    description: 'Early redemption before liquidity date requires documented qualifying reason.',
    descriptionHe: 'פדיון מוקדם לפני תאריך הנזילות מחייב סיבה מזכה מתועדת.',
    conditions: [{ field: 'supporting_documents', operator: '==', value: true }],
    consequence: 'block',
  }),
  () => {
    const taxRate = pick([25, 30, 35])
    return {
      clause_id: 'CL-30.3',
      category: 'penalties',
      title: 'Early Redemption Tax',
      titleHe: 'מס פדיון מוקדם',
      description: `Early redemption subject to ${taxRate}% capital gains tax on accrued profits.`,
      descriptionHe: `פדיון מוקדם כפוף ל-${taxRate}% מס רווחי הון על הרווחים שנצברו.`,
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
      titleHe: 'אימות סיבה מזכה',
      description: `Early redemption permitted only for qualifying reasons: ${validReasons.join(', ')}.`,
      descriptionHe: `פדיון מוקדם מותר רק מסיבות מזכות: מצוקה כלכלית, הוצאות לימוד, הוצאות רפואיות.`,
      conditions: [{ field: 'redemption_reason', operator: 'in', value: validReasons }],
      consequence: 'block',
    }
  },
  () => ({
    clause_id: 'CL-30.7',
    category: 'processing',
    title: 'Employer Notification for Early Redemption',
    titleHe: 'הודעה למעסיק על פדיון מוקדם',
    description: 'Employer must be notified of early redemption within 7 business days.',
    descriptionHe: 'יש להודיע למעסיק על פדיון מוקדם תוך 7 ימי עסקים.',
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
      titleHe: 'בדיקת ציות לסכומים גבוהים',
      description: `Withdrawals exceeding ${threshold.toLocaleString()} ₪ require manual compliance review.`,
      descriptionHe: `משיכות מעל ${threshold.toLocaleString()} ₪ מחייבות בדיקת ציות ידנית.`,
      conditions: [{ field: 'withdrawal_amount', operator: '>', value: threshold }],
      consequence: 'require_hitl',
    }
  },
  () => ({
    clause_id: 'CL-HITL-2',
    category: 'processing',
    title: 'Identity Verification Failure Review',
    titleHe: 'בדיקת כשל אימות זהות',
    description: 'Identity verification failures must be reviewed by a human operator before re-attempting.',
    descriptionHe: 'כשלונות באימות זהות חייבים להיבדק על ידי מפעיל אנושי לפני ניסיון חוזר.',
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
      titleHe: 'בדיקת חשד להונאה',
      description: `Members with more than ${maxRequests} withdrawal requests in the past ${days} days require fraud review.`,
      descriptionHe: `עמיתים עם יותר מ-${maxRequests} בקשות משיכה ב-${days} הימים האחרונים מחייבים בדיקת הונאה.`,
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
      titleHe: 'בדיקת התאמת חשבון',
      description: `First-time withdrawals from accounts older than ${years} years require account reconciliation review.`,
      descriptionHe: `משיכות ראשונות מחשבונות ותיקים מעל ${years} שנים מחייבות בדיקת התאמת חשבון.`,
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
    titleHe: 'הסכם רמת שירות - זמן טיפול',
    description: `Standard requests processed within ${slaDays} business days. Complex requests (human review, high-value) processed within ${complexDays} business days.`,
    descriptionHe: `בקשות רגילות מטופלות תוך ${slaDays} ימי עסקים. בקשות מורכבות (בדיקה אנושית, סכומים גבוהים) מטופלות תוך ${complexDays} ימי עסקים.`,
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
    titleHe: 'רמת אימות זהות',
    description: `Withdrawals require identity verification with minimum confidence of ${confidence}%.`,
    descriptionHe: `משיכות מחייבות אימות זהות עם רמת ביטחון מינימלית של ${confidence}%.`,
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
    customer_name_he: memberData.member_name_he,
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
      authorityHe: 'רשות ניירות ערך',
      title: 'AML Verification Requirements',
      titleHe: 'דרישות אימות למניעת הלבנת הון',
      requirements: [
        `All withdrawals above ${threshold.toLocaleString()} ₪ must include identity verification with confidence score above ${confidence}%.`,
        `Transactions flagged for manual AML review if member has more than ${maxWithdrawals} large withdrawals in ${days} days.`,
      ],
      requirementsHe: [
        `כל משיכה מעל ${threshold.toLocaleString()} ₪ חייבת לכלול אימות זהות עם ציון ביטחון מעל ${confidence}%.`,
        `עסקאות מסומנות לבדיקת איסור הלבנת הון ידנית אם לעמית יש יותר מ-${maxWithdrawals} משיכות גדולות ב-${days} ימים.`,
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
      authorityHe: 'משרד האוצר',
      title: 'Beneficiary Protection',
      titleHe: 'הגנת מוטבים',
      requirements: [
        `For members under age ${minorAge}, withdrawal requests must be co-signed by a registered guardian.`,
        `Members above age ${seniorAge} require additional capacity verification.`,
      ],
      requirementsHe: [
        `עבור עמיתים מתחת לגיל ${minorAge}, בקשות משיכה חייבות להיות חתומות יחד עם אפוטרופוס רשום.`,
        `עמיתים מעל גיל ${seniorAge} מחייבים אימות כשירות נוסף.`,
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
      authorityHe: 'משרד האוצר',
      title: 'Tax Reporting Threshold',
      titleHe: 'סף דיווח מס',
      requirements: [
        `Withdrawals exceeding ${threshold.toLocaleString()} ₪ in a calendar year trigger automatic tax authority reporting via form 856.`,
      ],
      requirementsHe: [
        `משיכות העולות על ${threshold.toLocaleString()} ₪ בשנה קלנדרית מפעילות דיווח אוטומטי לרשות המיסים באמצעות טופס 856.`,
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
      authorityHe: 'רשות ניירות ערך',
      title: 'Digital Identity Standards',
      titleHe: 'תקני זיהוי דיגיטלי',
      requirements: [
        `Electronic identity verification must achieve minimum confidence of ${confidence}% per ISA Digital Identity Directive ${year}.`,
        `Failed verifications must offer in-person alternative within ${days} business days.`,
      ],
      requirementsHe: [
        `אימות זהות אלקטרוני חייב להשיג רמת ביטחון מינימלית של ${confidence}% בהתאם להנחיית הזיהוי הדיגיטלי של רשות ניירות ערך ${year}.`,
        `אימותים שנכשלו חייבים להציע חלופה פרונטלית תוך ${days} ימי עסקים.`,
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
      authorityHe: 'רשות שוק ההון',
      title: 'Processing Time SLA',
      titleHe: 'הסכם רמת שירות - זמן טיפול',
      requirements: [
        `Fund managers must process standard withdrawal requests within ${standard} business days.`,
        `Complex cases requiring human review: ${complex} business days.`,
      ],
      requirementsHe: [
        `מנהלי קרנות חייבים לטפל בבקשות משיכה רגילות תוך ${standard} ימי עסקים.`,
        `מקרים מורכבים הדורשים בדיקה אנושית: ${complex} ימי עסקים.`,
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
      authorityHe: 'בנק ישראל',
      title: 'Partial Withdrawal Limits',
      titleHe: 'מגבלות משיכה חלקית',
      requirements: [
        `Partial withdrawals limited to ${maxPartial} per calendar year per account.`,
        `Each partial withdrawal minimum ${minPct}% of total balance.`,
      ],
      requirementsHe: [
        `משיכות חלקיות מוגבלות ל-${maxPartial} בשנה קלנדרית לכל חשבון.`,
        `כל משיכה חלקית מינימום ${minPct}% מסך היתרה.`,
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
    authorityHe: 'רשות ניירות ערך',
    title: 'Fund Transfer Transparency',
    titleHe: 'שקיפות העברה בין מסלולים',
    requirements: [
      'All inter-track transfers must be logged with source/target track names and amounts.',
      'Member must receive written confirmation of transfer within 2 business days.',
    ],
    requirementsHe: [
      'כל העברה בין מסלולים חייבת להיות מתועדת עם שמות מסלולי המקור/היעד והסכומים.',
      'העמית חייב לקבל אישור בכתב על ההעברה תוך 2 ימי עסקים.',
    ],
    effective_date: '2024-02-01',
  }),
  () => {
    const confidence = pick([85, 90])
    return {
      regulation_id: 'ISA-DID-2024',
      authority: 'Israel Securities Authority',
      authorityHe: 'רשות ניירות ערך',
      title: 'Digital Identity for Transfers',
      titleHe: 'זיהוי דיגיטלי להעברות',
      requirements: [
        `Identity verification with minimum ${confidence}% confidence required for fund transfers.`,
        'Failed verifications must offer in-person alternative within 5 business days.',
      ],
      requirementsHe: [
        `אימות זהות עם רמת ביטחון מינימלית של ${confidence}% נדרש להעברה בין מסלולים.`,
        'אימותים שנכשלו חייבים להציע חלופה פרונטלית תוך 5 ימי עסקים.',
      ],
      effective_date: '2024-03-01',
      confidence_threshold: confidence,
    }
  },
  () => ({
    regulation_id: 'REG-INV-2024',
    authority: 'Capital Market Authority',
    authorityHe: 'רשות שוק ההון',
    title: 'Investment Suitability Check',
    titleHe: 'בדיקת התאמת השקעה',
    requirements: [
      'Track transfers must be reviewed for suitability based on member risk profile.',
      'Members over age 60 transferring to aggressive tracks require additional risk acknowledgment.',
    ],
    requirementsHe: [
      'העברות בין מסלולים חייבות להיבדק להתאמה בהתאם לפרופיל הסיכון של העמית.',
      'עמיתים מעל גיל 60 המעבירים למסלולים אגרסיביים מחייבים הצהרת סיכון נוספת.',
    ],
    effective_date: '2024-05-01',
  }),
]

const BENEFICIARY_REGULATIONS = [
  () => ({
    regulation_id: 'REG-BEN-2024',
    authority: 'Ministry of Finance',
    authorityHe: 'משרד האוצר',
    title: 'Beneficiary Registration Requirements',
    titleHe: 'דרישות רישום מוטבים',
    requirements: [
      'All beneficiaries must be identified with valid ID number and full name.',
      'Beneficiary changes must be documented and stored for a minimum of 7 years.',
    ],
    requirementsHe: [
      'כל המוטבים חייבים להיות מזוהים עם מספר תעודת זהות תקף ושם מלא.',
      'שינויי מוטבים חייבים להיות מתועדים ונשמרים למשך 7 שנים לפחות.',
    ],
    effective_date: '2024-01-01',
  }),
  () => {
    const confidence = pick([85, 90, 95])
    return {
      regulation_id: 'ISA-DID-2024',
      authority: 'Israel Securities Authority',
      authorityHe: 'רשות ניירות ערך',
      title: 'Digital Identity for Beneficiary Changes',
      titleHe: 'זיהוי דיגיטלי לשינוי מוטבים',
      requirements: [
        `Identity verification with minimum ${confidence}% confidence required for beneficiary modifications.`,
        'Changes affecting more than 50% of allocation require enhanced verification.',
      ],
      requirementsHe: [
        `אימות זהות עם רמת ביטחון מינימלית של ${confidence}% נדרש לשינויי מוטבים.`,
        'שינויים המשפיעים על יותר מ-50% מההקצאה מחייבים אימות מוגבר.',
      ],
      effective_date: '2024-03-01',
      confidence_threshold: confidence,
    }
  },
  () => ({
    regulation_id: 'REG-PROT-2024',
    authority: 'Capital Market Authority',
    authorityHe: 'רשות שוק ההון',
    title: 'Minor Beneficiary Protection',
    titleHe: 'הגנת מוטבים קטינים',
    requirements: [
      'If any beneficiary is a minor (under 18), a legal guardian must co-sign the change.',
      'Beneficiary changes removing minors require court approval or notarized documentation.',
    ],
    requirementsHe: [
      'אם מוטב כלשהו הוא קטין (מתחת לגיל 18), אפוטרופוס חוקי חייב לחתום יחד על השינוי.',
      'שינויי מוטבים המסירים קטינים מחייבים אישור בית משפט או תיעוד נוטריוני.',
    ],
    effective_date: '2024-04-01',
  }),
]

const EMPLOYER_CHANGE_REGULATIONS = [
  () => ({
    regulation_id: 'REG-EMP-2024',
    authority: 'Ministry of Finance',
    authorityHe: 'משרד האוצר',
    title: 'Employer Transfer Compliance',
    titleHe: 'ציות להעברת מעסיק',
    requirements: [
      'Compensation fund transfers between employers must be completed within 90 days of employment change.',
      'Both previous and new employers must confirm the transfer in writing.',
    ],
    requirementsHe: [
      'העברות קופת פיצויים בין מעסיקים חייבות להסתיים תוך 90 ימים מהחלפת המעסיק.',
      'הן המעסיק הקודם והן המעסיק החדש חייבים לאשר את ההעברה בכתב.',
    ],
    effective_date: '2024-01-01',
  }),
  () => ({
    regulation_id: 'ISA-COMP-2024',
    authority: 'Israel Securities Authority',
    authorityHe: 'רשות ניירות ערך',
    title: 'Compensation Fund Portability',
    titleHe: 'ניידות קופת פיצויים',
    requirements: [
      'Members have the right to transfer compensation funds to any licensed fund manager.',
      'Transfer fees may not exceed 0.5% of transferred balance.',
    ],
    requirementsHe: [
      'לעמיתים הזכות להעביר כספי פיצויים לכל מנהל קרן מורשה.',
      'עמלות העברה לא יעלו על 0.5% מהיתרה המועברת.',
    ],
    effective_date: '2024-06-01',
  }),
  () => {
    const confidence = pick([85, 90])
    return {
      regulation_id: 'ISA-DID-2024',
      authority: 'Israel Securities Authority',
      authorityHe: 'רשות ניירות ערך',
      title: 'Digital Identity for Employer Changes',
      titleHe: 'זיהוי דיגיטלי להחלפת מעסיק',
      requirements: [
        `Identity verification with minimum ${confidence}% confidence required for employer change requests.`,
        'Both member and employer representative identities must be verified.',
      ],
      requirementsHe: [
        `אימות זהות עם רמת ביטחון מינימלית של ${confidence}% נדרש לבקשות החלפת מעסיק.`,
        'יש לאמת את זהות העמית ונציג המעסיק כאחד.',
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
    authorityHe: 'משרד האוצר',
    title: 'Early Redemption Tax Treatment',
    titleHe: 'טיפול מיסוי בפדיון מוקדם',
    requirements: [
      'Early redemptions are subject to capital gains tax as per Income Tax Ordinance Section 9(7a).',
      'Tax-exempt redemptions are limited to qualifying educational expenses only.',
    ],
    requirementsHe: [
      'פדיונות מוקדמים כפופים למס רווחי הון בהתאם לסעיף 9(7א) לפקודת מס הכנסה.',
      'פדיונות פטורים ממס מוגבלים להוצאות לימוד מזכות בלבד.',
    ],
    effective_date: '2024-01-01',
  }),
  () => {
    const confidence = pick([90, 95])
    return {
      regulation_id: 'ISA-DID-2024',
      authority: 'Israel Securities Authority',
      authorityHe: 'רשות ניירות ערך',
      title: 'Digital Identity for Redemptions',
      titleHe: 'זיהוי דיגיטלי לפדיונות',
      requirements: [
        `Identity verification with minimum ${confidence}% confidence required for early redemptions.`,
        'Failed verifications must offer in-person alternative within 5 business days.',
      ],
      requirementsHe: [
        `אימות זהות עם רמת ביטחון מינימלית של ${confidence}% נדרש לפדיונות מוקדמים.`,
        'אימותים שנכשלו חייבים להציע חלופה פרונטלית תוך 5 ימי עסקים.',
      ],
      effective_date: '2024-03-01',
      confidence_threshold: confidence,
    }
  },
  () => ({
    regulation_id: 'REG-DOC-2024',
    authority: 'Capital Market Authority',
    authorityHe: 'רשות שוק ההון',
    title: 'Documentation Requirements',
    titleHe: 'דרישות תיעוד',
    requirements: [
      'Early redemption requests must include supporting documentation for the qualifying reason.',
      'All documents must be verified by an authorized representative within 10 business days.',
    ],
    requirementsHe: [
      'בקשות פדיון מוקדם חייבות לכלול תיעוד תומך לסיבה המזכה.',
      'כל המסמכים חייבים להיות מאומתים על ידי נציג מורשה תוך 10 ימי עסקים.',
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
