import { useState, useEffect } from 'react'
import { useT, useLoc } from './i18n'

const FIELD_RENDERERS = {
  text: ({ field, value, onChange }) => (
    <input
      type="text"
      value={value || ''}
      onChange={e => onChange(field.name, e.target.value)}
      placeholder={field.placeholder || ''}
      className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
    />
  ),
  textarea: ({ field, value, onChange }) => (
    <textarea
      value={value || ''}
      onChange={e => onChange(field.name, e.target.value)}
      placeholder={field.placeholder || ''}
      rows={3}
      className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none resize-none"
    />
  ),
  select: ({ field, value, onChange }) => (
    <select
      value={value || ''}
      onChange={e => onChange(field.name, e.target.value)}
      className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
    >
      <option value="">Select...</option>
      {(field.options || []).map(opt => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  ),
  number: ({ field, value, onChange }) => (
    <input
      type="number"
      value={value ?? ''}
      onChange={e => onChange(field.name, e.target.value === '' ? '' : Number(e.target.value))}
      min={field.min}
      max={field.max}
      className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
    />
  ),
  date: ({ field, value, onChange }) => (
    <input
      type="date"
      value={value || ''}
      onChange={e => onChange(field.name, e.target.value)}
      className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
    />
  ),
  checkbox: ({ field, value, onChange }) => (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={!!value}
        onChange={e => onChange(field.name, e.target.checked)}
        className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
      />
      <span className="text-sm text-text-primary">{field.label}</span>
    </label>
  ),
  file: ({ field, value, onChange }) => {
    const [fileName, setFileName] = useState(value || '')
    const t = useT()
    return (
      <div
        className="w-full bg-bg-primary border border-dashed border-border rounded-lg px-3 py-4 text-center cursor-pointer hover:border-accent/50 transition-colors"
        onClick={() => {
          const name = `document_${Date.now()}.pdf`
          setFileName(name)
          onChange(field.name, name)
        }}
      >
        {fileName ? (
          <div className="flex items-center justify-center gap-2">
            <span className="text-success text-sm">📎</span>
            <span className="text-sm text-text-primary">{fileName}</span>
          </div>
        ) : (
          <span className="text-xs text-text-muted">{t('hitl.uploadFile')}</span>
        )}
      </div>
    )
  },
}

function StepCard({ step, stepIndex, totalSteps, state, formData, onFieldChange, onNext, onSubmit }) {
  const isCurrent = state === 'current'
  const isCompleted = state === 'completed'
  const isLast = stepIndex === totalSteps - 1
  const t = useT()
  const loc = useLoc()

  return (
    <div
      className={`rounded-xl border-2 transition-all duration-300 overflow-hidden ${
        isCurrent ? 'border-accent bg-bg-card animate-fade-in-up'
          : isCompleted ? 'border-success/30 bg-success/5'
          : 'border-border/50 bg-bg-card/50 opacity-60'
      }`}
    >
      {/* Step header */}
      <div className={`px-4 py-3 flex items-center justify-between ${isCompleted ? 'cursor-default' : ''}`}>
        <div className="flex items-center gap-2.5">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
            isCompleted ? 'bg-success text-bg-primary'
              : isCurrent ? 'bg-accent text-bg-primary'
              : 'bg-border text-text-muted'
          }`}>
            {isCompleted ? '✓' : stepIndex + 1}
          </div>
          <div>
            <h4 className={`text-sm font-semibold ${isCurrent ? 'text-text-primary' : isCompleted ? 'text-success' : 'text-text-muted'}`}>
              {loc(step, 'title')}
            </h4>
            {!isCurrent && !isCompleted && (
              <p className="text-[10px] text-text-muted">{t('hitl.locked')}</p>
            )}
          </div>
        </div>
      </div>

      {/* Completed summary */}
      {isCompleted && formData && (
        <div className="px-4 pb-3">
          <div className="text-xs text-text-muted space-y-0.5">
            {step.fields.map(field => {
              const val = formData[field.name]
              if (!val && val !== false && val !== 0) return null
              return (
                <div key={field.name} className="flex gap-1.5">
                  <span className="text-success/70">{loc(field, 'label')}:</span>
                  <span className="text-text-primary">{typeof val === 'boolean' ? (val ? t('hitl.yes') : t('hitl.no')) : String(val)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Current step form */}
      {isCurrent && (
        <div className="px-4 pb-4 space-y-3 animate-fade-in-up">
          <p className="text-xs text-text-muted">{loc(step, 'description')}</p>
          {step.fields.map(field => {
            const Renderer = FIELD_RENDERERS[field.type] || FIELD_RENDERERS.text
            return (
              <div key={field.name}>
                {field.type !== 'checkbox' && (
                  <label className="block text-xs text-text-muted mb-1">{loc(field, 'label')}</label>
                )}
                <Renderer field={field} value={formData?.[field.name]} onChange={onFieldChange} />
              </div>
            )
          })}
          <div className="flex justify-end pt-2">
            {isLast ? (
              <button
                onClick={onSubmit}
                className="bg-success hover:bg-success/80 text-bg-primary font-semibold rounded-lg px-5 py-2 text-sm transition-colors"
              >
                {t('hitl.submit')}
              </button>
            ) : (
              <button
                onClick={onNext}
                className="bg-accent hover:bg-accent/80 text-bg-primary font-semibold rounded-lg px-5 py-2 text-sm transition-colors flex items-center gap-1.5"
              >
                {t('hitl.next')} <span>→</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function HitlPanel({ validation, validationIndex, onResolve, onClose }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [stepData, setStepData] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const t = useT()
  const loc = useLoc()

  const steps = validation?.hitl_steps || []

  useEffect(() => {
    // Reset when opening a new validation
    setCurrentStep(0)
    setStepData({})
    setSubmitted(false)
  }, [validation?.id])

  if (!validation || !steps.length) return null

  const handleFieldChange = (stepIdx, fieldName, value) => {
    setStepData(prev => ({
      ...prev,
      [stepIdx]: { ...(prev[stepIdx] || {}), [fieldName]: value },
    }))
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleSubmit = () => {
    setSubmitted(true)

    // Determine outcome from the last step's decision field
    const lastStepData = stepData[steps.length - 1] || {}
    const decision = lastStepData.decision || lastStepData.final_decision || ''
    const decisionLower = decision.toLowerCase()

    let result = 'approve'
    if (decisionLower.includes('reject')) result = 'reject'
    else if (decisionLower.includes('escalate')) result = 'escalate'

    // Small delay for the confirmation animation
    setTimeout(() => {
      onResolve(validationIndex, result, stepData)
    }, 1200)
  }

  const progress = ((currentStep + (submitted ? 1 : 0)) / steps.length) * 100

  if (submitted) {
    return (
      <div className="w-96 bg-bg-card border-s-2 border-accent h-full overflow-y-auto p-5 shrink-0 animate-fade-in-up">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mb-4 animate-scale-in">
            <span className="text-3xl">✓</span>
          </div>
          <h3 className="text-lg font-bold text-success mb-2">{t('hitl.submitted')}</h3>
          <p className="text-sm text-text-muted text-center">{t('hitl.submitted.desc')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-96 bg-bg-card border-s-2 border-accent h-full overflow-y-auto shrink-0">
      {/* Header */}
      <div className="sticky top-0 bg-bg-card z-10 p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">👤</span>
            <h3 className="text-sm font-bold text-text-primary">{t('hitl.title')}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary text-xs border border-border rounded px-2 py-0.5"
          >
            ✕
          </button>
        </div>

        <h4 className="text-sm font-semibold text-accent mb-1">{loc(validation, 'name')}</h4>
        <p className="text-xs text-text-muted mb-3">{loc(validation, 'hitl_reason')}</p>

        {/* Progress */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-text-muted whitespace-nowrap">{t('hitl.step')} {currentStep + 1} {t('hitl.of')} {steps.length}</span>
          <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="p-4 space-y-3">
        {steps.map((step, i) => {
          let state = 'locked'
          if (i < currentStep) state = 'completed'
          else if (i === currentStep) state = 'current'

          return (
            <StepCard
              key={step.step_id || i}
              step={step}
              stepIndex={i}
              totalSteps={steps.length}
              state={state}
              formData={stepData[i]}
              onFieldChange={(name, val) => handleFieldChange(i, name, val)}
              onNext={handleNext}
              onSubmit={handleSubmit}
            />
          )
        })}
      </div>
    </div>
  )
}
