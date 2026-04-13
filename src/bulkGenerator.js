import { generateMemberData, generateContract, generateRegulations, FUND_TYPES, getUseCaseLabel } from './dataGenerators'

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }

function pickFundType() {
  const r = Math.random()
  if (r < 0.50) return 'investment'
  if (r < 0.75) return 'compensation'
  return 'study'
}

function pickUseCase(fundType) {
  const cases = {
    investment: ['withdrawal', 'fund_transfer', 'beneficiary_update'],
    compensation: ['withdrawal', 'employer_change', 'beneficiary_update'],
    study: ['withdrawal', 'fund_transfer', 'early_redemption'],
  }
  // Weight toward withdrawal (60%)
  const pool = cases[fundType] || cases.investment
  return Math.random() < 0.6 ? pool[0] : pick(pool)
}

function randomPastDate(minDays, maxDays) {
  const d = new Date()
  d.setDate(d.getDate() - randInt(minDays, maxDays))
  return d.toISOString().split('T')[0]
}

function randomFutureDate(minDays, maxDays) {
  const d = new Date()
  d.setDate(d.getDate() + randInt(minDays, maxDays))
  return d.toISOString().split('T')[0]
}

// Common validation steps that get mixed into every flow
const V = {
  idPhoto:     { name: 'ID Photo Verification', nameHe: 'אימות תמונת זהות', category: 'identity', severity: 'blocking', source: 'ISA-DID-2024', rule: 'id_photo_confidence >= 90', field: 'id_photo_confidence', expected: '>= 90', description: 'Verify member identity via biometric photo match', descriptionHe: 'אימות זהות העמית באמצעות התאמה ביומטרית של תמונה' },
  bankAccount: { name: 'Bank Account Ownership', nameHe: 'בעלות על חשבון בנק', category: 'identity', severity: 'blocking', source: 'CL-1.1', rule: 'account_owner == member_name', field: 'account_owner', expected: 'match member_name', description: 'Verify destination bank account is registered to the member', descriptionHe: 'אימות שחשבון הבנק היעד רשום על שם העמית' },
  age18:       { name: 'Age Verification', nameHe: 'אימות גיל', category: 'eligibility', severity: 'blocking', source: 'REG-2024-07', rule: 'age >= 18', field: 'birth_date', expected: 'age >= 18', description: 'Member must be at least 18 years old per regulatory requirements', descriptionHe: 'העמית חייב להיות בן 18 לפחות בהתאם לדרישות רגולטוריות' },
  retireAge:   { name: 'Retirement Age Check', nameHe: 'בדיקת גיל פרישה', category: 'eligibility', severity: 'blocking', source: 'CL-4.3', rule: 'age >= 62 for female / 67 for male', field: 'birth_date', expected: '>= retirement age', description: 'Standard withdrawal requires meeting retirement age threshold', descriptionHe: 'משיכה רגילה מחייבת עמידה בסף גיל פרישה' },
  balance:     { name: 'Balance Sufficiency', nameHe: 'בדיקת יתרה מספקת', category: 'financial', severity: 'blocking', source: 'CL-3.8', rule: 'balance >= withdrawal_amount', field: 'balance', expected: '>= withdrawal_amount', description: 'Account must have sufficient balance to cover the withdrawal amount', descriptionHe: 'בחשבון חייבת להיות יתרה מספקת לכיסוי סכום המשיכה' },
  minWithdraw: { name: 'Minimum Withdrawal Amount', nameHe: 'סכום משיכה מינימלי', category: 'financial', severity: 'blocking', source: 'CL-3.1', rule: 'withdrawal_amount >= 5000', field: 'withdrawal_amount', expected: '>= 5000', description: 'Withdrawal must meet the minimum amount defined in the contract', descriptionHe: 'המשיכה חייבת לעמוד בסכום המינימלי המוגדר בחוזה' },
  holdPeriod:  { name: 'Holding Period Check', nameHe: 'בדיקת תקופת החזקה', category: 'eligibility', severity: 'blocking', source: 'CL-4.3', rule: 'holding_months >= 12', field: 'start_date', expected: '>= 12 months', description: 'Funds must be held for the minimum period before withdrawal', descriptionHe: 'הכספים חייבים להיות מוחזקים לתקופה מינימלית לפני משיכה' },
  liquidity:   { name: 'Liquidity Date Check', nameHe: 'בדיקת תאריך נזילות', category: 'eligibility', severity: 'blocking', source: 'CL-4.3', rule: 'liquidity_date <= today', field: 'liquidity_date', expected: '<= today', description: 'Funds only accessible after the contractual liquidity date', descriptionHe: 'הכספים נגישים רק לאחר תאריך הנזילות החוזי' },
  aml:         { name: 'AML Screening', nameHe: 'סינון איסור הלבנת הון', category: 'regulatory', severity: 'info', source: 'REG-2024-07', rule: 'AML check passed', field: 'member_id', expected: 'clear', description: 'Anti-money laundering screening per ISA regulations', descriptionHe: 'סינון איסור הלבנת הון בהתאם לתקנות רשות שוק ההון' },
  taxReport:   { name: 'Tax Reporting Threshold', nameHe: 'סף דיווח מס', category: 'regulatory', severity: 'info', source: 'TAX-856-2024', rule: 'annual_withdrawals_checked', field: 'withdrawal_amount', expected: 'reported if > 50000', description: 'Check if withdrawal triggers automatic tax authority reporting', descriptionHe: 'בדיקה אם המשיכה מפעילה דיווח אוטומטי לרשות המסים' },
  partialLim:  { name: 'Partial Withdrawal Limit', nameHe: 'מגבלת משיכה חלקית', category: 'regulatory', severity: 'warning', source: 'REG-PWL-2024', rule: 'partial_count <= 3 per year', field: 'withdrawal_amount', expected: 'within annual limit', description: 'Verify number of partial withdrawals does not exceed annual limit', descriptionHe: 'אימות שמספר המשיכות החלקיות אינו חורג מהמגבלה השנתית' },
  transferPct: { name: 'Transfer Limit Check', nameHe: 'בדיקת מגבלת העברה', category: 'financial', severity: 'blocking', source: 'CL-12.3', rule: 'transfer_percentage <= 50', field: 'transfer_percentage', expected: '<= 50', description: 'Single track transfer limited to percentage of source balance', descriptionHe: 'העברה בין מסלולים מוגבלת לאחוז מיתרת המקור' },
  trackCool:   { name: 'Track Switch Cooldown', nameHe: 'תקופת צינון החלפת מסלול', category: 'eligibility', severity: 'blocking', source: 'CL-12.1', rule: 'days_since_last >= 30', field: 'days_since_last_transfer', expected: '>= 30', description: 'Minimum days between investment track transfers', descriptionHe: 'מספר ימים מינימלי בין העברות בין מסלולי השקעה' },
  annualTrans: { name: 'Annual Transfer Limit', nameHe: 'מגבלת העברות שנתית', category: 'eligibility', severity: 'warning', source: 'CL-12.5', rule: 'annual_transfers <= 4', field: 'annual_transfer_count', expected: '<= 4', description: 'Maximum number of track transfers per calendar year', descriptionHe: 'מספר מקסימלי של העברות בין מסלולים בשנה קלנדרית' },
  suitability: { name: 'Investment Suitability', nameHe: 'התאמת השקעה', category: 'regulatory', severity: 'info', source: 'REG-INV-2024', rule: 'risk_profile_check', field: 'member_id', expected: 'suitable', description: 'Track transfer must be reviewed for member risk profile suitability', descriptionHe: 'העברה בין מסלולים חייבת להיבדק להתאמה לפרופיל הסיכון של העמית' },
  suppDocs:    { name: 'Supporting Documents', nameHe: 'מסמכים תומכים', category: 'eligibility', severity: 'blocking', source: 'CL-30.1', rule: 'supporting_documents == true', field: 'supporting_documents', expected: 'true', description: 'Required documentation for early redemption must be provided', descriptionHe: 'יש לספק תיעוד נדרש לפדיון מוקדם' },
  qualReason:  { name: 'Qualifying Reason', nameHe: 'סיבה מזכה', category: 'eligibility', severity: 'blocking', source: 'CL-30.5', rule: 'redemption_reason in qualifying_list', field: 'redemption_reason', expected: 'qualifying reason', description: 'Early redemption permitted only for qualifying reasons', descriptionHe: 'פדיון מוקדם מותר רק מסיבות מזכות' },
  taxCalc:     { name: 'Tax Calculation', nameHe: 'חישוב מס', category: 'financial', severity: 'info', source: 'CL-30.3', rule: 'calculate capital gains tax', field: 'redemption_amount', expected: 'tax calculated', description: 'Calculate applicable capital gains tax and fees', descriptionHe: 'חישוב מס רווחי הון ועמלות החלים' },
  empGap:      { name: 'Employment Gap Check', nameHe: 'בדיקת פער העסקה', category: 'eligibility', severity: 'blocking', source: 'CL-20.1', rule: 'gap_days <= 45', field: 'gap_days', expected: '<= 45', description: 'Employer transfer must occur within gap limit', descriptionHe: 'העברה בין מעסיקים חייבת להתבצע בתוך מגבלת הפער' },
  empApproval: { name: 'Previous Employer Approval', nameHe: 'אישור מעסיק קודם', category: 'processing', severity: 'blocking', source: 'CL-20.3', rule: 'employer_approval == true', field: 'employer_approval_received', expected: 'true', description: 'Written approval from previous employer required', descriptionHe: 'נדרש אישור בכתב מהמעסיק הקודם' },
  minBalance:  { name: 'Minimum Remaining Balance', nameHe: 'יתרה מינימלית נותרת', category: 'financial', severity: 'blocking', source: 'CL-3.8', rule: 'remaining_balance >= 0', field: 'balance', expected: '>= 0', description: 'Account must maintain minimum balance after withdrawal or be fully withdrawn', descriptionHe: 'החשבון חייב לשמור על יתרה מינימלית לאחר משיכה או להימשך במלואו' },
  weekendCheck:{ name: 'Business Day Verification', nameHe: 'אימות יום עסקים', category: 'processing', severity: 'info', source: 'CL-9.1', rule: 'request_day is business day', field: 'member_id', expected: 'business day', description: 'Requests on weekends/holidays are queued for next business day', descriptionHe: 'בקשות בסופי שבוע/חגים ממתינות ליום העסקים הבא' },
  digiId:      { name: 'Digital Identity Standard', nameHe: 'תקן זהות דיגיטלית', category: 'regulatory', severity: 'info', source: 'ISA-DID-2024', rule: 'digital_id_compliant', field: 'id_photo_confidence', expected: 'compliant', description: 'Verify compliance with ISA Digital Identity Directive standards', descriptionHe: 'אימות עמידה בתקני הנחיית הזהות הדיגיטלית של רשות שוק ההון' },
}

