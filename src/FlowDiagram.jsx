import { useState, useMemo, useCallback, useEffect } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from 'reactflow'
import 'reactflow/dist/style.css'
import './flowDiagram.css'

import { StartEndNode, CustomNode, WebserviceNode, SplitterNode, NodeDetailPanel } from './FlowNodes'
import { buildFlowDiagram } from './flowDiagramBuilder'

const nodeTypes = {
  startEnd: StartEndNode,
  custom: CustomNode,
  webservice: WebserviceNode,
  splitter: SplitterNode,
}

const defaultEdgeOptions = {
  type: 'smoothstep',
  animated: false,
  style: { stroke: '#38595A', strokeWidth: 2 },
}

// Get minimap node color
function getNodeColor(node) {
  const status = node.data?.status
  if (status === 'pass') return '#4ADE80'
  if (status === 'fail') return '#F87171'
  if (status === 'warning') return '#FBBF24'
  if (status === 'executing') return '#70E6E8'
  if (node.type === 'webservice') return '#2E6BA6'
  if (node.type === 'splitter') return '#FBBF24'
  if (node.type === 'startEnd') return '#1FC2B8'
  return '#38595A'
}

export default function FlowDiagram({
  validations,
  validationStatuses,
  validationResults,
  outcome,
  memberData,
}) {
  const [selectedNode, setSelectedNode] = useState(null)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  const onNodeClick = useCallback((nodeData) => {
    setSelectedNode(nodeData)
  }, [])

  // Build initial diagram when validations arrive
  useEffect(() => {
    if (!validations || validations.length === 0) {
      setNodes([])
      setEdges([])
      return
    }

    // Attach current statuses/results to validations for the builder
    const enrichedValidations = validations.map((v, i) => ({
      ...v,
      _status: validationStatuses?.[i] || 'pending',
      _result: validationResults?.[i] || null,
    }))

    const showOutcome = validationStatuses?.every(s => s === 'pass' || s === 'fail' || s === 'warning')
    const { nodes: newNodes, edges: newEdges } = buildFlowDiagram(
      enrichedValidations,
      memberData,
      showOutcome ? outcome : null,
      onNodeClick,
    )

    setNodes(newNodes)
    setEdges(newEdges)
  }, [validations, validationStatuses, validationResults, outcome, memberData, onNodeClick, setNodes, setEdges])

  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
  }, [])

  if (!validations || validations.length === 0) {
    return (
      <div style={{
        height: '500px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#8AABAD',
        fontSize: '14px',
      }}>
        Flow diagram will appear when validations are generated...
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', height: '500px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #38595A' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        onPaneClick={onPaneClick}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1.2 }}
        minZoom={0.2}
        maxZoom={1.8}
        nodesDraggable={true}
        nodesConnectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#38595A" gap={20} size={1} variant="dots" />
        <Controls
          showInteractive={false}
          style={{ bottom: 10, left: 10 }}
        />
        <MiniMap
          nodeColor={getNodeColor}
          maskColor="rgba(0, 33, 34, 0.8)"
          style={{ bottom: 10, right: selectedNode ? 336 : 10, transition: 'right 0.3s ease' }}
          pannable
          zoomable
        />
      </ReactFlow>

      {/* Node detail panel */}
      {selectedNode && (
        <NodeDetailPanel
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
        />
      )}

      {/* Legend */}
      <div style={{
        position: 'absolute',
        top: 10,
        left: 10,
        background: 'rgba(13, 46, 47, 0.9)',
        border: '1px solid #38595A',
        borderRadius: '8px',
        padding: '8px 12px',
        fontSize: '10px',
        display: 'flex',
        gap: '14px',
        zIndex: 5,
      }}>
        <LegendItem color="#1FC2B8" shape="circle" label="Node" />
        <LegendItem color="#2E6BA6" shape="circle" label="Web Services" />
        <LegendItem color="#FBBF24" shape="circle" label="Splitter" />
        <LegendItem color="#4ADE80" shape="dot" label="Pass" />
        <LegendItem color="#F87171" shape="dot" label="Fail" />
      </div>
    </div>
  )
}

function LegendItem({ color, shape, label }) {
  let shapeEl
  if (shape === 'circle') {
    shapeEl = <div style={{ width: 12, height: 12, borderRadius: '50%', border: `2px solid ${color}`, background: `${color}22` }} />
  } else {
    shapeEl = <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      {shapeEl}
      <span style={{ color: '#8AABAD' }}>{label}</span>
    </div>
  )
}
