import { FUND_TYPES, USE_CASES } from './dataGenerators'

const OUTCOME_COLORS = {
  approved: 'bg-success/20 text-success',
  blocked: 'bg-error/20 text-error',
  customer_action: 'bg-error/20 text-error',
  tax_consent: 'bg-warning/20 text-warning',
  approval: 'bg-warning/20 text-warning',
}

const OUTCOME_LABELS = {
  approved: 'Approved',
  blocked: 'Blocked',
  customer_action: 'Action Required',
  tax_consent: 'Tax & Fees',
  approval: 'Pending Approval',
}

const USE_CASE_ICONS = {
  withdrawal: '💰',
  fund_transfer: '🔄',
  beneficiary_update: '👤',
  employer_change: '🏢',
  early_redemption: '⏰',
}

export default function Sidebar({ fundType, setFundType, useCase, setUseCase, onGenerate, onRunFlow, isRunning, runHistory, onSelectRun, hasData, apiKey, setApiKey }) {
  const currentUseCases = USE_CASES[fundType] || []

  // When fund type changes, reset use case to first available
  const handleFundTypeChange = (newFundType) => {
    setFundType(newFundType)
    const firstUseCase = USE_CASES[newFundType]?.[0]?.id || 'withdrawal'
    setUseCase(firstUseCase)
  }

  return (
    <aside className="w-72 min-h-screen bg-bg-card border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-border">
        <h1 className="text-xl font-bold text-accent tracking-wide">⚡ Flowmaze</h1>
        <p className="text-xs text-text-muted mt-1">AI-Driven Insurance Automation</p>
      </div>

      {/* Fund Type Selector */}
      <div className="p-4 border-b border-border">
        <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">Fund Type</label>
        <select
          value={fundType}
          onChange={e => handleFundTypeChange(e.target.value)}
          className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
        >
          {FUND_TYPES.map(ft => (
            <option key={ft.id} value={ft.id}>{ft.labelHe} — {ft.label}</option>
          ))}
        </select>

        {/* Use Case Selector */}
        <label className="block text-xs text-text-muted uppercase tracking-wider mb-2 mt-3">Action</label>
        <div className="space-y-1.5">
          {currentUseCases.map(uc => (
            <button
              key={uc.id}
              onClick={() => setUseCase(uc.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${
                useCase === uc.id
                  ? 'bg-accent/15 border border-accent/40 text-accent font-medium'
                  : 'bg-bg-primary border border-border text-text-muted hover:text-text-primary hover:border-border/80'
              }`}
            >
              <span>{uc.icon}</span>
              <div>
                <div className="text-sm leading-tight">{uc.label}</div>
                <div className="text-[10px] opacity-70">{uc.labelHe}</div>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={onGenerate}
          className="w-full mt-3 bg-teal hover:bg-teal/80 text-bg-primary font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors"
        >
          Generate Random Scenario
        </button>
      </div>

      {/* API Key */}
      <div className="p-4 border-b border-border">
        <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">API Key</label>
        <input
          type="password"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder="sk-ant-..."
          className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none placeholder-text-muted/50"
        />
      </div>

      {/* Run Flow */}
      <div className="p-4 border-b border-border">
        <button
          onClick={onRunFlow}
          disabled={isRunning || !hasData}
          className="w-full bg-accent hover:bg-accent/80 disabled:bg-border disabled:text-text-muted text-bg-primary font-bold rounded-lg px-4 py-3 text-sm transition-colors flex items-center justify-center gap-2"
        >
          {isRunning ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-bg-primary border-t-transparent rounded-full animate-spin" />
              Running Flow...
            </>
          ) : (
            '🚀 Run Flow'
          )}
        </button>
      </div>

      {/* Run History */}
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-xs text-text-muted uppercase tracking-wider mb-3">Recent Runs</h3>
        {runHistory.length === 0 ? (
          <p className="text-xs text-text-muted italic">No runs yet</p>
        ) : (
          <div className="space-y-2">
            {runHistory.map((run, i) => (
              <button
                key={i}
                onClick={() => onSelectRun(run)}
                className="w-full text-left bg-bg-primary hover:bg-bg-card-hover rounded-lg p-3 transition-colors border border-border/50"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-text-primary truncate max-w-[120px]">
                    {USE_CASE_ICONS[run.useCase] || '📋'} {run.memberName}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${OUTCOME_COLORS[run.outcomeType] || 'bg-border text-text-muted'}`}>
                    {OUTCOME_LABELS[run.outcomeType] || run.outcomeType}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-text-muted">
                    {FUND_TYPES.find(f => f.id === run.fundType)?.labelHe}
                  </span>
                  <span className="text-[10px] text-text-muted">{run.timestamp}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <p className="text-[10px] text-text-muted text-center">Flowmaze by Walkmaze</p>
      </div>
    </aside>
  )
}