const HITL_STEPS_COMPLIANCE = [
  { step_id: 'h1', title: 'Verify member identity', titleHe: 'אימות זהות עמית', description: 'Confirm member identity matches records', descriptionHe: 'אישור שזהות העמית תואמת לרשומות', fields: [{ name: 'id_verified', type: 'select', label: 'Identity verified?', labelHe: 'זהות אומתה?', options: ['Verified', 'Mismatch', 'Unable to verify'] }, { name: 'verification_notes', type: 'textarea', label: 'Verification notes', labelHe: 'הערות אימות' }] },
  { step_id: 'h2', title: 'Review transaction legitimacy', titleHe: 'בדיקת לגיטימיות העסקה', description: 'Check for fraud indicators and compliance', descriptionHe: 'בדיקת סממני הונאה וציות', fields: [{ name: 'fraud_check', type: 'select', label: 'Fraud indicators?', labelHe: 'סממני הונאה?', options: ['None detected', 'Suspicious patterns', 'Confirmed fraud'] }, { name: 'risk_level', type: 'select', label: 'Risk assessment', labelHe: 'הערכת סיכון', options: ['Low', 'Medium', 'High'] }, { name: 'review_notes', type: 'textarea', label: 'Review notes', labelHe: 'הערות בדיקה' }] },
  { step_id: 'h3', title: 'Final decision', titleHe: 'החלטה סופית', description: 'Approve or reject the transaction', descriptionHe: 'אישור או דחייה של העסקה', fields: [{ name: 'decision', type: 'select', label: 'Decision', labelHe: 'החלטה', options: ['Approve', 'Reject', 'Escalate further'] }, { name: 'reason', type: 'textarea', label: 'Decision justification', labelHe: 'נימוק ההחלטה' }] },
]

