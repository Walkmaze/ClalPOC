import { useState, useCallback, useRef, useEffect } from 'react'
import ScenarioBuilder from './features/scenario/ScenarioBuilder'
import ExecutionsList from './features/executions/ExecutionsList'
import ExecutionDetail from './features/executions/ExecutionDetail'
import SettingsPanel from './features/settings/SettingsPanel'
import Dashboard from './features/dashboard/Dashboard'
import RegulationsManagement from './features/regulations/RegulationsManagement'
import { useT } from './i18n'
import { generateMemberData, generateContract, generateRegulations, FUND_TYPES, USE_CASES, getUseCaseLabel } from './lib/dataGenerators'
import { callClaude } from './lib/claudeApi'
import { executeValidation, determineOutcome } from './lib/validationEngine'
import { generateBulkScenarios } from './lib/bulkGenerator'

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

  const [regulationFiles, setRegulationFiles] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('flowmaze_reg_files') || '[]')
    } catch { return [] }
  })
  const [manualEntries, setManualEntries] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('flowmaze_reg_manual') || '[]')
    } catch { return [] }
  })

  useEffect(() => {
    try { localStorage.setItem('flowmaze_reg_files', JSON.stringify(regulationFiles)) } catch {}
  }, [regulationFiles])
  useEffect(() => {
    try { localStorage.setItem('flowmaze_reg_manual', JSON.stringify(manualEntries)) } catch {}
  }, [manualEntries])

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
    const kbEntries = [
      ...regulationFiles.flatMap(f => f.entries || []),
      ...manualEntries,
    ]
    const regs = kbEntries.length > 0 ? kbEntries : generateRegulations(useCase)
    setMemberData(data)
    setContract(ctr)
    setRegulations(regs)
  }, [fundType, useCase, regulationFiles, manualEntries])

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
      { icon: '📋', text: `Analyzing member profile and fund data...`, textHe: `מנתח פרופיל מבוטח ונתוני ביטוח...` },
      { icon: '📜', text: `Reading ${execContract.clauses.length} customer contract clauses...`, textHe: `קורא ${execContract.clauses.length} סעיפי פוליסה לקוח...` },
      { icon: '⚖️', text: `Checking ${execRegulations.length} regulatory requirements...`, textHe: `בודק ${execRegulations.length} דרישות רגולטוריות...` },
      { icon: '🧠', text: `Determining required validation steps for ${ucLabel}...`, textHe: `מתכנן שלבי בדיקה נדרשים עבור ${ucLabelHe}...` },
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

    addAudit({ action: 'Contract analysis', actionHe: 'ניתוח פוליסה', category: 'ai', source: '—', result: 'SUCCESS', details: `${execContract.clauses.length} contract clauses analyzed`, detailsHe: `${execContract.clauses.length} סעיפי פוליסה נותחו` })
    addAudit({ action: 'Regulation check', actionHe: 'בדיקת רגולציה', category: 'ai', source: '—', result: 'SUCCESS', details: `${execRegulations.length} regulations checked`, detailsHe: `${execRegulations.length} תקנות נבדקו` })

    let validationArray
    try {
      const { validations, log } = await callClaude(execMemberData, execContract, execRegulations, apiKey)
      validationArray = validations
      updateExecution(execId, { claudeLog: log })
    } catch (err) {
      const patch = { error: `API Error: ${err.message}`, status: 'ERROR' }
      if (err.log) patch.claudeLog = err.log
      updateExecution(execId, patch)
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
              onClick={() => setActiveTab('regulations')}
              className={`px-4 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'regulations'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              {t('header.regulations')}
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
          <SettingsPanel apiKey={apiKey} setApiKey={handleSetApiKey} />
        )}

        {activeTab === 'regulations' && (
          <RegulationsManagement
            files={regulationFiles}
            setFiles={setRegulationFiles}
            manualEntries={manualEntries}
            setManualEntries={setManualEntries}
            apiKey={apiKey}
          />
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

