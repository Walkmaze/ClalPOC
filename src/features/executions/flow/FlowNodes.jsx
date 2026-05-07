import { Handle, Position } from 'reactflow'

// ─── Type-specific colors ────────────────────────────────────────
const TYPE_COLORS = {
  custom: { border: '#1FC2B8', bg: '#0D2E2F', icon: '#1FC2B8', label: 'Node' },
  webservice: { border: '#2E6BA6', bg: '#0D1E2F', icon: '#5BA3D9', label: 'Web services' },
  splitter: { border: '#FBBF24', bg: '#1A1A0D', icon: '#E879C8', label: 'Splitter' },
  startEnd: { border: '#1FC2B8', bg: '#0D2E2F', icon: '#1FC2B8', label: '' },
}

// ─── Status overlays (ring colors) ──────────────────────────────
const STATUS_RING = {
  pending: { border: '#38595A', opacity: 0.5 },
  executing: { border: '#70E6E8', opacity: 1 },
  pass: { border: '#4ADE80', opacity: 1 },
  fail: { border: '#F87171', opacity: 1 },
  warning: { border: '#FBBF24', opacity: 1 },
  hitl_waiting: { border: '#FBBF24', opacity: 1 },
  skipped: { border: '#38595A', opacity: 0.3 },
  inactive: { border: '#38595A', opacity: 0.3 },
}

// ─── SVG Icons ──────────────────────────────────────────────────
function NodeIcon({ type, size = 22, color }) {
  if (type === 'webservice') {
    // Globe / web icon
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    )
  }
  if (type === 'splitter') {
    // Gear / settings icon (like Flowmaze splitter)
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    )
  }
  // Default: crosshair / grid icon (like Flowmaze node)
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  )
}

function StartEndIcon({ isEnd, size = 20, color }) {
  if (isEnd) {
    // Flag icon
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
        <line x1="4" y1="22" x2="4" y2="15" />
      </svg>
    )
  }
  // Play icon
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
      <polygon points="6,3 20,12 6,21" />
    </svg>
  )
}

// ─── Status indicator dot ───────────────────────────────────────
function StatusDot({ status }) {
  if (status === 'pending') return null
  const colors = {
    executing: '#70E6E8',
    pass: '#4ADE80',
    fail: '#F87171',
    warning: '#FBBF24',
    hitl_waiting: '#FBBF24',
  }
  const icons = {
    pass: '✓',
    fail: '✗',
    warning: '⚠',
    hitl_waiting: '👤',
  }
  const color = colors[status] || '#8AABAD'

  return (
    <div style={{
      position: 'absolute',
      top: -2,
      right: -2,
      width: 16,
      height: 16,
      borderRadius: '50%',
      background: color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '9px',
      fontWeight: 'bold',
      color: '#002122',
      border: '2px solid #002122',
      zIndex: 2,
    }}>
      {status === 'executing' ? (
        <span className="inline-block w-2 h-2 border border-t-transparent rounded-full animate-spin"
          style={{ borderColor: '#002122', borderTopColor: 'transparent' }} />
      ) : (icons[status] || '')}
    </div>
  )
}

// Handle style shared
const handleStyle = { width: 6, height: 6, border: 'none', background: '#38595A' }

