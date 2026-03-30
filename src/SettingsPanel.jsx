import { useState } from 'react'
import { testConnection, DEFAULT_SETTINGS } from './easymazeApi'

export default function SettingsPanel({ settings, setSettings }) {
  const [showToken, setShowToken] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [testing, setTesting] = useState(false)
  const [saved, setSaved] = useState(false)

  const update = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    const result = await testConnection(settings)
    setTestResult(result)
    setTesting(false)
  }

  const handleReset = () => {
    setSettings({ ...DEFAULT_SETTINGS })
    setSaved(false)
    setTestResult(null)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-lg">⚙</span>
          <h2 className="text-lg font-bold text-text-primary">Easymaze Integration Settings</h2>
        </div>

        <div className="space-y-5">
          {/* API Base URL */}
          <div>
            <label className="block text-xs text-text-muted uppercase tracking-wider mb-1.5">API Base URL</label>
            <input
              type="text"
              value={settings.apiBaseUrl}
              onChange={e => update('apiBaseUrl', e.target.value)}
              placeholder="https://dev-easymaze.mazemateapp.com"
              className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none placeholder-text-muted/50"
            />
          </div>

          {/* Bearer Token */}
          <div>
            <label className="block text-xs text-text-muted uppercase tracking-wider mb-1.5">Bearer Token</label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={settings.bearerToken}
                onChange={e => update('bearerToken', e.target.value)}
                placeholder="Enter your Easymaze Bearer token"
                className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 pr-16 text-sm text-text-primary focus:border-accent focus:outline-none placeholder-text-muted/50 font-mono"
              />
              <button
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-text-muted hover:text-accent transition-colors px-2 py-0.5 border border-border rounded"
              >
                {showToken ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {/* CORS Proxy */}
          <div>
            <label className="block text-xs text-text-muted uppercase tracking-wider mb-1.5">CORS Proxy URL <span className="normal-case">(optional, for dev/testing)</span></label>
            <input
              type="text"
              value={settings.corsProxyUrl}
              onChange={e => update('corsProxyUrl', e.target.value)}
              placeholder="e.g. https://cors-anywhere.herokuapp.com/"
              className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none placeholder-text-muted/50"
            />
          </div>

          {/* Grid: IDs and codes */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-muted uppercase tracking-wider mb-1.5">Default Customer ID</label>
              <input
                type="text"
                value={settings.defaultCustomerId}
                onChange={e => update('defaultCustomerId', e.target.value)}
                className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
              />
              <p className="text-[10px] text-text-muted mt-1">Easymaze customer entity ID</p>
            </div>
            <div>
              <label className="block text-xs text-text-muted uppercase tracking-wider mb-1.5">Default Contact ID</label>
              <input
                type="text"
                value={settings.defaultContactId}
                onChange={e => update('defaultContactId', e.target.value)}
                className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
              />
              <p className="text-[10px] text-text-muted mt-1">Easymaze contact entity ID</p>
            </div>
            <div>
              <label className="block text-xs text-text-muted uppercase tracking-wider mb-1.5">Service Area</label>
              <input
                type="text"
                value={settings.serviceArea}
                onChange={e => update('serviceArea', e.target.value)}
                className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
              />
              <p className="text-[10px] text-text-muted mt-1">option_set value for service_area</p>
            </div>
            <div>
              <label className="block text-xs text-text-muted uppercase tracking-wider mb-1.5">Service Type</label>
              <input
                type="text"
                value={settings.serviceType}
                onChange={e => update('serviceType', e.target.value)}
                className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
              />
              <p className="text-[10px] text-text-muted mt-1">option_set value for service_type</p>
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3 pt-2">
            <label className="flex items-center justify-between cursor-pointer group">
              <div>
                <span className="text-sm text-text-primary group-hover:text-accent transition-colors">Enable Integration</span>
                <p className="text-[10px] text-text-muted">Create service on every execution</p>
              </div>
              <div
                onClick={() => update('enabled', !settings.enabled)}
                className={`w-10 h-5 rounded-full transition-colors relative ${settings.enabled ? 'bg-accent' : 'bg-border'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${settings.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
            </label>
            <label className="flex items-center justify-between cursor-pointer group">
              <div>
                <span className="text-sm text-text-primary group-hover:text-accent transition-colors">Debug Mode</span>
                <p className="text-[10px] text-text-muted">Log full API request/response payloads</p>
              </div>
              <div
                onClick={() => update('debugMode', !settings.debugMode)}
                className={`w-10 h-5 rounded-full transition-colors relative ${settings.debugMode ? 'bg-accent' : 'bg-border'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${settings.debugMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
            </label>
          </div>

          {/* Test result */}
          {testResult && (
            <div className={`rounded-lg p-3 text-sm flex items-center gap-2 ${testResult.success ? 'bg-success/10 border border-success/30 text-success' : 'bg-error/10 border border-error/30 text-error'}`}>
              <span>{testResult.success ? '✓' : '✗'}</span>
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleTest}
              disabled={testing || !settings.apiBaseUrl || !settings.bearerToken}
              className="bg-bg-primary border border-border hover:border-accent text-text-primary disabled:opacity-40 rounded-lg px-4 py-2 text-sm transition-colors flex items-center gap-2"
            >
              {testing ? (
                <>
                  <span className="inline-block w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  Testing...
                </>
              ) : 'Test Connection'}
            </button>
            <button
              onClick={handleSave}
              className="bg-accent hover:bg-accent/80 text-bg-primary font-semibold rounded-lg px-5 py-2 text-sm transition-colors"
            >
              {saved ? '✓ Saved' : 'Save Settings'}
            </button>
            <button
              onClick={handleReset}
              className="text-text-muted hover:text-error text-sm transition-colors ml-auto"
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
