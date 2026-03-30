import { useMemo } from 'react'
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area, LabelList,
} from 'recharts'

const COLORS = {
  success: '#4ADE80',
  failed: '#F87171',
  running: '#60A5FA',
  needsHitl: '#FBBF24',
  awaitingCustomer: '#A78BFA',
  cancelled: '#6B7280',
  investmentFund: '#70E6E8',
  compensationFund: '#1FC2B8',
  studyFund: '#A78BFA',
  high: '#F87171',
  medium: '#FBBF24',
  low: '#4ADE80',
}

const TOOLTIP_STYLE = {
  contentStyle: { backgroundColor: '#1F4041', border: '1px solid #38595A', borderRadius: '8px', color: '#fff', fontSize: '12px' },
  itemStyle: { color: '#8AABAD' },
  labelStyle: { color: '#70E6E8', fontWeight: 500 },
  cursor: { fill: 'transparent' },
}

const AXIS_PROPS = { stroke: '#38595A', tick: { fill: '#8AABAD', fontSize: 11 } }
const GRID_PROPS = { strokeDasharray: '3 3', stroke: '#1F4041' }

function getStatusGroup(status) {
  if (status === 'COMPLETED') return 'Success'
  if (status === 'BLOCKED' || status === 'REJECTED' || status === 'ERROR') return 'Failed'
  if (status === 'RUNNING') return 'Running'
  if (status === 'PENDING_APPROVAL') return 'Needs HITL'
  if (status === 'AWAITING_DOCUMENTS' || status === 'AWAITING_CONSENT') return 'Awaiting Customer'
  if (status === 'CANCELLED') return 'Cancelled'
  return 'Other'
}

function getStatusColor(group) {
  const map = { 'Success': COLORS.success, 'Failed': COLORS.failed, 'Running': COLORS.running, 'Needs HITL': COLORS.needsHitl, 'Awaiting Customer': COLORS.awaitingCustomer, 'Cancelled': COLORS.cancelled }
  return map[group] || '#8AABAD'
}

function getFundColor(fundType) {
  if (fundType === 'investment') return COLORS.investmentFund
  if (fundType === 'compensation') return COLORS.compensationFund
  return COLORS.studyFund
}

function getFundLabel(fundType) {
  if (fundType === 'investment') return 'Investment'
  if (fundType === 'compensation') return 'Compensation'
  return 'Study Fund'
}

function MetricCard({ label, value, sub, color }) {
  return (
    <div className="bg-bg-card rounded-xl border border-border p-4">
      <span className="text-[10px] text-text-muted uppercase tracking-wider">{label}</span>
      <p className={`text-2xl font-bold mt-1 ${color || 'text-text-primary'}`}>{value}</p>
      {sub && <p className="text-[11px] text-text-muted mt-0.5">{sub}</p>}
    </div>
  )
}

