import { useState } from 'react';
import { type StageResult, type SimulationResult, formatCurrency } from '@/lib/sim';

interface IncomeChartProps {
  stages: StageResult[];
}

export function IncomeChart({ stages }: IncomeChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  
  const computeBestWorstPaths = () => {
    const bestPath: number[] = [];
    const worstPath: number[] = [];
    
    const bestCareerSalary = 72000 * 1.2;
    const bestCareerGrowth = 0.055;
    const worstCareerSalary = 32000;
    const worstCareerGrowth = 0.01;
    
    let bestIncome = worstCareerSalary;
    let worstIncome = worstCareerSalary;
    const growthMin = -0.10;
    const growthMax = 0.40;
    const effectMultiplier = 2.0;
    let bestGrowth = bestCareerGrowth;
    let worstGrowth = worstCareerGrowth;
    
    for (const stage of stages) {
      if (stage.isEducation) {
        bestPath.push(0);
        worstPath.push(0);
        if (stage.education) {
          bestGrowth = Math.max(growthMin, Math.min(growthMax, bestCareerGrowth + stage.education.growthDelta));
          worstGrowth = Math.max(growthMin, Math.min(growthMax, worstCareerGrowth + stage.education.growthDelta));
        }
      } else if (stage.isCareer) {
        bestIncome = bestCareerSalary;
        worstIncome = worstCareerSalary;
        bestPath.push(bestIncome);
        worstPath.push(worstIncome);
      } else if (stage.eventOutcome) {
        const event = stage.eventOutcome.event;
        const critMultiplier = 2.0;
        
        let bestJump = event.success.jumpPct * effectMultiplier * critMultiplier;
        let bestGrowthDelta = event.success.growthDelta * effectMultiplier * critMultiplier;
        if (bestJump < 0) bestJump = Math.abs(bestJump);
        if (bestGrowthDelta < 0) bestGrowthDelta = Math.abs(bestGrowthDelta);
        
        const newBestGrowth = Math.max(growthMin, Math.min(growthMax, bestGrowth + bestGrowthDelta));
        const bestOutcome = bestIncome * (1 + newBestGrowth) * (1 + bestJump);
        bestGrowth = newBestGrowth;
        bestIncome = bestOutcome;
        bestPath.push(bestOutcome);
        
        let worstJump = event.fail.jumpPct * effectMultiplier * critMultiplier;
        let worstGrowthDelta = event.fail.growthDelta * effectMultiplier * critMultiplier;
        if (worstJump > 0) worstJump = -Math.abs(worstJump);
        if (worstGrowthDelta > 0) worstGrowthDelta = -Math.abs(worstGrowthDelta);
        
        const newWorstGrowth = Math.max(growthMin, Math.min(growthMax, worstGrowth + worstGrowthDelta));
        const worstOutcome = Math.max(1000, worstIncome * (1 + newWorstGrowth) * (1 + worstJump));
        worstGrowth = newWorstGrowth;
        worstIncome = worstOutcome;
        worstPath.push(worstOutcome);
      } else {
        bestPath.push(bestIncome);
        worstPath.push(worstIncome);
      }
    }
    return { bestPath, worstPath };
  };
  
  const { bestPath, worstPath } = computeBestWorstPaths();
  const incomes = stages.map(s => s.incomeAfter);
  
  const allValues = [...incomes, ...bestPath, ...worstPath];
  const maxIncome = Math.max(...allValues);
  const minIncome = Math.min(...allValues);
  const range = maxIncome - minIncome || 1;
  
  const width = 700;
  const height = 320;
  const padding = { top: 60, right: 60, bottom: 50, left: 80 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  const stageToAge = (stageIndex: number) => {
    if (stageIndex === 0) return 18;
    if (stageIndex === 1) return 24;
    return 24 + (stageIndex - 1) * 6;
  };
  
  const getEventInfo = (stage: StageResult) => {
    if (stage.isEducation) {
      return { name: 'Education', outcome: stage.education?.label || 'Complete', color: 'hsl(var(--chart-2))' };
    }
    if (stage.isCareer && stage.career) {
      return { name: 'Career', outcome: stage.career.career.name, color: 'hsl(var(--chart-1))' };
    }
    if (stage.eventOutcome) {
      const event = stage.eventOutcome;
      if (event.gateFailed) {
        return { name: event.event.name, outcome: "Didn't take the risk", color: 'hsl(var(--muted-foreground))' };
      }
      if (event.success) {
        return { name: event.event.name, outcome: 'Success', color: 'hsl(var(--chart-2))' };
      }
      return { name: event.event.name, outcome: 'Failed', color: 'hsl(var(--destructive))' };
    }
    return { name: 'Unknown', outcome: '', color: 'hsl(var(--muted-foreground))' };
  };
  
  const points = stages.map((stage, i) => ({
    x: padding.left + (i / (stages.length - 1)) * chartWidth,
    y: padding.top + chartHeight - ((stage.incomeAfter - minIncome) / range) * chartHeight,
    income: stage.incomeAfter,
    stage: stage.stage,
    age: stageToAge(i),
    eventInfo: getEventInfo(stage)
  }));
  
  const bestPoints = bestPath.map((income, i) => ({
    x: padding.left + (i / (stages.length - 1)) * chartWidth,
    y: padding.top + chartHeight - ((income - minIncome) / range) * chartHeight
  }));
  
  const worstPoints = worstPath.map((income, i) => ({
    x: padding.left + (i / (stages.length - 1)) * chartWidth,
    y: padding.top + chartHeight - ((income - minIncome) / range) * chartHeight
  }));
  
  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');
  
  const bestPathD = bestPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');
  
  const worstPathD = worstPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');
  
  const rangeFillD = bestPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ') + ' ' +
    [...worstPoints].reverse()
    .map((p, i) => `${i === 0 ? 'L' : 'L'} ${p.x} ${p.y}`)
    .join(' ') + ' Z';
  
  const yTicks = 5;
  const yLabels = Array.from({ length: yTicks }, (_, i) => {
    const value = minIncome + (range * i) / (yTicks - 1);
    return {
      value,
      y: padding.top + chartHeight - (i / (yTicks - 1)) * chartHeight
    };
  });

  return (
    <svg 
      viewBox={`0 0 ${width} ${height}`} 
      className="w-full max-w-[700px] h-auto"
      data-testid="income-chart"
      style={{ overflow: 'visible' }}
    >
      <defs>
        <linearGradient id="rangeGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity="0.25" />
          <stop offset="50%" stopColor="hsl(var(--chart-1))" stopOpacity="0.15" />
          <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      
      {yLabels.map(({ value, y }) => (
        <g key={value}>
          <line
            x1={padding.left}
            y1={y}
            x2={width - padding.right}
            y2={y}
            stroke="hsl(var(--border))"
            strokeDasharray="4,4"
          />
          <text
            x={padding.left - 10}
            y={y}
            textAnchor="end"
            alignmentBaseline="middle"
            className="fill-muted-foreground text-[10px] font-mono"
          >
            {formatCurrency(value)}
          </text>
        </g>
      ))}
      
      <path
        d={rangeFillD}
        fill="url(#rangeGradient)"
      />
      
      <path
        d={bestPathD}
        fill="none"
        stroke="hsl(var(--chart-2))"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="4,3"
        opacity="0.7"
      />
      
      <path
        d={worstPathD}
        fill="none"
        stroke="hsl(var(--destructive))"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="4,3"
        opacity="0.7"
      />
      
      <path
        d={pathD}
        fill="none"
        stroke="hsl(var(--chart-1))"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {points.map((point, i) => (
        <g 
          key={point.stage}
          onMouseEnter={() => setHoveredPoint(i)}
          onMouseLeave={() => setHoveredPoint(null)}
          style={{ cursor: 'pointer' }}
        >
          <circle
            cx={point.x}
            cy={point.y}
            r="8"
            fill="hsl(var(--background))"
            stroke="hsl(var(--chart-1))"
            strokeWidth="3"
          />
          <text
            x={point.x}
            y={height - 20}
            textAnchor="middle"
            className="fill-muted-foreground text-[11px] font-mono"
          >
            {i === 0 && '\u{1F476} '}{point.age}{i === points.length - 1 && ' \u{1FAA6}'}
          </text>
          {hoveredPoint === i && (() => {
            const tooltipWidth = 150;
            const tooltipHeight = 48;
            let tooltipX = point.x - tooltipWidth / 2;
            let tooltipY = point.y - tooltipHeight - 12;
            
            if (tooltipX < 5) tooltipX = 5;
            if (tooltipX + tooltipWidth > width - 5) tooltipX = width - tooltipWidth - 5;
            if (tooltipY < 5) {
              tooltipY = point.y + 18;
            }
            
            return (
              <g style={{ pointerEvents: 'none' }}>
                <rect
                  x={tooltipX}
                  y={tooltipY}
                  width={tooltipWidth}
                  height={tooltipHeight}
                  rx="4"
                  fill="hsl(var(--popover))"
                  stroke="hsl(var(--border))"
                  strokeWidth="1"
                  style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                />
                <text
                  x={tooltipX + tooltipWidth / 2}
                  y={tooltipY + 18}
                  textAnchor="middle"
                  className="fill-foreground text-[11px] font-medium"
                >
                  {point.eventInfo.name}
                </text>
                <text
                  x={tooltipX + tooltipWidth / 2}
                  y={tooltipY + 35}
                  textAnchor="middle"
                  className="text-[10px] font-medium"
                  fill={point.eventInfo.color}
                >
                  {point.eventInfo.outcome}
                </text>
              </g>
            );
          })()}
        </g>
      ))}
      
      <text
        x={width / 2}
        y={height - 2}
        textAnchor="middle"
        className="fill-muted-foreground text-xs"
      >
        Age
      </text>
      
      <g className="legend" transform={`translate(${width - padding.right - 200}, ${padding.top - 45})`}>
        <line x1="0" y1="8" x2="20" y2="8" stroke="hsl(var(--chart-2))" strokeWidth="1.5" strokeDasharray="4,3" opacity="0.7" />
        <text x="26" y="12" className="fill-muted-foreground text-[10px]">Best possible</text>
        
        <line x1="110" y1="8" x2="130" y2="8" stroke="hsl(var(--destructive))" strokeWidth="1.5" strokeDasharray="4,3" opacity="0.7" />
        <text x="136" y="12" className="fill-muted-foreground text-[10px]">Worst possible</text>
      </g>
    </svg>
  );
}

interface HistogramProps {
  results: SimulationResult[];
  bins?: number;
}

export function IncomeHistogram({ results, bins = 25 }: HistogramProps) {
  const incomes = results.map(r => r.peakIncome);
  const minIncome = Math.min(...incomes);
  const maxIncome = Math.max(...incomes);
  const range = maxIncome - minIncome || 1;
  const binSize = range / bins;
  
  const binCounts = new Array(bins).fill(0);
  incomes.forEach(income => {
    const binIndex = Math.min(Math.floor((income - minIncome) / binSize), bins - 1);
    binCounts[binIndex]++;
  });
  
  const maxCount = Math.max(...binCounts);
  const mean = incomes.reduce((a, b) => a + b, 0) / incomes.length;
  const sorted = [...incomes].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  
  const width = 700;
  const height = 350;
  const padding = { top: 30, right: 40, bottom: 60, left: 80 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const barWidth = chartWidth / bins - 2;
  
  const meanX = padding.left + ((mean - minIncome) / range) * chartWidth;
  const medianX = padding.left + ((median - minIncome) / range) * chartWidth;

  return (
    <svg 
      viewBox={`0 0 ${width} ${height}`} 
      className="w-full h-auto"
      data-testid="income-histogram"
    >
      {binCounts.map((count, i) => {
        const x = padding.left + (i / bins) * chartWidth + 1;
        const barHeight = (count / maxCount) * chartHeight;
        const y = padding.top + chartHeight - barHeight;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barWidth}
            height={barHeight}
            fill="hsl(var(--chart-1))"
            opacity="0.8"
            rx="2"
          />
        );
      })}
      
      <line
        x1={meanX}
        y1={padding.top}
        x2={meanX}
        y2={padding.top + chartHeight}
        stroke="hsl(var(--chart-4))"
        strokeWidth="2"
        strokeDasharray="6,3"
      />
      <text
        x={meanX}
        y={padding.top - 10}
        textAnchor="middle"
        className="fill-chart-4 text-[10px] font-medium"
      >
        Mean: {formatCurrency(mean)}
      </text>
      
      <line
        x1={medianX}
        y1={padding.top}
        x2={medianX}
        y2={padding.top + chartHeight}
        stroke="hsl(var(--chart-2))"
        strokeWidth="2"
        strokeDasharray="6,3"
      />
      <text
        x={medianX}
        y={padding.top - 22}
        textAnchor="middle"
        className="fill-chart-2 text-[10px] font-medium"
      >
        Median: {formatCurrency(median)}
      </text>
      
      <line
        x1={padding.left}
        y1={padding.top + chartHeight}
        x2={width - padding.right}
        y2={padding.top + chartHeight}
        stroke="hsl(var(--border))"
      />
      
      {[0, 0.25, 0.5, 0.75, 1].map(pct => (
        <text
          key={pct}
          x={padding.left + pct * chartWidth}
          y={height - 25}
          textAnchor="middle"
          className="fill-muted-foreground text-[10px] font-mono"
        >
          {formatCurrency(minIncome + pct * range)}
        </text>
      ))}
      
      <text
        x={width / 2}
        y={height - 5}
        textAnchor="middle"
        className="fill-muted-foreground text-xs"
      >
        Final Income
      </text>
    </svg>
  );
}

