import { useState, useCallback, useRef } from 'react'
import Sidebar from './Sidebar'
import DataTabs from './DataTabs'
import FlowExecution from './FlowExecution'
import AuditTrail from './AuditTrail'
import { generateMemberData, generatePolicies, generateRegulations, FUND_TYPES, USE_CASES, getUseCaseLabel } from './dataGenerators'
import { callClaude } from './claudeApi'
import { executeValidation, determineOutcome } from './validationEngine'

function formatTime() {
  const now = new Date()
  return now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
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

export default function App() {
  const [fundType, setFundType] = useState('investment')
  const [useCase, setUseCase] = useState('withdrawal')
  const [memberData, setMemberData] = useState(null)
  const [policies, setPolicies] = useState([])
  const [regulations, setRegulations] = useState([])

  const [isRunning, setIsRunning] = useState(false)
  const [analysisMessages, setAnalysisMessages] = useState(null)
  const [validations, setValidations] = useState(null)
  const [validationStatuses, setValidationStatuses] = useState([])
  const [validationResults, setValidationResults] = useState([])
  const [outcome, setOutcome] = useState(null)
  const [auditEntries, setAuditEntries] = useState([])
  const [processInfo, setProcessInfo] = useState(null)

  const [runHistory, setRunHistory] = useState([])
  const [error, setError] = useState(null)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('flowmaze_api_key') || '')

  const abortRef = useRef(false)

  const handleSetApiKey = useCallback((key) => {
    setApiKey(key)
    localStorage.setItem('flowmaze_api_key', key)
  }, [])

  const handleGenerate = useCallback(() => {
    const data = generateMemberData(fundType, useCase)
    const pols = generatePolicies(fundType, useCase, data)
    const regs = generateRegulations(useCase)
    setMemberData(data)
    setPolicies(pols)
    setRegulations(regs)
    // Reset flow state
    setAnalysisMessages(null)
    setValidations(null)
    setValidationStatuses([])
    setValidationResults([])
    setOutcome(null)
    setAuditEntries([])
    setProcessInfo(null)
    setError(null)
  }, [fundType, useCase])

  const delay = (ms) => new Promise(r => setTimeout(r, ms))

  const addAuditEntry = useCallback((entry) => {
    setAuditEntries(prev => [...prev, { ...entry, timestamp: formatTime() }])
  }, [])

  const handleRunFlow = useCallback(async () => {
    if (!memberData) return
    abortRef.current = false
    setIsRunning(true)
    setError(null)
    setOutcome(null)
    setValidations(null)
    setValidationStatuses([])
    setValidationResults([])
    setAuditEntries([])

    const currentUseCase = memberData.use_case || useCase
    const ucLabel = USE_CASE_LABELS[currentUseCase] || 'request'
    const ucIcon = USE_CASE_ICONS[currentUseCase] || '📋'

    const procId = `PROC-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`
    const fundLabel = FUND_TYPES.find(f => f.id === fundType)
    setProcessInfo({
      processId: procId,
      memberId: memberData.member_id,
      memberName: memberData.member_name,
      fundType: `${fundLabel?.labelHe} — ${fundLabel?.label}`,
      useCase: getUseCaseLabel(fundType, currentUseCase),
      status: 'RUNNING',
    })

    // Phase 1: Analysis animation
    const messages = [
      { icon: '⏳', text: `Receiving ${ucLabel} for ${memberData.member_name}...` },
      { icon: '📋', text: `Analyzing member profile and fund data...` },
      { icon: '📜', text: `Reading ${policies.length} insurance policy clauses...` },
      { icon: '⚖️', text: `Checking ${regulations.length} regulatory requirements...` },
      { icon: '🧠', text: `Determining required validation steps for ${ucLabel}...` },
    ]

    setAnalysisMessages([])
    addAuditEntry({ action: 'Request intake', category: 'system', source: '—', result: 'SUCCESS', details: `${ucIcon} ${ucLabel} — Process ${procId} initiated` })

    for (let i = 0; i < messages.length; i++) {
      if (abortRef.current) return
      await delay(800)
      setAnalysisMessages(prev => [...prev, { ...messages[i], done: true }])
    }

    addAuditEntry({ action: 'Policy analysis', category: 'ai', source: '—', result: 'SUCCESS', details: `${policies.length} policies analyzed` })
    addAuditEntry({ action: 'Regulation check', category: 'ai', source: '—', result: 'SUCCESS', details: `${regulations.length} regulations checked` })

    // Phase 2: Claude API call
    let validationArray
    try {
      validationArray = await callClaude(memberData, policies, regulations, apiKey)
    } catch (err) {
      setError(`API Error: ${err.message}`)
      setIsRunning(false)
      setProcessInfo(prev => ({ ...prev, status: 'ERROR' }))
      return
    }

    if (!Array.isArray(validationArray) || validationArray.length === 0) {
      setError('Claude returned an invalid response. Please try again.')
      setIsRunning(false)
      setProcessInfo(prev => ({ ...prev, status: 'ERROR' }))
      return
    }

    // Show completion message
    await delay(500)
    setAnalysisMessages(prev => [...prev, { icon: '✅', text: `Flow generated: ${validationArray.length} validation steps identified`, done: true }])
    addAuditEntry({ action: 'Flow generation', category: 'ai', source: '—', result: 'SUCCESS', details: `${validationArray.length} validations generated` })

    // Phase 3: Render all cards as pending, then execute
    setValidations(validationArray)
    setValidationStatuses(validationArray.map(() => 'pending'))
    setValidationResults(validationArray.map(() => null))

    await delay(600)

    const results = []
    for (let i = 0; i < validationArray.length; i++) {
      if (abortRef.current) return

      setValidationStatuses(prev => prev.map((s, j) => j === i ? 'executing' : s))
      await delay(600)

      const result = executeValidation(validationArray[i], memberData)
      results.push(result)

      const status = result.passed ? 'pass' : (validationArray[i].severity === 'warning' ? 'warning' : 'fail')
      setValidationStatuses(prev => prev.map((s, j) => j === i ? status : s))
      setValidationResults(prev => prev.map((r, j) => j === i ? result : r))

      addAuditEntry({
        action: validationArray[i].name,
        category: validationArray[i].category,
        source: validationArray[i].source || '—',
        result: status.toUpperCase(),
        details: result.message,
      })
    }

    // Phase 4: Determine outcome
    await delay(400)
    const finalOutcome = determineOutcome(validationArray, results, memberData)
    setOutcome(finalOutcome)
    setProcessInfo(prev => ({
      ...prev,
      status: finalOutcome.type === 'approved' ? 'COMPLETED'
        : finalOutcome.type === 'blocked' ? 'BLOCKED'
        : finalOutcome.type === 'customer_action' ? 'AWAITING_DOCUMENTS'
        : finalOutcome.type === 'tax_consent' ? 'AWAITING_CONSENT'
        : 'PENDING',
    }))

    addAuditEntry({
      action: 'Outcome determination',
      category: 'system',
      source: '—',
      result: finalOutcome.type === 'approved' ? 'SUCCESS' : finalOutcome.type === 'blocked' ? 'FAIL' : 'WARNING',
      details: finalOutcome.message,
    })

    // Add to run history
    setRunHistory(prev => [{
      fundType,
      useCase: currentUseCase,
      memberName: memberData.member_name,
      outcomeType: finalOutcome.type,
      timestamp: formatTime(),
      snapshot: {
        memberData: { ...memberData },
        policies: [...policies],
        regulations: [...regulations],
        validations: validationArray,
        results,
        outcome: finalOutcome,
      },
    }, ...prev].slice(0, 10))

    setIsRunning(false)
  }, [memberData, policies, regulations, fundType, useCase, apiKey, addAuditEntry])

  const handleApprove = useCallback(() => {
    const currentUseCase = memberData?.use_case || useCase
    const ucLabel = USE_CASE_LABELS[currentUseCase] || 'request'
    setOutcome(prev => ({
      ...prev,
      type: 'approved',
      message: prev.type === 'tax_consent'
        ? `Early ${currentUseCase === 'early_redemption' ? 'redemption' : 'withdrawal'} approved with tax deductions. Net amount: ₪${prev.breakdown.net.toLocaleString()}`
        : `${ucLabel.charAt(0).toUpperCase() + ucLabel.slice(1)} approved by supervisor`,
    }))
    setProcessInfo(prev => ({ ...prev, status: 'COMPLETED' }))
    addAuditEntry({ action: 'Manual approval', category: 'system', source: 'supervisor', result: 'SUCCESS', details: `${ucLabel} approved` })
  }, [memberData, useCase, addAuditEntry])

  const handleReject = useCallback(() => {
    const currentUseCase = memberData?.use_case || useCase
    const ucLabel = USE_CASE_LABELS[currentUseCase] || 'request'
    setOutcome(prev => ({ ...prev, type: 'blocked', message: `${ucLabel.charAt(0).toUpperCase() + ucLabel.slice(1)} rejected by supervisor` }))
    setProcessInfo(prev => ({ ...prev, status: 'REJECTED' }))
    addAuditEntry({ action: 'Manual rejection', category: 'system', source: 'supervisor', result: 'FAIL', details: `${ucLabel} rejected` })
  }, [memberData, useCase, addAuditEntry])

  const handleSelectRun = useCallback((run) => {
    const { snapshot } = run
    setMemberData(snapshot.memberData)
    setPolicies(snapshot.policies)
    setRegulations(snapshot.regulations)
    setFundType(run.fundType)
    setUseCase(run.useCase || 'withdrawal')
    setValidations(snapshot.validations)
    setValidationStatuses(snapshot.validations.map((_, i) => snapshot.results[i].passed ? 'pass' : 'fail'))
    setValidationResults(snapshot.results)
    setOutcome(snapshot.outcome)
    setAnalysisMessages([
      { icon: '✅', text: `Replaying flow: ${snapshot.validations.length} validation steps`, done: true },
    ])
  }, [])

  const currentUseCases = USE_CASES[fundType] || []
  const currentUcInfo = currentUseCases.find(uc => uc.id === useCase)

  return (
    <div className="flex min-h-screen">
      <Sidebar
        fundType={fundType}
        setFundType={setFundType}
        useCase={useCase}
        setUseCase={setUseCase}
        onGenerate={handleGenerate}
        onRunFlow={handleRunFlow}
        isRunning={isRunning}
        runHistory={runHistory}
        onSelectRun={handleSelectRun}
        hasData={!!memberData}
        apiKey={apiKey}
        setApiKey={handleSetApiKey}
      />

      <main className="flex-1 p-6 overflow-y-auto max-h-screen">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-text-primary">Insurance Automation POC</h2>
          <p className="text-sm text-text-muted mt-1">
            AI-driven real-time validation engine for fund operations
            {currentUcInfo && (
              <span className="ml-2 text-accent">
                — {currentUcInfo.icon} {currentUcInfo.label}
              </span>
            )}
          </p>
        </div>

        {/* Data Tabs */}
        <DataTabs
          memberData={memberData}
          setMemberData={setMemberData}
          policies={policies}
          setPolicies={setPolicies}
          regulations={regulations}
          setRegulations={setRegulations}
        />

        {/* Error */}
        {error && (
          <div className="mt-4 bg-error/10 border border-error rounded-lg p-4 text-sm text-error">
            {error}
          </div>
        )}

        {/* Flow Execution */}
        <div className="mt-4">
          <FlowExecution
            analysisMessages={analysisMessages}
            validations={validations}
            validationStatuses={validationStatuses}
            validationResults={validationResults}
            outcome={outcome}
            onApprove={handleApprove}
            onReject={handleReject}
            useCase={memberData?.use_case || useCase}
            memberData={memberData}
          />
        </div>

        {/* Audit Trail */}
        <AuditTrail entries={auditEntries} processInfo={processInfo} />

        {/* Footer */}
        <footer className="mt-8 py-4 border-t border-border text-center">
          <p className="text-xs text-text-muted">Flowmaze by Walkmaze — AI-Driven Insurance Back-Office Automation</p>
        </footer>
      </main>
    </div>
  )
}