const HITL_STEPS_FRAUD = [
  { step_id: 'h1', title: 'Review transaction history', titleHe: 'סקירת היסטוריית עסקאות', description: 'Analyze recent withdrawal patterns', descriptionHe: 'ניתוח דפוסי משיכות אחרונים', fields: [{ name: 'pattern_analysis', type: 'select', label: 'Pattern assessment', labelHe: 'הערכת דפוסים', options: ['Normal activity', 'Unusual frequency', 'Suspicious pattern'] }, { name: 'notes', type: 'textarea', label: 'Analysis notes', labelHe: 'הערות ניתוח' }] },
  { step_id: 'h2', title: 'Contact verification', titleHe: 'אימות פרטי קשר', description: 'Verify customer contact information', descriptionHe: 'אימות פרטי התקשרות הלקוח', fields: [{ name: 'contact_verified', type: 'select', label: 'Customer contacted?', labelHe: 'נוצר קשר עם הלקוח?', options: ['Yes - confirmed', 'Yes - denied', 'Unable to reach'] }, { name: 'contact_notes', type: 'textarea', label: 'Contact notes', labelHe: 'הערות קשר' }] },
  { step_id: 'h3', title: 'Final decision', titleHe: 'החלטה סופית', description: 'Approve or reject the transaction', descriptionHe: 'אישור או דחייה של העסקה', fields: [{ name: 'decision', type: 'select', label: 'Decision', labelHe: 'החלטה', options: ['Approve', 'Reject', 'Escalate further'] }, { name: 'reason', type: 'textarea', label: 'Decision justification', labelHe: 'נימוק ההחלטה' }] },
]

