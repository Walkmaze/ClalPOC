import { useState } from 'react'

const TABS = [
  { id: 'input', label: 'Input Data' },
  { id: 'policies', label: 'Customer Contract' },
  { id: 'regulations', label: 'Regulations' },
]

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
    investment: [['Balance (₪)', 'balance', 'number']],
    compensation: [
      ['Gender', 'gender'],
      ['Employer', 'employer'],
      ['Balance (₪)', 'balance', 'number'],
    ],
    study: [
      ['General Track Balance (₪)', 'general_track_balance', 'number'],
      ['Stock Track Balance (₪)', 'stock_track_balance', 'number'],
      ['Total Balance (₪)', 'total_balance', 'number'],
    ],
  }

  // Use-case-specific fields
  const useCaseFields = {
    // Investment
    investment_withdrawal: [
      ['Withdrawal Amount (₪)', 'withdrawal_amount', 'number'],
      ['Start Date', 'start_date', 'date'],
      ['Min Holding Months', 'policy_minimum_holding_months', 'number'],
    ],
    investment_fund_transfer: [
      ['Source Track', 'source_track'],
      ['Target Track', 'target_track'],
      ['Source Track Balance (₪)', 'source_track_balance', 'number'],
      ['Transfer Amount (₪)', 'transfer_amount', 'number'],
      ['Transfer Percentage (%)', 'transfer_percentage', 'number'],
    ],
    investment_beneficiary_update: [
      ['Change Reason', 'change_reason'],
      ['Notary Verified', 'notary_verified'],
      ['Consent Obtained', 'beneficiary_consent_obtained'],
    ],

    // Compensation
    compensation_withdrawal: [
      ['Withdrawal Amount (₪)', 'withdrawal_amount', 'number'],
      ['Early Withdrawal Allowed', 'early_withdrawal_allowed'],
    ],
    compensation_employer_change: [
      ['Current Employer', 'current_employer'],
      ['New Employer', 'new_employer'],
      ['Employment End Date', 'employment_end_date', 'date'],
      ['New Employment Start Date', 'new_employment_start_date', 'date'],
      ['Transfer Balance (₪)', 'transfer_balance', 'number'],
      ['Gap Days', 'gap_days', 'number'],
      ['Severance Included', 'severance_included'],
      ['Employer Approval Received', 'employer_approval_received'],
      ['Continuous Employment', 'continuous_employment'],
    ],
    compensation_beneficiary_update: [
      ['Change Reason', 'change_reason'],
      ['Notary Verified', 'notary_verified'],
      ['Consent Obtained', 'beneficiary_consent_obtained'],
      ['Employer Notified', 'employer_notified'],
    ],

    // Study
    study_withdrawal: [
      ['Withdrawal Amount (₪)', 'withdrawal_amount', 'number'],
      ['Liquidity Date', 'liquidity_date', 'date'],
    ],
    study_fund_transfer: [
      ['Current General Track (%)', 'current_general_pct', 'number'],
      ['Current Stock Track (%)', 'current_stock_pct', 'number'],
      ['Target General Track (%)', 'target_general_pct', 'number'],
      ['Target Stock Track (%)', 'target_stock_pct', 'number'],
      ['Rebalance Amount (₪)', 'rebalance_amount', 'number'],
      ['Rebalance Direction', 'rebalance_direction'],
    ],
    study_early_redemption: [
      ['Redemption Amount (₪)', 'redemption_amount', 'number'],
      ['Redemption Reason', 'redemption_reason'],
      ['Supporting Documents', 'supporting_documents'],
      ['Tax Aware', 'tax_aware'],
      ['Employer Notified', 'employer_notified'],
      ['Liquidity Date', 'liquidity_date', 'date'],
    ],
  }

  const key = `${fundType}_${useCase}`
  return {
    fundFields: fundFields[fundType] || [],
    useCaseFields: useCaseFields[key] || [],
  }
}

