import { useRef, useState } from 'react'
import { useT, useLoc, useI18n } from '../../i18n'
import { extractTextFromFile, extractRegulationsFromText, MAX_REG_IMPORT_BYTES } from '../../lib/regulationImport'

const KB_LIMIT_KB = MAX_REG_IMPORT_BYTES / 1000

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

export default function RegulationsManagement({
  files,
  setFiles,
  manualEntries,
  setManualEntries,
  apiKey,
}) {
  const t = useT()
  const loc = useLoc()
  const { lang } = useI18n()
  const lk = (field) => (lang === 'he' ? field + 'He' : field)

  const fileInputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(() => new Set())

  const totalEntries =
    files.reduce((sum, f) => sum + (f.entries?.length || 0), 0) + manualEntries.length

  const handleFileSelect = async (e) => {
    const list = Array.from(e.target.files || [])
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (list.length === 0) return
    setError('')
    setBusy(true)
    const newFiles = []
    for (const f of list) {
      if (f.size > MAX_REG_IMPORT_BYTES) {
        setError(t('regMgmt.errors.tooLarge').replace('{kb}', String(KB_LIMIT_KB)))
        continue
      }
      try {
        const text = await extractTextFromFile(f)
        newFiles.push({
          id: newId(),
          name: f.name,
          size: f.size,
          uploadedAt: new Date().toISOString(),
          rawText: text,
          status: 'raw',
          entries: [],
        })
      } catch (err) {
        if (err.code === 'UNSUPPORTED') {
          setError(t('regMgmt.errors.unsupported'))
        } else {
          setError(t('regMgmt.errors.parse').replace('{file}', f.name))
        }
      }
    }
    if (newFiles.length > 0) setFiles(prev => [...prev, ...newFiles])
    setBusy(false)
  }

  const handleDeleteFile = (id) => {
    if (!window.confirm(t('regMgmt.confirm.deleteFile'))) return
    setFiles(prev => prev.filter(f => f.id !== id))
    setExpanded(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const toggleExpand = (id) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleGenerate = async () => {
    if (!apiKey) {
      setError(t('regMgmt.errors.apiKey'))
      return
    }
    if (files.length === 0) return
    setError('')
    setGenerating(true)
    try {
      let counter = 1
      const updated = []
      for (const f of files) {
        try {
          const entries = await extractRegulationsFromText(f.rawText, apiKey)
          const renumbered = entries.map(e => ({ ...e, regulation_id: `REG-IMPORT-${counter++}` }))
          updated.push({ ...f, status: 'processed', entries: renumbered })
        } catch (err) {
          updated.push({ ...f, status: 'raw', entries: [] })
          setError(t('regMgmt.errors.extract').replace('{file}', f.name).replace('{error}', err.message))
        }
      }
      setFiles(updated)
    } finally {
      setGenerating(false)
    }
  }

  const updateFileEntry = (fileId, entryIndex, field, value) => {
    setFiles(prev => prev.map(f => {
      if (f.id !== fileId) return f
      const next = [...f.entries]
      next[entryIndex] = { ...next[entryIndex], [field]: value }
      return { ...f, entries: next }
    }))
  }

  const updateFileEntryRequirement = (fileId, entryIndex, reqIndex, value, field) => {
    setFiles(prev => prev.map(f => {
      if (f.id !== fileId) return f
      const next = [...f.entries]
      const arr = [...(next[entryIndex][field] || [])]
      arr[reqIndex] = value
      next[entryIndex] = { ...next[entryIndex], [field]: arr }
      return { ...f, entries: next }
    }))
  }

  const updateManualEntry = (index, field, value) => {
    setManualEntries(prev => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)))
  }
  const updateManualRequirement = (index, reqIndex, value, field) => {
    setManualEntries(prev => prev.map((r, i) => {
      if (i !== index) return r
      const arr = [...(r[field] || [])]
      arr[reqIndex] = value
      return { ...r, [field]: arr }
    }))
  }
  const addManualRequirement = (index) => {
    setManualEntries(prev => prev.map((r, i) => {
      if (i !== index) return r
      return {
        ...r,
        requirements: [...(r.requirements || []), ''],
        requirementsHe: [...(r.requirementsHe || []), ''],
      }
    }))
  }
  const removeManualEntry = (index) => {
    setManualEntries(prev => prev.filter((_, i) => i !== index))
  }
  const addManualEntry = () => {
    const today = new Date().toISOString().slice(0, 10)
    setManualEntries(prev => [
      ...prev,
      {
        regulation_id: `REG-MANUAL-${prev.length + 1}`,
        authority: 'Custom',
        authorityHe: 'מותאם אישית',
        title: t('dataTabs.newRegTitle'),
        titleHe: t('dataTabs.newRegTitle'),
        requirements: [''],
        requirementsHe: [''],
        effective_date: today,
      },
    ])
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary">{t('regMgmt.title')}</h1>
        <p className="text-xs text-text-muted mt-1">{t('regMgmt.subtitle')}</p>
      </div>

      {error && (
        <div className="bg-error/10 border border-error/30 text-error text-xs rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Source Files */}
      <section className="bg-bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
            {t('regMgmt.sources.title')}
          </h2>
          <label className="cursor-pointer">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".txt,.md,.pdf,.docx,.json,.csv,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileSelect}
              className="hidden"
              disabled={busy || generating}
            />
            <span className="text-xs bg-accent hover:bg-accent/80 disabled:bg-border text-bg-primary font-semibold rounded-lg px-3 py-1.5 transition-colors inline-flex items-center gap-1.5">
              {busy && (
                <span className="inline-block w-3 h-3 border-2 border-bg-primary border-t-transparent rounded-full animate-spin" />
              )}
              📥 {t('regMgmt.sources.upload')}
            </span>
          </label>
        </div>
        <p className="text-[11px] text-text-muted mb-3">
          {t('regMgmt.sources.dropHint').replace('{kb}', String(KB_LIMIT_KB))}
        </p>

        {files.length === 0 ? (
          <div className="text-center py-10 text-text-muted text-sm italic">
            {t('regMgmt.sources.empty')}
          </div>
        ) : (
          <div className="space-y-2">
            {files.map(f => {
              const isExpanded = expanded.has(f.id)
              return (
                <div key={f.id} className="bg-bg-primary rounded-lg border border-border">
                  <div className="flex items-center justify-between px-3 py-2.5 gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-text-primary truncate">{f.name}</span>
                        {f.status === 'processed' ? (
                          <span className="text-[10px] bg-success/20 text-success px-1.5 py-0.5 rounded-full">
                            {t('regMgmt.sources.status.processed')}
                          </span>
                        ) : (
                          <span className="text-[10px] bg-warning/20 text-warning px-1.5 py-0.5 rounded-full">
                            {t('regMgmt.sources.status.raw')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-text-muted mt-0.5">
                        <span>{formatSize(f.size)}</span>
                        <span>{t('regMgmt.sources.uploadedAt').replace('{when}', formatDate(f.uploadedAt))}</span>
                        {f.entries.length > 0 && (
                          <span className="text-accent">
                            {t('regMgmt.sources.entries').replace('{n}', String(f.entries.length))}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {f.entries.length > 0 && (
                        <button
                          onClick={() => toggleExpand(f.id)}
                          className="text-[10px] text-accent hover:text-accent/80"
                        >
                          {isExpanded ? t('regMgmt.sources.hideExtracted') : t('regMgmt.sources.viewExtracted')}
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteFile(f.id)}
                        className="text-text-muted hover:text-error text-sm"
                        title="Delete"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  {isExpanded && f.entries.length > 0 && (
                    <div className="border-t border-border p-3 space-y-2">
                      {f.entries.map((reg, i) => (
                        <RegulationEditor
                          key={i}
                          reg={reg}
                          onUpdate={(field, value) => updateFileEntry(f.id, i, field, value)}
                          onUpdateRequirement={(reqIndex, value, field) =>
                            updateFileEntryRequirement(f.id, i, reqIndex, value, field)
                          }
                          loc={loc}
                          lk={lk}
                          t={t}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Knowledge Base */}
      <section className="bg-bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
              {t('regMgmt.kb.title')}
            </h2>
            <p className="text-[11px] text-text-muted mt-0.5">
              {t('regMgmt.kb.totalEntries').replace('{n}', String(totalEntries))}
            </p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating || files.length === 0 || !apiKey}
            className="bg-accent hover:bg-accent/80 disabled:bg-border disabled:text-text-muted text-bg-primary font-semibold rounded-lg px-4 py-2 text-xs transition-colors inline-flex items-center gap-2"
          >
            {generating && (
              <span className="inline-block w-3 h-3 border-2 border-bg-primary border-t-transparent rounded-full animate-spin" />
            )}
            {generating ? t('regMgmt.kb.generating') : t('regMgmt.kb.generate')}
          </button>
        </div>
        <p className="text-[11px] text-text-muted mb-4">
          {t('regMgmt.kb.regenerateHint')}
          {!apiKey && files.length > 0 && (
            <span className="block text-warning mt-1">{t('regMgmt.errors.apiKey')}</span>
          )}
        </p>

        {totalEntries === 0 ? (
          <div className="text-center py-10 text-text-muted text-sm italic">
            {t('regMgmt.kb.empty')}
          </div>
        ) : (
          <div className="space-y-3">
            {files.flatMap(f =>
              f.entries.map((reg, i) => (
                <div key={`${f.id}-${i}`} className="bg-bg-primary rounded-lg border border-border p-4">
                  <div className="text-[10px] text-text-muted mb-2">
                    {t('regMgmt.kb.fromFile').replace('{file}', f.name)}
                  </div>
                  <RegulationEditor
                    reg={reg}
                    onUpdate={(field, value) => updateFileEntry(f.id, i, field, value)}
                    onUpdateRequirement={(reqIndex, value, field) =>
                      updateFileEntryRequirement(f.id, i, reqIndex, value, field)
                    }
                    loc={loc}
                    lk={lk}
                    t={t}
                  />
                </div>
              ))
            )}
            {manualEntries.map((reg, i) => (
              <div key={`manual-${i}`} className="bg-bg-primary rounded-lg border border-border p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] text-accent font-medium">{t('regMgmt.kb.manual')}</div>
                  <button
                    onClick={() => removeManualEntry(i)}
                    className="text-text-muted hover:text-error text-xs"
                  >
                    ✕
                  </button>
                </div>
                <RegulationEditor
                  reg={reg}
                  onUpdate={(field, value) => updateManualEntry(i, field, value)}
                  onUpdateRequirement={(reqIndex, value, field) =>
                    updateManualRequirement(i, reqIndex, value, field)
                  }
                  onAddRequirement={() => addManualRequirement(i)}
                  loc={loc}
                  lk={lk}
                  t={t}
                />
              </div>
            ))}
          </div>
        )}
        <button
          onClick={addManualEntry}
          className="w-full mt-3 py-2.5 rounded-lg border border-dashed border-accent/40 text-accent text-xs font-medium hover:bg-accent/5 transition-colors flex items-center justify-center gap-1.5"
        >
          <span className="text-sm">+</span> {t('regMgmt.kb.addManual')}
        </button>
      </section>
    </div>
  )
}

function RegulationEditor({ reg, onUpdate, onUpdateRequirement, onAddRequirement, loc, lk, t }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <input
          value={reg.regulation_id || ''}
          onChange={e => onUpdate('regulation_id', e.target.value)}
          className="w-32 text-xs font-mono text-accent bg-accent/10 px-2 py-0.5 rounded border border-transparent focus:border-accent focus:outline-none"
        />
        <input
          value={loc(reg, 'authority') || ''}
          onChange={e => onUpdate(lk('authority'), e.target.value)}
          className="flex-1 text-xs text-text-muted bg-transparent border-b border-transparent focus:border-accent focus:outline-none"
        />
      </div>
      <input
        value={loc(reg, 'title') || ''}
        onChange={e => onUpdate(lk('title'), e.target.value)}
        placeholder={t('dataTabs.newRegTitle')}
        className="w-full bg-transparent text-sm font-semibold text-text-primary mb-2 focus:outline-none border-b border-transparent focus:border-accent"
      />
      <div className="space-y-1">
        {(loc(reg, 'requirements') || reg.requirements || []).map((req, j) => (
          <textarea
            key={j}
            value={req || ''}
            onChange={e => onUpdateRequirement(j, e.target.value, lk('requirements'))}
            placeholder={t('dataTabs.newRegRequirement')}
            rows={2}
            className="w-full bg-bg-card text-xs text-text-muted rounded px-2 py-1.5 focus:outline-none resize-none focus:border-accent border border-transparent"
          />
        ))}
      </div>
      {onAddRequirement && (
        <button
          onClick={onAddRequirement}
          className="mt-1.5 text-[10px] text-accent hover:text-accent/80 transition-colors flex items-center gap-1"
        >
          <span>+</span> {t('dataTabs.addRequirement')}
        </button>
      )}
      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-text-muted">
        <span>{t('dataTabs.effective')}</span>
        <input
          type="date"
          value={reg.effective_date || ''}
          onChange={e => onUpdate('effective_date', e.target.value)}
          className="bg-transparent text-text-muted text-[10px] border-b border-transparent focus:border-accent focus:outline-none"
        />
      </div>
    </div>
  )
}