// Pre-computed validation flows — 7-10 validations each
const PRECOMPUTED_FLOWS = {
  success_withdrawal: [
    V.idPhoto, V.bankAccount, V.age18, V.digiId, V.balance, V.minWithdraw, V.holdPeriod, V.minBalance, V.aml, V.taxReport,
  ],
  success_transfer: [
    V.idPhoto, V.bankAccount, V.age18, V.digiId, V.transferPct, V.trackCool, V.annualTrans, V.suitability, V.aml,
  ],
  failed_age: [
    V.idPhoto, V.bankAccount, V.digiId, V.retireAge, V.balance, V.minWithdraw, V.minBalance, V.aml, V.taxReport,
  ],
  failed_liquidity: [
    V.idPhoto, V.bankAccount, V.age18, V.digiId, V.liquidity, V.balance, V.minWithdraw, V.partialLim, V.aml,
  ],
  failed_holding: [
    V.idPhoto, V.bankAccount, V.age18, V.digiId, V.holdPeriod, V.balance, V.minWithdraw, V.minBalance, V.aml, V.weekendCheck,
  ],
  hitl_compliance: [
    V.idPhoto, V.bankAccount, V.age18, V.digiId, V.balance, V.minWithdraw, V.holdPeriod, V.aml, V.taxReport,
    { name: 'High-Value Compliance Review', nameHe: 'בדיקת ציות לסכום גבוה', category: 'contract', severity: 'warning', source: 'CL-HITL-1', rule: 'withdrawal_amount > threshold', field: 'withdrawal_amount', expected: 'manual review', description: 'Amount exceeds compliance review threshold — manual review required', descriptionHe: 'הסכום חורג מסף בדיקת הציות — נדרשת בדיקה ידנית', requires_hitl: true, hitl_reason: 'Withdrawal amount exceeds manual review threshold per contract clause CL-HITL-1', hitl_reasonHe: 'סכום המשיכה חורג מסף הבדיקה הידנית בהתאם לסעיף חוזה CL-HITL-1', hitl_steps: HITL_STEPS_COMPLIANCE },
  ],
  hitl_fraud: [
    V.idPhoto, V.bankAccount, V.age18, V.digiId, V.balance, V.minWithdraw, V.aml, V.taxReport,
    { name: 'Fraud Pattern Review', nameHe: 'בדיקת דפוס הונאה', category: 'contract', severity: 'warning', source: 'CL-HITL-3', rule: 'recent_withdrawal_count > 2', field: 'recent_withdrawal_count', expected: 'manual review', description: 'Multiple recent withdrawals detected — fraud review required', descriptionHe: 'זוהו משיכות מרובות לאחרונה — נדרשת בדיקת הונאה', requires_hitl: true, hitl_reason: 'Multiple withdrawal requests detected — fraud review required per CL-HITL-3', hitl_reasonHe: 'זוהו בקשות משיכה מרובות — נדרשת בדיקת הונאה בהתאם ל-CL-HITL-3', hitl_steps: HITL_STEPS_FRAUD },
  ],
  awaiting_id: [
    V.idPhoto, V.bankAccount, V.age18, V.digiId, V.balance, V.minWithdraw, V.holdPeriod, V.minBalance, V.aml,
  ],
  tax_consent: [
    V.idPhoto, V.bankAccount, V.age18, V.digiId, V.suppDocs, V.qualReason, V.balance, V.aml, V.taxCalc, V.taxReport,
  ],
}

// Determine which validation field is the intended failure point for each target outcome
const FAIL_FIELDS = {
  failed_age: 'birth_date',
  failed_liquidity: 'liquidity_date',
  failed_holding: 'start_date',
  awaiting_customer: 'id_photo_confidence',
}

