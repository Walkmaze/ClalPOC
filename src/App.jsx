import { useState, useCallback, useRef } from 'react'
import ScenarioBuilder from './ScenarioBuilder'
import ExecutionsList from './ExecutionsList'
import ExecutionDetail from './ExecutionDetail'
import SettingsPanel from './SettingsPanel'
import { generateMemberData, generateContract, generateRegulations, FUND_TYPES, USE_CASES, getUseCaseLabel } from './dataGenerators'
import { callClaude } from './claudeApi'
import { executeValidation, determineOutcome } from './validationEngine'
import { loadSettings, saveSettings, createEasymazeService } from './easymazeApi'

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
  const [activeTab, setActiveTab] = useState('executions')
  const [selectedExecutionId, setSelectedExecutionId] = useState(null)

  const [fundType, setFundType] = useState('investment')
  const [useCase, setUseCase] = useState('withdrawal')
  const [memberData, setMemberData] = useState(null)
  const [contract, setContract] = useState(null)
  const [regulations, setRegulations] = useState([])
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('flowmaze_api_key') || '')
  const [isLaunching, setIsLaunching] = useState(false)

  const [executions, setExecutions] = useState([])
  const [emSettings, setEmSettings] = useState(() => loadSettings())
  const abortRefs = useRef({})
  const hitlResolvers = useRef({})

  const handleSetEmSettings = useCallback((updater) => {
    setEmSettings(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      saveSettings(next)
      return next
    })
  }, [])

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

    const messages = [
      { icon: '⏳', text: `Receiving ${ucLabel} for ${execMemberData.member_name}...` },
      { icon: '📋', text: `Analyzing member profile and fund data...` },
      { icon: '📜', text: `Reading ${execContract.clauses.length} customer contract clauses...` },
      { icon: '⚖️', text: `Checking ${execRegulations.length} regulatory requirements...` },
      { icon: '🧠', text: `Determining required validation steps for ${ucLabel}...` },
    ]

    const addApiLog = (logEntry) => {
      setExecutions(prev => prev.map(ex =>
        ex.id === execId
          ? { ...ex, apiLogs: [...(ex.apiLogs || []), logEntry] }
          : ex
      ))
    }

    const tryEasymaze = async (phase) => {
      // Get latest execution state for description
      const latestExec = await new Promise(resolve => {
        setExecutions(prev => {
          const ex = prev.find(e => e.id === execId)
          resolve(ex)
          return prev
        })
      })
      if (!latestExec) return

      const result = await createEasymazeService(latestExec, emSettings, phase)
      if (result.skipped) return

      if (result.logEntry) addApiLog(result.logEntry)

      if (result.success) {
        if (phase === 'launch' && result.serviceNumber) {
          updateExecution(execId, { easymazeServiceNumber: result.serviceNumber, easymazeStatus: 'synced' })
        } else if (phase === 'launch') {
          updateExecution(execId, { easymazeStatus: 'synced' })
        }
        addAudit({
          action: phase === 'launch' ? 'Create Easymaze Service' : 'Update Easymaze Service',
          category: 'integration',
          source: '—',
          result: 'SUCCESS',
          details: result.serviceNumber ? `Service #${result.serviceNumber} created` : 'Service record created',
        })
      } else {
        updateExecution(execId, { easymazeStatus: 'failed', easymazeError: result.error })
        addAudit({
          action: phase === 'launch' ? 'Create Easymaze Service' : 'Update Easymaze Service',
          category: 'integration',
          source: '—',
          result: 'FAIL',
          details: result.error || 'API call failed',
        })
      }
    }

    updateExecution(execId, { analysisMessages: [] })
    addAudit({ action: 'Request intake', category: 'system', source: '—', result: 'SUCCESS', details: `${ucIcon} ${ucLabel} — Process initiated` })

    // Easymaze: Create service on launch
    tryEasymaze('launch')

    for (let i = 0; i < messages.length; i++) {
      if (abortRefs.current[execId]) return
      await delay(800)
      setExecutions(prev => prev.map(ex =>
        ex.id === execId
          ? { ...ex, analysisMessages: [...(ex.analysisMessages || []), { ...messages[i], done: true }] }
          : ex
      ))
    }

    addAudit({ action: 'Contract analysis', category: 'ai', source: '—', result: 'SUCCESS', details: `${execContract.clauses.length} contract clauses analyzed` })
    addAudit({ action: 'Regulation check', category: 'ai', source: '—', result: 'SUCCESS', details: `${execRegulations.length} regulations checked` })

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
        ? { ...ex, analysisMessages: [...(ex.analysisMessages || []), { icon: '✅', text: `Flow generated: ${validationArray.length} validation steps identified`, done: true }] }
        : ex
    ))
    addAudit({ action: 'Flow generation', category: 'ai', source: '—', result: 'SUCCESS', details: `${validationArray.length} validations generated` })

    updateExecution(execId, {
      validations: validationArray,
      validationStatuses: validationArray.map(() => 'pending'),
      validationResults: validationArray.map(() => null),
    })

    await delay(600)

    const results = []
    for (let i = 0; i < validationArray.length; i++) {
      if (abortRefs.current[execId]) return

      // Check if this is a HITL node
      if (validationArray[i].requires_hitl) {
        // Set to hitl_waiting state
        setExecutions(prev => prev.map(ex =>
          ex.id === execId
            ? {
                ...ex,
                status: 'PENDING_APPROVAL',
                validationStatuses: ex.validationStatuses.map((s, j) => j === i ? 'hitl_waiting' : s),
              }
            : ex
        ))

        addAudit({
          action: validationArray[i].name,
          category: 'hitl',
          source: validationArray[i].source || '—',
          result: 'PAUSED',
          details: `Waiting for human review: ${validationArray[i].hitl_reason || 'Manual review required'}`,
        })

        // Wait for HITL resolution
        const hitlResult = await new Promise(resolve => {
          hitlResolvers.current[execId] = { resolve, validationIndex: i }
        })

        delete hitlResolvers.current[execId]
        if (abortRefs.current[execId]) return

        // Process HITL result
        if (hitlResult.decision === 'approve') {
          const result = { passed: true, actual_value: 'Human approved', message: 'Approved by human reviewer' }
          results.push(result)
          setExecutions(prev => prev.map(ex =>
            ex.id === execId
              ? {
                  ...ex,
                  status: 'RUNNING',
                  validationStatuses: ex.validationStatuses.map((s, j) => j === i ? 'pass' : s),
                  validationResults: ex.validationResults.map((r, j) => j === i ? result : r),
                }
              : ex
          ))
          addAudit({
            action: validationArray[i].name,
            category: 'hitl',
            source: validationArray[i].source || '—',
            result: 'RESOLVED',
            details: 'Human approved, flow continues',
          })
        } else if (hitlResult.decision === 'reject') {
          const result = { passed: false, actual_value: 'Human rejected', message: 'Rejected by human reviewer' }
          results.push(result)
          setExecutions(prev => prev.map(ex =>
            ex.id === execId
              ? {
                  ...ex,
                  status: 'RUNNING',
                  validationStatuses: ex.validationStatuses.map((s, j) => j === i ? 'fail' : s),
                  validationResults: ex.validationResults.map((r, j) => j === i ? result : r),
                }
              : ex
          ))
          addAudit({
            action: validationArray[i].name,
            category: 'hitl',
            source: validationArray[i].source || '—',
            result: 'REJECTED',
            details: 'Human rejected, flow terminated',
          })
          // End the flow on rejection
          await delay(400)
          updateExecution(execId, {
            outcome: { type: 'blocked', message: `${validationArray[i].name}: Rejected by human reviewer` },
            status: 'REJECTED',
          })
          addAudit({
            action: 'Outcome determination',
            category: 'system',
            source: '—',
            result: 'FAIL',
            details: 'Flow terminated by human rejection',
          })
          return
        } else {
          // Escalate — mark as warning, continue
          const result = { passed: true, actual_value: 'Escalated', message: 'Escalated for further review, flow continues' }
          results.push(result)
          setExecutions(prev => prev.map(ex =>
            ex.id === execId
              ? {
                  ...ex,
                  status: 'RUNNING',
                  validationStatuses: ex.validationStatuses.map((s, j) => j === i ? 'warning' : s),
                  validationResults: ex.validationResults.map((r, j) => j === i ? result : r),
                }
              : ex
          ))
          addAudit({
            action: validationArray[i].name,
            category: 'hitl',
            source: validationArray[i].source || '—',
            result: 'ESCALATED',
            details: 'Escalated for further review, flow continues',
          })
        }

        // Log HITL step details
        if (hitlResult.stepData) {
          const steps = validationArray[i].hitl_steps || []
          for (let s = 0; s < steps.length; s++) {
            const data = hitlResult.stepData[s]
            if (data) {
              const summary = Object.entries(data).map(([k, v]) => `${k}: ${v}`).join(', ')
              addAudit({
                action: `HITL Step ${s + 1}: ${steps[s].title}`,
                category: 'hitl',
                source: validationArray[i].source || '—',
                result: 'COMPLETED',
                details: summary,
              })
            }
          }
        }

        await delay(400)
        continue
      }

      // Normal (non-HITL) validation
      setExecutions(prev => prev.map(ex =>
        ex.id === execId
          ? { ...ex, validationStatuses: ex.validationStatuses.map((s, j) => j === i ? 'executing' : s) }
          : ex
      ))
      await delay(600)

      const result = executeValidation(validationArray[i], execMemberData)
      results.push(result)

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
        category: validationArray[i].category,
        source: validationArray[i].source || '—',
        result: status.toUpperCase(),
        details: result.message,
      })
    }

    await delay(400)
    const finalOutcome = determineOutcome(validationArray, results, execMemberData)

    const finalStatus = finalOutcome.type === 'approved' ? 'COMPLETED'
      : finalOutcome.type === 'blocked' ? 'BLOCKED'
      : finalOutcome.type === 'customer_action' ? 'AWAITING_DOCUMENTS'
      : finalOutcome.type === 'tax_consent' ? 'AWAITING_CONSENT'
      : finalOutcome.type === 'approval' ? 'PENDING_APPROVAL'
      : 'COMPLETED'

    const isComplex = finalOutcome.type === 'approval' || finalOutcome.type === 'tax_consent'
    const newSla = isComplex ? calculateSlaDeadline(execContract, true) : undefined

    updateExecution(execId, {
      outcome: finalOutcome,
      status: finalStatus,
      ...(newSla ? { slaDeadline: newSla } : {}),
    })

    addAudit({
      action: 'Outcome determination',
      category: 'system',
      source: '—',
      result: finalOutcome.type === 'approved' ? 'SUCCESS' : finalOutcome.type === 'blocked' ? 'FAIL' : 'WARNING',
      details: finalOutcome.message,
    })

    // Easymaze: Update service on completion
    await delay(200)
    tryEasymaze('completion')
  }, [apiKey, updateExecution, emSettings])

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
      apiLogs: [],
      easymazeStatus: null,
      easymazeServiceNumber: null,
      easymazeError: null,
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

    const ucLabel = USE_CASE_LABELS[exec.useCase] || 'request'
    const newOutcome = exec.outcome?.type === 'tax_consent'
      ? {
          ...exec.outcome,
          type: 'approved',
          message: `Early ${exec.useCase === 'early_redemption' ? 'redemption' : 'withdrawal'} approved with tax deductions. Net amount: ₪${exec.outcome.breakdown?.net?.toLocaleString()}`,
        }
      : {
          ...exec.outcome,
          type: 'approved',
          message: `${ucLabel.charAt(0).toUpperCase() + ucLabel.slice(1)} approved by supervisor`,
        }

    updateExecution(selectedExecutionId, {
      outcome: newOutcome,
      status: 'COMPLETED',
      auditEntries: [...exec.auditEntries, {
        action: 'Manual approval',
        category: 'system',
        source: 'supervisor',
        result: 'SUCCESS',
        details: `${ucLabel} approved`,
        timestamp: formatTime(),
      }],
    })
  }, [selectedExecutionId, executions, updateExecution])

  const handleReject = useCallback(() => {
    if (!selectedExecutionId) return
    const exec = executions.find(e => e.id === selectedExecutionId)
    if (!exec) return

    const ucLabel = USE_CASE_LABELS[exec.useCase] || 'request'
    updateExecution(selectedExecutionId, {
      outcome: { ...exec.outcome, type: 'blocked', message: `${ucLabel.charAt(0).toUpperCase() + ucLabel.slice(1)} rejected by supervisor` },
      status: 'REJECTED',
      auditEntries: [...exec.auditEntries, {
        action: 'Manual rejection',
        category: 'system',
        source: 'supervisor',
        result: 'FAIL',
        details: `${ucLabel} rejected`,
        timestamp: formatTime(),
      }],
    })
  }, [selectedExecutionId, executions, updateExecution])

  const handleHitlResolve = useCallback((executionId, validationIndex, decision, stepData) => {
    const resolver = hitlResolvers.current[executionId]
    if (resolver) {
      resolver.resolve({ decision, stepData })
    }
  }, [])

  const selectedExecution = executions.find(e => e.id === selectedExecutionId)

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-bg-card border-b border-border px-6 py-0 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-8">
          <h1 className="text-lg font-bold text-accent tracking-wide py-3">
            <span className="text-text-primary">flow</span>maze
          </h1>
          <nav className="flex">
            <button
              onClick={() => { setActiveTab('executions'); setSelectedExecutionId(null) }}
              className={`px-4 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'executions'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              Executions
              {executions.length > 0 && (
                <span className="ml-2 text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded-full">
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
              Scenario Builder
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'settings'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              ⚙ Settings
              {emSettings.enabled && (
                <span className="ml-1.5 w-1.5 h-1.5 inline-block rounded-full bg-success" />
              )}
            </button>
          </nav>
        </div>
        <p className="text-[10px] text-text-muted">Insurance Back-Office Automation</p>
      </header>

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
          />
        )}

        {activeTab === 'settings' && (
          <SettingsPanel settings={emSettings} setSettings={handleSetEmSettings} />
        )}

        {activeTab === 'executions' && !selectedExecutionId && (
          <ExecutionsList
            executions={executions}
            onSelect={(id) => setSelectedExecutionId(id)}
            onGoToBuilder={() => setActiveTab('builder')}
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
        <p className="text-[10px] text-text-muted">Flowmaze by Walkmaze — AI-Driven Insurance Back-Office Automation</p>
      </footer>
    </div>
  )
}