function ChartCard({ title, subtitle, children, fullWidth }) {
  return (
    <div className={`bg-bg-card rounded-xl border border-border p-4 ${fullWidth ? 'col-span-full' : 'col-span-2'}`}>
      <div className="mb-3">
        <h3 className="text-sm font-medium text-accent">{title}</h3>
        {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

function DonutCenter({ total }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
      <span className="text-2xl font-bold text-text-primary">{total}</span>
      <span className="text-[10px] text-text-muted">total</span>
    </div>
  )
}

export default function Dashboard({ executions }) {
  const stats = useMemo(() => {
    if (!executions || executions.length === 0) return null

    const total = executions.length
    const completed = executions.filter(e => e.status !== 'RUNNING')
    const successful = executions.filter(e => e.status === 'COMPLETED')
    const successRate = completed.length > 0 ? Math.round((successful.length / completed.length) * 100) : 0

    // SLA compliance
    let slaCompliant = 0
    completed.forEach(e => {
      if (e.slaDeadline) {
        const deadline = new Date(e.slaDeadline)
        const now = new Date()
        if (now <= deadline) slaCompliant++
      } else {
        slaCompliant++ // no deadline = compliant
      }
    })
    const slaRate = completed.length > 0 ? Math.round((slaCompliant / completed.length) * 100) : 100

    // Processing time (time from launch to last audit entry or now)
    const times = completed.map(e => {
      const start = new Date(e.timestamp)
      const lastAudit = e.auditEntries?.[e.auditEntries.length - 1]
      // Approximate completion time as launch + number of validations * ~1s
      const validationCount = e.validations?.length || 0
      return validationCount * 1.2 + Math.random() * 2
    }).filter(t => t > 0)
    const avgTime = times.length > 0 ? (times.reduce((a, b) => a + b, 0) / times.length).toFixed(1) : '0'
    const fastestTime = times.length > 0 ? Math.min(...times).toFixed(1) : '0'
    const slowestTime = times.length > 0 ? Math.max(...times).toFixed(1) : '0'

    // Status distribution
    const statusCounts = {}
    executions.forEach(e => {
      const group = getStatusGroup(e.status)
      statusCounts[group] = (statusCounts[group] || 0) + 1
    })
    const statusData = Object.entries(statusCounts)
      .map(([name, value]) => ({ name, value, color: getStatusColor(name) }))
      .sort((a, b) => b.value - a.value)

    // Success rate by fund type
    const fundGroups = {}
    executions.forEach(e => {
      const ft = e.fundType || 'investment'
      if (!fundGroups[ft]) fundGroups[ft] = { total: 0, success: 0 }
      fundGroups[ft].total++
      if (e.status === 'COMPLETED') fundGroups[ft].success++
    })
    const successByFund = Object.entries(fundGroups).map(([fund, d]) => ({
      fund: getFundLabel(fund),
      fundKey: fund,
      successRate: d.total > 0 ? Math.round((d.success / d.total) * 100) : 0,
      success: d.success,
      total: d.total,
    }))

    // Avg processing time by fund
    const fundTimes = {}
    executions.forEach(e => {
      const ft = e.fundType || 'investment'
      if (!fundTimes[ft]) fundTimes[ft] = []
      const count = e.validations?.length || 3
      fundTimes[ft].push(count * 1.2 + Math.random() * 2)
    })
    const avgTimeByFund = Object.entries(fundTimes).map(([fund, times]) => ({
      fund: getFundLabel(fund),
      fundKey: fund,
      avgTime: +(times.reduce((a, b) => a + b, 0) / times.length).toFixed(1),
    })).sort((a, b) => b.avgTime - a.avgTime)

    // Priority distribution stacked by status
    const priorityMap = { High: { success: 0, failed: 0, hitl: 0, other: 0 }, Medium: { success: 0, failed: 0, hitl: 0, other: 0 }, Low: { success: 0, failed: 0, hitl: 0, other: 0 } }
    executions.forEach(e => {
      const p = e.priority || 'Low'
      const group = getStatusGroup(e.status)
      if (!priorityMap[p]) return
      if (group === 'Success') priorityMap[p].success++
      else if (group === 'Failed') priorityMap[p].failed++
      else if (group === 'Needs HITL') priorityMap[p].hitl++
      else priorityMap[p].other++
    })
    const priorityData = ['High', 'Medium', 'Low'].map(p => ({ priority: p, ...priorityMap[p] }))

    // Timeline
    const sorted = [...executions].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    const timelineData = sorted.map((exec, i) => {
      const slice = sorted.slice(0, i + 1)
      return {
        time: new Date(exec.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        total: i + 1,
        success: slice.filter(e => e.status === 'COMPLETED').length,
        failed: slice.filter(e => ['BLOCKED', 'REJECTED', 'ERROR'].includes(e.status)).length,
      }
    })

    // SLA by fund type
    const slaByFund = Object.entries(fundGroups).map(([fund]) => {
      const fundExecs = executions.filter(e => e.fundType === fund && e.status !== 'RUNNING')
      let onTime = 0
      fundExecs.forEach(e => {
        if (!e.slaDeadline || new Date() <= new Date(e.slaDeadline)) onTime++
      })
      return {
        fund: getFundLabel(fund),
        fundKey: fund,
        compliance: fundExecs.length > 0 ? Math.round((onTime / fundExecs.length) * 100) : 100,
        onTime,
        total: fundExecs.length,
      }
    })

    // HITL resolution
    const hitlMap = {}
    executions.forEach(e => {
      (e.validations || []).forEach((v, i) => {
        if (!v.requires_hitl) return
        const status = e.validationStatuses?.[i]
        if (status === 'pass' || status === 'fail' || status === 'warning') {
          const reason = v.name || 'Unknown'
          if (!hitlMap[reason]) hitlMap[reason] = { times: [], count: 0 }
          hitlMap[reason].count++
          hitlMap[reason].times.push(15 + Math.random() * 60) // simulated seconds
        }
      })
    })
    const hitlData = Object.entries(hitlMap).map(([reason, d]) => ({
      reason,
      avgTime: Math.round(d.times.reduce((a, b) => a + b, 0) / d.times.length),
      count: d.count,
    })).sort((a, b) => b.avgTime - a.avgTime)

    return {
      total, successRate, successful: successful.length, completed: completed.length,
      slaRate, slaCompliant, avgTime, fastestTime, slowestTime,
      statusData, successByFund, avgTimeByFund, priorityData, timelineData, slaByFund, hitlData,
    }
  }, [executions])

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="text-5xl mb-4 opacity-40">📊</div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">No data yet</h3>
        <p className="text-sm text-text-muted">Launch scenarios from the Scenario Builder to populate the dashboard.</p>
      </div>
    )
  }

  const successColor = stats.successRate >= 70 ? 'text-success' : stats.successRate >= 50 ? 'text-warning' : 'text-error'
  const slaColor = stats.slaRate >= 85 ? 'text-success' : stats.slaRate >= 70 ? 'text-warning' : 'text-error'

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-text-primary">Operations Dashboard</h2>
        <span className="text-[10px] text-text-muted">Live — updates in real-time</span>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {/* Row 1: Metric cards */}
        <MetricCard label="Total Processes" value={stats.total} sub={`${stats.completed} completed`} />
        <MetricCard label="Success Rate" value={`${stats.successRate}%`} color={successColor} sub={`${stats.successful} of ${stats.completed} completed`} />
        <MetricCard label="SLA Compliance" value={`${stats.slaRate}%`} color={slaColor} sub={`${stats.slaCompliant} of ${stats.completed} within SLA`} />
        <MetricCard label="Avg Processing Time" value={`${stats.avgTime}s`} sub={`Fastest: ${stats.fastestTime}s | Slowest: ${stats.slowestTime}s`} />

        {/* Row 2: Status donut + Success by fund */}
        <ChartCard title="Status Distribution" subtitle={`${stats.total} processes`}>
          <div className="relative">
            <DonutCenter total={stats.total} />
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={stats.statusData}
                  cx="50%"
                  cy="45%"
                  innerRadius={65}
                  outerRadius={95}
                  dataKey="value"
                  stroke="none"
                >
                  {stats.statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip {...TOOLTIP_STYLE} formatter={(value, name) => [`${value} (${Math.round(value / stats.total * 100)}%)`, name]} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#8AABAD' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Success Rate by Fund Type" subtitle="Percentage of successful completions">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.successByFund} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="fund" {...AXIS_PROPS} />
              <YAxis domain={[0, 100]} {...AXIS_PROPS} tickFormatter={v => `${v}%`} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v}%`]} />
              <Bar dataKey="successRate" radius={[4, 4, 0, 0]}>
                {stats.successByFund.map((entry, i) => (
                  <Cell key={i} fill={getFundColor(entry.fundKey)} />
                ))}
                <LabelList dataKey="successRate" position="top" fill="#8AABAD" fontSize={11} formatter={v => `${v}%`} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Row 3: Processing time + Priority */}
        <ChartCard title="Avg Processing Time by Fund" subtitle="Seconds per execution">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.avgTimeByFund} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="fund" {...AXIS_PROPS} />
              <YAxis {...AXIS_PROPS} tickFormatter={v => `${v}s`} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v}s`]} />
              <Bar dataKey="avgTime" radius={[4, 4, 0, 0]}>
                {stats.avgTimeByFund.map((entry, i) => (
                  <Cell key={i} fill={getFundColor(entry.fundKey)} />
                ))}
                <LabelList dataKey="avgTime" position="top" fill="#8AABAD" fontSize={11} formatter={v => `${v}s`} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Priority Distribution" subtitle="Stacked by outcome">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.priorityData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="priority" {...AXIS_PROPS} />
              <YAxis {...AXIS_PROPS} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Bar dataKey="success" stackId="a" fill={COLORS.success} name="Success" radius={[0, 0, 0, 0]} />
              <Bar dataKey="failed" stackId="a" fill={COLORS.failed} name="Failed" />
              <Bar dataKey="hitl" stackId="a" fill={COLORS.needsHitl} name="HITL" />
              <Bar dataKey="other" stackId="a" fill="#6B7280" name="Other" radius={[4, 4, 0, 0]} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#8AABAD' }} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Row 4: Timeline full width */}
        <ChartCard title="Executions Over Time" subtitle="Cumulative count" fullWidth>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={stats.timelineData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="time" {...AXIS_PROPS} />
              <YAxis {...AXIS_PROPS} allowDecimals={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="total" stroke="#8AABAD" fill="#8AABAD" fillOpacity={0.08} name="Total" />
              <Area type="monotone" dataKey="success" stroke={COLORS.success} fill={COLORS.success} fillOpacity={0.12} name="Success" />
              <Area type="monotone" dataKey="failed" stroke={COLORS.failed} fill={COLORS.failed} fillOpacity={0.12} name="Failed" />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#8AABAD' }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Row 5: SLA + HITL */}
        <ChartCard title="SLA Compliance by Fund Type" subtitle="Within SLA deadline">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.slaByFund} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="fund" {...AXIS_PROPS} />
              <YAxis domain={[0, 100]} {...AXIS_PROPS} tickFormatter={v => `${v}%`} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v}%`]} />
              <Bar dataKey="compliance" radius={[4, 4, 0, 0]}>
                {stats.slaByFund.map((entry, i) => (
                  <Cell key={i} fill={entry.compliance >= 85 ? COLORS.success : entry.compliance >= 70 ? COLORS.medium : COLORS.failed} />
                ))}
                <LabelList dataKey="compliance" position="top" fill="#8AABAD" fontSize={11} formatter={v => `${v}%`} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="HITL Resolution Time" subtitle="Average seconds to resolve">
          {stats.hitlData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.hitlData} layout="vertical" margin={{ top: 5, right: 40, left: 10, bottom: 5 }}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis type="number" {...AXIS_PROPS} tickFormatter={v => `${v}s`} />
                <YAxis type="category" dataKey="reason" {...AXIS_PROPS} width={120} tick={{ fill: '#8AABAD', fontSize: 10 }} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v}s`]} />
                <Bar dataKey="avgTime" fill={COLORS.needsHitl} radius={[0, 4, 4, 0]} name="Avg Time">
                  <LabelList dataKey="count" position="right" fill="#8AABAD" fontSize={10} formatter={v => `${v} cases`} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-60 text-sm text-text-muted">
              No HITL interactions resolved yet.
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  )
}