function executePrecomputedFlow(validations, memberData, targetOutcome, flowKey) {
  const statuses = []
  const results = []

  // Which field should fail (if any) for this outcome
  const failField = FAIL_FIELDS[flowKey] || (targetOutcome === 'awaiting_customer' ? 'id_photo_confidence' : null)
  const shouldAllPass = targetOutcome === 'success' || targetOutcome === 'needs_hitl' || targetOutcome === 'tax_consent'

  for (let i = 0; i < validations.length; i++) {
    const v = validations[i]

    // HITL nodes pause
    if (v.requires_hitl) {
      if (targetOutcome === 'needs_hitl') {
        statuses.push('hitl_waiting')
        results.push(null)
      } else {
        statuses.push('pass')
        results.push({ passed: true, actual_value: 'Auto-cleared', message: 'Within threshold — no manual review needed', messageHe: 'בתוך הסף — לא נדרשת בדיקה ידנית' })
      }
      continue
    }

    // Generate realistic actual values and messages
    const { actualValue, passMessage, passMessageHe, failMessage, failMessageHe } = getFieldDisplay(v, memberData)

    // Decide pass or fail
    const isFailPoint = failField && v.field === failField
    const passed = isFailPoint ? false : true

    const message = passed ? passMessage : failMessage
    const messageHe = passed ? passMessageHe : failMessageHe
    const status = passed ? 'pass' : (v.severity === 'warning' ? 'warning' : 'fail')

    statuses.push(status)
    results.push({ passed, actual_value: actualValue, message, messageHe })
  }

  return { statuses, results }
}

