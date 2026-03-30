import dagre from 'dagre'

const FUND_TYPE_NAMES = {
  investment: 'Investment Provident Fund',
  compensation: 'Compensation Fund',
  study: 'Study Fund',
}

const USE_CASE_NAMES = {
  withdrawal: 'Withdrawal',
  fund_transfer: 'Fund Transfer',
  beneficiary_update: 'Beneficiary Update',
  employer_change: 'Employer Change',
  early_redemption: 'Early Redemption',
}

// Determine if a validation involves an external API call
function isApiValidation(validation) {
  const name = (validation.name || '').toLowerCase()
  const field = (validation.field || '').toLowerCase()

  if (field === 'id_confidence' || name.includes('id photo') || name.includes('identity') || name.includes('photo verif')) return true
  if (field === 'account_owner' || name.includes('bank') || name.includes('account owner')) return true
  if (name.includes('tax calc') || name.includes('calculate tax')) return true
  if (name.includes('aml') || name.includes('anti-money')) return true

  return false
}

function getWsLabel(validation) {
  const field = (validation.field || '').toLowerCase()
  const name = (validation.name || '').toLowerCase()

  if (field === 'id_confidence' || name.includes('id photo') || name.includes('photo')) return 'WS: Verify ID photo'
  if (field === 'account_owner' || name.includes('bank') || name.includes('account owner')) return 'WS: Validate bank account'
  if (name.includes('aml') || name.includes('anti-money')) return 'WS: AML screening'
  if (name.includes('tax')) return 'WS: Calculate tax'
  return `WS: ${validation.name}`
}

function getWsEndpoint(validation) {
  const field = (validation.field || '').toLowerCase()
  const name = (validation.name || '').toLowerCase()

  if (field === 'id_confidence' || name.includes('id photo')) return 'POST /api/identity/verify'
  if (field === 'account_owner' || name.includes('bank')) return 'POST /api/bank/validate'
  if (name.includes('aml')) return 'POST /api/compliance/aml-check'
  if (name.includes('tax')) return 'POST /api/tax/calculate'
  return 'POST /api/validate'
}

function getSplitLabel(val) {
  const name = (val.name || '').toLowerCase()
  const field = (val.field || '').toLowerCase()

  if (field === 'id_confidence' || name.includes('id photo') || name.includes('confidence')) return 'ID verified?'
  if (field === 'account_owner' || name.includes('bank') || name.includes('account owner')) return 'Bank valid?'
  if (name.includes('age') || name.includes('retirement')) return 'Age eligible?'
  if (name.includes('balance')) return 'Balance OK?'
  if (name.includes('holding') || name.includes('period')) return 'Period met?'
  if (name.includes('liquidity')) return 'Liquid?'
  if (name.includes('early withdrawal') || name.includes('early_withdrawal')) return 'Early allowed?'
  if (name.includes('amount') || name.includes('threshold')) return 'Amount valid?'
  if (name.includes('employer')) return 'Employer OK?'
  if (name.includes('beneficiary')) return 'Beneficiary OK?'
  return `${val.name}\npassed?`
}

function getFailureAction(validation) {
  const field = (validation.field || '').toLowerCase()
  const name = (validation.name || '').toLowerCase()

  if (field === 'id_confidence' || name.includes('id photo') || name.includes('photo')) return 'Send upload link'
  if (field === 'account_owner' || name.includes('bank')) return 'Notify: update bank'
  if (name.includes('age') || name.includes('retirement')) return 'Block: age requirement'
  if (name.includes('holding') || name.includes('period')) return 'Block: holding period'
  if (name.includes('liquidity')) return 'Block: not yet liquid'
  if (name.includes('balance')) return 'Block: insufficient'
  return 'Block: failed'
}

function isApiFailAction(val) {
  const field = (val.field || '').toLowerCase()
  const name = (val.name || '').toLowerCase()
  return field === 'id_confidence' || name.includes('id photo') ||
    field === 'account_owner' || name.includes('bank')
}

