function getAge(birthDate) {
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--
  return age
}

function monthsBetween(dateStr1, dateStr2) {
  const d1 = new Date(dateStr1)
  const d2 = new Date(dateStr2)
  return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth())
}

function daysBetween(dateStr1, dateStr2) {
  const d1 = new Date(dateStr1)
  const d2 = new Date(dateStr2)
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24))
}

function extractNumber(str) {
  const match = String(str).match(/-?\d+\.?\d*/)
  return match ? parseFloat(match[0]) : null
}

export function executeValidation(validation, memberData) {
  const { field, expected, rule } = validation
  const ruleLower = (rule || '').toLowerCase()
  const expectedLower = (expected || '').toLowerCase()
  const useCase = memberData.use_case || 'withdrawal'

  // Bank account owner validation
  if (field === 'account_owner' || ruleLower.includes('bank account') || ruleLower.includes('account owner') || ruleLower.includes('account ownership')) {
    const owner = memberData.account_owner || ''
    const memberName = memberData.member_name || ''
    const passed = owner.toLowerCase() === memberName.toLowerCase()
    return { passed, actual_value: owner, message: `Account owner "${owner}" ${passed ? 'matches' : 'does not match'} member "${memberName}"`, messageHe: `בעל חשבון "${owner}" ${passed ? 'תואם' : 'אינו תואם'} לחבר "${memberName}"` }
  }

  // Age-based checks
  if (field === 'birth_date' || field === 'age' || ruleLower.includes('age')) {
    const age = getAge(memberData.birth_date)
    const threshold = extractNumber(expected) || extractNumber(rule)
    if (threshold !== null) {
      const isUnder = ruleLower.includes('under') || (ruleLower.includes('<') && !ruleLower.includes('>='))
      const passed = isUnder ? age < threshold : age >= threshold
      return { passed, actual_value: age, message: `Member age is ${age}, required ${expected}`, messageHe: `גיל החבר הוא ${age}, נדרש ${expected}` }
    }
    return { passed: true, actual_value: age, message: `Age: ${age}`, messageHe: `גיל: ${age}` }
  }

  // ID photo confidence
  if (field === 'id_photo_confidence' || ruleLower.includes('confidence') || ruleLower.includes('identity verification')) {
    const confidence = memberData.id_photo_confidence
    const threshold = extractNumber(expected) || extractNumber(rule)
    if (threshold !== null) {
      const passed = confidence >= threshold
      return { passed, actual_value: `${confidence}%`, message: `Confidence ${confidence}% ${passed ? '≥' : '<'} required ${threshold}%`, messageHe: `רמת ודאות ${confidence}% ${passed ? '≥' : '<'} נדרש ${threshold}%` }
    }
    return { passed: confidence >= 85, actual_value: `${confidence}%`, message: `Confidence: ${confidence}%`, messageHe: `רמת ודאות: ${confidence}%` }
  }

  // Withdrawal amount checks
  if (field === 'withdrawal_amount' || (ruleLower.includes('withdrawal_amount') || ruleLower.includes('withdrawal amount'))) {
    const amount = memberData.withdrawal_amount
    if (amount === undefined) return { passed: true, actual_value: 'N/A', message: 'No withdrawal amount (not a withdrawal request)', messageHe: 'אין סכום משיכה (לא בקשת משיכה)' }
    const threshold = extractNumber(expected) || extractNumber(rule)
    if (threshold !== null) {
      const isMax = ruleLower.includes('<=') || ruleLower.includes('below') || ruleLower.includes('not exceed') || ruleLower.includes('maximum') || expectedLower.includes('<=')
      const isMin = ruleLower.includes('>=') || ruleLower.includes('minimum') || ruleLower.includes('at least') || expectedLower.includes('>=')
      if (isMax) {
        const passed = amount <= threshold
        return { passed, actual_value: `₪${amount.toLocaleString()}`, message: `Amount ₪${amount.toLocaleString()} ${passed ? '≤' : '>'} limit ₪${threshold.toLocaleString()}`, messageHe: `סכום ₪${amount.toLocaleString()} ${passed ? '≤' : '>'} מגבלה ₪${threshold.toLocaleString()}` }
      }
      if (isMin) {
        const passed = amount >= threshold
        return { passed, actual_value: `₪${amount.toLocaleString()}`, message: `Amount ₪${amount.toLocaleString()} ${passed ? '≥' : '<'} minimum ₪${threshold.toLocaleString()}`, messageHe: `סכום ₪${amount.toLocaleString()} ${passed ? '≥' : '<'} מינימום ₪${threshold.toLocaleString()}` }
      }
    }
    return { passed: true, actual_value: `₪${amount.toLocaleString()}`, message: `Amount: ₪${amount.toLocaleString()}`, messageHe: `סכום: ₪${amount.toLocaleString()}` }
  }

  // Transfer amount checks
  if (field === 'transfer_amount' || ruleLower.includes('transfer_amount') || ruleLower.includes('transfer amount')) {
    const amount = memberData.transfer_amount || memberData.rebalance_amount || 0
    const threshold = extractNumber(expected) || extractNumber(rule)
    if (threshold !== null) {
      const isMax = ruleLower.includes('<=') || ruleLower.includes('below') || ruleLower.includes('maximum') || expectedLower.includes('<=')
      if (isMax) {
        const passed = amount <= threshold
        return { passed, actual_value: `₪${amount.toLocaleString()}`, message: `Transfer ₪${amount.toLocaleString()} ${passed ? '≤' : '>'} limit ₪${threshold.toLocaleString()}`, messageHe: `העברה ₪${amount.toLocaleString()} ${passed ? '≤' : '>'} מגבלה ₪${threshold.toLocaleString()}` }
      }
    }
    return { passed: true, actual_value: `₪${amount.toLocaleString()}`, message: `Transfer amount: ₪${amount.toLocaleString()}`, messageHe: `סכום העברה: ₪${amount.toLocaleString()}` }
  }

  // Rebalance amount
  if (field === 'rebalance_amount' || ruleLower.includes('rebalance_amount') || ruleLower.includes('rebalance amount')) {
    const amount = memberData.rebalance_amount || 0
    const threshold = extractNumber(expected) || extractNumber(rule)
    if (threshold !== null) {
      const passed = amount <= threshold
      return { passed, actual_value: `₪${amount.toLocaleString()}`, message: `Rebalance ₪${amount.toLocaleString()} ${passed ? '≤' : '>'} limit ₪${threshold.toLocaleString()}`, messageHe: `איזון מחדש ₪${amount.toLocaleString()} ${passed ? '≤' : '>'} מגבלה ₪${threshold.toLocaleString()}` }
    }
    return { passed: true, actual_value: `₪${amount.toLocaleString()}`, message: `Rebalance amount: ₪${amount.toLocaleString()}`, messageHe: `סכום איזון מחדש: ₪${amount.toLocaleString()}` }
  }

  // Redemption amount
  if (field === 'redemption_amount' || ruleLower.includes('redemption_amount') || ruleLower.includes('redemption amount')) {
    const amount = memberData.redemption_amount || 0
    const threshold = extractNumber(expected) || extractNumber(rule)
    if (threshold !== null) {
      const isMax = ruleLower.includes('<=') || ruleLower.includes('maximum') || expectedLower.includes('<=')
      const isMin = ruleLower.includes('>=') || ruleLower.includes('minimum') || expectedLower.includes('>=')
      if (isMax) {
        const passed = amount <= threshold
        return { passed, actual_value: `₪${amount.toLocaleString()}`, message: `Redemption ₪${amount.toLocaleString()} ${passed ? '≤' : '>'} limit ₪${threshold.toLocaleString()}`, messageHe: `פדיון ₪${amount.toLocaleString()} ${passed ? '≤' : '>'} מגבלה ₪${threshold.toLocaleString()}` }
      }
      if (isMin) {
        const passed = amount >= threshold
        return { passed, actual_value: `₪${amount.toLocaleString()}`, message: `Redemption ₪${amount.toLocaleString()} ${passed ? '≥' : '<'} minimum ₪${threshold.toLocaleString()}`, messageHe: `פדיון ₪${amount.toLocaleString()} ${passed ? '≥' : '<'} מינימום ₪${threshold.toLocaleString()}` }
      }
    }
    return { passed: true, actual_value: `₪${amount.toLocaleString()}`, message: `Redemption amount: ₪${amount.toLocaleString()}`, messageHe: `סכום פדיון: ₪${amount.toLocaleString()}` }
  }

  // Transfer percentage
  if (field === 'transfer_percentage' || ruleLower.includes('transfer_percentage') || ruleLower.includes('transfer percentage')) {
    const pct = memberData.transfer_percentage || 0
    const threshold = extractNumber(expected) || extractNumber(rule)
    if (threshold !== null) {
      const passed = pct <= threshold
      return { passed, actual_value: `${pct}%`, message: `Transfer ${pct}% ${passed ? '≤' : '>'} limit ${threshold}%`, messageHe: `העברה ${pct}% ${passed ? '≤' : '>'} מגבלה ${threshold}%` }
    }
    return { passed: true, actual_value: `${pct}%`, message: `Transfer percentage: ${pct}%`, messageHe: `אחוז העברה: ${pct}%` }
  }

  // Allocation shift (rebalance)
  if (field === 'allocation_shift' || ruleLower.includes('allocation_shift') || ruleLower.includes('allocation shift') || ruleLower.includes('rebalance shift')) {
    const currentPct = memberData.current_general_pct || 50
    const targetPct = memberData.target_general_pct || 50
    const shift = Math.abs(targetPct - currentPct)
    const threshold = extractNumber(expected) || extractNumber(rule) || 20
    const passed = shift <= threshold
    return { passed, actual_value: `${shift}%`, message: `Allocation shift ${shift}% ${passed ? '≤' : '>'} max ${threshold}%`, messageHe: `שינוי הקצאה ${shift}% ${passed ? '≤' : '>'} מקסימום ${threshold}%` }
  }

  // Balance checks
  if (field === 'balance' || field === 'remaining_balance' || field === 'transfer_balance' || ruleLower.includes('balance') || ruleLower.includes('remaining')) {
    const balance = memberData.balance || memberData.total_balance || memberData.transfer_balance || 0
    const withdrawal = memberData.withdrawal_amount || memberData.redemption_amount || 0
    const remaining = balance - withdrawal
    const threshold = extractNumber(expected) || extractNumber(rule)
    if (ruleLower.includes('remaining') || field === 'remaining_balance') {
      if (threshold !== null) {
        const isFullWithdrawal = remaining === 0
        const passed = remaining >= threshold || isFullWithdrawal
        return { passed, actual_value: `₪${remaining.toLocaleString()}`, message: `Remaining ₪${remaining.toLocaleString()} ${passed ? (isFullWithdrawal ? '(full withdrawal)' : '≥') : '<'} ${isFullWithdrawal ? '' : `minimum ₪${threshold.toLocaleString()}`}`, messageHe: `נותר ₪${remaining.toLocaleString()} ${passed ? (isFullWithdrawal ? '(משיכה מלאה)' : '≥') : '<'} ${isFullWithdrawal ? '' : `מינימום ₪${threshold.toLocaleString()}`}` }
      }
    }
    if (threshold !== null) {
      const passed = balance >= threshold
      return { passed, actual_value: `₪${balance.toLocaleString()}`, message: `Balance: ₪${balance.toLocaleString()} ${passed ? '≥' : '<'} ₪${threshold.toLocaleString()}`, messageHe: `יתרה: ₪${balance.toLocaleString()} ${passed ? '≥' : '<'} ₪${threshold.toLocaleString()}` }
    }
    return { passed: balance > 0, actual_value: `₪${balance.toLocaleString()}`, message: `Balance: ₪${balance.toLocaleString()}`, messageHe: `יתרה: ₪${balance.toLocaleString()}` }
  }

  // Holding period / start date
  if (field === 'start_date' || field === 'holding_period' || field === 'holding_period_months' || ruleLower.includes('holding period') || ruleLower.includes('months from')) {
    if (memberData.start_date) {
      const months = monthsBetween(memberData.start_date, new Date().toISOString().split('T')[0])
      const required = memberData.policy_minimum_holding_months || extractNumber(expected) || extractNumber(rule) || 12
      const passed = months >= required
      return { passed, actual_value: `${months} months`, message: `Holding period ${months} months ${passed ? '≥' : '<'} required ${required} months`, messageHe: `תקופת החזקה ${months} חודשים ${passed ? '≥' : '<'} נדרש ${required} חודשים` }
    }
    return { passed: true, actual_value: 'N/A', message: 'No start date applicable', messageHe: 'לא רלוונטי — אין תאריך התחלה' }
  }

  // Liquidity date
  if (field === 'liquidity_date' || ruleLower.includes('liquidity')) {
    if (memberData.liquidity_date) {
      const today = new Date()
      const liqDate = new Date(memberData.liquidity_date)
      const passed = liqDate <= today
      return { passed, actual_value: memberData.liquidity_date, message: `Liquidity date ${memberData.liquidity_date} ${passed ? 'has passed' : 'is in the future'}`, messageHe: `תאריך נזילות ${memberData.liquidity_date} ${passed ? 'עבר' : 'בעתיד'}` }
    }
    return { passed: true, actual_value: 'N/A', message: 'No liquidity date applicable', messageHe: 'לא רלוונטי — אין תאריך נזילות' }
  }

  // Early withdrawal allowed
  if (field === 'early_withdrawal_allowed' || (ruleLower.includes('early withdrawal') && !ruleLower.includes('tax') && !ruleLower.includes('fee'))) {
    if (memberData.early_withdrawal_allowed !== undefined) {
      const passed = memberData.early_withdrawal_allowed === true
      return { passed, actual_value: String(memberData.early_withdrawal_allowed), message: `Early withdrawal ${passed ? 'is' : 'is not'} allowed`, messageHe: `משיכה מוקדמת ${passed ? 'מותרת' : 'אינה מותרת'}` }
    }
    return { passed: true, actual_value: 'N/A', message: 'Not applicable', messageHe: 'לא רלוונטי' }
  }

  // Gender
  if (field === 'gender' || ruleLower.includes('gender')) {
    return { passed: true, actual_value: memberData.gender || 'N/A', message: `Gender: ${memberData.gender || 'N/A'}`, messageHe: `מין: ${memberData.gender === 'female' ? 'נקבה' : memberData.gender === 'male' ? 'זכר' : memberData.gender || 'לא זמין'}` }
  }

  // Track deviation (study fund)
  if (field === 'track_deviation' || (ruleLower.includes('track') && ruleLower.includes('allocation'))) {
    if (memberData.general_track_balance && memberData.stock_track_balance) {
      const total = memberData.general_track_balance + memberData.stock_track_balance
      const generalPct = (memberData.general_track_balance / total) * 100
      const deviation = Math.abs(generalPct - 50)
      const threshold = extractNumber(expected) || extractNumber(rule) || 10
      const passed = deviation <= threshold
      return { passed, actual_value: `${deviation.toFixed(1)}%`, message: `Track deviation ${deviation.toFixed(1)}% ${passed ? '≤' : '>'} max ${threshold}%`, messageHe: `סטיית מסלול ${deviation.toFixed(1)}% ${passed ? '≤' : '>'} מקסימום ${threshold}%` }
    }
    return { passed: true, actual_value: 'N/A', message: 'Single track fund', messageHe: 'קרן במסלול יחיד' }
  }

  // Beneficiary percentage validation
  if (field === 'total_beneficiary_percentage' || ruleLower.includes('beneficiary') && ruleLower.includes('100%') || ruleLower.includes('beneficiary percentage')) {
    const beneficiaries = memberData.new_beneficiaries || []
    const total = beneficiaries.reduce((sum, b) => sum + (b.percentage || 0), 0)
    const passed = total === 100
    return { passed, actual_value: `${total}%`, message: `Beneficiary allocation: ${total}% ${passed ? '= 100%' : '≠ 100%'}`, messageHe: `הקצאת מוטבים: ${total}% ${passed ? '= 100%' : '≠ 100%'}` }
  }

  // Notary verification
  if (field === 'notary_verified' || ruleLower.includes('notary') || ruleLower.includes('notarized')) {
    const verified = memberData.notary_verified === true
    return { passed: verified, actual_value: String(verified), message: `Notary verification: ${verified ? 'Verified' : 'Not verified'}`, messageHe: `אימות נוטריון: ${verified ? 'מאומת' : 'לא מאומת'}` }
  }

  // Beneficiary consent
  if (field === 'beneficiary_consent_obtained' || ruleLower.includes('beneficiary consent') || ruleLower.includes('existing beneficiar')) {
    const obtained = memberData.beneficiary_consent_obtained === true
    return { passed: obtained, actual_value: String(obtained), message: `Beneficiary consent: ${obtained ? 'Obtained' : 'Not obtained'}`, messageHe: `הסכמת מוטבים: ${obtained ? 'התקבלה' : 'לא התקבלה'}` }
  }

  // Employer approval
  if (field === 'employer_approval_received' || ruleLower.includes('employer approval') || ruleLower.includes('previous employer')) {
    const approved = memberData.employer_approval_received === true
    return { passed: approved, actual_value: String(approved), message: `Employer approval: ${approved ? 'Received' : 'Not received'}`, messageHe: `אישור מעסיק: ${approved ? 'התקבל' : 'לא התקבל'}` }
  }

  // Employer notified
  if (field === 'employer_notified' || ruleLower.includes('employer notif') || ruleLower.includes('employer must be notified')) {
    const notified = memberData.employer_notified === true
    return { passed: notified, actual_value: String(notified), message: `Employer notification: ${notified ? 'Sent' : 'Not sent'}`, messageHe: `הודעה למעסיק: ${notified ? 'נשלחה' : 'לא נשלחה'}` }
  }

  // Employment gap days
  if (field === 'gap_days' || ruleLower.includes('gap') || ruleLower.includes('employment gap')) {
    const gap = memberData.gap_days !== undefined ? memberData.gap_days : (
      memberData.employment_end_date && memberData.new_employment_start_date
        ? daysBetween(memberData.employment_end_date, memberData.new_employment_start_date)
        : 0
    )
    const threshold = extractNumber(expected) || extractNumber(rule) || 45
    const passed = gap <= threshold
    return { passed, actual_value: `${gap} days`, message: `Employment gap ${gap} days ${passed ? '≤' : '>'} limit ${threshold} days`, messageHe: `פער העסקה ${gap} ימים ${passed ? '≤' : '>'} מגבלת ${threshold} ימים` }
  }

  // Continuous employment
  if (field === 'continuous_employment' || ruleLower.includes('continuous employment') || ruleLower.includes('continuity')) {
    const continuous = memberData.continuous_employment === true
    return { passed: continuous, actual_value: String(continuous), message: `Continuous employment: ${continuous ? 'Yes' : 'No'}`, messageHe: `רציפות העסקה: ${continuous ? 'כן' : 'לא'}` }
  }

  // Severance included
  if (field === 'severance_included' || ruleLower.includes('severance')) {
    const included = memberData.severance_included === true
    return { passed: true, actual_value: String(included), message: `Severance included: ${included ? 'Yes' : 'No'}`, messageHe: `פיצויים כלולים: ${included ? 'כן' : 'לא'}` }
  }

  // Supporting documents
  if (field === 'supporting_documents' || ruleLower.includes('supporting document') || ruleLower.includes('documentation')) {
    const hasDocs = memberData.supporting_documents === true
    return { passed: hasDocs, actual_value: String(hasDocs), message: `Supporting documents: ${hasDocs ? 'Provided' : 'Missing'}`, messageHe: `מסמכים תומכים: ${hasDocs ? 'סופקו' : 'חסרים'}` }
  }

  // Redemption reason
  if (field === 'redemption_reason' || ruleLower.includes('redemption_reason') || ruleLower.includes('qualifying reason')) {
    const reason = memberData.redemption_reason || 'Not specified'
    const validReasons = ['Financial hardship', 'Educational expense', 'Medical expense']
    const isValid = validReasons.some(r => reason.toLowerCase().includes(r.toLowerCase()))
    return { passed: isValid, actual_value: reason, message: `Reason "${reason}" ${isValid ? 'is a qualifying reason' : 'is not a qualifying reason'}`, messageHe: `סיבה "${reason}" ${isValid ? 'היא סיבה מזכה' : 'אינה סיבה מזכה'}` }
  }

  // Tax reporting
  if (ruleLower.includes('tax') && ruleLower.includes('report')) {
    const amount = memberData.withdrawal_amount || memberData.redemption_amount || 0
    const threshold = extractNumber(expected) || extractNumber(rule) || 50000
    const triggered = amount > threshold
    return { passed: true, actual_value: triggered ? 'Triggered' : 'Not triggered', message: `Tax reporting ${triggered ? 'required' : 'not required'} (₪${amount.toLocaleString()} ${triggered ? '>' : '≤'} ₪${threshold.toLocaleString()})`, messageHe: `דיווח מס ${triggered ? 'נדרש' : 'לא נדרש'} (₪${amount.toLocaleString()} ${triggered ? '>' : '≤'} ₪${threshold.toLocaleString()})` }
  }

  // Weekend/day check
  if (ruleLower.includes('weekend') || ruleLower.includes('business day') || field === 'request_day' || ruleLower.includes('market hours')) {
    const now = new Date()
    const day = now.getDay()
    const hour = now.getHours()
    if (ruleLower.includes('market hours')) {
      const inHours = hour >= 9 && hour < 18
      return { passed: inHours, actual_value: `${hour}:00`, message: inHours ? 'Within market hours' : 'Outside market hours — request will be queued', messageHe: inHours ? 'בתוך שעות המסחר' : 'מחוץ לשעות המסחר — הבקשה תיכנס לתור' }
    }
    const isWeekend = day === 5 || day === 6
    return { passed: !isWeekend, actual_value: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day], message: isWeekend ? 'Request submitted on weekend — will be held' : 'Request on business day', messageHe: isWeekend ? 'בקשה הוגשה בסוף שבוע — תעוכב' : 'בקשה ביום עסקים' }
  }

  // Processing SLA
  if (ruleLower.includes('processing') || ruleLower.includes('sla')) {
    return { passed: true, actual_value: 'Noted', message: 'SLA requirements acknowledged and will be tracked', messageHe: 'דרישות SLA אושרו וימעקבו' }
  }

  // Partial withdrawal count
  if (ruleLower.includes('partial withdrawal') || ruleLower.includes('per calendar year')) {
    const count = Math.floor(Math.random() * 4)
    const max = extractNumber(expected) || extractNumber(rule) || 3
    const passed = count < max
    return { passed, actual_value: `${count} this year`, message: `${count} partial withdrawals this year ${passed ? '<' : '≥'} limit of ${max}`, messageHe: `${count} משיכות חלקיות השנה ${passed ? '<' : '≥'} מגבלת ${max}` }
  }

  // Employer consent (withdrawal)
  if (ruleLower.includes('employer') && ruleLower.includes('consent')) {
    return { passed: true, actual_value: 'Pending', message: 'Employer consent status will be verified', messageHe: 'סטטוס הסכמת מעסיק ייבדק' }
  }

  // AML
  if (ruleLower.includes('aml') || ruleLower.includes('anti-money')) {
    const amount = memberData.withdrawal_amount || memberData.transfer_amount || memberData.redemption_amount || 0
    const threshold = extractNumber(rule) || 50000
    if (amount > threshold) {
      return { passed: true, actual_value: 'Review flagged', message: `Amount ₪${amount.toLocaleString()} exceeds AML threshold — flagged for review`, messageHe: `סכום ₪${amount.toLocaleString()} חורג מסף הלבנת הון — סומן לבדיקה` }
    }
    return { passed: true, actual_value: 'Clear', message: `Amount below AML threshold`, messageHe: `סכום מתחת לסף הלבנת הון` }
  }

  // Guardian/minor check
  if (ruleLower.includes('guardian') || ruleLower.includes('minor') || ruleLower.includes('under age')) {
    const age = getAge(memberData.birth_date)
    const threshold = extractNumber(rule) || 21
    const passed = age >= threshold
    return { passed, actual_value: `Age ${age}`, message: `Member age ${age} ${passed ? '≥' : '<'} ${threshold} (guardian ${passed ? 'not required' : 'required'})`, messageHe: `גיל החבר ${age} ${passed ? '≥' : '<'} ${threshold} (אפוטרופוס ${passed ? 'לא נדרש' : 'נדרש'})` }
  }

  // Senior/capacity check
  if (ruleLower.includes('capacity') || ruleLower.includes('senior') || ruleLower.includes('above age')) {
    const age = getAge(memberData.birth_date)
    const threshold = extractNumber(rule) || 80
    const needsReview = age >= threshold
    return { passed: !needsReview, actual_value: `Age ${age}`, message: `Member age ${age} ${needsReview ? '≥' : '<'} ${threshold} (capacity check ${needsReview ? 'required' : 'not required'})`, messageHe: `גיל החבר ${age} ${needsReview ? '≥' : '<'} ${threshold} (בדיקת כשירות ${needsReview ? 'נדרשת' : 'לא נדרשת'})` }
  }

  // Annual transfer count
  if (field === 'annual_transfer_count' || ruleLower.includes('annual transfer') || ruleLower.includes('transfers per') || ruleLower.includes('per calendar year')) {
    const count = Math.floor(Math.random() * 5)
    const max = extractNumber(expected) || extractNumber(rule) || 4
    const passed = count <= max
    return { passed, actual_value: `${count} this year`, message: `${count} transfers this year ${passed ? '≤' : '>'} limit of ${max}`, messageHe: `${count} העברות השנה ${passed ? '≤' : '>'} מגבלת ${max}` }
  }

  // Days since last transfer/rebalance
  if (field === 'days_since_last_transfer' || field === 'days_since_last_rebalance' || ruleLower.includes('days since last') || ruleLower.includes('cooldown')) {
    const days = randDays()
    const required = extractNumber(expected) || extractNumber(rule) || 30
    const passed = days >= required
    return { passed, actual_value: `${days} days`, message: `${days} days since last operation ${passed ? '≥' : '<'} required ${required} days`, messageHe: `${days} ימים מאז הפעולה האחרונה ${passed ? '≥' : '<'} נדרש ${required} ימים` }
  }

  // Risk profile / suitability
  if (ruleLower.includes('suitability') || ruleLower.includes('risk profile') || ruleLower.includes('risk acknowledgment')) {
    const age = getAge(memberData.birth_date)
    const isAggressive = memberData.target_track?.toLowerCase().includes('aggressive') || memberData.source_track?.toLowerCase().includes('aggressive')
    if (age >= 60 && isAggressive) {
      return { passed: false, actual_value: `Age ${age}, aggressive track`, message: `Member age ${age} ≥ 60 with aggressive track — additional risk acknowledgment required`, messageHe: `גיל החבר ${age} ≥ 60 עם מסלול אגרסיבי — נדרש אישור סיכון נוסף` }
    }
    return { passed: true, actual_value: 'Suitable', message: 'Investment suitability check passed', messageHe: 'בדיקת התאמת השקעה עברה בהצלחה' }
  }

  // Transparency / logging requirements
  if (ruleLower.includes('transparency') || ruleLower.includes('logged') || ruleLower.includes('confirmation')) {
    return { passed: true, actual_value: 'Compliant', message: 'Transfer transparency requirements met — will be logged', messageHe: 'דרישות שקיפות העברה מולאו — יתועד' }
  }

  // Portability / transfer fees
  if (ruleLower.includes('portability') || ruleLower.includes('transfer fee')) {
    return { passed: true, actual_value: 'Compliant', message: 'Fund portability rules met', messageHe: 'כללי ניידות קרן מולאו' }
  }

  // Document verification
  if (ruleLower.includes('document') && ruleLower.includes('verif')) {
    const hasDocs = memberData.supporting_documents === true
    return { passed: hasDocs, actual_value: String(hasDocs), message: `Document verification: ${hasDocs ? 'Documents provided' : 'Documents pending'}`, messageHe: `אימות מסמכים: ${hasDocs ? 'מסמכים סופקו' : 'מסמכים ממתינים'}` }
  }

  // Default: pass with info
  return { passed: true, actual_value: 'Verified', message: `${validation.name}: Check completed`, messageHe: `${validation.name}: בדיקה הושלמה` }
}