// ─── Start/End Node (Circle) ────────────────────────────────────
export function StartEndNode({ data }) {
  const isEnd = data.isEnd
  const endColors = {
    completed: '#4ADE80',
    blocked: '#F87171',
    awaiting: '#FBBF24',
    cancelled: '#8AABAD',
  }
  const ringColor = isEnd && data.endType ? (endColors[data.endType] || '#1FC2B8') : '#1FC2B8'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      {/* Circle */}
      <div style={{
        position: 'relative',
        width: 48,
        height: 48,
        borderRadius: '50%',
        background: '#0D2E2F',
        border: `2.5px solid ${ringColor}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `0 0 12px ${ringColor}33`,
      }}>
        {!isEnd && <Handle type="source" position={Position.Right} style={{ ...handleStyle, background: ringColor }} />}
        {isEnd && <Handle type="target" position={Position.Left} style={{ ...handleStyle, background: ringColor }} />}
        {!isEnd && <Handle type="target" position={Position.Left} style={{ ...handleStyle, background: ringColor, opacity: 0 }} />}
        <StartEndIcon isEnd={isEnd} color={ringColor} />
      </div>
      {/* Label below */}
      <div style={{
        fontSize: '10px',
        fontWeight: 600,
        color: ringColor,
        textAlign: 'center',
        maxWidth: 130,
        lineHeight: '1.3',
        whiteSpace: 'nowrap',
      }}>
        {data.label}
      </div>
    </div>
  )
}

// ─── Custom Node (Processing / Validation) ──────────────────────
export function CustomNode({ data }) {
  const status = data.status || 'pending'
  const isHitl = data.requires_hitl
  const isHitlWaiting = status === 'hitl_waiting'
  const ring = STATUS_RING[status] || STATUS_RING.pending
  const tc = TYPE_COLORS.custom
  const isActive = status !== 'pending' && status !== 'inactive' && status !== 'skipped'
  const borderColor = isActive ? ring.border : tc.border
  const borderOpacity = ring.opacity

  const handleClick = () => {
    if (isHitlWaiting && data.onHitlClick) {
      data.onHitlClick(data.validationIndex)
    } else if (data.onNodeClick) {
      data.onNodeClick(data)
    }
  }

  return (
    <div
      onClick={handleClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        cursor: (data.onNodeClick || isHitlWaiting) ? 'pointer' : 'default',
        opacity: borderOpacity,
      }}
    >
      {/* Circle */}
      <div
        className={status === 'executing' ? 'flow-node-executing' : isHitlWaiting ? 'flow-node-executing' : ''}
        style={{
          position: 'relative',
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: isHitlWaiting ? '#1A1A0D' : tc.bg,
          border: `2.5px solid ${borderColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s ease',
          boxShadow: isActive ? `0 0 12px ${borderColor}44` : 'none',
        }}
      >
        <Handle type="target" position={Position.Left} style={{ ...handleStyle, background: borderColor }} />
        <Handle type="source" position={Position.Right} style={{ ...handleStyle, background: borderColor }} />
        {isHitl ? (
          <span style={{ fontSize: '20px' }}>👤</span>
        ) : (
          <NodeIcon type="custom" color={isActive ? borderColor : tc.icon} />
        )}
        <StatusDot status={status} />
      </div>
      {/* Type label */}
      <div style={{ fontSize: '9px', fontWeight: 700, color: isHitl ? '#FBBF24' : tc.icon, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {isHitl ? 'HITL' : tc.label}
      </div>
      {/* Name */}
      <div style={{
        fontSize: '10px',
        fontWeight: 500,
        color: isActive ? '#FFFFFF' : '#8AABAD',
        textAlign: 'center',
        maxWidth: 130,
        lineHeight: '1.3',
        wordWrap: 'break-word',
      }}>
        {data.label}
      </div>
    </div>
  )
}

// ─── Webservice Node (API calls) ────────────────────────────────
export function WebserviceNode({ data }) {
  const status = data.status || 'pending'
  const ring = STATUS_RING[status] || STATUS_RING.pending
  const tc = TYPE_COLORS.webservice
  const isActive = status !== 'pending' && status !== 'inactive' && status !== 'skipped'
  const borderColor = isActive ? ring.border : tc.border
  const borderOpacity = ring.opacity

  return (
    <div
      onClick={() => data.onNodeClick?.(data)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        cursor: data.onNodeClick ? 'pointer' : 'default',
        opacity: borderOpacity,
      }}
    >
      {/* Circle */}
      <div
        className={status === 'executing' ? 'flow-node-executing' : ''}
        style={{
          position: 'relative',
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: tc.bg,
          border: `2.5px solid ${borderColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s ease',
          boxShadow: isActive ? `0 0 12px ${borderColor}44` : 'none',
        }}
      >
        <Handle type="target" position={Position.Left} style={{ ...handleStyle, background: borderColor }} />
        <Handle type="source" position={Position.Right} style={{ ...handleStyle, background: borderColor }} />
        <NodeIcon type="webservice" color={isActive ? borderColor : tc.icon} />
        <StatusDot status={status} />
      </div>
      {/* Type label */}
      <div style={{ fontSize: '9px', fontWeight: 700, color: tc.icon, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {tc.label}
      </div>
      {/* Name */}
      <div style={{
        fontSize: '10px',
        fontWeight: 500,
        color: isActive ? '#FFFFFF' : '#6B9FCE',
        textAlign: 'center',
        maxWidth: 130,
        lineHeight: '1.3',
        wordWrap: 'break-word',
      }}>
        {data.label}
      </div>
    </div>
  )
}

// ─── Splitter Node (Decision / Branch) ──────────────────────────
export function SplitterNode({ data }) {
  const status = data.status || 'pending'
  const ring = STATUS_RING[status] || STATUS_RING.pending
  const tc = TYPE_COLORS.splitter
  const isActive = status !== 'pending' && status !== 'inactive' && status !== 'skipped'
  const borderColor = isActive ? ring.border : tc.border
  const borderOpacity = ring.opacity

  return (
    <div
      onClick={() => data.onNodeClick?.(data)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        cursor: data.onNodeClick ? 'pointer' : 'default',
        opacity: borderOpacity,
      }}
    >
      {/* Circle */}
      <div
        className={status === 'executing' ? 'flow-node-executing' : ''}
        style={{
          position: 'relative',
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: tc.bg,
          border: `2.5px solid ${borderColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s ease',
          boxShadow: isActive ? `0 0 12px ${borderColor}44` : 'none',
        }}
      >
        <Handle type="target" position={Position.Left} style={{ ...handleStyle, background: borderColor }} />
        <Handle type="source" position={Position.Right} id="yes" style={{ ...handleStyle, background: '#4ADE80' }} />
        <Handle type="source" position={Position.Bottom} id="no" style={{ ...handleStyle, background: '#F87171' }} />
        <NodeIcon type="splitter" color={isActive ? borderColor : tc.icon} />
        <StatusDot status={status} />
      </div>
      {/* Type label */}
      <div style={{ fontSize: '9px', fontWeight: 700, color: tc.icon, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {tc.label}
      </div>
      {/* Name */}
      <div style={{
        fontSize: '10px',
        fontWeight: 500,
        color: isActive ? '#FFFFFF' : '#D4A852',
        textAlign: 'center',
        maxWidth: 130,
        lineHeight: '1.3',
        wordWrap: 'break-word',
      }}>
        {data.label}
      </div>
    </div>
  )
}

// ─── Node Detail Panel ──────────────────────────────────────────
export function NodeDetailPanel({ node, onClose }) {
  if (!node) return null

  const d = node
  const typeIcon = d.nodeType === 'webservice' ? '⊕' : d.nodeType === 'splitter' ? '⚙' : '⊞'
  const typeLabel = d.nodeType === 'webservice' ? 'Web Services'
    : d.nodeType === 'splitter' ? 'Splitter'
    : 'Node'

  const tc = TYPE_COLORS[d.nodeType] || TYPE_COLORS.custom

  const statusColor = d.status === 'pass' ? '#4ADE80'
    : d.status === 'fail' ? '#F87171'
    : d.status === 'warning' ? '#FBBF24'
    : d.status === 'executing' ? '#70E6E8'
    : '#8AABAD'

  return (
    <div className="flow-detail-panel" style={{
      position: 'absolute',
      top: 0,
      right: 0,
      width: '320px',
      height: '100%',
      background: '#0A1F20',
      borderLeft: `2px solid ${tc.border}`,
      zIndex: 50,
      overflow: 'auto',
      padding: '16px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Mini circle */}
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: tc.bg,
            border: `2px solid ${statusColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            flexShrink: 0,
          }}>
            <NodeIcon type={d.nodeType || 'custom'} size={16} color={statusColor} />
          </div>
          <div>
            <div style={{ fontSize: '9px', color: tc.icon, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {typeLabel}
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: statusColor, marginTop: 2 }}>
              {d.label}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: '1px solid #38595A',
            color: '#8AABAD',
            cursor: 'pointer',
            borderRadius: '4px',
            padding: '2px 8px',
            fontSize: '14px',
          }}
        >
          ✕
        </button>
      </div>

      {/* Status badge */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: '12px',
        background: `${statusColor}15`,
        border: `1px solid ${statusColor}33`,
        marginBottom: 14,
      }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor }} />
        <span style={{ fontSize: '10px', fontWeight: 600, color: statusColor, textTransform: 'uppercase' }}>
          {d.status || 'pending'}
        </span>
      </div>

      {/* Category & Source */}
      {d.category && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', marginTop: 4, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '10px',
            padding: '2px 8px',
            borderRadius: '10px',
            background: 'rgba(31, 194, 184, 0.2)',
            color: '#1FC2B8',
          }}>
            {d.category}
          </span>
          {d.source && (
            <span style={{
              fontSize: '10px',
              padding: '2px 8px',
              borderRadius: '10px',
              background: 'rgba(138, 171, 173, 0.15)',
              color: '#8AABAD',
              fontFamily: 'monospace',
            }}>
              {d.source}
            </span>
          )}
        </div>
      )}

      <hr style={{ border: 'none', borderTop: '1px solid #1F4041', margin: '12px 0' }} />

      {/* Validation details */}
      {d.validation && (
        <div>
          {d.validation.rule && <DetailRow label="Rule" value={d.validation.rule} mono />}
          {d.validation.field && <DetailRow label="Field" value={d.validation.field} mono />}
          {d.validation.expected && <DetailRow label="Expected" value={d.validation.expected} />}
          {d.validation.description && <DetailRow label="Description" value={d.validation.description} />}
        </div>
      )}

      {/* Webservice details */}
      {d.nodeType === 'webservice' && d.endpoint && (
        <div>
          <DetailRow label="Endpoint" value={d.endpoint} mono />
          {d.requestPayload && (
            <div style={{ marginTop: '8px' }}>
              <div style={{ fontSize: '10px', color: '#8AABAD', marginBottom: '4px' }}>Request:</div>
              <pre style={{
                fontSize: '10px',
                fontFamily: 'monospace',
                color: '#70E6E8',
                background: 'rgba(0, 33, 34, 0.6)',
                padding: '8px',
                borderRadius: '6px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}>
                {typeof d.requestPayload === 'string' ? d.requestPayload : JSON.stringify(d.requestPayload, null, 2)}
              </pre>
            </div>
          )}
          {d.responsePayload && (
            <div style={{ marginTop: '8px' }}>
              <div style={{ fontSize: '10px', color: '#8AABAD', marginBottom: '4px' }}>Response:</div>
              <pre style={{
                fontSize: '10px',
                fontFamily: 'monospace',
                color: '#4ADE80',
                background: 'rgba(0, 33, 34, 0.6)',
                padding: '8px',
                borderRadius: '6px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}>
                {typeof d.responsePayload === 'string' ? d.responsePayload : JSON.stringify(d.responsePayload, null, 2)}
              </pre>
            </div>
          )}
          {d.statusCode && (
            <DetailRow label="Status" value={`${d.statusCode} ${d.statusCode === 200 ? 'OK' : 'Error'}`} color={d.statusCode === 200 ? '#4ADE80' : '#F87171'} />
          )}
        </div>
      )}

      {/* Splitter details */}
      {d.nodeType === 'splitter' && (
        <div>
          {d.condition && <DetailRow label="Condition" value={d.condition} mono />}
          {d.actualValue && <DetailRow label="Actual value" value={d.actualValue} />}
          {d.branchTaken && (
            <DetailRow label="Branch taken" value={d.branchTaken} color={d.branchTaken === 'Yes' || d.branchTaken === 'Pass' ? '#4ADE80' : '#F87171'} />
          )}
        </div>
      )}

      {/* Result */}
      {d.result && (
        <>
          <hr style={{ border: 'none', borderTop: '1px solid #1F4041', margin: '12px 0' }} />
          <DetailRow label="Value" value={d.result.actual_value} />
          <DetailRow label="Result" value={d.result.message} color={statusColor} />
        </>
      )}

      {/* Duration */}
      {d.duration && (
        <>
          <hr style={{ border: 'none', borderTop: '1px solid #1F4041', margin: '12px 0' }} />
          <DetailRow label="Duration" value={d.duration} />
        </>
      )}
    </div>
  )
}

function DetailRow({ label, value, mono, color }) {
  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{ fontSize: '10px', color: '#8AABAD', marginBottom: '2px' }}>{label}</div>
      <div style={{
        fontSize: '12px',
        color: color || '#FFFFFF',
        fontFamily: mono ? 'monospace' : 'inherit',
        wordBreak: 'break-word',
      }}>
        {value}
      </div>
    </div>
  )
}