function getFailEndpoint(val) {
  const field = (val.field || '').toLowerCase()
  if (field === 'id_confidence') return 'POST /api/notifications/upload-link'
  if (field === 'account_owner') return 'POST /api/notifications/sms'
  return 'POST /api/notifications/block'
}

function getFailEndLabel(val) {
  const field = (val.field || '').toLowerCase()
  const name = (val.name || '').toLowerCase()
  if (field === 'id_confidence' || name.includes('id photo')) return 'Awaiting Documents'
  if (field === 'account_owner' || name.includes('bank')) return 'Customer Action'
  return 'Blocked'
}

function buildRequestPayload(val, memberData) {
  const field = (val.field || '').toLowerCase()
  if (field === 'id_confidence') {
    return { member_id: memberData?.id_number || memberData?.member_id, photo_base64: '<binary>', verification_type: 'document' }
  }
  if (field === 'account_owner') {
    return { account_number: memberData?.bank_account_number, member_id: memberData?.id_number, expected_owner: memberData?.member_name }
  }
  return { member_id: memberData?.id_number, field: val.field }
}

function buildResponsePayload(val, result) {
  const field = (val.field || '').toLowerCase()
  if (field === 'id_confidence') {
    return { verified: result.passed, confidence: result.actual_value, threshold: '85%' }
  }
  if (field === 'account_owner') {
    return { valid: result.passed, owner_match: result.passed, owner_name: result.actual_value }
  }
  return { result: result.passed ? 'pass' : 'fail', value: result.actual_value }
}

// Single uniform edge color for all connectors
const EDGE_COLOR = '#38595A'
const EDGE_LABEL_COLOR = '#8AABAD'

/**
 * Build the flow diagram — ALL validations run through to the end (no stopping on failure).
 * The flow mirrors the cards view: every validation executes regardless of prior failures.
 */