function InputDataTab({ memberData, setMemberData }) {
  if (!memberData) return <EmptyState text="Generate a scenario to see member data" />

  const update = (field, value) => setMemberData(prev => ({ ...prev, [field]: value }))

  const commonFields = [
    ['Member ID', 'member_id'],
    ['Member Name', 'member_name'],
    ['Birth Date', 'birth_date', 'date'],
    ['Phone', 'phone'],
    ['Email', 'email'],
    ['Account Number', 'account_number'],
    ['Account Owner', 'account_owner'],
    ['ID Photo Confidence (%)', 'id_photo_confidence', 'number'],
  ]

  const { fundFields, useCaseFields } = getFieldsForUseCase(memberData)
  const ucBadge = USE_CASE_BADGES[memberData.use_case] || USE_CASE_BADGES.withdrawal

  const booleanFields = ['early_withdrawal_allowed', 'notary_verified', 'beneficiary_consent_obtained',
    'employer_approval_received', 'employer_notified', 'continuous_employment', 'severance_included',
    'supporting_documents', 'tax_aware']

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
        {commonFields.map(([label, field, type]) => (
          <InputField
            key={field}
            label={label}
            value={memberData[field]}
            onChange={v => update(field, v)}
            type={type}
          />
        ))}
      </div>

      <hr className="border-border" />
      <h4 className="text-xs text-text-muted uppercase tracking-wider">Fund Data</h4>

      <div className="grid grid-cols-2 gap-3">
        {fundFields.map(([label, field, type]) => (
          <InputField key={field} label={label} value={memberData[field]} onChange={v => update(field, v)} type={type} />
        ))}
      </div>

      <hr className="border-border" />
      <h4 className="text-xs text-text-muted uppercase tracking-wider">{ucBadge.label} Data</h4>

      <div className="grid grid-cols-2 gap-3">
        {useCaseFields.map(([label, field, type]) => {
          if (booleanFields.includes(field)) {
            return (
              <div key={field}>
                <label className="block text-xs text-text-muted mb-1">{label}</label>
                <select
                  value={String(memberData[field])}
                  onChange={e => update(field, e.target.value === 'true')}
                  className="w-full bg-bg-primary border border-border rounded px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
            )
          }
          return (
            <InputField key={field} label={label} value={memberData[field]} onChange={v => update(field, v)} type={type} />
          )
        })}
      </div>

      {/* Beneficiary lists */}
      {memberData.current_beneficiaries && (
        <BeneficiaryList label="Current Beneficiaries" beneficiaries={memberData.current_beneficiaries} />
      )}
      {memberData.new_beneficiaries && (
        <BeneficiaryList label="New Beneficiaries" beneficiaries={memberData.new_beneficiaries} />
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

function ContractTab({ contract, setContract }) {
  if (!contract) return <EmptyState text="Generate a scenario to see contract terms" />

  const updateClause = (index, field, value) => {
    setContract(prev => ({
      ...prev,
      clauses: prev.clauses.map((c, i) => i === index ? { ...c, [field]: value } : c),
    }))
  }

  const removeClause = (index) => {
    setContract(prev => ({
      ...prev,
      clauses: prev.clauses.filter((_, i) => i !== index),
    }))
  }

  return (
    <div className="space-y-3 animate-fade-in-up">
      {/* Contract header */}
      <div className="bg-bg-primary rounded-lg border border-border p-3">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          <div><span className="text-text-muted">Contract ID:</span> <span className="font-mono text-accent">{contract.contract_id}</span></div>
          <div><span className="text-text-muted">Customer:</span> <span className="text-text-primary">{contract.customer_name}</span></div>
          <div><span className="text-text-muted">Insurance Company:</span> <span className="text-text-primary">{contract.insurance_company}</span></div>
          <div><span className="text-text-muted">Fund Type:</span> <span className="text-text-primary">{contract.fund_type}</span></div>
          <div><span className="text-text-muted">Effective:</span> <span className="text-text-primary">{contract.effective_date}</span></div>
          <div><span className="text-text-muted">Expires:</span> <span className="text-text-primary">{contract.expiry_date}</span></div>
        </div>
      </div>

      <h4 className="text-xs text-text-muted uppercase tracking-wider">Contract Terms ({contract.clauses.length} clauses)</h4>

      {contract.clauses.map((clause, i) => (
        <div key={i} className="bg-bg-primary rounded-lg border border-border p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-accent bg-accent/10 px-2 py-0.5 rounded">{clause.clause_id}</span>
              {clause.category && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${CATEGORY_COLORS[clause.category] || 'bg-bg-card text-text-muted'}`}>{clause.category}</span>
              )}
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${CONSEQUENCE_COLORS[clause.consequence] || 'bg-warning/20 text-warning'}`}>{clause.consequence}</span>
            </div>
            <button onClick={() => removeClause(i)} className="text-text-muted hover:text-error text-xs">✕</button>
          </div>
          <input
            value={clause.title || ''}
            onChange={e => updateClause(i, 'title', e.target.value)}
            className="w-full bg-transparent text-sm font-semibold text-text-primary mb-1 focus:outline-none border-b border-transparent focus:border-accent"
          />
          <textarea
            value={clause.description || ''}
            onChange={e => updateClause(i, 'description', e.target.value)}
            rows={2}
            className="w-full bg-transparent text-xs text-text-muted mt-1 focus:outline-none resize-none border-b border-transparent focus:border-accent"
          />
          {clause.conditions && clause.conditions.length > 0 && (
            <div className="mt-2 text-[10px] text-text-muted font-mono">
              {clause.conditions.map((c, j) => (
                <span key={j} className="inline-block bg-bg-card rounded px-1.5 py-0.5 mr-1 mb-1">
                  {c.field} {c.operator} {JSON.stringify(c.value)}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function RegulationsTab({ regulations, setRegulations }) {
  if (!regulations || regulations.length === 0) return <EmptyState text="Generate a scenario to see regulations" />

  const updateReg = (index, field, value) => {
    setRegulations(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r))
  }

  const updateRequirement = (regIndex, reqIndex, value) => {
    setRegulations(prev => prev.map((r, i) => {
      if (i !== regIndex) return r
      const newReqs = [...r.requirements]
      newReqs[reqIndex] = value
      return { ...r, requirements: newReqs }
    }))
  }

  const removeRegulation = (index) => {
    setRegulations(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3 animate-fade-in-up">
      {regulations.map((reg, i) => (
        <div key={i} className="bg-bg-primary rounded-lg border border-border p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-accent bg-accent/10 px-2 py-0.5 rounded">{reg.regulation_id}</span>
              <span className="text-xs text-text-muted">{reg.authority}</span>
            </div>
            <button onClick={() => removeRegulation(i)} className="text-text-muted hover:text-error text-xs">✕</button>
          </div>
          <input
            value={reg.title || ''}
            onChange={e => updateReg(i, 'title', e.target.value)}
            className="w-full bg-transparent text-sm font-semibold text-text-primary mb-2 focus:outline-none border-b border-transparent focus:border-accent"
          />
          <div className="space-y-1">
            {reg.requirements.map((req, j) => (
              <textarea
                key={j}
                value={req || ''}
                onChange={e => updateRequirement(i, j, e.target.value)}
                rows={2}
                className="w-full bg-bg-card text-xs text-text-muted rounded px-2 py-1.5 focus:outline-none resize-none focus:border-accent border border-transparent"
              />
            ))}
          </div>
          <div className="mt-2 text-[10px] text-text-muted">Effective: {reg.effective_date}</div>
        </div>
      ))}
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
              <span className="ml-1.5 text-[10px] bg-accent/20 text-accent px-1.5 rounded-full">{contract.clauses.length}</span>
            )}
            {tab.id === 'regulations' && regulations?.length > 0 && (
              <span className="ml-1.5 text-[10px] bg-accent/20 text-accent px-1.5 rounded-full">{regulations.length}</span>
            )}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-4 max-h-[400px] overflow-y-auto">
        {activeTab === 'input' && <InputDataTab memberData={memberData} setMemberData={setMemberData} />}
        {activeTab === 'policies' && <ContractTab contract={contract} setContract={setContract} />}
        {activeTab === 'regulations' && <RegulationsTab regulations={regulations} setRegulations={setRegulations} />}
      </div>
    </div>
  )
}
