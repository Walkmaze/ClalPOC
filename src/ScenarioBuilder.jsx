import { useState } from 'react'
import { FUND_TYPES, USE_CASES } from './dataGenerators'
import DataTabs from './DataTabs'

const FLOOD_PRESETS = [5, 10, 20, 50]

export default function ScenarioBuilder({
  fundType, setFundType,
  useCase, setUseCase,
  memberData, setMemberData,
  contract, setContract,
  regulations, setRegulations,
  onGenerate, onLaunch,
  isRunning, apiKey, setApiKey,
  onFlood, floodProgress,
}) {
  const [floodCount, setFloodCount] = useState(10)
  const currentUseCases = USE_CASES[fundType] || []

  const handleFundTypeChange = (newFundType) => {
    setFundType(newFundType)
    const firstUseCase = USE_CASES[newFundType]?.[0]?.id || 'withdrawal'
    setUseCase(firstUseCase)
  }

  return (
    <div className="flex gap-6 h-full">
      {/* Left sidebar — fund + action + generate */}
      <div className="w-72 shrink-0 space-y-5">
        {/* Fund Type */}
        <div className="bg-bg-card rounded-xl border border-border p-4">
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

          {/* Use Case */}
          <label className="block text-xs text-text-muted uppercase tracking-wider mb-2 mt-4">Action</label>
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
            className="w-full mt-4 bg-teal hover:bg-teal/80 text-bg-primary font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors"
          >
            Generate Random Scenario
          </button>
        </div>

        {/* API Key */}
        <div className="bg-bg-card rounded-xl border border-border p-4">
          <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">Claude API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="sk-ant-..."
            className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none placeholder-text-muted/50"
          />
          {apiKey && (
            <div className="flex items-center gap-1.5 mt-2">
              <div className="w-1.5 h-1.5 rounded-full bg-success" />
              <span className="text-[10px] text-success">Key configured</span>
            </div>
          )}
        </div>

        {/* Launch button */}
        <button
          onClick={onLaunch}
          disabled={isRunning || !memberData || !apiKey}
          className="w-full bg-accent hover:bg-accent/80 disabled:bg-border disabled:text-text-muted text-bg-primary font-bold rounded-xl px-4 py-4 text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-accent/20 disabled:shadow-none"
        >
          {isRunning ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-bg-primary border-t-transparent rounded-full animate-spin" />
              Launching...
            </>
          ) : (
            'Launch Scenario'
          )}
        </button>
        {!memberData && (
          <p className="text-[10px] text-text-muted text-center -mt-3">Generate a scenario first</p>
        )}
        {memberData && !apiKey && (
          <p className="text-[10px] text-warning text-center -mt-3">API key required to launch</p>
        )}

        {/* Bulk Launch */}
        <div className="bg-bg-card rounded-xl border border-border p-4">
          <h3 className="text-xs text-text-muted uppercase tracking-wider mb-2">Bulk Launch</h3>
          <p className="text-[11px] text-text-muted mb-3">Generate and launch multiple random scenarios with mixed fund types and outcomes. No API key needed.</p>

          <div className="flex gap-1.5 mb-3">
            {FLOOD_PRESETS.map(n => (
              <button
                key={n}
                onClick={() => setFloodCount(n)}
                className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors ${
                  floodCount === n
                    ? 'border-accent bg-accent/15 text-accent font-semibold'
                    : 'border-border bg-bg-primary text-text-muted hover:text-text-primary'
                }`}
              >
                {n}
              </button>
            ))}
          </div>

          {floodCount >= 50 && (
            <p className="text-[10px] text-warning mb-2">50 scenarios will take ~15-20 seconds to inject.</p>
          )}

          <button
            onClick={() => onFlood?.(floodCount)}
            disabled={!!floodProgress}
            className="w-full bg-warning hover:bg-warning/80 disabled:bg-border disabled:text-text-muted text-bg-primary font-bold rounded-lg px-4 py-3 text-sm transition-colors flex items-center justify-center gap-2"
          >
            {floodProgress ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-bg-primary border-t-transparent rounded-full animate-spin" />
                {floodProgress.launched} / {floodProgress.total}
              </>
            ) : (
              <>🚀 Flood the System</>
            )}
          </button>
        </div>
      </div>

      {/* Right area — data tabs */}
      <div className="flex-1 min-w-0">
        <DataTabs
          memberData={memberData}
          setMemberData={setMemberData}
          contract={contract}
          setContract={setContract}
          regulations={regulations}
          setRegulations={setRegulations}
        />
      </div>
    </div>
  )
}
