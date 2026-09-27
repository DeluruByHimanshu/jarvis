import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { TaskItem, TaskColumn, AgentId } from '../types';

interface TaskAnalyticsD3Props {
  tasks: TaskItem[];
}

export const TaskAnalyticsD3: React.FC<TaskAnalyticsD3Props> = ({ tasks }) => {
  const donutRef = useRef<SVGSVGElement | null>(null);
  const barRef = useRef<SVGSVGElement | null>(null);

  // Status Color Mapping
  const statusColors: Record<TaskColumn, string> = {
    queue: '#94a3b8',        // slate
    processing: '#ffaa00',   // amber
    verification: '#00f0ff', // cyan
    completed: '#00ff9d'     // emerald
  };

  const agentColors: Record<string, string> = {
    jarvis: '#00f0ff',
    friday: '#00ff9d',
    ultron: '#ffaa00',
    edith: '#ff0055',
    nebula: '#a855f7'
  };

  // 1. Draw D3 Donut Chart (Task Status Distribution)
  useEffect(() => {
    if (!donutRef.current) return;

    const svg = d3.select(donutRef.current);
    svg.selectAll('*').remove();

    const width = 240;
    const height = 200;
    const radius = Math.min(width, height) / 2 - 15;
    const innerRadius = radius * 0.62;

    const g = svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    // Group tasks by status
    const statusCounts: Record<TaskColumn, number> = {
      queue: 0,
      processing: 0,
      verification: 0,
      completed: 0
    };

    tasks.forEach(t => {
      if (statusCounts[t.column] !== undefined) {
        statusCounts[t.column]++;
      }
    });

    const data = (Object.keys(statusCounts) as TaskColumn[]).map(key => ({
      status: key,
      count: statusCounts[key],
      color: statusColors[key]
    })).filter(d => d.count > 0);

    // If no data, show default empty placeholder arc
    if (data.length === 0) {
      g.append('circle')
        .attr('r', radius)
        .attr('fill', 'none')
        .attr('stroke', '#1e293b')
        .attr('stroke-width', 16);

      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.3em')
        .attr('fill', '#64748b')
        .attr('font-size', '11px')
        .attr('font-family', 'JetBrains Mono')
        .text('NO DATA');
      return;
    }

    const pie = d3.pie<{ status: TaskColumn; count: number; color: string }>()
      .value(d => d.count)
      .sort(null);

    const arc = d3.arc<d3.PieArcDatum<{ status: TaskColumn; count: number; color: string }>>()
      .innerRadius(innerRadius)
      .outerRadius(radius)
      .padAngle(0.04)
      .cornerRadius(4);

    const hoverArc = d3.arc<d3.PieArcDatum<{ status: TaskColumn; count: number; color: string }>>()
      .innerRadius(innerRadius - 2)
      .outerRadius(radius + 5)
      .padAngle(0.04)
      .cornerRadius(4);

    // Filter glow defs
    const defs = svg.append('defs');
    const filter = defs.append('filter')
      .attr('id', 'd3-glow')
      .attr('x', '-20%')
      .attr('y', '-20%')
      .attr('width', '140%')
      .attr('height', '140%');
    filter.append('feGaussianBlur')
      .attr('stdDeviation', '4')
      .attr('result', 'blur');
    filter.append('feComposite')
      .attr('in', 'SourceGraphic')
      .attr('in2', 'blur')
      .attr('operator', 'over');

    // Draw pie slices
    const paths = g.selectAll('path')
      .data(pie(data))
      .enter()
      .append('path')
      .attr('d', arc)
      .attr('fill', d => d.data.color)
      .attr('stroke', '#05070f')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .style('opacity', 0.88)
      .on('mouseenter', function (event, d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('d', hoverArc as any)
          .style('opacity', 1)
          .attr('filter', 'url(#d3-glow)');

        centerText.text(`${d.data.status.toUpperCase()}`);
        centerCount.text(`${d.data.count} (${Math.round((d.data.count / tasks.length) * 100)}%)`);
      })
      .on('mouseleave', function () {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('d', arc as any)
          .style('opacity', 0.88)
          .attr('filter', null);

        centerText.text('TOTAL OBJECTIVES');
        centerCount.text(`${tasks.length}`);
      });

    // Center count label
    const centerCount = g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.1em')
      .attr('fill', '#ffffff')
      .attr('font-size', '18px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'Chakra Petch')
      .text(`${tasks.length}`);

    const centerText = g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.4em')
      .attr('fill', '#00f0ff')
      .attr('font-size', '9px')
      .attr('font-family', 'JetBrains Mono')
      .attr('letter-spacing', '0.08em')
      .text('TOTAL TASKS');

  }, [tasks]);

  // 2. Draw D3 Bar / Workload Trend Chart (Agent Workload Allocation)
  useEffect(() => {
    if (!barRef.current) return;

    const svg = d3.select(barRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 15, right: 25, bottom: 25, left: 65 };
    const width = 360;
    const height = 200;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Group tasks by agent
    const agentsList = ['jarvis', 'friday', 'ultron', 'edith', 'nebula'];
    const agentWorkload = agentsList.map(a => {
      const assigned = tasks.filter(t => t.assignedAgent === a);
      const active = assigned.filter(t => t.column !== 'completed').length;
      const completed = assigned.filter(t => t.column === 'completed').length;
      return {
        agent: a,
        name: `@${a.toUpperCase()}`,
        active,
        completed,
        total: assigned.length,
        color: agentColors[a] || '#00f0ff'
      };
    });

    const maxVal = Math.max(4, d3.max(agentWorkload, d => d.total) || 4);

    const yScale = d3.scaleBand()
      .domain(agentWorkload.map(d => d.name))
      .range([0, innerHeight])
      .padding(0.3);

    const xScale = d3.scaleLinear()
      .domain([0, maxVal])
      .nice()
      .range([0, innerWidth]);

    // Gridlines
    g.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(
        d3.axisBottom(xScale)
          .ticks(5)
          .tickSize(-innerHeight)
          .tickFormat(() => '')
      )
      .selectAll('line')
      .attr('stroke', 'rgba(255, 255, 255, 0.05)');

    // Y Axis
    g.append('g')
      .call(d3.axisLeft(yScale).tickSize(0))
      .selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '10px')
      .attr('font-family', 'JetBrains Mono');

    g.select('.domain').remove();

    // X Axis
    g.append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(maxVal).tickFormat(d => `${d}`))
      .selectAll('text')
      .attr('fill', '#64748b')
      .attr('font-size', '9px')
      .attr('font-family', 'JetBrains Mono');

    // Horizontal bars
    const barGroups = g.selectAll('.bar-group')
      .data(agentWorkload)
      .enter()
      .append('g')
      .attr('class', 'bar-group')
      .attr('transform', d => `translate(0, ${yScale(d.name) || 0})`);

    // Background track
    barGroups.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', innerWidth)
      .attr('height', yScale.bandwidth())
      .attr('fill', 'rgba(255, 255, 255, 0.03)')
      .attr('rx', 3);

    // Active tasks bar
    barGroups.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('height', yScale.bandwidth())
      .attr('fill', d => d.color)
      .attr('rx', 3)
      .attr('width', 0)
      .transition()
      .duration(500)
      .attr('width', d => Math.max(0, xScale(d.total)));

    // Labels at end of bar
    barGroups.append('text')
      .attr('x', d => xScale(d.total) + 6)
      .attr('y', yScale.bandwidth() / 2 + 3.5)
      .attr('fill', '#cbd5e1')
      .attr('font-size', '10px')
      .attr('font-family', 'JetBrains Mono')
      .text(d => `${d.total} tasks (${d.active} active)`);

  }, [tasks]);

  return (
    <div className="w-full bg-slate-900/60 border border-slate-800 rounded-lg p-3 my-2 backdrop-blur-sm">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs font-mono">
        <span className="text-cyan-400 font-bold tracking-wider">
          D3.JS REAL-TIME DISTRIBUTION &amp; AGENT WORKLOAD
        </span>
        <span className="text-slate-500 text-[10px]">
          SVG POWERED &middot; D3 v7
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Donut Chart View */}
        <div className="md:col-span-5 flex flex-col items-center">
          <div className="w-full flex justify-center">
            <svg ref={donutRef} className="w-full max-w-[220px] h-auto drop-shadow-[0_0_12px_rgba(0,240,255,0.2)]" />
          </div>
          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-2 mt-1 text-[10px] font-mono">
            <span className="flex items-center gap-1 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-slate-400" /> Queue
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400" /> Processing
            </span>
            <span className="flex items-center gap-1 text-cyan-400">
              <span className="w-2 h-2 rounded-full bg-cyan-400" /> Verification
            </span>
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> Completed
            </span>
          </div>
        </div>

        {/* Bar Chart View */}
        <div className="md:col-span-7 flex flex-col justify-center">
          <div className="w-full flex justify-center">
            <svg ref={barRef} className="w-full max-w-[360px] h-auto" />
          </div>
        </div>
      </div>
    </div>
  );
};