interface ScatterPlotProps {
  results: SimulationResult[];
  xKey: string;
  xLabel: string;
  color: string;
}

export function ScatterPlot({ results, xKey, xLabel, color }: ScatterPlotProps) {
  const getXValue = (r: SimulationResult): number => {
    if (xKey in r.traits) {
      return r.traits[xKey as keyof typeof r.traits];
    }
    if (xKey in r.luck) {
      return r.luck[xKey as keyof typeof r.luck];
    }
    return 0;
  };
  
  const data = results.map(r => ({
    x: getXValue(r),
    y: r.peakIncome
  }));
  
  const xValues = data.map(d => d.x);
  const yValues = data.map(d => d.y);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);
  const xRange = maxX - minX || 1;
  const yRange = maxY - minY || 1;
  
  const width = 300;
  const height = 250;
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  const sampleSize = Math.min(results.length, 500);
  const step = Math.ceil(results.length / sampleSize);
  const sampledData = data.filter((_, i) => i % step === 0);

  return (
    <svg 
      viewBox={`0 0 ${width} ${height}`} 
      className="w-full h-auto"
      data-testid={`scatter-${xKey}`}
    >
      {sampledData.map((point, i) => {
        const x = padding.left + ((point.x - minX) / xRange) * chartWidth;
        const y = padding.top + chartHeight - ((point.y - minY) / yRange) * chartHeight;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="3"
            fill={color}
            opacity="0.4"
          />
        );
      })}
      
      <line
        x1={padding.left}
        y1={padding.top + chartHeight}
        x2={width - padding.right}
        y2={padding.top + chartHeight}
        stroke="hsl(var(--border))"
      />
      <line
        x1={padding.left}
        y1={padding.top}
        x2={padding.left}
        y2={padding.top + chartHeight}
        stroke="hsl(var(--border))"
      />
      
      <text
        x={width / 2}
        y={height - 5}
        textAnchor="middle"
        className="fill-muted-foreground text-[10px]"
      >
        {xLabel}
      </text>
      
      <text
        x={10}
        y={height / 2}
        textAnchor="middle"
        transform={`rotate(-90, 10, ${height / 2})`}
        className="fill-muted-foreground text-[10px]"
      >
        Income
      </text>
    </svg>
  );
}

interface ScatterGridProps {
  results: SimulationResult[];
}

export function ScatterGrid({ results }: ScatterGridProps) {
  const plots = [
    { key: 'INT', label: 'Intelligence', color: 'hsl(var(--chart-1))' },
    { key: 'WORK', label: 'Work Ethic', color: 'hsl(var(--chart-2))' },
    { key: 'NEPO', label: 'Nepotism', color: 'hsl(var(--chart-3))' },
    { key: 'CHAR', label: 'Charisma', color: 'hsl(var(--chart-4))' },
    { key: 'RISK', label: 'Risk Tolerance', color: 'hsl(var(--chart-5))' },
    { key: 'netLuck', label: 'Net Luck', color: 'hsl(var(--chart-1))' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4" data-testid="scatter-grid">
      {plots.map(({ key, label, color }) => (
        <div key={key} className="p-3 rounded-md bg-card border border-card-border">
          <div className="text-sm font-medium text-center mb-2">{label} vs Income</div>
          <ScatterPlot results={results} xKey={key} xLabel={label} color={color} />
        </div>
      ))}
    </div>
  );
}