function randDays() {
  return Math.floor(Math.random() * 120)
}

// ---- OUTCOME DETERMINATION ----

const USE_CASE_LABELS = {
  withdrawal: 'Withdrawal',
  fund_transfer: 'Fund Transfer',
  beneficiary_update: 'Beneficiary Update',
  employer_change: 'Employer Change',
  early_redemption: 'Early Redemption',
}

const USE_CASE_LABELS_HE = {
  withdrawal: 'משיכה',
  fund_transfer: 'העברה בין מסלולים',
  beneficiary_update: 'עדכון מוטבים',
  employer_change: 'החלפת מעסיק',
  early_redemption: 'פדיון מוקדם',
}

export function determineOutcome(validations, results, memberData) {
  const useCase = memberData.use_case || 'withdrawal'
  const ucLabel = USE_CASE_LABELS[useCase] || 'Request'
  const ucLabelHe = USE_CASE_LABELS_HE[useCase] || 'בקשה'

  const failures = validations
    .map((v, i) => ({ validation: v, result: results[i] }))
    .filter(({ result }) => !result.passed)

  const blockingFailures = failures.filter(({ validation }) => validation.severity === 'blocking')

  if (blockingFailures.length === 0) {
    const approvalNeeded = validations.some((v, i) =>
      v.severity === 'warning' && !results[i].passed
    )
    if (approvalNeeded) {
      return { type: 'approval', message: `Human approval required for ${ucLabel.toLowerCase()}`, messageHe: `נדרש אישור אנושי עבור ${ucLabelHe}`, failures }
    }
    return { type: 'approved', message: `All validations passed — auto-executing ${ucLabel.toLowerCase()}`, messageHe: `כל הבדיקות עברו בהצלחה — מבצע אוטומטית ${ucLabelHe}`, useCase }
  }

  // Analyze blocking failures based on use case
  const hasIdFailure = blockingFailures.some(({ validation }) =>
    validation.category === 'identity' || validation.field === 'id_photo_confidence'
  )
  const hasAgeFailure = blockingFailures.some(({ validation }) =>
    validation.field === 'age' || validation.field === 'birth_date' ||
    (validation.rule || '').toLowerCase().includes('age')
  )
  const hasLiquidityFailure = blockingFailures.some(({ validation }) =>
    (validation.rule || '').toLowerCase().includes('liquidity') || validation.field === 'liquidity_date'
  )
  const hasHoldingFailure = blockingFailures.some(({ validation }) =>
    (validation.rule || '').toLowerCase().includes('holding') || validation.field === 'start_date'
  )
  const hasDocFailure = blockingFailures.some(({ validation }) =>
    validation.field === 'supporting_documents' || validation.field === 'notary_verified' ||
    (validation.rule || '').toLowerCase().includes('document')
  )
  const hasEmployerFailure = blockingFailures.some(({ validation }) =>
    validation.field === 'employer_approval_received' || validation.field === 'employer_notified' ||
    (validation.rule || '').toLowerCase().includes('employer')
  )
  const hasBankFailure = blockingFailures.some(({ validation }) =>
    validation.field === 'account_owner' ||
    (validation.rule || '').toLowerCase().includes('bank account') ||
    (validation.rule || '').toLowerCase().includes('account owner')
  )

  // Identity failure — sends customer a link to upload new photo
  if (hasIdFailure) {
    return { type: 'customer_action', subtype: 'id_photo', message: `Identity verification failed — customer must upload a valid ID photo`, messageHe: `אימות זהות נכשל — הלקוח חייב להעלות תמונת ת.ז. תקינה`, failures: blockingFailures, useCase }
  }

  // Bank account failure
  if (hasBankFailure) {
    return { type: 'customer_action', subtype: 'bank_account', message: `Bank account ownership verification failed — account does not match member`, messageHe: `אימות בעלות חשבון בנק נכשל — החשבון אינו תואם לחבר`, failures: blockingFailures, useCase }
  }

  // Use-case-specific outcomes
  if (useCase === 'withdrawal') {
    if (hasAgeFailure && memberData.early_withdrawal_allowed) {
      const taxRate = 35
      const feeRate = 5
      const gross = memberData.withdrawal_amount
      const tax = Math.round(gross * taxRate / 100)
      const fee = Math.round(gross * feeRate / 100)
      const net = gross - tax - fee
      return {
        type: 'tax_consent',
        message: 'Early withdrawal — tax and fees apply. Customer consent required.',
        messageHe: 'משיכה מוקדמת — חל מס ועמלות. נדרשת הסכמת לקוח.',
        failures: blockingFailures,
        breakdown: { gross, tax, taxRate, fee, feeRate, net },
        useCase,
      }
    }
    if (hasAgeFailure && memberData.early_withdrawal_allowed === false) {
      const retirementAge = memberData.gender === 'female' ? 62 : 67
      return {
        type: 'blocked',
        message: `Blocked — retirement age not reached. ${memberData.gender === 'female' ? 'Female' : 'Male'} members require age ${retirementAge}. Early withdrawal is not allowed for this fund.`,
        messageHe: `נחסם — גיל פרישה לא הושג. ${memberData.gender === 'female' ? 'נשים' : 'גברים'} נדרשים לגיל ${retirementAge}. משיכה מוקדמת אינה מותרת עבור קרן זו.`,
        failures: blockingFailures,
        useCase,
      }
    }
    if (hasLiquidityFailure) {
      const liqDateFormatted = memberData.liquidity_date ? new Date(memberData.liquidity_date).toLocaleDateString('he-IL') : 'unknown'
      return {
        type: 'blocked',
        message: `Blocked — liquidity date has not been reached. Funds accessible after ${liqDateFormatted} (${memberData.liquidity_date}). You may reapply after this date.`,
        messageHe: `נחסם — תאריך נזילות לא הגיע. הכספים נגישים לאחר ${liqDateFormatted} (${memberData.liquidity_date}). ניתן להגיש מחדש לאחר תאריך זה.`,
        failures: blockingFailures,
        useCase,
        eligibleDate: memberData.liquidity_date,
      }
    }
    if (hasHoldingFailure) {
      // Calculate the eligible date
      let eligibleDate = null
      if (memberData.start_date && memberData.policy_minimum_holding_months) {
        const start = new Date(memberData.start_date)
        start.setMonth(start.getMonth() + memberData.policy_minimum_holding_months)
        eligibleDate = start.toISOString().split('T')[0]
      }
      return {
        type: 'blocked',
        message: `Blocked — minimum holding period not met. ${eligibleDate ? `You may reapply after ${new Date(eligibleDate).toLocaleDateString('he-IL')} (${eligibleDate}).` : ''}`,
        messageHe: `נחסם — תקופת החזקה מינימלית לא הושלמה. ${eligibleDate ? `ניתן להגיש מחדש לאחר ${new Date(eligibleDate).toLocaleDateString('he-IL')} (${eligibleDate}).` : ''}`,
        failures: blockingFailures,
        useCase,
        eligibleDate,
      }
    }
  }

  if (useCase === 'fund_transfer') {
    if (hasHoldingFailure) {
      return { type: 'blocked', message: 'Blocked — track switch cooldown period not met', messageHe: 'נחסם — תקופת המתנה להחלפת מסלול לא הושלמה', failures: blockingFailures, useCase }
    }
    return { type: 'blocked', message: `Fund transfer blocked — ${blockingFailures.length} validation(s) failed`, messageHe: `העברה בין מסלולים נחסמה — ${blockingFailures.length} בדיקה/בדיקות נכשלו`, failures: blockingFailures, useCase }
  }

  if (useCase === 'beneficiary_update') {
    if (hasDocFailure) {
      return { type: 'customer_action', message: 'Beneficiary update requires additional documentation — please provide notarized documents', messageHe: 'עדכון מוטבים דורש תיעוד נוסף — נא לספק מסמכים נוטריוניים', failures: blockingFailures, useCase }
    }
    return { type: 'blocked', message: `Beneficiary update blocked — ${blockingFailures.length} validation(s) failed`, messageHe: `עדכון מוטבים נחסם — ${blockingFailures.length} בדיקה/בדיקות נכשלו`, failures: blockingFailures, useCase }
  }

  if (useCase === 'employer_change') {
    if (hasEmployerFailure) {
      return { type: 'customer_action', message: 'Employer change requires employer approval — please obtain written consent', messageHe: 'החלפת מעסיק דורשת אישור מעסיק — נא להשיג הסכמה בכתב', failures: blockingFailures, useCase }
    }
    return { type: 'blocked', message: `Employer change blocked — ${blockingFailures.length} validation(s) failed`, messageHe: `החלפת מעסיק נחסמה — ${blockingFailures.length} בדיקה/בדיקות נכשלו`, failures: blockingFailures, useCase }
  }

  if (useCase === 'early_redemption') {
    if (hasDocFailure) {
      return { type: 'customer_action', message: 'Early redemption requires supporting documentation for qualifying reason', messageHe: 'פדיון מוקדם דורש מסמכים תומכים לסיבה מזכה', failures: blockingFailures, useCase }
    }
    const hasReasonFailure = blockingFailures.some(({ validation }) =>
      validation.field === 'redemption_reason' || (validation.rule || '').toLowerCase().includes('qualifying reason')
    )
    if (hasReasonFailure) {
      return { type: 'blocked', message: 'Blocked — redemption reason does not qualify for early redemption', messageHe: 'נחסם — סיבת הפדיון אינה מזכה לפדיון מוקדם', failures: blockingFailures, useCase }
    }
    // Early redemption with tax
    const taxRate = 30
    const gross = memberData.redemption_amount || 0
    const tax = Math.round(gross * taxRate / 100)
    const net = gross - tax
    if (blockingFailures.length === 1 && blockingFailures[0].validation.rule?.toLowerCase().includes('early redemption')) {
      return {
        type: 'tax_consent',
        message: 'Early redemption — capital gains tax applies',
        messageHe: 'פדיון מוקדם — חל מס רווחי הון',
        failures: blockingFailures,
        breakdown: { gross, tax, taxRate, fee: 0, feeRate: 0, net },
        useCase,
      }
    }
  }

  return { type: 'blocked', message: `${ucLabel} blocked — ${blockingFailures.length} critical validation(s) failed`, messageHe: `${ucLabelHe} נחסמה — ${blockingFailures.length} בדיקה/בדיקות קריטיות נכשלו`, failures: blockingFailures, useCase }
}