function getFieldDisplay(v, md) {
  const field = v.field
  const age = md.birth_date ? Math.floor((Date.now() - new Date(md.birth_date)) / 31557600000) : 35
  const bal = md.balance || md.total_balance || 0
  const amt = md.withdrawal_amount || md.transfer_amount || md.redemption_amount || 0

  switch (field) {
    case 'id_photo_confidence': {
      const conf = md.id_photo_confidence || 50
      return { actualValue: `${conf}%`, passMessage: `Identity verified (${conf}% confidence)`, passMessageHe: `זהות אומתה (${conf}% ביטחון)`, failMessage: `ID photo confidence ${conf}% below 90% threshold`, failMessageHe: `ביטחון תמונת זהות ${conf}% מתחת לסף 90%` }
    }
    case 'account_owner':
      return { actualValue: md.account_owner || md.member_name, passMessage: 'Bank account owner matches member', passMessageHe: 'בעל חשבון הבנק תואם לעמית', failMessage: 'Bank account owner mismatch', failMessageHe: 'אי-התאמה בבעלות חשבון הבנק' }
    case 'birth_date': {
      const retAge = md.gender === 'female' ? 62 : 67
      if (v.rule?.includes('retirement') || v.rule?.includes('62') || v.rule?.includes('67'))
        return { actualValue: String(age), passMessage: `Age ${age} meets retirement age ${retAge}`, passMessageHe: `גיל ${age} עומד בגיל פרישה ${retAge}`, failMessage: `Age ${age} below retirement age ${retAge}`, failMessageHe: `גיל ${age} מתחת לגיל פרישה ${retAge}` }
      return { actualValue: String(age), passMessage: `Age ${age} meets minimum requirement`, passMessageHe: `גיל ${age} עומד בדרישת המינימום`, failMessage: `Age ${age} below minimum 18`, failMessageHe: `גיל ${age} מתחת למינימום 18` }
    }
    case 'balance':
      return { actualValue: `₪${bal.toLocaleString()}`, passMessage: `Balance ₪${bal.toLocaleString()} sufficient for ₪${amt.toLocaleString()}`, passMessageHe: `יתרה ₪${bal.toLocaleString()} מספקת עבור ₪${amt.toLocaleString()}`, failMessage: `Insufficient balance ₪${bal.toLocaleString()} for ₪${amt.toLocaleString()}`, failMessageHe: `יתרה לא מספקת ₪${bal.toLocaleString()} עבור ₪${amt.toLocaleString()}` }
    case 'withdrawal_amount':
      return { actualValue: `₪${amt.toLocaleString()}`, passMessage: `₪${amt.toLocaleString()} meets minimum withdrawal`, passMessageHe: `₪${amt.toLocaleString()} עומד במשיכה מינימלית`, failMessage: `₪${amt.toLocaleString()} below minimum withdrawal`, failMessageHe: `₪${amt.toLocaleString()} מתחת למשיכה מינימלית` }
    case 'liquidity_date':
      return { actualValue: md.liquidity_date || 'N/A', passMessage: 'Liquidity date reached', passMessageHe: 'תאריך נזילות הגיע', failMessage: `Liquidity date ${md.liquidity_date} not yet reached`, failMessageHe: `תאריך נזילות ${md.liquidity_date} טרם הגיע` }
    case 'start_date': {
      const start = md.start_date ? new Date(md.start_date) : new Date()
      const months = Math.max(0, Math.floor((Date.now() - start) / (30.44 * 86400000)))
      return { actualValue: `${months} months`, passMessage: `Holding period ${months} months meets requirement`, passMessageHe: `תקופת החזקה ${months} חודשים עומדת בדרישה`, failMessage: `Only ${months} months held, minimum 12 required`, failMessageHe: `רק ${months} חודשי החזקה, נדרשים לפחות 12` }
    }
    case 'transfer_percentage': {
      const pct = md.transfer_percentage || 20
      return { actualValue: `${pct}%`, passMessage: `Transfer ${pct}% within 50% limit`, passMessageHe: `העברה ${pct}% בתוך מגבלת 50%`, failMessage: `Transfer ${pct}% exceeds 50% limit`, failMessageHe: `העברה ${pct}% חורגת ממגבלת 50%` }
    }
    case 'supporting_documents':
      return { actualValue: String(!!md.supporting_documents), passMessage: 'Supporting documents provided', passMessageHe: 'מסמכים תומכים סופקו', failMessage: 'Missing required documents', failMessageHe: 'חסרים מסמכים נדרשים' }
    case 'redemption_reason':
      return { actualValue: md.redemption_reason || 'N/A', passMessage: `Qualifying reason: ${md.redemption_reason}`, passMessageHe: `סיבה מזכה: ${md.redemption_reason}`, failMessage: 'Non-qualifying reason for early redemption', failMessageHe: 'סיבה לא מזכה לפדיון מוקדם' }
    case 'redemption_amount': {
      const tax = Math.round((md.redemption_amount || 0) * 0.3)
      return { actualValue: `₪${tax.toLocaleString()} tax`, passMessage: `30% capital gains tax on ₪${(md.redemption_amount || 0).toLocaleString()}`, passMessageHe: `30% מס רווחי הון על ₪${(md.redemption_amount || 0).toLocaleString()}`, failMessage: 'Tax calculation error', failMessageHe: 'שגיאה בחישוב מס' }
    }
    case 'gap_days':
      return { actualValue: `${md.gap_days || 0} days`, passMessage: `Employment gap ${md.gap_days || 0} days within limit`, passMessageHe: `פער העסקה ${md.gap_days || 0} ימים בתוך המגבלה`, failMessage: `Employment gap ${md.gap_days || 0} days exceeds limit`, failMessageHe: `פער העסקה ${md.gap_days || 0} ימים חורג מהמגבלה` }
    case 'employer_approval_received':
      return { actualValue: String(!!md.employer_approval_received), passMessage: 'Employer approval received', passMessageHe: 'אישור מעסיק התקבל', failMessage: 'Missing employer approval', failMessageHe: 'חסר אישור מעסיק' }
    default:
      return { actualValue: 'OK', passMessage: `${v.name} — check passed`, passMessageHe: `${v.nameHe || v.name} — בדיקה עברה`, failMessage: `${v.name} — check failed`, failMessageHe: `${v.nameHe || v.name} — בדיקה נכשלה` }
  }
}

function determineDemoOutcome(targetOutcome, validations, statuses, results, memberData) {
  if (targetOutcome === 'needs_hitl') return null // flow paused at HITL
  if (targetOutcome === 'running') return null // still executing

  if (targetOutcome === 'awaiting_customer') {
    return { type: 'customer_action', subtype: 'id_photo', message: `ID photo verification failed (${memberData.id_photo_confidence}% confidence). Customer needs to upload a clear ID photo.`, messageHe: `אימות תמונת זהות נכשל (${memberData.id_photo_confidence}% ביטחון). הלקוח צריך להעלות תמונת זהות ברורה.` }
  }

  if (targetOutcome === 'tax_consent') {
    const amt = memberData.redemption_amount || 100000
    const taxRate = 30
    const tax = Math.round(amt * taxRate / 100)
    return { type: 'tax_consent', message: 'Early redemption approved pending tax consent.', messageHe: 'פדיון מוקדם אושר בהמתנה להסכמת מס.', breakdown: { gross: amt, tax, taxRate, fee: 0, feeRate: 0, net: amt - tax } }
  }

  if (targetOutcome === 'failed') {
    const failIdx = statuses.findIndex(s => s === 'fail')
    const failMsg = failIdx >= 0 && results[failIdx] ? results[failIdx].message : 'Validation failed'
    const failMsgHe = failIdx >= 0 && results[failIdx] ? (results[failIdx].messageHe || results[failIdx].message) : 'אימות נכשל'
    return { type: 'blocked', message: `Process blocked — ${failMsg}`, messageHe: `התהליך נחסם — ${failMsgHe}` }
  }

  // success
  return { type: 'approved', message: 'All validations passed. Process completed successfully.', messageHe: 'כל האימותים עברו בהצלחה. התהליך הושלם בהצלחה.' }
}