export function buildFlowDiagram(validations, memberData, outcome, onNodeClick, onHitlClick) {
  const nodes = []
  const edges = []

  if (!validations || validations.length === 0) return { nodes, edges }

  const fundType = memberData?.fund_type || 'investment'
  const useCase = memberData?.use_case || 'withdrawal'
  const fundName = FUND_TYPE_NAMES[fundType] || fundType
  const ucName = USE_CASE_NAMES[useCase] || useCase

  let nodeIndex = 0
  const makeId = (prefix) => `${prefix}-${nodeIndex++}`

  // Track failure branches for end nodes
  const failureBranches = []

  // ─── 1. Start node ─────────────────────────────────────
  const startId = makeId('start')
  nodes.push({
    id: startId,
    type: 'startEnd',
    position: { x: 0, y: 0 },
    data: { label: `Start: ${ucName}`, status: 'pass', fundType },
  })

  // ─── 2. Request intake node ────────────────────────────
  const intakeId = makeId('intake')
  nodes.push({
    id: intakeId,
    type: 'custom',
    position: { x: 0, y: 0 },
    data: {
      label: 'Request intake',
      category: 'intake',
      status: 'pass',
      nodeType: 'custom',
      onNodeClick,
      validation: {
        rule: `Process ${ucName} request for ${fundName}`,
        field: 'request',
        description: `Received and logged ${ucName.toLowerCase()} request`,
      },
      result: { actual_value: 'Request logged', message: 'Request received and validated for processing' },
    },
  })
  edges.push({
    id: `e-${startId}-${intakeId}`,
    source: startId,
    target: intakeId,
    type: 'smoothstep',
    style: { stroke: EDGE_COLOR, strokeWidth: 2 },
  })

  // ─── 3. ALL Validation nodes (no skipping) ────────────
  let prevMainNodeId = intakeId

  for (let i = 0; i < validations.length; i++) {
    const val = validations[i]
    const isApi = isApiValidation(val)
    const valStatus = val._status || 'pending'
    const valResult = val._result || null
    const isBlocking = val.severity === 'blocking'

    // ── Validation / Webservice node ──
    const valNodeId = makeId(isApi ? 'ws' : 'val')
    nodes.push({
      id: valNodeId,
      type: isApi ? 'webservice' : 'custom',
      position: { x: 0, y: 0 },
      data: {
        label: isApi ? getWsLabel(val) : val.name,
        category: val.category,
        source: val.source,
        status: valStatus,
        nodeType: isApi ? 'webservice' : 'custom',
        onNodeClick,
        onHitlClick,
        requires_hitl: val.requires_hitl,
        validationIndex: val._index,
        validation: val,
        result: valResult,
        endpoint: isApi ? getWsEndpoint(val) : undefined,
        statusCode: isApi && valResult ? 200 : undefined,
        duration: valResult ? `${Math.floor(Math.random() * 200 + 50)}ms` : undefined,
        requestPayload: isApi && valResult ? buildRequestPayload(val, memberData) : undefined,
        responsePayload: isApi && valResult ? buildResponsePayload(val, valResult) : undefined,
      },
    })

    // Edge from prev main node to this validation
    edges.push({
      id: `e-${prevMainNodeId}-${valNodeId}`,
      source: prevMainNodeId,
      sourceHandle: prevMainNodeId.startsWith('split') ? 'yes' : undefined,
      target: valNodeId,
      type: 'smoothstep',
      label: prevMainNodeId.startsWith('split') ? 'Yes' : undefined,
      style: {
        stroke: EDGE_COLOR,
        strokeWidth: 2,
        strokeDasharray: valStatus === 'pending' ? '6 4' : undefined,
      },
      labelStyle: prevMainNodeId.startsWith('split') ? { fill: EDGE_LABEL_COLOR, fontSize: 10, fontWeight: 600 } : undefined,
      labelBgStyle: prevMainNodeId.startsWith('split') ? { fill: '#0D2E2F' } : undefined,
    })

    // ── Splitter after blocking validations ──
    if (isBlocking) {
      const splitId = makeId('split')
      const splitLabel = getSplitLabel(val)
      const splitStatus = valStatus === 'pending' ? 'pending'
        : valStatus === 'executing' ? 'executing'
        : valStatus === 'pass' ? 'pass'
        : 'fail'

      nodes.push({
        id: splitId,
        type: 'splitter',
        position: { x: 0, y: 0 },
        data: {
          label: splitLabel,
          status: splitStatus,
          nodeType: 'splitter',
          onNodeClick,
          condition: val.rule || val.name,
          actualValue: valResult?.actual_value,
          branchTaken: valStatus === 'pass' ? 'Yes' : valStatus === 'fail' ? 'No' : undefined,
        },
      })

      edges.push({
        id: `e-${valNodeId}-${splitId}`,
        source: valNodeId,
        target: splitId,
        type: 'smoothstep',
        style: {
          stroke: valStatus === 'pass' ? '#4ADE80' : valStatus === 'fail' ? '#F87171' : '#38595A',
          strokeWidth: 2,
          strokeDasharray: valStatus === 'pending' ? '6 4' : undefined,
        },
      })

      // ── Failure branch (goes down to action + end) ──
      const failActionId = makeId('fail-action')
      const failLabel = getFailureAction(val)
      const failIsApi = isApiFailAction(val)
      nodes.push({
        id: failActionId,
        type: failIsApi ? 'webservice' : 'custom',
        position: { x: 0, y: 0 },
        data: {
          label: failIsApi ? `WS: ${failLabel}` : failLabel,
          status: valStatus === 'fail' ? 'pass' : 'inactive',
          nodeType: failIsApi ? 'webservice' : 'custom',
          onNodeClick,
          endpoint: failIsApi ? getFailEndpoint(val) : undefined,
        },
      })

      edges.push({
        id: `e-${splitId}-${failActionId}`,
        source: splitId,
        sourceHandle: 'no',
        target: failActionId,
        type: 'smoothstep',
        label: 'No',
        style: {
          stroke: valStatus === 'fail' ? '#F87171' : '#38595A',
          strokeWidth: 2,
          strokeDasharray: valStatus !== 'fail' ? '6 4' : undefined,
          opacity: valStatus === 'fail' ? 1 : 0.4,
        },
        labelStyle: { fill: '#F87171', fontSize: 10, fontWeight: 600 },
        labelBgStyle: { fill: '#0D2E2F' },
      })

      // End node for failure branch
      const failEndId = makeId('end-fail')
      const endLabel = getFailEndLabel(val)
      nodes.push({
        id: failEndId,
        type: 'startEnd',
        position: { x: 0, y: 0 },
        data: {
          label: `End: ${endLabel}`,
          isEnd: true,
          endType: endLabel.includes('Awaiting') ? 'awaiting' : endLabel.includes('Customer') ? 'awaiting' : 'blocked',
          status: valStatus === 'fail' ? 'pass' : 'inactive',
        },
      })
      edges.push({
        id: `e-${failActionId}-${failEndId}`,
        source: failActionId,
        target: failEndId,
        type: 'smoothstep',
        style: {
          stroke: valStatus === 'fail' ? '#F87171' : '#38595A',
          strokeWidth: 2,
          strokeDasharray: valStatus !== 'fail' ? '6 4' : undefined,
          opacity: valStatus === 'fail' ? 1 : 0.4,
        },
      })

      // Main flow continues from the "Yes" branch of the splitter
      prevMainNodeId = splitId
    } else {
      prevMainNodeId = valNodeId
    }
  }

  // ─── 4. Outcome nodes ─────────────────────────────────
  const allDone = validations.every(v => v._status === 'pass' || v._status === 'fail' || v._status === 'warning')
  const hasAnyFailure = validations.some(v => v._status === 'fail' && v.severity === 'blocking')

  if (outcome && allDone) {
    if (outcome.type === 'tax_consent') {
      addTaxConsentOutcome(nodes, edges, prevMainNodeId, makeId, onNodeClick, outcome)
    } else if (outcome.type === 'approved') {
      addApprovedOutcome(nodes, edges, prevMainNodeId, makeId, onNodeClick, memberData, fundType, useCase, ucName)
    } else if (outcome.type === 'blocked' || outcome.type === 'customer_action') {
      // Blocked/customer_action outcome — the failure branch end nodes already handle this
      // Just add a final outcome indicator on the main path
      const outcomeId = makeId('outcome-info')
      nodes.push({
        id: outcomeId,
        type: 'custom',
        position: { x: 0, y: 0 },
        data: {
          label: outcome.type === 'customer_action' ? 'Customer action required' : 'Process blocked',
          status: 'fail',
          nodeType: 'custom',
          onNodeClick,
          validation: { description: outcome.message || 'Validation failed — see failure branch' },
        },
      })
      edges.push({
        id: `e-${prevMainNodeId}-${outcomeId}`,
        source: prevMainNodeId,
        sourceHandle: prevMainNodeId.startsWith('split') ? 'yes' : undefined,
        target: outcomeId,
        type: 'smoothstep',
        label: prevMainNodeId.startsWith('split') ? 'Yes' : undefined,
        style: { stroke: '#F87171', strokeWidth: 2 },
        labelStyle: prevMainNodeId.startsWith('split') ? { fill: '#4ADE80', fontSize: 10, fontWeight: 600 } : undefined,
        labelBgStyle: prevMainNodeId.startsWith('split') ? { fill: '#0D2E2F' } : undefined,
      })
    }
  } else if (!outcome) {
    // Flow not yet complete — show a pending end node
    const pendingEndId = makeId('end-pending')
    nodes.push({
      id: pendingEndId,
      type: 'startEnd',
      position: { x: 0, y: 0 },
      data: {
        label: 'Outcome pending...',
        isEnd: true,
        endType: 'awaiting',
        status: 'pending',
      },
    })
    edges.push({
      id: `e-${prevMainNodeId}-${pendingEndId}`,
      source: prevMainNodeId,
      sourceHandle: prevMainNodeId.startsWith('split') ? 'yes' : undefined,
      target: pendingEndId,
      type: 'smoothstep',
      label: prevMainNodeId.startsWith('split') ? 'Yes' : undefined,
      style: { stroke: '#38595A', strokeWidth: 2, strokeDasharray: '6 4' },
      labelStyle: prevMainNodeId.startsWith('split') ? { fill: '#4ADE80', fontSize: 10, fontWeight: 600 } : undefined,
      labelBgStyle: prevMainNodeId.startsWith('split') ? { fill: '#0D2E2F' } : undefined,
    })
  }

  // ─── 5. Layout with dagre ─────────────────────────────
  return layoutNodes(nodes, edges)
}

