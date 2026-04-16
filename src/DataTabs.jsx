import { useState } from 'react'
import { useT, useLoc, useI18n } from './i18n'

const USE_CASE_BADGES = {
  withdrawal: { label: 'Withdrawal', labelHe: 'משיכה', color: 'bg-amber-500/20 text-amber-300' },
  fund_transfer: { label: 'Fund Transfer', labelHe: 'העברה בין מסלולים', color: 'bg-blue-500/20 text-blue-300' },
  beneficiary_update: { label: 'Beneficiary Update', labelHe: 'עדכון מוטבים', color: 'bg-purple-500/20 text-purple-300' },
  employer_change: { label: 'Employer Change', labelHe: 'החלפת מעסיק', color: 'bg-emerald-500/20 text-emerald-300' },
  early_redemption: { label: 'Early Redemption', labelHe: 'פדיון מוקדם', color: 'bg-red-500/20 text-red-300' },
}

function InputField({ label, value, onChange, type = 'text' }) {
  return (
    <div>
      <label className="block text-xs text-text-muted mb-1">{label}</label>
      <input
        type={type}
        value={value === undefined || value === null ? (type === 'number' ? 0 : '') : value}
        onChange={e => onChange(type === 'number' ? (e.target.value === '' ? 0 : Number(e.target.value)) : e.target.value)}
        className="w-full bg-bg-primary border border-border rounded px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
      />
    </div>
  )
}

