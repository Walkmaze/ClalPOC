import { useState, useCallback, useRef } from 'react'
import ScenarioBuilder from './ScenarioBuilder'
import ExecutionsList from './ExecutionsList'
import ExecutionDetail from './ExecutionDetail'
import SettingsPanel from './SettingsPanel'
import Dashboard from './Dashboard'
import { useT } from './i18n'
import { generateMemberData, generateContract, generateRegulations, FUND_TYPES, USE_CASES, getUseCaseLabel } from './dataGenerators'
import { callClaude } from './claudeApi'
import { executeValidation, determineOutcome } from './validationEngine'
import { generateBulkScenarios } from './bulkGenerator'

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }

function formatTime() {
  const now = new Date()
  return now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatDateTime() {
  const now = new Date()
  return now.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const USE_CASE_LABELS = {
  withdrawal: 'withdrawal request',
  fund_transfer: 'fund transfer request',
  beneficiary_update: 'beneficiary update request',
  employer_change: 'employer change request',
  early_redemption: 'early redemption request',
}

const USE_CASE_ICONS = {
  withdrawal: '💰',
  fund_transfer: '🔄',
  beneficiary_update: '👤',
  employer_change: '🏢',
  early_redemption: '⏰',
}

function calculateSlaDeadline(contract, isComplex) {
  const clauses = contract?.clauses || []
  const slaClause = clauses.find(c => c.clause_id === 'SLA-1')
  const days = slaClause
    ? (isComplex ? slaClause.sla_complex_business_days : slaClause.sla_business_days)
    : 5
  const deadline = new Date()
  let added = 0
  while (added < days) {
    deadline.setDate(deadline.getDate() + 1)
    const day = deadline.getDay()
    if (day !== 5 && day !== 6) added++
  }
  return deadline.toISOString()
}

function determinePriority(memberData) {
  const amount = memberData.withdrawal_amount || memberData.transfer_amount || memberData.redemption_amount || 0
  if (amount > 100000) return 'High'
  if (amount > 50000) return 'Medium'
  return 'Low'
}

function _REMOVED_generateDemoExecutions() {
  const demoData = [
    {
      processId: 'PROC-78221', memberName: 'Amit Cohen', fundType: 'investment',
      fundTypeLabel: 'קופת גמל להשקעה — Investment Provident Fund',
      useCase: 'withdrawal', useCaseLabel: '💰 משיכה — Withdrawal',
      priority: 'High', status: 'COMPLETED', minutesAgo: 47,
      memberData: { member_id: '23847561', member_name: 'Amit Cohen', fund_type: 'investment', use_case: 'withdrawal', balance: 342000, withdrawal_amount: 185000, phone: '054-7823456', email: 'amit.cohen@gmail.com', birth_date: '1978-03-14', account_number: '482917365012', account_owner: 'Amit Cohen', id_photo_confidence: 96 },
      outcome: { type: 'approved', message: 'Withdrawal approved — all validations passed. ₪185,000 transferred.' },
      validations: [
        { id: 'v1', name: 'ID Photo Verification', category: 'identity', severity: 'blocking', source: 'REG-2024-07', rule: 'id_photo_confidence >= 90', description: 'Verify member identity photo' },
        { id: 'v2', name: 'Bank Account Ownership', category: 'identity', severity: 'blocking', source: 'CL-1.1', rule: 'account_owner == member_name', description: 'Verify bank account matches member' },
        { id: 'v3', name: 'Age Verification', category: 'eligibility', severity: 'blocking', source: 'REG-2024-07', rule: 'age >= 18', description: 'Member must be at least 18' },
        { id: 'v4', name: 'Balance Check', category: 'financial', severity: 'blocking', source: 'CL-3.8', rule: 'balance > withdrawal_amount', description: 'Sufficient funds available' },
        { id: 'v5', name: 'Holding Period', category: 'contract', severity: 'blocking', source: 'CL-4.3', rule: 'holding_months >= 12', description: 'Minimum holding period met' },
      ],
      validationStatuses: ['pass', 'pass', 'pass', 'pass', 'pass'],
      validationResults: [
        { passed: true, actual_value: '96%', message: 'Identity verified (96% confidence)' },
        { passed: true, actual_value: 'Amit Cohen', message: 'Bank account owner matches member' },
        { passed: true, actual_value: '48', message: 'Age 48 meets minimum requirement' },
        { passed: true, actual_value: '₪342,000', message: 'Balance sufficient for ₪185,000 withdrawal' },
        { passed: true, actual_value: '36 months', message: 'Holding period of 36 months meets 12 month minimum' },
      ],
    },
    {
      processId: 'PROC-88431', memberName: 'Yael Levi', fundType: 'compensation',
      fundTypeLabel: 'קופת גמל פיצויים — Compensation Fund',
      useCase: 'withdrawal', useCaseLabel: '💰 משיכה — Withdrawal',
      priority: 'Medium', status: 'PENDING_APPROVAL', minutesAgo: 82,
      memberData: { member_id: '91234567', member_name: 'Yael Levi', fund_type: 'compensation', use_case: 'withdrawal', gender: 'female', balance: 198000, withdrawal_amount: 198000, phone: '052-3456789', email: 'yael.levi@gmail.com', birth_date: '1985-11-22', account_number: '193847562301', account_owner: 'Yael Levi', id_photo_confidence: 93, employer: 'Harel', early_withdrawal_allowed: true },
      outcome: null,
      validations: [
        { id: 'v1', name: 'ID Photo Verification', category: 'identity', severity: 'blocking', source: 'ISA-DID-2024', rule: 'id_photo_confidence >= 90', description: 'Verify identity' },
        { id: 'v2', name: 'Age Check', category: 'eligibility', severity: 'warning', source: 'CL-4.3', rule: 'age >= 62 for female', description: 'Retirement age check' },
        { id: 'v3', name: 'Balance Check', category: 'financial', severity: 'blocking', source: 'CL-3.8', rule: 'balance > 0', description: 'Positive balance' },
        { id: 'v4', name: 'Compliance Review', category: 'contract', severity: 'warning', source: 'CL-HITL-1', requires_hitl: true, hitl_reason: 'Withdrawal amount ₪198,000 exceeds manual review threshold per contract clause CL-HITL-1', description: 'Manual compliance review required', hitl_steps: [
          { step_id: 'h1', title: 'Verify member identity', description: 'Confirm member identity matches records', fields: [
            { name: 'id_verified', type: 'select', label: 'Identity verified?', options: ['Verified', 'Mismatch', 'Unable to verify'] },
            { name: 'verification_notes', type: 'textarea', label: 'Verification notes' },
          ]},
          { step_id: 'h2', title: 'Review transaction legitimacy', description: 'Check for fraud indicators', fields: [
            { name: 'fraud_check', type: 'select', label: 'Fraud indicators?', options: ['None detected', 'Suspicious patterns', 'Confirmed fraud'] },
            { name: 'risk_level', type: 'select', label: 'Risk assessment', options: ['Low', 'Medium', 'High'] },
            { name: 'review_notes', type: 'textarea', label: 'Review notes' },
          ]},
          { step_id: 'h3', title: 'Final decision', description: 'Approve or reject the transaction', fields: [
            { name: 'decision', type: 'select', label: 'Decision', options: ['Approve', 'Reject', 'Escalate further'] },
            { name: 'reason', type: 'textarea', label: 'Decision justification' },
          ]},
        ]},
      ],
      validationStatuses: ['pass', 'warning', 'pass', 'hitl_waiting'],
      validationResults: [
        { passed: true, actual_value: '93%', message: 'Identity verified' },
        { passed: false, actual_value: '41', message: 'Age 41 below retirement age 62 — early withdrawal path' },
        { passed: true, actual_value: '₪198,000', message: 'Balance available' },
        null,
      ],
    },
    {
      processId: 'PROC-90122', memberName: 'Noam Shapira', fundType: 'study',
      fundTypeLabel: 'קרן השתלמות — Study Fund',
      useCase: 'withdrawal', useCaseLabel: '💰 משיכה — Withdrawal',
      priority: 'Low', status: 'BLOCKED', minutesAgo: 195,
      memberData: { member_id: '45678901', member_name: 'Noam Shapira', fund_type: 'study', use_case: 'withdrawal', total_balance: 87000, general_track_balance: 52000, stock_track_balance: 35000, withdrawal_amount: 45000, phone: '050-9876543', email: 'noam.shapira@gmail.com', birth_date: '1992-06-08', account_number: '567812349087', account_owner: 'Noam Shapira', id_photo_confidence: 42, liquidity_date: '2027-01-15' },
      outcome: { type: 'blocked', message: 'Withdrawal blocked — ID photo verification failed (42% confidence, minimum 90% required).' },
      validations: [
        { id: 'v1', name: 'ID Photo Verification', category: 'identity', severity: 'blocking', source: 'ISA-DID-2024', rule: 'id_photo_confidence >= 90', description: 'Verify identity' },
        { id: 'v2', name: 'Liquidity Date Check', category: 'eligibility', severity: 'blocking', source: 'CL-4.3', rule: 'liquidity_date <= today', description: 'Funds accessible after liquidity date' },
        { id: 'v3', name: 'Balance Check', category: 'financial', severity: 'blocking', source: 'CL-3.1', rule: 'withdrawal_amount >= 5000', description: 'Minimum withdrawal amount' },
      ],
      validationStatuses: ['fail', 'fail', 'pass'],
      validationResults: [
        { passed: false, actual_value: '42%', message: 'ID photo confidence 42% below 90% threshold' },
        { passed: false, actual_value: '2027-01-15', message: 'Liquidity date not yet reached' },
        { passed: true, actual_value: '₪45,000', message: 'Meets minimum withdrawal of ₪5,000' },
      ],
    },
    {
      processId: 'PROC-91001', memberName: 'Dana Mizrahi', fundType: 'investment',
      fundTypeLabel: 'קופת גמל להשקעה — Investment Provident Fund',
      useCase: 'fund_transfer', useCaseLabel: '🔄 העברה בין מסלולים — Fund Transfer',
      priority: 'Low', status: 'COMPLETED', minutesAgo: 12,
      memberData: { member_id: '78901234', member_name: 'Dana Mizrahi', fund_type: 'investment', use_case: 'fund_transfer', balance: 267000, transfer_amount: 53000, source_track: 'Conservative', target_track: 'Aggressive Growth', phone: '054-1234567', email: 'dana.mizrahi@gmail.com', birth_date: '1990-01-30', account_number: '890123456789', account_owner: 'Dana Mizrahi', id_photo_confidence: 98 },
      outcome: { type: 'approved', message: 'Fund transfer approved — ₪53,000 moved from Conservative to Aggressive Growth.' },
      validations: [
        { id: 'v1', name: 'Identity Verification', category: 'identity', severity: 'blocking', source: 'ISA-DID-2024', rule: 'id_photo_confidence >= 85', description: 'Verify identity for transfer' },
        { id: 'v2', name: 'Transfer Limit Check', category: 'financial', severity: 'blocking', source: 'CL-12.3', rule: 'transfer_percentage <= 50', description: 'Max transfer percentage' },
        { id: 'v3', name: 'Track Switch Cooldown', category: 'eligibility', severity: 'blocking', source: 'CL-12.1', rule: 'days_since_last_transfer >= 30', description: 'Minimum days between transfers' },
      ],
      validationStatuses: ['pass', 'pass', 'pass'],
      validationResults: [
        { passed: true, actual_value: '98%', message: 'Identity verified' },
        { passed: true, actual_value: '20%', message: 'Transfer is 20% of balance, within 50% limit' },
        { passed: true, actual_value: '120 days', message: 'Last transfer 120 days ago, meets 30 day minimum' },
      ],
    },
    {
      processId: 'PROC-67834', memberName: 'Tamar Avraham', fundType: 'compensation',
      fundTypeLabel: 'קופת גמל פיצויים — Compensation Fund',
      useCase: 'employer_change', useCaseLabel: '🏢 החלפת מעסיק — Employer Change',
      priority: 'Medium', status: 'COMPLETED', minutesAgo: 310,
      memberData: { member_id: '34567890', member_name: 'Tamar Avraham', fund_type: 'compensation', use_case: 'employer_change', balance: 145000, current_employer: 'Migdal', new_employer: 'Phoenix', phone: '052-8765432', email: 'tamar.avraham@gmail.com', birth_date: '1982-09-15', account_number: '234567890123', account_owner: 'Tamar Avraham', id_photo_confidence: 91, gap_days: 14, employer_approval_received: true, continuous_employment: true, transfer_balance: 145000, severance_included: true },
      outcome: { type: 'approved', message: 'Employer change approved — funds transferred from Migdal to Phoenix.' },
      validations: [
        { id: 'v1', name: 'Identity Verification', category: 'identity', severity: 'blocking', source: 'ISA-DID-2024', rule: 'id_photo_confidence >= 85', description: 'Verify identity' },
        { id: 'v2', name: 'Employment Gap Check', category: 'eligibility', severity: 'blocking', source: 'CL-20.1', rule: 'gap_days <= 45', description: 'Employment gap within limit' },
        { id: 'v3', name: 'Employer Approval', category: 'processing', severity: 'blocking', source: 'CL-20.3', rule: 'employer_approval_received == true', description: 'Previous employer consent' },
        { id: 'v4', name: 'Severance Continuity', category: 'processing', severity: 'warning', source: 'CL-20.5', rule: 'continuous_employment == true', description: 'Verify continuous employment' },
      ],
      validationStatuses: ['pass', 'pass', 'pass', 'pass'],
      validationResults: [
        { passed: true, actual_value: '91%', message: 'Identity verified' },
        { passed: true, actual_value: '14 days', message: 'Gap of 14 days within 45 day limit' },
        { passed: true, actual_value: 'true', message: 'Employer approval received' },
        { passed: true, actual_value: 'true', message: 'Continuous employment verified' },
      ],
    },
    {
      processId: 'PROC-55219', memberName: 'Eyal Peretz', fundType: 'study',
      fundTypeLabel: 'קרן השתלמות — Study Fund',
      useCase: 'early_redemption', useCaseLabel: '⏰ פדיון מוקדם — Early Redemption',
      priority: 'High', status: 'AWAITING_CONSENT', minutesAgo: 28,
      memberData: { member_id: '56789012', member_name: 'Eyal Peretz', fund_type: 'study', use_case: 'early_redemption', total_balance: 312000, general_track_balance: 187000, stock_track_balance: 125000, redemption_amount: 200000, redemption_reason: 'Financial hardship', phone: '050-5678901', email: 'eyal.peretz@gmail.com', birth_date: '1988-04-20', account_number: '678901234567', account_owner: 'Eyal Peretz', id_photo_confidence: 95, supporting_documents: true, tax_aware: true, employer_notified: true, liquidity_date: '2027-06-01' },
      outcome: { type: 'tax_consent', message: 'Early redemption approved pending tax consent.', breakdown: { gross: 200000, tax: 60000, taxRate: 30, fee: 0, feeRate: 0, net: 140000 } },
      validations: [
        { id: 'v1', name: 'Identity Verification', category: 'identity', severity: 'blocking', source: 'ISA-DID-2024', rule: 'id_photo_confidence >= 90', description: 'Verify identity' },
        { id: 'v2', name: 'Supporting Documents', category: 'eligibility', severity: 'blocking', source: 'CL-30.1', rule: 'supporting_documents == true', description: 'Required documentation' },
        { id: 'v3', name: 'Qualifying Reason', category: 'eligibility', severity: 'blocking', source: 'CL-30.5', rule: 'redemption_reason in qualifying_list', description: 'Valid early redemption reason' },
        { id: 'v4', name: 'Tax Calculation', category: 'financial', severity: 'info', source: 'CL-30.3', rule: 'calculate capital gains tax', description: 'Calculate applicable taxes' },
      ],
      validationStatuses: ['pass', 'pass', 'pass', 'pass'],
      validationResults: [
        { passed: true, actual_value: '95%', message: 'Identity verified' },
        { passed: true, actual_value: 'true', message: 'Supporting documents provided' },
        { passed: true, actual_value: 'Financial hardship', message: 'Qualifying reason accepted' },
        { passed: true, actual_value: '₪60,000 tax', message: '30% capital gains tax on ₪200,000' },
      ],
    },
  ]

  const now = new Date()
  return demoData.map(d => {
    const ts = new Date(now.getTime() - d.minutesAgo * 60000)
    const slaDate = new Date(ts)
    slaDate.setDate(slaDate.getDate() + 5)
    return {
      id: d.processId,
      processId: d.processId,
      timestamp: ts.toISOString(),
      timestampDisplay: ts.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
      memberName: d.memberName,
      fundType: d.fundType,
      fundTypeLabel: d.fundTypeLabel,
      useCase: d.useCase,
      useCaseLabel: d.useCaseLabel,
      priority: d.priority,
      slaDeadline: slaDate.toISOString(),
      status: d.status,
      memberData: d.memberData,
      contract: { contract_id: `CTR-2024-${Math.floor(1000 + Math.random() * 9000)}`, customer_name: d.memberName, insurance_company: ['Menora Mivtachim', 'Migdal Insurance', 'Harel Insurance', 'The Phoenix', 'Clal Insurance'][Math.floor(Math.random() * 5)], effective_date: '2022-01-15', expiry_date: '2032-01-15', clauses: [{ clause_id: 'SLA-1', category: 'sla', title: 'Processing Time SLA', description: 'Standard: 5 business days. Complex: 14 business days.', conditions: [], consequence: 'notify', sla_business_days: 5, sla_complex_business_days: 14 }] },
      regulations: [],
      analysisMessages: [{ icon: '✅', text: `Flow completed: ${d.validations.length} validation steps`, done: true }],
      validations: d.validations,
      validationStatuses: d.validationStatuses,
      validationResults: d.validationResults,
      outcome: d.outcome,
      auditEntries: [
        { action: 'Request intake', category: 'system', source: '—', result: 'SUCCESS', details: `Process initiated`, timestamp: ts.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) },
        ...d.validations.map((v, i) => ({
          action: v.name, category: v.category, source: v.source || '—',
          result: d.validationStatuses[i] === 'pass' ? 'PASS' : d.validationStatuses[i] === 'fail' ? 'FAIL' : d.validationStatuses[i] === 'hitl_waiting' ? 'PAUSED' : 'WARNING',
          details: d.validationResults[i]?.message || 'Pending',
          timestamp: new Date(ts.getTime() + (i + 1) * 2000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        })),
        ...(d.outcome ? [{ action: 'Outcome determination', category: 'system', source: '—', result: d.outcome.type === 'approved' ? 'SUCCESS' : d.outcome.type === 'blocked' ? 'FAIL' : 'WARNING', details: d.outcome.message, timestamp: new Date(ts.getTime() + (d.validations.length + 1) * 2000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }] : []),
      ],
      error: null,
    }
  })
}

export default function App() {
  const t = useT()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [selectedExecutionId, setSelectedExecutionId] = useState(null)

  const [fundType, setFundType] = useState('investment')
  const [useCase, setUseCase] = useState('withdrawal')
  const [memberData, setMemberData] = useState(null)
  const [contract, setContract] = useState(null)
  const [regulations, setRegulations] = useState([])
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('flowmaze_api_key') || '')
  const [isLaunching, setIsLaunching] = useState(false)

  const [executions, setExecutions] = useState([])
  const abortRefs = useRef({})
  const hitlResolvers = useRef({})

  const handleSetApiKey = useCallback((key) => {
    setApiKey(key)
    localStorage.setItem('flowmaze_api_key', key)
  }, [])

  const handleGenerate = useCallback(() => {
    const data = generateMemberData(fundType, useCase)
    const ctr = generateContract(fundType, useCase, data)
    const regs = generateRegulations(useCase)
    setMemberData(data)
    setContract(ctr)
    setRegulations(regs)
  }, [fundType, useCase])

  const updateExecution = useCallback((id, updates) => {
    setExecutions(prev => prev.map(ex => ex.id === id ? { ...ex, ...updates } : ex))
  }, [])

  const runFlowForExecution = useCallback(async (execId, execMemberData, execContract, execRegulations) => {
    const delay = (ms) => new Promise(r => setTimeout(r, ms))

    const addAudit = (entry) => {
      setExecutions(prev => prev.map(ex =>
        ex.id === execId
          ? { ...ex, auditEntries: [...ex.auditEntries, { ...entry, timestamp: formatTime() }] }
          : ex
      ))
    }

    const currentUseCase = execMemberData.use_case || 'withdrawal'
    const ucLabel = USE_CASE_LABELS[currentUseCase] || 'request'
    const ucIcon = USE_CASE_ICONS[currentUseCase] || '📋'

    const UC_LABELS_HE = { withdrawal: 'בקשת משיכה', fund_transfer: 'בקשת העברה בין מסלולים', beneficiary_update: 'בקשת עדכון מוטבים', employer_change: 'בקשת החלפת מעסיק', early_redemption: 'בקשת פדיון מוקדם' }
    const ucLabelHe = UC_LABELS_HE[currentUseCase] || 'בקשה'
    const memberNameHe = execMemberData.member_name_he || execMemberData.member_name

    const messages = [
      { icon: '⏳', text: `Receiving ${ucLabel} for ${execMemberData.member_name}...`, textHe: `מקבל ${ucLabelHe} עבור ${memberNameHe}...` },
      { icon: '📋', text: `Analyzing member profile and fund data...`, textHe: `מנתח פרופיל חבר ונתוני קופה...` },
      { icon: '📜', text: `Reading ${execContract.clauses.length} customer contract clauses...`, textHe: `קורא ${execContract.clauses.length} סעיפי חוזה לקוח...` },
      { icon: '⚖️', text: `Checking ${execRegulations.length} regulatory requirements...`, textHe: `בודק ${execRegulations.length} דרישות רגולטוריות...` },
      { icon: '🧠', text: `Determining required validation steps for ${ucLabel}...`, textHe: `קובע שלבי בדיקה נדרשים עבור ${ucLabelHe}...` },
    ]

    updateExecution(execId, { analysisMessages: [] })
    addAudit({ action: 'Request intake', actionHe: 'קליטת בקשה', category: 'system', source: '—', result: 'SUCCESS', details: `${ucIcon} ${ucLabel} — Process initiated`, detailsHe: `${ucIcon} ${ucLabelHe} — התהליך החל` })

    for (let i = 0; i < messages.length; i++) {
      if (abortRefs.current[execId]) return
      await delay(800)
      setExecutions(prev => prev.map(ex =>
        ex.id === execId
          ? { ...ex, analysisMessages: [...(ex.analysisMessages || []), { ...messages[i], done: true }] }
          : ex
      ))
    }

    addAudit({ action: 'Contract analysis', actionHe: 'ניתוח חוזה', category: 'ai', source: '—', result: 'SUCCESS', details: `${execContract.clauses.length} contract clauses analyzed`, detailsHe: `${execContract.clauses.length} סעיפי חוזה נותחו` })
    addAudit({ action: 'Regulation check', actionHe: 'בדיקת רגולציה', category: 'ai', source: '—', result: 'SUCCESS', details: `${execRegulations.length} regulations checked`, detailsHe: `${execRegulations.length} תקנות נבדקו` })

    let validationArray
    try {
      validationArray = await callClaude(execMemberData, execContract, execRegulations, apiKey)
    } catch (err) {
      updateExecution(execId, { error: `API Error: ${err.message}`, status: 'ERROR' })
      return
    }

    if (!Array.isArray(validationArray) || validationArray.length === 0) {
      updateExecution(execId, { error: 'Claude returned an invalid response.', status: 'ERROR' })
      return
    }

    await delay(500)
    setExecutions(prev => prev.map(ex =>
      ex.id === execId
        ? { ...ex, analysisMessages: [...(ex.analysisMessages || []), { icon: '✅', text: `Flow generated: ${validationArray.length} validation steps identified`, textHe: `זרימה נוצרה: ${validationArray.length} שלבי בדיקה זוהו`, done: true }] }
        : ex
    ))
    addAudit({ action: 'Flow generation', actionHe: 'יצירת זרימה', category: 'ai', source: '—', result: 'SUCCESS', details: `${validationArray.length} validations generated`, detailsHe: `${validationArray.length} בדיקות נוצרו` })

    updateExecution(execId, {
      validations: validationArray,
      validationStatuses: validationArray.map(() => 'pending'),
      validationResults: validationArray.map(() => null),
    })

    await delay(600)

    // Phase 1: Run ALL validations (HITL nodes marked as waiting, not blocking)
    const results = new Array(validationArray.length).fill(null)
    const hitlIndices = []

    for (let i = 0; i < validationArray.length; i++) {
      if (abortRefs.current[execId]) return

      if (validationArray[i].requires_hitl) {
        // Mark as hitl_waiting but keep executing the rest
        hitlIndices.push(i)
        setExecutions(prev => prev.map(ex =>
          ex.id === execId
            ? { ...ex, validationStatuses: ex.validationStatuses.map((s, j) => j === i ? 'hitl_waiting' : s) }
            : ex
        ))
        addAudit({
          action: validationArray[i].name,
          actionHe: validationArray[i].nameHe || validationArray[i].name,
          category: 'hitl',
          source: validationArray[i].source || '—',
          result: 'PAUSED',
          details: `Waiting for human review: ${validationArray[i].hitl_reason || 'Manual review required'}`,
          detailsHe: `ממתין לבדיקה אנושית: ${validationArray[i].hitl_reasonHe || validationArray[i].hitl_reason || 'נדרשת בדיקה ידנית'}`,
        })
        await delay(300)
        continue
      }

      // Normal validation
      setExecutions(prev => prev.map(ex =>
        ex.id === execId
          ? { ...ex, validationStatuses: ex.validationStatuses.map((s, j) => j === i ? 'executing' : s) }
          : ex
      ))
      await delay(600)

      const result = executeValidation(validationArray[i], execMemberData)
      results[i] = result

      const status = result.passed ? 'pass' : (validationArray[i].severity === 'warning' ? 'warning' : 'fail')
      setExecutions(prev => prev.map(ex =>
        ex.id === execId
          ? {
              ...ex,
              validationStatuses: ex.validationStatuses.map((s, j) => j === i ? status : s),
              validationResults: ex.validationResults.map((r, j) => j === i ? result : r),
            }
          : ex
      ))

      addAudit({
        action: validationArray[i].name,
        actionHe: validationArray[i].nameHe || validationArray[i].name,
        category: validationArray[i].category,
        source: validationArray[i].source || '—',
        result: status.toUpperCase(),
        details: result.message,
        detailsHe: result.messageHe || result.message,
      })
    }

    // Phase 2: If HITL nodes exist, set status and wait for each to be resolved
    if (hitlIndices.length > 0) {
      updateExecution(execId, { status: 'PENDING_APPROVAL' })

      for (const hitlIdx of hitlIndices) {
        if (abortRefs.current[execId]) return

        // Wait for this HITL node to be resolved by the human
        const hitlResult = await new Promise(resolve => {
          hitlResolvers.current[execId] = { resolve, validationIndex: hitlIdx }
        })
        delete hitlResolvers.current[execId]
        if (abortRefs.current[execId]) return

        // Log HITL step details
        if (hitlResult.stepData) {
          const steps = validationArray[hitlIdx].hitl_steps || []
          for (let s = 0; s < steps.length; s++) {
            const data = hitlResult.stepData[s]
            if (data) {
              const summary = Object.entries(data).map(([k, v]) => `${k}: ${v}`).join(', ')
              addAudit({
                action: `HITL Step ${s + 1}: ${steps[s].title}`,
                category: 'hitl',
                source: validationArray[hitlIdx].source || '—',
                result: 'COMPLETED',
                details: summary,
              })
            }
          }
        }

        // Process HITL decision
        if (hitlResult.decision === 'approve') {
          const result = { passed: true, actual_value: 'Human approved', message: 'Approved by human reviewer', messageHe: 'אושר על ידי בודק אנושי' }
          results[hitlIdx] = result
          setExecutions(prev => prev.map(ex =>
            ex.id === execId
              ? {
                  ...ex,
                  validationStatuses: ex.validationStatuses.map((s, j) => j === hitlIdx ? 'pass' : s),
                  validationResults: ex.validationResults.map((r, j) => j === hitlIdx ? result : r),
                }
              : ex
          ))
          addAudit({ action: validationArray[hitlIdx].name, actionHe: validationArray[hitlIdx].nameHe || validationArray[hitlIdx].name, category: 'hitl', source: validationArray[hitlIdx].source || '—', result: 'RESOLVED', details: 'Human approved', detailsHe: 'אושר על ידי בודק אנושי' })
        } else if (hitlResult.decision === 'reject') {
          const result = { passed: false, actual_value: 'Human rejected', message: 'Rejected by human reviewer', messageHe: 'נדחה על ידי בודק אנושי' }
          results[hitlIdx] = result
          setExecutions(prev => prev.map(ex =>
            ex.id === execId
              ? {
                  ...ex,
                  validationStatuses: ex.validationStatuses.map((s, j) => j === hitlIdx ? 'fail' : s),
                  validationResults: ex.validationResults.map((r, j) => j === hitlIdx ? result : r),
                }
              : ex
          ))
          addAudit({ action: validationArray[hitlIdx].name, actionHe: validationArray[hitlIdx].nameHe || validationArray[hitlIdx].name, category: 'hitl', source: validationArray[hitlIdx].source || '—', result: 'REJECTED', details: 'Human rejected', detailsHe: 'נדחה על ידי בודק אנושי' })
        } else {
          // Escalate
          const result = { passed: true, actual_value: 'Escalated', message: 'Escalated for further review', messageHe: 'הועבר לבדיקה נוספת' }
          results[hitlIdx] = result
          setExecutions(prev => prev.map(ex =>
            ex.id === execId
              ? {
                  ...ex,
                  validationStatuses: ex.validationStatuses.map((s, j) => j === hitlIdx ? 'warning' : s),
                  validationResults: ex.validationResults.map((r, j) => j === hitlIdx ? result : r),
                }
              : ex
          ))
          addAudit({ action: validationArray[hitlIdx].name, actionHe: validationArray[hitlIdx].nameHe || validationArray[hitlIdx].name, category: 'hitl', source: validationArray[hitlIdx].source || '—', result: 'ESCALATED', details: 'Escalated for further review', detailsHe: 'הועבר לבדיקה נוספת' })
        }
      }

      // Check if any HITL was rejected — if so, block the flow
      const anyRejected = hitlIndices.some(idx => results[idx] && !results[idx].passed)
      if (anyRejected) {
        updateExecution(execId, {
          outcome: { type: 'blocked', message: 'Process blocked — rejected by human reviewer', messageHe: 'התהליך נחסם — נדחה על ידי בודק אנושי' },
          status: 'REJECTED',
        })
        addAudit({ action: 'Outcome determination', actionHe: 'קביעת תוצאה', category: 'system', source: '—', result: 'FAIL', details: 'Flow terminated by human rejection', detailsHe: 'הזרימה הופסקה עקב דחייה אנושית' })
        return
      }

      // All HITL resolved positively — back to running for outcome
      updateExecution(execId, { status: 'RUNNING' })
    }

    // Phase 3: Determine final outcome
    await delay(400)
    const finalResults = results.filter(r => r !== null)
    const finalOutcome = determineOutcome(validationArray, finalResults, execMemberData)

    const finalStatus = finalOutcome.type === 'approved' ? 'COMPLETED'
      : finalOutcome.type === 'blocked' ? 'BLOCKED'
      : finalOutcome.type === 'customer_action' ? 'AWAITING_DOCUMENTS'
      : finalOutcome.type === 'tax_consent' ? 'AWAITING_CONSENT'
      : 'COMPLETED'

    const isComplex = finalOutcome.type === 'tax_consent'
    const newSla = isComplex ? calculateSlaDeadline(execContract, true) : undefined

    updateExecution(execId, {
      outcome: finalOutcome,
      status: finalStatus,
      ...(newSla ? { slaDeadline: newSla } : {}),
    })

    addAudit({
      action: 'Outcome determination',
      actionHe: 'קביעת תוצאה',
      category: 'system',
      source: '—',
      result: finalOutcome.type === 'approved' ? 'SUCCESS' : finalOutcome.type === 'blocked' ? 'FAIL' : 'WARNING',
      details: finalOutcome.message,
      detailsHe: finalOutcome.messageHe || finalOutcome.message,
    })

  }, [apiKey, updateExecution])

  const handleLaunch = useCallback(() => {
    if (!memberData || !apiKey || !contract) return
    setIsLaunching(true)

    const currentUseCase = memberData.use_case || useCase
    const procId = `PROC-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`
    const fundLabel = FUND_TYPES.find(f => f.id === fundType)
    const priority = determinePriority(memberData)
    const slaDeadline = calculateSlaDeadline(contract, false)

    const execContract = { ...contract, clauses: [...contract.clauses] }

    const newExecution = {
      id: procId,
      processId: procId,
      timestamp: new Date().toISOString(),
      timestampDisplay: formatDateTime(),
      memberName: memberData.member_name,
      fundType,
      fundTypeLabel: fundLabel ? `${fundLabel.labelHe} — ${fundLabel.label}` : fundType,
      useCase: currentUseCase,
      useCaseLabel: getUseCaseLabel(fundType, currentUseCase),
      priority,
      slaDeadline,
      status: 'RUNNING',
      memberData: { ...memberData },
      contract: execContract,
      regulations: [...regulations],
      analysisMessages: null,
      validations: null,
      validationStatuses: [],
      validationResults: [],
      outcome: null,
      auditEntries: [],
      error: null,
    }

    setExecutions(prev => [newExecution, ...prev])
    setSelectedExecutionId(procId)
    setActiveTab('executions')
    setIsLaunching(false)

    abortRefs.current[procId] = false
    runFlowForExecution(procId, { ...memberData }, execContract, [...regulations])
  }, [memberData, contract, regulations, fundType, useCase, apiKey, runFlowForExecution])

  const handleApprove = useCallback(() => {
    if (!selectedExecutionId) return
    const exec = executions.find(e => e.id === selectedExecutionId)
    if (!exec) return

    if (exec.outcome?.type !== 'tax_consent') return

    const newOutcome = {
      ...exec.outcome,
      type: 'approved',
      message: `Early ${exec.useCase === 'early_redemption' ? 'redemption' : 'withdrawal'} approved with tax deductions. Net amount: ₪${exec.outcome.breakdown?.net?.toLocaleString()}`,
    }

    updateExecution(selectedExecutionId, {
      outcome: newOutcome,
      status: 'COMPLETED',
      auditEntries: [...exec.auditEntries, {
        action: 'Tax consent accepted',
        category: 'system',
        source: 'customer',
        result: 'SUCCESS',
        details: 'Customer accepted tax deductions',
        timestamp: formatTime(),
      }],
    })
  }, [selectedExecutionId, executions, updateExecution])

  const handleReject = useCallback(() => {
    if (!selectedExecutionId) return
    const exec = executions.find(e => e.id === selectedExecutionId)
    if (!exec) return

    if (exec.outcome?.type !== 'tax_consent') return

    updateExecution(selectedExecutionId, {
      outcome: { ...exec.outcome, type: 'blocked', message: 'Customer declined tax deductions — withdrawal cancelled.' },
      status: 'CANCELLED',
      auditEntries: [...exec.auditEntries, {
        action: 'Tax consent declined',
        category: 'system',
        source: 'customer',
        result: 'CANCELLED',
        details: 'Customer declined tax deductions',
        timestamp: formatTime(),
      }],
    })
  }, [selectedExecutionId, executions, updateExecution])

  const handleHitlResolve = useCallback((executionId, validationIndex, decision, stepData) => {
    const resolver = hitlResolvers.current[executionId]
    if (resolver) {
      // Live flow — resolve the promise so the engine continues
      resolver.resolve({ decision, stepData })
      return
    }

    // Pre-generated (flood) scenario — update state directly
    setExecutions(prev => prev.map(ex => {
      if (ex.id !== executionId) return ex

      const newStatuses = [...ex.validationStatuses]
      const newResults = [...(ex.validationResults || [])]
      const newAudit = [...ex.auditEntries]
      const val = ex.validations?.[validationIndex]
      const ts = formatTime()

      // Log HITL step details
      if (stepData && val?.hitl_steps) {
        val.hitl_steps.forEach((step, s) => {
          const data = stepData[s]
          if (data) {
            newAudit.push({ action: `HITL Step ${s + 1}: ${step.title}`, category: 'hitl', source: val.source || '—', result: 'COMPLETED', details: Object.entries(data).map(([k, v]) => `${k}: ${v}`).join(', '), timestamp: ts })
          }
        })
      }

      if (decision === 'approve') {
        newStatuses[validationIndex] = 'pass'
        newResults[validationIndex] = { passed: true, actual_value: 'Human approved', message: 'Approved by human reviewer' }
        newAudit.push({ action: val?.name || 'HITL Review', category: 'hitl', source: val?.source || '—', result: 'RESOLVED', details: 'Human approved', timestamp: ts })
      } else if (decision === 'reject') {
        newStatuses[validationIndex] = 'fail'
        newResults[validationIndex] = { passed: false, actual_value: 'Human rejected', message: 'Rejected by human reviewer' }
        newAudit.push({ action: val?.name || 'HITL Review', category: 'hitl', source: val?.source || '—', result: 'REJECTED', details: 'Human rejected', timestamp: ts })
      } else {
        newStatuses[validationIndex] = 'warning'
        newResults[validationIndex] = { passed: true, actual_value: 'Escalated', message: 'Escalated for further review' }
        newAudit.push({ action: val?.name || 'HITL Review', category: 'hitl', source: val?.source || '—', result: 'ESCALATED', details: 'Escalated for further review', timestamp: ts })
      }

      // Check if any HITL nodes still waiting
      const stillWaiting = newStatuses.some(s => s === 'hitl_waiting')

      // Determine new execution status
      let newStatus = ex.status
      let newOutcome = ex.outcome
      if (decision === 'reject') {
        newStatus = 'REJECTED'
        newOutcome = { type: 'blocked', message: `${val?.name || 'HITL Review'}: Rejected by human reviewer` }
        newAudit.push({ action: 'Outcome determination', category: 'system', source: '—', result: 'FAIL', details: 'Flow terminated by human rejection', timestamp: ts })
      } else if (!stillWaiting && !newOutcome) {
        // All HITL resolved, no outcome yet — determine it
        const hasFail = newStatuses.some((s, idx) => s === 'fail' && ex.validations?.[idx]?.severity === 'blocking')
        if (hasFail) {
          newStatus = 'BLOCKED'
          newOutcome = { type: 'blocked', message: 'Process blocked — one or more validations failed' }
        } else {
          newStatus = 'COMPLETED'
          newOutcome = { type: 'approved', message: 'All validations passed. Process completed successfully.' }
        }
        newAudit.push({ action: 'Outcome determination', category: 'system', source: '—', result: newOutcome.type === 'approved' ? 'SUCCESS' : 'FAIL', details: newOutcome.message, timestamp: ts })
      } else if (!stillWaiting) {
        // All HITL resolved but outcome already existed — keep running
        newStatus = 'RUNNING'
      }

      return {
        ...ex,
        validationStatuses: newStatuses,
        validationResults: newResults,
        auditEntries: newAudit,
        status: newStatus,
        outcome: newOutcome,
      }
    }))
  }, [])


  const [floodProgress, setFloodProgress] = useState(null)

  const handleFlood = useCallback(async (count) => {
    const scenarios = generateBulkScenarios(count)
    setFloodProgress({ total: count, launched: 0 })

    for (let i = 0; i < scenarios.length; i++) {
      setExecutions(prev => [scenarios[i], ...prev])
      setFloodProgress({ total: count, launched: i + 1 })
      await new Promise(r => setTimeout(r, randInt(150, 400)))
    }

    setFloodProgress(null)
    setActiveTab('executions')
    setSelectedExecutionId(null)
  }, [])

  const selectedExecution = executions.find(e => e.id === selectedExecutionId)

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-bg-card border-b border-border px-6 py-0 flex items-center justify-between shrink-0 sticky top-0 z-50">
        <div className="flex items-center gap-8">
          <h1 className="text-lg font-bold text-accent tracking-wide py-3">
            <span className="text-text-primary">flow</span>maze
          </h1>
          <nav className="flex">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'dashboard'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              {t('header.dashboard')}
            </button>
            <button
              onClick={() => { setActiveTab('executions'); setSelectedExecutionId(null) }}
              className={`px-4 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'executions'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              {t('header.executions')}
              {executions.length > 0 && (
                <span className="ms-2 text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded-full">
                  {executions.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('builder')}
              className={`px-4 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'builder'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              {t('header.builder')}
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'settings'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              ⚙ {t('header.settings')}
            </button>
          </nav>
        </div>
        <p className="text-[10px] text-text-muted">{t('header.subtitle')}</p>
      </header>

      {/* Flood progress bar */}
      {floodProgress && (
        <div className="bg-bg-card border-b border-border px-6 py-2 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-sm text-text-primary">🚀 {t('flood.launching')} {floodProgress.launched} {t('flood.of')} {floodProgress.total}</span>
            <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full transition-all duration-300" style={{ width: `${(floodProgress.launched / floodProgress.total) * 100}%` }} />
            </div>
            <span className="text-xs text-text-muted">{Math.round((floodProgress.launched / floodProgress.total) * 100)}%</span>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 p-6 overflow-y-auto">
        {activeTab === 'builder' && (
          <ScenarioBuilder
            fundType={fundType}
            setFundType={setFundType}
            useCase={useCase}
            setUseCase={setUseCase}
            memberData={memberData}
            setMemberData={setMemberData}
            contract={contract}
            setContract={setContract}
            regulations={regulations}
            setRegulations={setRegulations}
            onGenerate={handleGenerate}
            onLaunch={handleLaunch}
            isRunning={isLaunching}
            apiKey={apiKey}
            setApiKey={handleSetApiKey}
            onFlood={handleFlood}
            floodProgress={floodProgress}
          />
        )}

        {activeTab === 'dashboard' && (
          <Dashboard executions={executions} />
        )}

        {activeTab === 'settings' && (
          <SettingsPanel />
        )}

        {activeTab === 'executions' && !selectedExecutionId && (
          <ExecutionsList
            executions={executions}
            onSelect={(id) => setSelectedExecutionId(id)}
            onGoToBuilder={() => setActiveTab('builder')}
            onFlood={handleFlood}
          />
        )}

        {activeTab === 'executions' && selectedExecutionId && selectedExecution && (
          <ExecutionDetail
            execution={selectedExecution}
            onApprove={handleApprove}
            onReject={handleReject}
            onBack={() => setSelectedExecutionId(null)}
            onHitlResolve={handleHitlResolve}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-3 text-center shrink-0">
        <p className="text-[10px] text-text-muted">{t('footer.text')}</p>
      </footer>
    </div>
  )
}