// ─── Outcome sub-builders ────────────────────────────────────────
function addApprovedOutcome(nodes, edges, prevId, makeId, onNodeClick, memberData, fundType, useCase, ucName) {
  const execId = makeId('ws-execute')
  const endpoint = useCase === 'withdrawal'
    ? (fundType === 'study' ? '/api/studyfund/withdraw' : '/api/providentfund/withdraw')
    : `/api/${useCase}/execute`

  nodes.push({
    id: execId,
    type: 'webservice',
    position: { x: 0, y: 0 },
    data: {
      label: `WS: Execute ${ucName.toLowerCase()}`,
      status: 'pass',
      nodeType: 'webservice',
      onNodeClick,
      endpoint: `POST ${endpoint}`,
      statusCode: 200,
      requestPayload: { account_number: memberData?.account_number, amount: memberData?.withdrawal_amount },
      responsePayload: { status: 'confirmed', transaction_id: `TXN-${Math.random().toString(36).substring(2, 8).toUpperCase()}` },
    },
  })
  connectFromPrev(edges, prevId, execId, '#4ADE80')

  const smsId = makeId('ws-sms')
  nodes.push({
    id: smsId,
    type: 'webservice',
    position: { x: 0, y: 0 },
    data: { label: 'WS: Send SMS', status: 'pass', nodeType: 'webservice', onNodeClick, endpoint: 'POST /api/notifications/sms', statusCode: 200 },
  })
  edges.push({ id: `e-${execId}-${smsId}`, source: execId, target: smsId, type: 'smoothstep', style: { stroke: '#4ADE80', strokeWidth: 2 } })

  const endId = makeId('end-ok')
  nodes.push({
    id: endId,
    type: 'startEnd',
    position: { x: 0, y: 0 },
    data: { label: 'End: Completed', isEnd: true, endType: 'completed', status: 'pass' },
  })
  edges.push({ id: `e-${smsId}-${endId}`, source: smsId, target: endId, type: 'smoothstep', style: { stroke: '#4ADE80', strokeWidth: 2 } })
}