function BeneficiaryList({ label, beneficiaries }) {
  if (!beneficiaries || beneficiaries.length === 0) return null
  return (
    <div className="col-span-2">
      <label className="block text-xs text-text-muted mb-2">{label}</label>
      <div className="space-y-1.5">
        {beneficiaries.map((b, i) => (
          <div key={i} className="bg-bg-primary rounded px-3 py-2 text-xs flex items-center justify-between border border-border/50">
            <span className="text-text-primary">{b.name} <span className="text-text-muted">({b.relation})</span></span>
            <span className="text-accent font-mono">{b.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function getFieldsForUseCase(memberData) {
  const fundType = memberData?.fund_type
  const useCase = memberData?.use_case || 'withdrawal'

  // Common fund-level fields
  const fundFields = {
    investment: [['dataTabs.balance', 'balance', 'number']],
    compensation: [
      ['dataTabs.gender', 'gender'],
      ['dataTabs.employer', 'employer'],
      ['dataTabs.balance', 'balance', 'number'],
    ],
    study: [
      ['dataTabs.generalTrackBalance', 'general_track_balance', 'number'],
      ['dataTabs.stockTrackBalance', 'stock_track_balance', 'number'],
      ['dataTabs.totalBalance', 'total_balance', 'number'],
    ],
  }

  // Use-case-specific fields
  const useCaseFields = {
    // Investment
    investment_withdrawal: [
      ['dataTabs.withdrawalAmount', 'withdrawal_amount', 'number'],
      ['dataTabs.startDate', 'start_date', 'date'],
      ['dataTabs.minHoldingMonths', 'policy_minimum_holding_months', 'number'],
    ],
    investment_fund_transfer: [
      ['dataTabs.sourceTrack', 'source_track'],
      ['dataTabs.targetTrack', 'target_track'],
      ['dataTabs.sourceTrackBalance', 'source_track_balance', 'number'],
      ['dataTabs.transferAmount', 'transfer_amount', 'number'],
      ['dataTabs.transferPercentage', 'transfer_percentage', 'number'],
    ],
    investment_beneficiary_update: [
      ['dataTabs.changeReason', 'change_reason'],
      ['dataTabs.notaryVerified', 'notary_verified'],
      ['dataTabs.consentObtained', 'beneficiary_consent_obtained'],
    ],

    // Compensation
    compensation_withdrawal: [
      ['dataTabs.withdrawalAmount', 'withdrawal_amount', 'number'],
      ['dataTabs.earlyWithdrawalAllowed', 'early_withdrawal_allowed'],
    ],
    compensation_employer_change: [
      ['dataTabs.currentEmployer', 'current_employer'],
      ['dataTabs.newEmployer', 'new_employer'],
      ['dataTabs.employmentEndDate', 'employment_end_date', 'date'],
      ['dataTabs.newEmploymentStartDate', 'new_employment_start_date', 'date'],
      ['dataTabs.transferBalance', 'transfer_balance', 'number'],
      ['dataTabs.gapDays', 'gap_days', 'number'],
      ['dataTabs.severanceIncluded', 'severance_included'],
      ['dataTabs.employerApproval', 'employer_approval_received'],
      ['dataTabs.continuousEmployment', 'continuous_employment'],
    ],
    compensation_beneficiary_update: [
      ['dataTabs.changeReason', 'change_reason'],
      ['dataTabs.notaryVerified', 'notary_verified'],
      ['dataTabs.consentObtained', 'beneficiary_consent_obtained'],
      ['dataTabs.employerNotified', 'employer_notified'],
    ],

    // Study
    study_withdrawal: [
      ['dataTabs.withdrawalAmount', 'withdrawal_amount', 'number'],
      ['dataTabs.liquidityDate', 'liquidity_date', 'date'],
    ],
    study_fund_transfer: [
      ['dataTabs.currentGeneralTrack', 'current_general_pct', 'number'],
      ['dataTabs.currentStockTrack', 'current_stock_pct', 'number'],
      ['dataTabs.targetGeneralTrack', 'target_general_pct', 'number'],
      ['dataTabs.targetStockTrack', 'target_stock_pct', 'number'],
      ['dataTabs.rebalanceAmount', 'rebalance_amount', 'number'],
      ['dataTabs.rebalanceDirection', 'rebalance_direction'],
    ],
    study_early_redemption: [
      ['dataTabs.redemptionAmount', 'redemption_amount', 'number'],
      ['dataTabs.redemptionReason', 'redemption_reason'],
      ['dataTabs.supportingDocuments', 'supporting_documents'],
      ['dataTabs.taxAware', 'tax_aware'],
      ['dataTabs.employerNotified', 'employer_notified'],
      ['dataTabs.liquidityDate', 'liquidity_date', 'date'],
    ],
  }

  const key = `${fundType}_${useCase}`
  return {
    fundFields: fundFields[fundType] || [],
    useCaseFields: useCaseFields[key] || [],
  }
}

function InputDataTab({ memberData, setMemberData }) {
  const t = useT()

  if (!memberData) return <EmptyState text={t('dataTabs.generateToSeeContract')} />

  const update = (field, value) => setMemberData(prev => ({ ...prev, [field]: value }))

  const commonFields = [
    ['dataTabs.memberId', 'member_id'],
    ['dataTabs.memberName', 'member_name'],
    ['dataTabs.birthDate', 'birth_date', 'date'],
    ['dataTabs.phone', 'phone'],
    ['dataTabs.email', 'email'],
    ['dataTabs.accountNumber', 'account_number'],
    ['dataTabs.accountOwner', 'account_owner'],
    ['dataTabs.idPhotoConfidence', 'id_photo_confidence', 'number'],
  ]

  const { fundFields, useCaseFields } = getFieldsForUseCase(memberData)
  const ucBadge = USE_CASE_BADGES[memberData.use_case] || USE_CASE_BADGES.withdrawal

  const booleanFields = ['early_withdrawal_allowed', 'notary_verified', 'beneficiary_consent_obtained',
    'employer_approval_received', 'employer_notified', 'continuous_employment', 'severance_included',
    'supporting_documents', 'tax_aware']

  // Use case data section header key
  const ucDataKeys = {
    withdrawal: 'dataTabs.withdrawalData',
    fund_transfer: 'dataTabs.fundTransferData',
    beneficiary_update: 'dataTabs.beneficiaryData',
    employer_change: 'dataTabs.employerData',
    early_redemption: 'dataTabs.earlyRedemptionData',
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent font-medium">
          {memberData.fund_type_he}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ucBadge.color}`}>
          {ucBadge.labelHe} — {ucBadge.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {commonFields.map(([labelKey, field, type]) => (
          <InputField
            key={field}
            label={t(labelKey)}
            value={memberData[field]}
            onChange={v => update(field, v)}
            type={type}
          />
        ))}
      </div>

      <hr className="border-border" />
      <h4 className="text-xs text-text-muted uppercase tracking-wider">{t('dataTabs.fundData')}</h4>

      <div className="grid grid-cols-2 gap-3">
        {fundFields.map(([labelKey, field, type]) => (
          <InputField key={field} label={t(labelKey)} value={memberData[field]} onChange={v => update(field, v)} type={type} />
        ))}
      </div>

      <hr className="border-border" />
      <h4 className="text-xs text-text-muted uppercase tracking-wider">{t(ucDataKeys[memberData.use_case] || 'dataTabs.withdrawalData')}</h4>

      <div className="grid grid-cols-2 gap-3">
        {useCaseFields.map(([labelKey, field, type]) => {
          if (booleanFields.includes(field)) {
            return (
              <div key={field}>
                <label className="block text-xs text-text-muted mb-1">{t(labelKey)}</label>
                <select
                  value={String(memberData[field])}
                  onChange={e => update(field, e.target.value === 'true')}
                  className="w-full bg-bg-primary border border-border rounded px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
                >
                  <option value="true">{t('dataTabs.yes')}</option>
                  <option value="false">{t('dataTabs.no')}</option>
                </select>
              </div>
            )
          }
          return (
            <InputField key={field} label={t(labelKey)} value={memberData[field]} onChange={v => update(field, v)} type={type} />
          )
        })}
      </div>

      {/* Beneficiary lists */}
      {memberData.current_beneficiaries && (
        <BeneficiaryList label={t('dataTabs.currentBeneficiaries')} beneficiaries={memberData.current_beneficiaries} />
      )}
      {memberData.new_beneficiaries && (
        <BeneficiaryList label={t('dataTabs.newBeneficiaries')} beneficiaries={memberData.new_beneficiaries} />
      )}
    </div>
  )
}

const CONSEQUENCE_COLORS = {
  block: 'bg-error/20 text-error',
  require_approval: 'bg-warning/20 text-warning',
  require_hitl: 'bg-purple-500/20 text-purple-400',
  apply_fee: 'bg-amber-500/20 text-amber-300',
  notify: 'bg-blue-500/20 text-blue-400',
}

const CATEGORY_COLORS = {
  eligibility: 'bg-cyan-500/20 text-cyan-300',
  financial: 'bg-emerald-500/20 text-emerald-300',
  processing: 'bg-blue-500/20 text-blue-300',
  withdrawal: 'bg-amber-500/20 text-amber-300',
  sla: 'bg-purple-500/20 text-purple-300',
  penalties: 'bg-red-500/20 text-red-300',
}

function parseConditionValue(currentValue, newRaw) {
  if (typeof currentValue === 'boolean') return newRaw === 'true'
  if (typeof currentValue === 'number') return newRaw === '' ? 0 : Number(newRaw)
  return newRaw
}

const OPERATORS = ['==', '!=', '>=', '<=', '>', '<']

function ContractTab({ contract, setContract }) {
  const t = useT()
  const loc = useLoc()
  const { lang } = useI18n()
  const lk = (field) => lang === 'he' ? field + 'He' : field
  if (!contract) return <EmptyState text={t('dataTabs.generateToSeeContract')} />

  const updateClause = (index, field, value) => {
    setContract(prev => ({
      ...prev,
      clauses: prev.clauses.map((c, i) => i === index ? { ...c, [field]: value } : c),
    }))
  }

  const updateCondition = (clauseIndex, condIndex, key, value) => {
    setContract(prev => ({
      ...prev,
      clauses: prev.clauses.map((c, i) => {
        if (i !== clauseIndex) return c
        const newConditions = c.conditions.map((cond, j) =>
          j === condIndex ? { ...cond, [key]: key === 'value' ? parseConditionValue(cond.value, value) : value } : cond
        )
        return { ...c, conditions: newConditions }
      }),
    }))
  }

  const removeCondition = (clauseIndex, condIndex) => {
    setContract(prev => ({
      ...prev,
      clauses: prev.clauses.map((c, i) => {
        if (i !== clauseIndex) return c
        return { ...c, conditions: c.conditions.filter((_, j) => j !== condIndex) }
      }),
    }))
  }

  const addCondition = (clauseIndex) => {
    setContract(prev => ({
      ...prev,
      clauses: prev.clauses.map((c, i) => {
        if (i !== clauseIndex) return c
        return { ...c, conditions: [...(c.conditions || []), { field: '', operator: '==', value: '' }] }
      }),
    }))
  }

  const removeClause = (index) => {
    setContract(prev => ({
      ...prev,
      clauses: prev.clauses.filter((_, i) => i !== index),
    }))
  }

  const addClause = () => {
    const nextNum = contract.clauses.length + 1
    setContract(prev => ({
      ...prev,
      clauses: [...prev.clauses, {
        clause_id: `CL-NEW-${nextNum}`,
        category: 'processing',
        title: t('dataTabs.newClauseTitle'),
        titleHe: t('dataTabs.newClauseTitle'),
        description: '',
        descriptionHe: '',
        conditions: [],
        consequence: 'block',
      }],
    }))
  }

  return (
    <div className="space-y-3 animate-fade-in-up">
      {/* Contract header */}
      <div className="bg-bg-primary rounded-lg border border-border p-3">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          <div><span className="text-text-muted">{t('dataTabs.contractId')}</span> <span className="font-mono text-accent">{contract.contract_id}</span></div>
          <div><span className="text-text-muted">{t('dataTabs.customer')}</span> <span className="text-text-primary">{loc(contract, 'customer_name')}</span></div>
          <div><span className="text-text-muted">{t('dataTabs.insuranceCompany')}</span> <span className="text-text-primary">{contract.insurance_company}</span></div>
          <div><span className="text-text-muted">{t('dataTabs.fundTypeLabel')}</span> <span className="text-text-primary">{contract.fund_type}</span></div>
          <div><span className="text-text-muted">{t('dataTabs.effective')}</span> <span className="text-text-primary">{contract.effective_date}</span></div>
          <div><span className="text-text-muted">{t('dataTabs.expires')}</span> <span className="text-text-primary">{contract.expiry_date}</span></div>
        </div>
      </div>

      <h4 className="text-xs text-text-muted uppercase tracking-wider">{t('dataTabs.contractTerms')} ({contract.clauses.length} {t('dataTabs.clauses')})</h4>

      {contract.clauses.map((clause, i) => (
        <div key={i} className="bg-bg-primary rounded-lg border border-border p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <input
                value={clause.clause_id}
                onChange={e => updateClause(i, 'clause_id', e.target.value)}
                className="w-20 text-xs font-mono text-accent bg-accent/10 px-2 py-0.5 rounded border border-transparent focus:border-accent focus:outline-none"
              />
              <select
                value={clause.category || 'processing'}
                onChange={e => updateClause(i, 'category', e.target.value)}
                className={`text-[10px] px-1.5 py-0.5 rounded border-0 focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer ${CATEGORY_COLORS[clause.category] || 'bg-bg-card text-text-muted'}`}
              >
                {['eligibility', 'financial', 'processing', 'withdrawal', 'sla', 'penalties'].map(cat => (
                  <option key={cat} value={cat}>{t(`cat.${cat}`, cat)}</option>
                ))}
              </select>
              <select
                value={clause.consequence || 'block'}
                onChange={e => updateClause(i, 'consequence', e.target.value)}
                className={`text-[10px] px-1.5 py-0.5 rounded border-0 focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer ${CONSEQUENCE_COLORS[clause.consequence] || 'bg-warning/20 text-warning'}`}
              >
                {['block', 'require_approval', 'require_hitl', 'apply_fee', 'notify'].map(con => (
                  <option key={con} value={con}>{t(`consequence.${con}`, con)}</option>
                ))}
              </select>
            </div>
            <button onClick={() => removeClause(i)} className="text-text-muted hover:text-error text-xs">✕</button>
          </div>
          <input
            value={loc(clause, 'title') || ''}
            onChange={e => updateClause(i, lk('title'), e.target.value)}
            placeholder={t('dataTabs.newClauseTitle')}
            className="w-full bg-transparent text-sm font-semibold text-text-primary mb-1 focus:outline-none border-b border-transparent focus:border-accent"
          />
          <textarea
            value={loc(clause, 'description') || ''}
            onChange={e => updateClause(i, lk('description'), e.target.value)}
            placeholder={t('dataTabs.newClauseDesc')}
            rows={2}
            className="w-full bg-transparent text-xs text-text-muted mt-1 focus:outline-none resize-none border-b border-transparent focus:border-accent"
          />
          {clause.conditions && clause.conditions.length > 0 && (
            <div className="mt-2 space-y-1">
              {clause.conditions.map((c, j) => (
                <div key={j} className="flex items-center gap-1 text-[10px] font-mono">
                  <input
                    value={c.field}
                    onChange={e => updateCondition(i, j, 'field', e.target.value)}
                    className="w-36 bg-bg-card text-text-muted rounded px-1.5 py-0.5 border border-transparent focus:border-accent focus:outline-none"
                    placeholder="field"
                  />
                  <select
                    value={c.operator}
                    onChange={e => updateCondition(i, j, 'operator', e.target.value)}
                    className="bg-bg-card text-accent rounded px-1 py-0.5 border border-transparent focus:border-accent focus:outline-none cursor-pointer"
                  >
                    {OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
                  </select>
                  <input
                    value={typeof c.value === 'boolean' ? String(c.value) : c.value}
                    onChange={e => updateCondition(i, j, 'value', e.target.value)}
                    className="w-24 bg-bg-card text-text-muted rounded px-1.5 py-0.5 border border-transparent focus:border-accent focus:outline-none"
                    placeholder="value"
                  />
                  <button onClick={() => removeCondition(i, j)} className="text-text-muted hover:text-error px-1">✕</button>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => addCondition(i)}
            className="mt-1.5 text-[10px] text-accent hover:text-accent/80 transition-colors flex items-center gap-1"
          >
            <span>+</span> {t('dataTabs.addCondition')}
          </button>
        </div>
      ))}

      <button
        onClick={addClause}
        className="w-full py-2.5 rounded-lg border border-dashed border-accent/40 text-accent text-xs font-medium hover:bg-accent/5 transition-colors flex items-center justify-center gap-1.5"
      >
        <span className="text-sm">+</span> {t('dataTabs.addClause')}
      </button>
    </div>
  )
}

function RegulationsTab({ regulations, setRegulations }) {
  const t = useT()
  const loc = useLoc()
  const { lang } = useI18n()
  const lk = (field) => lang === 'he' ? field + 'He' : field
  if (!regulations || regulations.length === 0) return <EmptyState text={t('dataTabs.generateToSeeRegulations')} />

  const updateReg = (index, field, value) => {
    setRegulations(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r))
  }

  const updateRequirement = (regIndex, reqIndex, value) => {
    const reqField = lk('requirements')
    setRegulations(prev => prev.map((r, i) => {
      if (i !== regIndex) return r
      const reqs = r[reqField] || r.requirements
      const newReqs = [...reqs]
      newReqs[reqIndex] = value
      return { ...r, [reqField]: newReqs }
    }))
  }

  const removeRegulation = (index) => {
    setRegulations(prev => prev.filter((_, i) => i !== index))
  }

  const addRegulation = () => {
    const nextNum = regulations.length + 1
    const today = new Date().toISOString().split('T')[0]
    setRegulations(prev => [...prev, {
      regulation_id: `REG-NEW-${nextNum}`,
      authority: 'Custom',
      authorityHe: 'מותאם אישית',
      title: t('dataTabs.newRegTitle'),
      titleHe: t('dataTabs.newRegTitle'),
      requirements: [''],
      requirementsHe: [''],
      effective_date: today,
    }])
  }

  const addRequirement = (regIndex) => {
    setRegulations(prev => prev.map((r, i) => {
      if (i !== regIndex) return r
      return {
        ...r,
        requirements: [...r.requirements, ''],
        ...(r.requirementsHe ? { requirementsHe: [...r.requirementsHe, ''] } : {}),
      }
    }))
  }

  return (
    <div className="space-y-3 animate-fade-in-up">
      {regulations.map((reg, i) => (
        <div key={i} className="bg-bg-primary rounded-lg border border-border p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <input
                value={reg.regulation_id}
                onChange={e => updateReg(i, 'regulation_id', e.target.value)}
                className="w-28 text-xs font-mono text-accent bg-accent/10 px-2 py-0.5 rounded border border-transparent focus:border-accent focus:outline-none"
              />
              <input
                value={loc(reg, 'authority') || ''}
                onChange={e => updateReg(i, lk('authority'), e.target.value)}
                className="w-36 text-xs text-text-muted bg-transparent border-b border-transparent focus:border-accent focus:outline-none"
              />
            </div>
            <button onClick={() => removeRegulation(i)} className="text-text-muted hover:text-error text-xs">✕</button>
          </div>
          <input
            value={loc(reg, 'title') || ''}
            onChange={e => updateReg(i, lk('title'), e.target.value)}
            placeholder={t('dataTabs.newRegTitle')}
            className="w-full bg-transparent text-sm font-semibold text-text-primary mb-2 focus:outline-none border-b border-transparent focus:border-accent"
          />
          <div className="space-y-1">
            {(loc(reg, 'requirements') || reg.requirements).map((req, j) => (
              <textarea
                key={j}
                value={req || ''}
                onChange={e => updateRequirement(i, j, e.target.value)}
                placeholder={t('dataTabs.newRegRequirement')}
                rows={2}
                className="w-full bg-bg-card text-xs text-text-muted rounded px-2 py-1.5 focus:outline-none resize-none focus:border-accent border border-transparent"
              />
            ))}
          </div>
          <button
            onClick={() => addRequirement(i)}
            className="mt-1.5 text-[10px] text-accent hover:text-accent/80 transition-colors flex items-center gap-1"
          >
            <span>+</span> {t('dataTabs.addRequirement')}
          </button>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-text-muted">
            <span>{t('dataTabs.effective')}</span>
            <input
              type="date"
              value={reg.effective_date || ''}
              onChange={e => updateReg(i, 'effective_date', e.target.value)}
              className="bg-transparent text-text-muted text-[10px] border-b border-transparent focus:border-accent focus:outline-none"
            />
          </div>
        </div>
      ))}

      <button
        onClick={addRegulation}
        className="w-full py-2.5 rounded-lg border border-dashed border-accent/40 text-accent text-xs font-medium hover:bg-accent/5 transition-colors flex items-center justify-center gap-1.5"
      >
        <span className="text-sm">+</span> {t('dataTabs.addRegulation')}
      </button>
    </div>
  )
}

function EmptyState({ text }) {
  return (
    <div className="flex items-center justify-center py-16 text-text-muted text-sm italic">
      {text}
    </div>
  )
}

export default function DataTabs({ memberData, setMemberData, contract, setContract, regulations, setRegulations }) {
  const [activeTab, setActiveTab] = useState('input')
  const t = useT()

  const TABS = [
    { id: 'input', label: t('dataTabs.inputData') },
    { id: 'policies', label: t('dataTabs.contract') },
    { id: 'regulations', label: t('dataTabs.regulations') },
  ]

  return (
    <div className="bg-bg-card rounded-xl border border-border overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-border">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
              activeTab === tab.id
                ? 'text-accent'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {tab.label}
            {tab.id === 'policies' && contract?.clauses?.length > 0 && (
              <span className="ms-1.5 text-[10px] bg-accent/20 text-accent px-1.5 rounded-full">{contract.clauses.length}</span>
            )}
            {tab.id === 'regulations' && regulations?.length > 0 && (
              <span className="ms-1.5 text-[10px] bg-accent/20 text-accent px-1.5 rounded-full">{regulations.length}</span>
            )}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-4 max-h-[calc(100vh-14rem)] overflow-y-auto">
        {activeTab === 'input' && <InputDataTab memberData={memberData} setMemberData={setMemberData} />}
        {activeTab === 'policies' && <ContractTab contract={contract} setContract={setContract} />}
        {activeTab === 'regulations' && <RegulationsTab regulations={regulations} setRegulations={setRegulations} />}
      </div>
    </div>
  )
}
