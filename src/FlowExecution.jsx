import { useState } from 'react'
import FlowDiagram from './FlowDiagram'
import { useT, useLoc } from './i18n'

const CATEGORY_COLORS = {
  identity: 'bg-purple-500/20 text-purple-300',
  eligibility: 'bg-blue-500/20 text-blue-300',
  financial: 'bg-emerald-500/20 text-emerald-300',
  regulatory: 'bg-orange-500/20 text-orange-300',
  contract: 'bg-cyan-500/20 text-cyan-300',
}

const SEVERITY_ICONS = {
  blocking: '🔒',
  warning: '⚠️',
  info: 'ℹ️',
}

function Spinner() {
  return <span className="inline-block w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
}

function ValidationCard({ validation, status, result, index, onHitlClick }) {
  const t = useT()
  const loc = useLoc()
  const isPending = status === 'pending'
  const isExecuting = status === 'executing'
  const isHitlWaiting = status === 'hitl_waiting'
  const isDone = status === 'pass' || status === 'fail' || status === 'warning'

  const borderColor = isHitlWaiting ? 'border-warning animate-pulse-glow'
    : isExecuting ? 'border-accent animate-pulse-glow'
    : status === 'pass' ? 'border-success'
    : status === 'fail' ? 'border-error'
    : status === 'warning' ? 'border-warning'
    : 'border-border'

  const opacity = isPending ? 'opacity-50' : 'opacity-100'

  return (
    <div
      className={`bg-bg-primary rounded-lg border-2 ${borderColor} ${opacity} p-4 transition-all duration-300 ${isHitlWaiting ? 'cursor-pointer' : ''}`}
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={isHitlWaiting ? () => onHitlClick?.(index) : undefined}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isHitlWaiting ? (
            <span className="text-xs">👤</span>
          ) : (
            <span className="text-xs">{SEVERITY_ICONS[validation.severity] || 'ℹ️'}</span>
          )}
          <h4 className="text-sm font-semibold text-text-primary truncate">{loc(validation, 'name')}</h4>
          {validation.requires_hitl && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-warning/20 text-warning font-medium shrink-0">HITL</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 ms-2 shrink-0">
          {isExecuting && <Spinner />}
          {isHitlWaiting && <span className="text-warning text-lg">👤</span>}
          {status === 'pass' && <span className="text-success text-lg">✓</span>}
          {status === 'fail' && <span className="text-error text-lg">✗</span>}
          {status === 'warning' && <span className="text-warning text-lg">⚠</span>}
        </div>
      </div>

      {/* Category + Source */}
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[validation.category] || 'bg-border text-text-muted'}`}>
          {t(`cat.${validation.category}`, validation.category)}
        </span>
        {validation.source && (
          <span className="text-[10px] text-text-muted font-mono">{validation.source}</span>
        )}
      </div>

      {/* Description */}
      <p className="text-xs text-text-muted mb-2">{loc(validation, 'description')}</p>

      {/* HITL waiting state */}
      {isHitlWaiting && (
        <div className="mt-2 pt-2 border-t border-warning/30">
          <p className="text-xs text-warning font-semibold mb-1">{t('flow.requiresReview')}</p>
          {validation.hitl_reason && (
            <p className="text-[10px] text-text-muted mb-2">{loc(validation, 'hitl_reason')}</p>
          )}
          <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-warning bg-warning/10 px-2.5 py-1 rounded-full animate-pulse">
            <span>👤</span> {t('flow.clickToReview')}
          </div>
        </div>
      )}

      {/* Rule */}
      {!isHitlWaiting && validation.rule && (
        <div className="text-[10px] font-mono text-text-muted bg-bg-card rounded px-2 py-1 mb-2">
          {t('flow.rule')} {validation.rule}
        </div>
      )}

      {/* Result */}
      {isDone && result && (
        <div className={`text-xs mt-2 pt-2 border-t ${status === 'pass' ? 'border-success/30 text-success' : status === 'fail' ? 'border-error/30 text-error' : 'border-warning/30 text-warning'}`}>
          <div className="flex justify-between">
            <span>{t('flow.value')} {result.actual_value}</span>
          </div>
          <p className="mt-0.5 opacity-80">{loc(result, 'message')}</p>
        </div>
      )}

      {/* Executing label */}
      {isExecuting && (
        <div className="text-xs text-accent mt-2 pt-2 border-t border-accent/30">
          {t('flow.executing')}
        </div>
      )}
    </div>
  )
}

const OUTCOME_CONFIGS = {
  withdrawal: {
    approved: { icon: '✅', tKey: 'flow.outcome.withdrawalApproved' },
    blocked: { icon: '🚫', tKey: 'flow.outcome.withdrawalBlocked' },
    customer_action: { icon: '📋', tKey: 'flow.outcome.customerAction' },
    tax_consent: { icon: '💰', tKey: 'flow.outcome.earlyWithdrawalTax' },
  },
  fund_transfer: {
    approved: { icon: '✅', tKey: 'flow.outcome.fundTransferApproved' },
    blocked: { icon: '🚫', tKey: 'flow.outcome.fundTransferBlocked' },
    customer_action: { icon: '📋', tKey: 'flow.outcome.customerAction' },
    tax_consent: { icon: '💰', tKey: 'flow.outcome.transferFees' },
    approval: { icon: '👤', tKey: 'flow.outcome.transferApproval' },
  },
  beneficiary_update: {
    approved: { icon: '✅', tKey: 'flow.outcome.beneficiaryApproved' },
    blocked: { icon: '🚫', tKey: 'flow.outcome.beneficiaryBlocked' },
    customer_action: { icon: '📋', tKey: 'flow.outcome.docsRequired' },
    tax_consent: { icon: '💰', tKey: 'flow.outcome.transferFees' },
    approval: { icon: '👤', tKey: 'flow.outcome.beneficiaryApproved' },
  },
  employer_change: {
    approved: { icon: '✅', tKey: 'flow.outcome.employerApproved' },
    blocked: { icon: '🚫', tKey: 'flow.outcome.employerBlocked' },
    customer_action: { icon: '📋', tKey: 'flow.outcome.employerApprovalRequired' },
    tax_consent: { icon: '💰', tKey: 'flow.outcome.transferFees' },
    approval: { icon: '👤', tKey: 'flow.outcome.employerApproved' },
  },
  early_redemption: {
    approved: { icon: '✅', tKey: 'flow.outcome.earlyRedemptionApproved' },
    blocked: { icon: '🚫', tKey: 'flow.outcome.earlyRedemptionBlocked' },
    customer_action: { icon: '📋', tKey: 'flow.outcome.docsRequired' },
    tax_consent: { icon: '💰', tKey: 'flow.outcome.earlyRedemptionTax' },
    approval: { icon: '👤', tKey: 'flow.outcome.redemptionApproval' },
  },
}

const TYPE_STYLES = {
  approved: { border: 'border-success', bg: 'bg-success/10' },
  blocked: { border: 'border-error', bg: 'bg-error/10' },
  customer_action: { border: 'border-error', bg: 'bg-error/10' },
  tax_consent: { border: 'border-warning', bg: 'bg-warning/10' },
}

// Fund-type-specific SMS messages matching the reference use cases
function getSmsMessages(fundType, uc) {
  if (fundType === 'investment') {
    return {
      approved: (txnId, data) => `בקשת המשיכה מקופת הגמל להשקעה אושרה. סכום משיכה: ${data?.withdrawal_amount?.toLocaleString() || '—'} ₪ הכסף יועבר לחשבונך תוך 3 ימי עסקים. מספר אסמכתא: ${txnId}`,
      blocked_holding: (data) => `בקשת המשיכה מקופת הגמל להשקעה התקבלה, אך לא ניתן לבצע משיכה בשלב זה. על פי תנאי הפוליסה נדרש להחזיק את הכספים לפחות ${data?.policy_minimum_holding_months || 12} חודשים לפני משיכה.${data?.eligibleDate ? ` תוכל להגיש בקשה מחדש לאחר ${new Date(data.eligibleDate).toLocaleDateString('he-IL')}.` : ''}`,
      blocked: () => 'בקשת המשיכה מקופת הגמל להשקעה נדחתה. לפרטים נוספים אנא פנה/י לשירות הלקוחות.',
      customer_action_id: () => 'בקשת המשיכה שלך התקבלה, אך צילום תעודת הזהות אינו תקין. אנא העלה צילום ברור של תעודת הזהות כדי שנוכל להמשיך בטיפול. קישור: secure.insurer.co.il/upload-id',
      customer_action_bank: () => 'בקשת המשיכה שלך התקבלה, אך חשבון הבנק שהוזן אינו רשום על שמך. אנא עדכן את פרטי חשבון הבנק.',
    }
  }
  if (fundType === 'compensation') {
    return {
      approved: (txnId, data) => `בקשת המשיכה מקופת גמל לפיצויים אושרה. סכום ברוטו: ${data?.withdrawal_amount?.toLocaleString() || '—'} ₪ הכסף יועבר לחשבונך תוך 3 ימי עסקים. מספר אסמכתא: ${txnId}`,
      approved_early: (txnId, data) => `בקשת המשיכה מקופת גמל לפיצויים אושרה. סכום ברוטו: ${data?.breakdown?.gross?.toLocaleString() || '—'} ₪ מס ודמי משיכה: ${((data?.breakdown?.tax || 0) + (data?.breakdown?.fee || 0)).toLocaleString()} ₪ סכום נטו שיועבר: ${data?.breakdown?.net?.toLocaleString() || '—'} ₪`,
      blocked_age: (data) => `בקשת המשיכה מקופת גמל לפיצויים התקבלה, אך לא ניתן לבצע משיכה בשלב זה. על פי תקנות הקרן ניתן למשוך כספים רק לאחר גיל הפרישה. ${data?.gender === 'female' ? 'לנשים: גיל 62' : 'לגברים: גיל 67'}`,
      blocked: () => 'בקשת המשיכה מקופת גמל לפיצויים נדחתה. לפרטים נוספים אנא פנה/י לשירות הלקוחות.',
      customer_action_id: () => 'בקשת המשיכה שלך התקבלה, אך צילום תעודת הזהות אינו תקין. אנא העלה צילום ברור של תעודת הזהות כדי שנוכל להמשיך בטיפול. קישור: secure.insurer.co.il/upload-id',
      customer_action_bank: () => 'בקשת המשיכה שלך התקבלה, אך חשבון הבנק שהוזן אינו רשום על שמך. אנא עדכן את פרטי חשבון הבנק.',
      tax_consent: (data) => `בקשת המשיכה שלך מקופת גמל לפיצויים התקבלה. מאחר ולא הגעת לגיל פרישה, המשיכה כרוכה בתשלום מס ודמי משיכה מוקדמת. סכום המשיכה: ${data?.breakdown?.gross?.toLocaleString() || '—'} ₪ מס: ${data?.breakdown?.tax?.toLocaleString() || '—'} ₪ עמלה מיוחדת: ${data?.breakdown?.fee?.toLocaleString() || '—'} ₪ סכום נטו: ${data?.breakdown?.net?.toLocaleString() || '—'} ₪ האם לאשר את המשיכה?`,
    }
  }
  if (fundType === 'study') {
    return {
      approved: (txnId, data) => `בקשת המשיכה מקרן ההשתלמות אושרה. סכום המשיכה: ${data?.withdrawal_amount?.toLocaleString() || '—'} ₪ הכספים יועברו לחשבונך תוך 3 ימי עסקים. מספר אסמכתא: ${txnId}`,
      blocked_liquidity: (data) => `בקשת המשיכה מקרן ההשתלמות התקבלה. על פי תנאי הקרן ניתן למשוך כספים רק לאחר תאריך הנזילות: ${data?.liquidity_date ? new Date(data.liquidity_date).toLocaleDateString('he-IL') : '—'}. תוכל להגיש בקשה מחדש לאחר מועד זה.`,
      blocked: () => 'בקשת המשיכה מקרן ההשתלמות נדחתה. לפרטים נוספים אנא פנה/י לשירות הלקוחות.',
      customer_action_id: () => 'בקשת המשיכה שלך התקבלה, אך צילום תעודת הזהות אינו תקין. אנא העלה צילום ברור של תעודת הזהות כדי שנוכל להמשיך בטיפול. קישור: secure.insurer.co.il/upload-id',
      customer_action_bank: () => 'בקשת המשיכה שלך התקבלה, אך חשבון הבנק שהוזן אינו רשום על שמך. אנא עדכן את פרטי חשבון הבנק.',
    }
  }
  return {
    approved: (txnId) => `בקשתך אושרה ותטופל בתוך 3 ימי עסקים. מספר אסמכתא: ${txnId}`,
    blocked: () => 'בקשתך נדחתה. לפרטים נוספים אנא פנה/י לשירות הלקוחות.',
    customer_action_id: () => 'לא הצלחנו לאמת את זהותך באופן דיגיטלי. אנא העלה צילום ברור של תעודת הזהות. קישור: secure.insurer.co.il/upload-id',
    customer_action_bank: () => 'חשבון הבנק שהוזן אינו רשום על שמך. אנא עדכן את פרטי חשבון הבנק.',
  }
}

const USE_CASE_SMS = {
  fund_transfer: {
    approved: (txnId) => `בקשת ההעברה בין מסלולים אושרה ותתבצע בתוך 2 ימי עסקים. מספר אסמכתא: ${txnId}`,
    customer_action: () => 'לא הצלחנו לאמת את זהותך באופן דיגיטלי. אנ�� פנה/י לשירות הלקוחות להשלמת בקשת ההעברה.',
  },
  beneficiary_update: {
    approved: (txnId) => `עדכון המוטבים שלך אושר. השינויים ייכנסו לתוקף בתוך 14 ימי עסקים. מספר אסמכתא: ${txnId}`,
    customer_action: () => 'נדרשת הגשת מסמכים נוספים לצורך עדכון המוטבים. אנא פנה/י לשירות הלקוחות.',
  },
  employer_change: {
    approved: (txnId) => `בקשת החלפת המעסיק אושרה. העברת הכספים תתבצע בתוך 5 ימי עסקים. מספר אסמכתא: ${txnId}`,
    customer_action: () => 'נדרש אישור מהמעסיק הקודם להשלמת תהליך ההעברה. אנא פנה/י לשירות הלקוחות.',
  },
  early_redemption: {
    approved: (txnId) => `בקשת הפדיון המוקדם אושרה. הכספים יועברו לחשבונך בתוך 5 ימי עסקים. מספר אסמכתא: ${txnId}`,
    customer_action: () => 'נדרשת הגשת מסמכים תומכים לצורך פדיון מוקדם. אנא פנה/י לשירות הלקוחות.',
  },
}

const API_ENDPOINTS = {
  withdrawal: { investment: '/api/providentfund/withdraw', compensation: '/api/providentfund/withdraw', study: '/api/studyfund/withdraw' },
  fund_transfer: '/api/transfers/execute',
  beneficiary_update: '/api/beneficiaries/update',
  employer_change: '/api/employers/transfer',
  early_redemption: '/api/redemptions/execute',
}

function OutcomeCard({ outcome, onApprove, onReject, useCase, memberData }) {
  const t = useT()
  const loc = useLoc()
  if (!outcome) return null

  const uc = useCase || outcome.useCase || 'withdrawal'
  const fundType = memberData?.fund_type || 'investment'
  const ucConfigs = OUTCOME_CONFIGS[uc] || OUTCOME_CONFIGS.withdrawal
  const config = ucConfigs[outcome.type] || ucConfigs.blocked || { icon: '❓', tKey: 'flow.outcome.withdrawalBlocked' }
  const style = TYPE_STYLES[outcome.type] || TYPE_STYLES.blocked

  const txnId = `TXN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

  const fundSms = uc === 'withdrawal' ? getSmsMessages(fundType, uc) : null
  const ucSms = USE_CASE_SMS[uc] || null

  const endpoint = uc === 'withdrawal'
    ? (typeof API_ENDPOINTS.withdrawal === 'object' ? API_ENDPOINTS.withdrawal[fundType] : API_ENDPOINTS.withdrawal)
    : (API_ENDPOINTS[uc] || '/api/process/execute')

  function getSmsText() {
    if (uc === 'withdrawal' && fundSms) {
      if (outcome.type === 'approved') return fundSms.approved(txnId, memberData)
      if (outcome.type === 'customer_action') {
        if (outcome.subtype === 'bank_account' && fundSms.customer_action_bank) return fundSms.customer_action_bank()
        if (fundSms.customer_action_id) return fundSms.customer_action_id()
      }
      if (outcome.type === 'blocked') {
        if (outcome.message?.includes('holding period') && fundSms.blocked_holding) return fundSms.blocked_holding({ ...memberData, eligibleDate: outcome.eligibleDate })
        if (outcome.message?.includes('liquidity') && fundSms.blocked_liquidity) return fundSms.blocked_liquidity(memberData)
        if (outcome.message?.includes('retirement') && fundSms.blocked_age) return fundSms.blocked_age(memberData)
        return fundSms.blocked()
      }
      if (outcome.type === 'tax_consent' && fundSms.tax_consent) return fundSms.tax_consent({ ...memberData, breakdown: outcome.breakdown })
    }
    if (ucSms) {
      if (outcome.type === 'approved' && ucSms.approved) return ucSms.approved(txnId)
      if (outcome.type === 'customer_action' && ucSms.customer_action) return ucSms.customer_action()
    }
    return `בקשתך התקבלה. מספר אסמכתא: ${txnId}`
  }

  return (
    <div className={`${style.bg} border-2 ${style.border} rounded-xl p-5 animate-scale-in mt-4`}>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">{config.icon}</span>
        <h3 className="text-lg font-bold text-text-primary">{t(config.tKey)}</h3>
      </div>
      <p className="text-sm text-text-muted mb-4">{loc(outcome, 'message')}</p>

      {/* Eligible date for blocked outcomes */}
      {outcome.type === 'blocked' && outcome.eligibleDate && (
        <div className="bg-bg-primary rounded-lg p-3 mb-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-warning">📅</span>
            <span className="text-text-primary">{t('flow.eligibleDate')} <span className="font-mono text-accent">{outcome.eligibleDate}</span></span>
          </div>
        </div>
      )}

      {/* Tax breakdown */}
      {outcome.type === 'tax_consent' && outcome.breakdown && (
        <div className="bg-bg-primary rounded-lg p-4 mb-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">{t('flow.grossAmount')}</span>
            <span className="text-text-primary font-mono">₪{outcome.breakdown.gross.toLocaleString()}</span>
          </div>
          {outcome.breakdown.tax > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-error">
                {uc === 'early_redemption' ? t('flow.capitalGainsTax') : t('flow.incomeTax')} ({outcome.breakdown.taxRate}%)
              </span>
              <span className="text-error font-mono">-₪{outcome.breakdown.tax.toLocaleString()}</span>
            </div>
          )}
          {outcome.breakdown.fee > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-warning">{t('flow.earlyWithdrawalFee')} ({outcome.breakdown.feeRate}%)</span>
              <span className="text-warning font-mono">-₪{outcome.breakdown.fee.toLocaleString()}</span>
            </div>
          )}
          <hr className="border-border" />
          <div className="flex justify-between text-sm font-bold">
            <span className="text-success">{t('flow.netAmount')}</span>
            <span className="text-success font-mono">₪{outcome.breakdown.net.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Track allocation for study fund withdrawal */}
      {outcome.type === 'approved' && fundType === 'study' && uc === 'withdrawal' && memberData?.general_track_balance && memberData?.stock_track_balance && (
        <div className="bg-bg-primary rounded-lg p-4 mb-4 space-y-2">
          <p className="text-xs text-text-muted mb-2 uppercase tracking-wider font-medium">{t('flow.trackAllocation')}</p>
          {(() => {
            const total = memberData.general_track_balance + memberData.stock_track_balance
            const generalRatio = memberData.general_track_balance / total
            const stockRatio = memberData.stock_track_balance / total
            const amount = memberData.withdrawal_amount || 0
            const generalWithdraw = Math.round(amount * generalRatio)
            const stockWithdraw = Math.round(amount * stockRatio)
            return (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">{t('flow.totalBalance')}</span>
                  <span className="text-text-primary font-mono">₪{total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-300">{t('flow.generalTrack')} ({Math.round(generalRatio * 100)}%)</span>
                  <span className="text-blue-300 font-mono">₪{generalWithdraw.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-purple-300">{t('flow.stockTrack')} ({Math.round(stockRatio * 100)}%)</span>
                  <span className="text-purple-300 font-mono">₪{stockWithdraw.toLocaleString()}</span>
                </div>
                <hr className="border-border" />
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-success">{t('flow.totalWithdrawal')}</span>
                  <span className="text-success font-mono">₪{amount.toLocaleString()}</span>
                </div>
              </>
            )
          })()}
        </div>
      )}

      {/* Approved — show execution mock */}
      {outcome.type === 'approved' && (
        <div className="space-y-2 text-xs">
          <div className="bg-bg-primary rounded-lg p-3 font-mono text-success">
            <p>→ POST {endpoint}</p>
            {fundType === 'study' && uc === 'withdrawal' && memberData?.general_track_balance && memberData?.stock_track_balance && (() => {
              const total = memberData.general_track_balance + memberData.stock_track_balance
              const generalRatio = memberData.general_track_balance / total
              const stockRatio = memberData.stock_track_balance / total
              const amount = memberData.withdrawal_amount || 0
              return (
                <pre className="text-text-muted mt-1 whitespace-pre-wrap">{`{
  "account_number": "${memberData.account_number}",
  "withdraw_amount": ${amount},
  "general_track_withdrawal": ${Math.round(amount * generalRatio)},
  "stock_track_withdrawal": ${Math.round(amount * stockRatio)}
}`}</pre>
              )
            })()}
            <p className="text-text-muted mt-1">{t('flow.txnConfirmed')}</p>
          </div>
          <div className="bg-bg-primary rounded-lg p-3">
            <p className="text-text-muted mb-1">{t('flow.smsSent')}</p>
            <p className="text-text-primary" dir="rtl">{getSmsText()}</p>
          </div>
        </div>
      )}

      {/* Customer action */}
      {outcome.type === 'customer_action' && (
        <div className="space-y-2 text-xs">
          <div className="bg-bg-primary rounded-lg p-3">
            <p className="text-text-muted mb-1">{t('flow.smsSent')}</p>
            <p className="text-text-primary" dir="rtl">{getSmsText()}</p>
          </div>
          {outcome.subtype === 'id_photo' && (
            <div className="bg-bg-primary rounded-lg p-3">
              <p className="text-text-muted mb-1">{t('flow.emailSent')}</p>
              <ul className="text-text-muted space-y-0.5 list-disc list-inside">
                <li>{t('flow.photoGuidelines')}</li>
                <li>{t('flow.secureUploadLink')} <span className="text-accent font-mono">secure.insurer.co.il/upload-id</span></li>
                <li>{t('flow.futureTrigger')}</li>
              </ul>
            </div>
          )}
          <div className="bg-bg-primary rounded-lg p-3 font-mono text-warning">
            <p>{t('flow.awaitingDocs')}</p>
            <p className="text-text-muted mt-1">{t('flow.processCompleted')}</p>
          </div>
        </div>
      )}

      {/* Blocked */}
      {outcome.type === 'blocked' && (
        <div className="bg-bg-primary rounded-lg p-3 text-xs">
          <p className="text-text-muted mb-1">{t('flow.notificationSent')}</p>
          <p className="text-text-primary" dir="rtl">{getSmsText()}</p>
        </div>
      )}

      {/* Tax consent */}
      {outcome.type === 'tax_consent' && (
        <div className="bg-bg-primary rounded-lg p-3 text-xs mb-4">
          <p className="text-text-muted mb-1">{t('flow.consentMessage')}</p>
          <p className="text-text-primary" dir="rtl">{getSmsText()}</p>
        </div>
      )}

      {/* Action buttons */}
      {outcome.type === 'tax_consent' && (
        <div className="flex gap-3 mt-4">
          <button
            onClick={onApprove}
            className="flex-1 bg-success hover:bg-success/80 text-bg-primary font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors"
          >
            {t('flow.acceptProceed')}
          </button>
          <button
            onClick={onReject}
            className="flex-1 bg-error hover:bg-error/80 text-bg-primary font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors"
          >
            {t('flow.cancel')}
          </button>
        </div>
      )}
    </div>
  )
}

function AnalysisMessages({ messages }) {
  const loc = useLoc()
  return (
    <div className="space-y-2 mb-4">
      {messages.map((msg, i) => (
        <div key={i} className="flex items-center gap-2 text-sm animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
          <span>{msg.icon}</span>
          <span className={msg.done ? 'text-text-primary' : 'text-text-muted'}>{loc(msg, 'text')}</span>
          {!msg.done && <Spinner />}
        </div>
      ))}
    </div>
  )
}

export default function FlowExecution({ analysisMessages, validations, validationStatuses, validationResults, outcome, onApprove, onReject, useCase, memberData, onHitlCardClick }) {
  const [viewMode, setViewMode] = useState('cards')
  const t = useT()

  if (!analysisMessages && !validations) {
    return (
      <div className="bg-bg-card rounded-xl border border-border p-12 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3 opacity-50">⚡</div>
          <p className="text-text-muted text-sm">{t('flow.emptyState')}</p>
        </div>
      </div>
    )
  }

  const hasValidations = validations && validations.length > 0

  return (
    <div className="bg-bg-card rounded-xl border border-border p-5">
      {/* Header with view toggle */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-accent uppercase tracking-wider">{t('flow.title')}</h3>

        {hasValidations && (
          <div className="flex rounded-lg overflow-hidden border border-border">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors ${
                viewMode === 'cards'
                  ? 'bg-accent text-bg-primary'
                  : 'bg-bg-primary text-text-muted hover:text-text-primary hover:bg-bg-card-hover'
              }`}
            >
              <span>📋</span> {t('flow.cardsView')}
            </button>
            <button
              onClick={() => setViewMode('diagram')}
              className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors border-s border-border ${
                viewMode === 'diagram'
                  ? 'bg-accent text-bg-primary'
                  : 'bg-bg-primary text-text-muted hover:text-text-primary hover:bg-bg-card-hover'
              }`}
            >
              <span>🔀</span> {t('flow.diagramView')}
            </button>
          </div>
        )}
      </div>

      {/* Analysis messages */}
      {analysisMessages && analysisMessages.length > 0 && (
        <AnalysisMessages messages={analysisMessages} />
      )}

      {/* Cards view */}
      {viewMode === 'cards' && hasValidations && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-4">
          {validations.map((v, i) => (
            <ValidationCard
              key={v.id || i}
              validation={v}
              status={validationStatuses?.[i] || 'pending'}
              result={validationResults?.[i]}
              index={i}
              onHitlClick={onHitlCardClick}
            />
          ))}
        </div>
      )}

      {/* Flow diagram view */}
      {viewMode === 'diagram' && hasValidations && (
        <div className="mt-4">
          <FlowDiagram
            validations={validations}
            validationStatuses={validationStatuses}
            validationResults={validationResults}
            outcome={outcome}
            memberData={memberData}
            onHitlNodeClick={onHitlCardClick}
          />
        </div>
      )}

      {/* Outcome */}
      <OutcomeCard outcome={outcome} onApprove={onApprove} onReject={onReject} useCase={useCase} memberData={memberData} />
    </div>
  )
}