function addTaxConsentOutcome(nodes, edges, prevId, makeId, onNodeClick, outcome) {
  const taxId = makeId('ws-tax')
  nodes.push({
    id: taxId,
    type: 'webservice',
    position: { x: 0, y: 0 },
    data: {
      label: 'WS: Calculate tax', status: 'pass', nodeType: 'webservice', onNodeClick,
      endpoint: 'POST /api/tax/calculate',
      responsePayload: outcome.breakdown || undefined,
    },
  })
  connectFromPrev(edges, prevId, taxId, '#4ADE80')

  const consentId = makeId('split-consent')
  nodes.push({
    id: consentId,
    type: 'splitter',
    position: { x: 0, y: 0 },
    data: { label: 'Customer approved?', status: 'pending', nodeType: 'splitter', onNodeClick, condition: 'Customer accepts tax deduction' },
  })
  edges.push({ id: `e-${taxId}-${consentId}`, source: taxId, target: consentId, type: 'smoothstep', style: { stroke: '#FBBF24', strokeWidth: 2 } })

  const smsId = makeId('ws-sms-consent')
  nodes.push({
    id: smsId,
    type: 'webservice',
    position: { x: 0, y: 0 },
    data: { label: 'WS: Send consent SMS', status: 'pass', nodeType: 'webservice', onNodeClick, endpoint: 'POST /api/notifications/sms' },
  })
  edges.push({
    id: `e-${consentId}-${smsId}`, source: consentId, sourceHandle: 'no', target: smsId,
    type: 'smoothstep', label: 'Yes',
    style: { stroke: '#FBBF24', strokeWidth: 2 },
    labelStyle: { fill: '#FBBF24', fontSize: 10, fontWeight: 600 }, labelBgStyle: { fill: '#0D2E2F' },
  })

  const endConsentId = makeId('end-consent')
  nodes.push({
    id: endConsentId,
    type: 'startEnd',
    position: { x: 0, y: 0 },
    data: { label: 'End: Awaiting Consent', isEnd: true, endType: 'awaiting', status: 'pass' },
  })
  edges.push({ id: `e-${smsId}-${endConsentId}`, source: smsId, target: endConsentId, type: 'smoothstep', style: { stroke: '#FBBF24', strokeWidth: 2 } })

  const cancelId = makeId('end-cancel')
  nodes.push({
    id: cancelId,
    type: 'startEnd',
    position: { x: 0, y: 0 },
    data: { label: 'End: Cancelled', isEnd: true, endType: 'cancelled', status: 'pass' },
  })
  edges.push({
    id: `e-${consentId}-${cancelId}`, source: consentId, sourceHandle: 'yes', target: cancelId,
    type: 'smoothstep', label: 'No',
    style: { stroke: '#F87171', strokeWidth: 2, strokeDasharray: '6 4' },
    labelStyle: { fill: '#F87171', fontSize: 10, fontWeight: 600 }, labelBgStyle: { fill: '#0D2E2F' },
  })
}