function determineDemoStatus(targetOutcome) {
  switch (targetOutcome) {
    case 'success': return 'COMPLETED'
    case 'failed': return 'BLOCKED'
    case 'needs_hitl': return 'PENDING_APPROVAL'
    case 'awaiting_customer': return 'AWAITING_DOCUMENTS'
    case 'tax_consent': return 'AWAITING_CONSENT'
    case 'running': return 'RUNNING'
    default: return 'COMPLETED'
  }
}

export function generateBulkScenarios(count) {
  const scenarios = []

  for (let i = 0; i < count; i++) {
    const roll = Math.random()
    let targetOutcome
    if (roll < 0.38) targetOutcome = 'success'
    else if (roll < 0.60) targetOutcome = 'failed'
    else if (roll < 0.76) targetOutcome = 'needs_hitl'
    else if (roll < 0.85) targetOutcome = 'tax_consent'
    else if (roll < 0.95) targetOutcome = 'awaiting_customer'
    else targetOutcome = 'running'

    const fundType = pickFundType()
    let useCase = pickUseCase(fundType)

    // Force early_redemption for tax_consent
    if (targetOutcome === 'tax_consent') {
      useCase = fundType === 'study' ? 'early_redemption' : 'withdrawal'
    }

    const memberData = generateMemberData(fundType, useCase)
    const contract = generateContract(fundType, useCase, memberData)
    const regulations = generateRegulations(useCase)

    // Tune member data for target outcome
    switch (targetOutcome) {
      case 'success':
        memberData.id_photo_confidence = randInt(92, 99)
        memberData.account_owner = memberData.member_name
        if (fundType === 'compensation') {
          const year = new Date().getFullYear() - randInt(68, 75)
          memberData.birth_date = `${year}-${String(randInt(1, 12)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`
        }
        if (fundType === 'study' && memberData.liquidity_date) {
          memberData.liquidity_date = randomPastDate(30, 365)
        }
        if (fundType === 'investment' && memberData.start_date) {
          memberData.start_date = randomPastDate(400, 730)
        }
        if (memberData.withdrawal_amount) {
          memberData.withdrawal_amount = Math.min(memberData.withdrawal_amount, (memberData.balance || memberData.total_balance || 100000) * 0.7)
        }
        contract.clauses = contract.clauses.filter(c => c.consequence !== 'require_hitl')
        break

      case 'failed':
        memberData.id_photo_confidence = randInt(92, 99)
        memberData.account_owner = memberData.member_name
        if (fundType === 'compensation') {
          const year = new Date().getFullYear() - randInt(35, 55)
          memberData.birth_date = `${year}-${String(randInt(1, 12)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`
          memberData.early_withdrawal_allowed = false
        } else if (fundType === 'study') {
          memberData.liquidity_date = randomFutureDate(180, 730)
        } else {
          memberData.start_date = randomPastDate(30, 150)
          memberData.policy_minimum_holding_months = 12
        }
        break

      case 'needs_hitl':
        memberData.id_photo_confidence = randInt(92, 99)
        memberData.account_owner = memberData.member_name
        if (memberData.withdrawal_amount) {
          memberData.withdrawal_amount = randInt(100000, 400000)
          if (memberData.balance != null) memberData.balance = Math.max(memberData.balance, memberData.withdrawal_amount + 10000)
          if (memberData.total_balance != null) memberData.total_balance = Math.max(memberData.total_balance, memberData.withdrawal_amount + 10000)
        }
        break

      case 'tax_consent':
        memberData.id_photo_confidence = randInt(92, 99)
        memberData.account_owner = memberData.member_name
        memberData.supporting_documents = true
        memberData.tax_aware = true
        memberData.redemption_reason = pick(['Financial hardship', 'Educational expense', 'Medical expense'])
        if (!memberData.redemption_amount) memberData.redemption_amount = randInt(50000, 200000)
        break

      case 'awaiting_customer':
        memberData.id_photo_confidence = randInt(30, 70)
        break

      case 'running':
        memberData.id_photo_confidence = randInt(92, 99)
        memberData.account_owner = memberData.member_name
        break
    }

    // Pick appropriate precomputed flow
    let flowKey
    if (targetOutcome === 'success') flowKey = useCase === 'fund_transfer' ? 'success_transfer' : 'success_withdrawal'
    else if (targetOutcome === 'failed' && fundType === 'compensation') flowKey = 'failed_age'
    else if (targetOutcome === 'failed' && fundType === 'study') flowKey = 'failed_liquidity'
    else if (targetOutcome === 'failed') flowKey = 'failed_holding'
    else if (targetOutcome === 'needs_hitl') flowKey = Math.random() < 0.6 ? 'hitl_compliance' : 'hitl_fraud'
    else if (targetOutcome === 'awaiting_customer') flowKey = 'awaiting_id'
    else if (targetOutcome === 'tax_consent') flowKey = 'tax_consent'
    else flowKey = 'success_withdrawal'

    const validations = PRECOMPUTED_FLOWS[flowKey].map((v, idx) => ({ ...v, id: `val_${String(idx + 1).padStart(3, '0')}` }))
    const { statuses, results } = targetOutcome === 'running'
      ? { statuses: validations.map(() => 'pending'), results: validations.map(() => null) }
      : executePrecomputedFlow(validations, memberData, targetOutcome, flowKey)

    const outcome = determineDemoOutcome(targetOutcome, validations, statuses, results, memberData)
    const status = determineDemoStatus(targetOutcome)

    const procId = `PROC-${String(randInt(10000, 99999))}`
    const fundLabel = FUND_TYPES.find(f => f.id === fundType)
    const priority = (memberData.withdrawal_amount || memberData.transfer_amount || memberData.redemption_amount || 0) > 100000 ? 'High'
      : (memberData.withdrawal_amount || memberData.transfer_amount || memberData.redemption_amount || 0) > 50000 ? 'Medium' : 'Low'

    // SLA: set a reasonable future deadline (1-7 days from now)
    const slaClause = contract.clauses.find(c => c.clause_id === 'SLA-1')
    const slaDays = slaClause?.sla_business_days || 5
    const launchedAt = new Date(Date.now() - randInt(0, 5) * 60000 - randInt(0, 59) * 1000)
    const slaDeadline = new Date(Date.now() + slaDays * 24 * 3600000 + randInt(-12, 12) * 3600000)

    const ts = launchedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

    const auditEntries = [
      { action: 'Request intake', actionHe: 'קליטת בקשה', category: 'system', source: '—', result: 'SUCCESS', details: 'Process initiated', detailsHe: 'התהליך הופעל', timestamp: ts },
    ]
    validations.forEach((v, idx) => {
      if (statuses[idx] === 'hitl_waiting') {
        auditEntries.push({ action: v.name, actionHe: v.nameHe || v.name, category: 'hitl', source: v.source || '—', result: 'PAUSED', details: v.hitl_reason || 'Waiting for human review', detailsHe: v.hitl_reasonHe || 'ממתין לבדיקה ידנית', timestamp: ts })
      } else if (statuses[idx] && statuses[idx] !== 'pending') {
        auditEntries.push({ action: v.name, actionHe: v.nameHe || v.name, category: v.category, source: v.source || '—', result: statuses[idx].toUpperCase(), details: results[idx]?.message || '', detailsHe: results[idx]?.messageHe || '', timestamp: ts })
      }
    })
    if (outcome) {
      auditEntries.push({ action: 'Outcome determination', actionHe: 'קביעת תוצאה', category: 'system', source: '—', result: outcome.type === 'approved' ? 'SUCCESS' : outcome.type === 'blocked' ? 'FAIL' : 'WARNING', details: outcome.message, detailsHe: outcome.messageHe || outcome.message, timestamp: ts })
    }

    scenarios.push({
      id: procId,
      processId: procId,
      timestamp: launchedAt.toISOString(),
      timestampDisplay: launchedAt.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
      memberName: memberData.member_name,
      fundType,
      fundTypeLabel: fundLabel ? `${fundLabel.labelHe} — ${fundLabel.label}` : fundType,
      useCase,
      useCaseLabel: getUseCaseLabel(fundType, useCase),
      priority,
      slaDeadline: slaDeadline.toISOString(),
      status,
      memberData,
      contract,
      regulations,
      analysisMessages: [{ icon: '✅', text: `Flow completed: ${validations.length} validation steps`, textHe: `התהליך הושלם: ${validations.length} שלבי אימות`, done: true }],
      validations,
      validationStatuses: statuses,
      validationResults: results,
      outcome,
      auditEntries,
      error: null,
    })
  }

  return scenarios
}