// ─── Helpers ─────────────────────────────────────────────────────
function getEdgeColor(status) {
  if (status === 'pass') return '#4ADE80'
  if (status === 'fail') return '#F87171'
  if (status === 'executing') return '#70E6E8'
  if (status === 'warning') return '#FBBF24'
  return '#38595A'
}

function connectFromPrev(edges, prevId, targetId, color) {
  const isSplit = prevId.startsWith('split')
  edges.push({
    id: `e-${prevId}-${targetId}`,
    source: prevId,
    sourceHandle: isSplit ? 'yes' : undefined,
    target: targetId,
    type: 'smoothstep',
    label: isSplit ? 'Yes' : undefined,
    style: { stroke: color, strokeWidth: 2 },
    labelStyle: isSplit ? { fill: color, fontSize: 10, fontWeight: 600 } : undefined,
    labelBgStyle: isSplit ? { fill: '#0D2E2F' } : undefined,
  })
}

// ─── Dagre layout ────────────────────────────────────────────────
function layoutNodes(nodes, edges) {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'LR', nodesep: 60, ranksep: 100, marginx: 30, marginy: 30 })

  nodes.forEach(node => {
    // All circle-based nodes have similar dimensions now
    let width = 80
    let height = 90
    if (node.type === 'startEnd') {
      width = 70
      height = 80
    }
    g.setNode(node.id, { width, height })
  })

  edges.forEach(edge => {
    g.setEdge(edge.source, edge.target)
  })

  dagre.layout(g)

  const laidOut = nodes.map(node => {
    const pos = g.node(node.id)
    return {
      ...node,
      position: {
        x: pos.x - (pos.width / 2),
        y: pos.y - (pos.height / 2),
      },
    }
  })

  return { nodes: laidOut, edges }
}
