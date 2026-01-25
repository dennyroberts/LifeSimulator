import { useState } from 'react';
import { type StageResult, type SimulationResult, type LuckAnalysis, formatCurrency } from '@/lib/sim';

interface IncomeChartProps {
  stages: StageResult[];
  onHoverStage?: (stageIndex: number | null) => void;
}

export function IncomeChart({ stages, onHoverStage }: IncomeChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  
  const handleHover = (index: number | null) => {
    setHoveredPoint(index);
    onHoverStage?.(index);
  };
  
  const computeBestWorstPaths = () => {
    const bestPath: number[] = [];
    const worstPath: number[] = [];
    
    const bestCareerSalary = 72000;
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
        
        let bestJump = event.success.jumpPct * effectMultiplier;
        let bestGrowthDelta = event.success.growthDelta * effectMultiplier;
        if (bestJump < 0) bestJump = Math.abs(bestJump);
        if (bestGrowthDelta < 0) bestGrowthDelta = Math.abs(bestGrowthDelta);
        
        const newBestGrowth = Math.max(growthMin, Math.min(growthMax, bestGrowth + bestGrowthDelta));
        const bestOutcome = bestIncome * (1 + newBestGrowth) * (1 + bestJump);
        bestGrowth = newBestGrowth;
        bestIncome = bestOutcome;
        bestPath.push(bestOutcome);
        
        let worstJump = event.fail.jumpPct * effectMultiplier;
        let worstGrowthDelta = event.fail.growthDelta * effectMultiplier;
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
  
  // Base chart range on user's actual experience with generous headroom
  const userMax = Math.max(...incomes);
  const userMin = Math.min(...incomes);
  const headroom_pct = 0.5; // 50% headroom above max
  const floor_padding_pct = 0.1; // 10% below min
  const userRange = userMax - userMin || 1;
  const maxIncome = userMax + userRange * headroom_pct;
  const minIncome = Math.max(0, userMin - userRange * floor_padding_pct);
  const range = maxIncome - minIncome || 1;
  
  // Check if best/worst go off chart
  const bestFinal = bestPath[bestPath.length - 1];
  const worstFinal = worstPath[worstPath.length - 1];
  const bestGoesOffTop = bestFinal > maxIncome;
  const worstGoesOffBottom = worstFinal < minIncome;
  
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
      const isCrit = stage.career.isNat20;
      return { 
        name: 'Career', 
        outcome: isCrit ? `${stage.career.career.name} (Crit!)` : stage.career.career.name, 
        color: 'hsl(var(--chart-1))' 
      };
    }
    if (stage.eventOutcome) {
      const event = stage.eventOutcome;
      if (event.gateFailed) {
        return { name: event.event.name, outcome: "Didn't take the risk", color: 'hsl(var(--muted-foreground))' };
      }
      if (event.isCritical && event.criticalType === 'success') {
        return { name: event.event.name, outcome: 'Critical Success!', color: 'hsl(var(--chart-2))' };
      }
      if (event.isCritical && event.criticalType === 'failure') {
        return { name: event.event.name, outcome: 'Critical Failure!', color: 'hsl(var(--destructive))' };
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
  
  const clampY = (income: number) => {
    const rawY = padding.top + chartHeight - ((income - minIncome) / range) * chartHeight;
    return Math.max(padding.top, Math.min(padding.top + chartHeight, rawY));
  };
  
  const bestPoints = bestPath.map((income, i) => ({
    x: padding.left + (i / (stages.length - 1)) * chartWidth,
    y: clampY(income),
    income,
    offChart: income > maxIncome
  }));
  
  const worstPoints = worstPath.map((income, i) => ({
    x: padding.left + (i / (stages.length - 1)) * chartWidth,
    y: clampY(income),
    income,
    offChart: income < minIncome
  }));
  
  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');
  
  // Generate path that stops when going off-chart and return exit point
  const generateClippedPath = (pts: typeof bestPoints, goingUp: boolean): { path: string; exitPoint: { x: number; y: number } | null } => {
    const segments: string[] = [];
    let inChart = true;
    let exitPoint: { x: number; y: number } | null = null;
    
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const prevInChart = i === 0 || !pts[i - 1].offChart;
      const currInChart = !p.offChart;
      
      if (i === 0) {
        inChart = currInChart;
        segments.push(`M ${p.x} ${p.y}`);
      } else if (inChart && currInChart) {
        segments.push(`L ${p.x} ${p.y}`);
      } else if (inChart && !currInChart) {
        // Line goes off chart - draw to edge and stop
        const prev = pts[i - 1];
        const edgeY = goingUp ? padding.top : padding.top + chartHeight;
        // Interpolate x position where line hits edge
        const t = (edgeY - prev.y) / (p.y - prev.y);
        const edgeX = prev.x + t * (p.x - prev.x);
        segments.push(`L ${edgeX} ${edgeY}`);
        exitPoint = { x: edgeX, y: edgeY };
        inChart = false;
      }
      // If already off-chart, don't draw anything more
    }
    return { path: segments.join(' '), exitPoint };
  };
  
  const bestResult = generateClippedPath(bestPoints, true);
  const worstResult = generateClippedPath(worstPoints, false);
  const bestPathD = bestResult.path;
  const worstPathD = worstResult.path;
  const bestExitPoint = bestResult.exitPoint;
  const worstExitPoint = worstResult.exitPoint;
  
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
          onMouseEnter={() => handleHover(i)}
          onMouseLeave={() => handleHover(null)}
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
      
      {bestGoesOffTop && bestExitPoint && (
        <text
          x={bestExitPoint.x}
          y={bestExitPoint.y - 6}
          textAnchor="middle"
          className="fill-chart-2 text-[9px] font-mono font-medium"
        >
          {formatCurrency(bestFinal)}
        </text>
      )}
      
      {worstGoesOffBottom && worstExitPoint ? (
        <text
          x={worstExitPoint.x}
          y={worstExitPoint.y + 12}
          textAnchor="middle"
          className="fill-destructive text-[9px] font-mono font-medium"
        >
          {formatCurrency(worstFinal)}
        </text>
      ) : (
        <text
          x={worstPoints[worstPoints.length - 1].x + 4}
          y={worstPoints[worstPoints.length - 1].y}
          textAnchor="start"
          dominantBaseline="middle"
          className="fill-destructive text-[9px] font-mono font-medium"
        >
          {formatCurrency(worstFinal)}
        </text>
      )}
    </svg>
  );
}

interface HistogramProps {
  results: SimulationResult[];
  bins?: number;
  compact?: boolean;
}

export function IncomeHistogram({ results, bins = 25, compact = false }: HistogramProps) {
  const [hoveredBin, setHoveredBin] = useState<number | null>(null);
  
  const incomes = results.map(r => r.lifetimeEarnings);
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
  const height = 380;
  const padding = { top: 50, right: 40, bottom: 70, left: 80 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const barWidth = chartWidth / bins - 2;
  
  const meanX = padding.left + ((mean - minIncome) / range) * chartWidth;
  const medianX = padding.left + ((median - minIncome) / range) * chartWidth;
  
  const getBinRange = (binIndex: number) => {
    const binStart = minIncome + binIndex * binSize;
    const binEnd = minIncome + (binIndex + 1) * binSize;
    return { binStart, binEnd };
  };

  return (
    <svg 
      viewBox={`0 0 ${width} ${height}`} 
      className="w-full h-auto"
      data-testid="income-histogram"
      onMouseLeave={() => setHoveredBin(null)}
    >
      {binCounts.map((count, i) => {
        const x = padding.left + (i / bins) * chartWidth + 1;
        const barHeight = (count / maxCount) * chartHeight;
        const y = padding.top + chartHeight - barHeight;
        const isHovered = hoveredBin === i;
        return (
          <g key={i}>
            <rect
              x={x}
              y={padding.top}
              width={barWidth}
              height={chartHeight}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredBin(i)}
            />
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              fill={isHovered ? "hsl(var(--chart-4))" : "hsl(var(--chart-1))"}
              opacity={isHovered ? "1" : "0.8"}
              rx="2"
              className="pointer-events-none transition-all duration-150"
            />
          </g>
        );
      })}
      
      {hoveredBin !== null && (
        <>
          {(() => {
            const { binStart, binEnd } = getBinRange(hoveredBin);
            const count = binCounts[hoveredBin];
            const x = padding.left + (hoveredBin / bins) * chartWidth + barWidth / 2;
            const barHeight = (count / maxCount) * chartHeight;
            const y = padding.top + chartHeight - barHeight - 10;
            return (
              <g>
                <rect
                  x={x - 70}
                  y={y - 35}
                  width={140}
                  height={40}
                  rx="4"
                  fill="hsl(var(--popover))"
                  stroke="hsl(var(--border))"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={y - 18}
                  textAnchor="middle"
                  className="fill-foreground text-xs font-bold"
                >
                  {count.toLocaleString()} agents
                </text>
                <text
                  x={x}
                  y={y - 3}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[10px] font-mono"
                >
                  {formatCurrency(binStart)} - {formatCurrency(binEnd)}
                </text>
              </g>
            );
          })()}
        </>
      )}
      
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
        className="fill-chart-4 text-xs font-semibold"
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
        y={padding.top - 26}
        textAnchor="middle"
        className="fill-chart-2 text-xs font-semibold"
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
          y={height - 30}
          textAnchor="middle"
          className="fill-muted-foreground text-xs font-mono"
        >
          {formatCurrency(minIncome + pct * range)}
        </text>
      ))}
      
      <text
        x={width / 2}
        y={height - 8}
        textAnchor="middle"
        className="fill-muted-foreground text-sm font-medium"
      >
        Lifetime Earnings
      </text>
    </svg>
  );
}

interface ScatterPlotProps {
  results: SimulationResult[];
  xKey: string;
  xLabel: string;
  color: string;
  compact?: boolean;
}

export function ScatterPlot({ results, xKey, xLabel, color, compact = false }: ScatterPlotProps) {
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
    y: r.lifetimeEarnings
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
        Lifetime Earnings
      </text>
    </svg>
  );
}

interface ScatterGridProps {
  results: SimulationResult[];
  compact?: boolean;
}

export function ScatterGrid({ results, compact = false }: ScatterGridProps) {
  const allPlots = [
    { key: 'INT', label: 'Intelligence', color: 'hsl(var(--chart-1))' },
    { key: 'WORK', label: 'Work Ethic', color: 'hsl(var(--chart-2))' },
    { key: 'NEPO', label: 'Nepotism', color: 'hsl(var(--chart-3))' },
    { key: 'CHAR', label: 'Charisma', color: 'hsl(var(--chart-4))' },
    { key: 'RISK', label: 'Risk Tolerance', color: 'hsl(var(--chart-5))' },
    { key: 'netLuck', label: 'Net Luck', color: 'hsl(var(--chart-1))' },
  ];
  
  const plots = compact ? allPlots.slice(0, 4) : allPlots;

  return (
    <div className={`grid ${compact ? 'grid-cols-2 gap-2' : 'grid-cols-2 md:grid-cols-3 gap-4'}`} data-testid="scatter-grid">
      {plots.map(({ key, label, color }) => (
        <div key={key} className={`${compact ? 'p-2' : 'p-3'} rounded-md bg-card border border-card-border`}>
          <div className={`${compact ? 'text-xs' : 'text-sm'} font-medium text-center mb-1`}>{label}</div>
          <ScatterPlot results={results} xKey={key} xLabel={label} color={color} compact={compact} />
        </div>
      ))}
    </div>
  );
}

type OthersFilter = 'low' | 'average' | 'high';

const FILTER_RANGES: Record<OthersFilter, [number, number]> = {
  low: [4, 7],
  average: [8, 12],
  high: [13, 16],
};

const FILTER_LABELS: Record<OthersFilter, string> = {
  low: 'Others Low (4-7)',
  average: 'Others Average (8-12)',
  high: 'Others High (13-16)',
};

function filterByOtherTraits(
  results: SimulationResult[],
  excludeTrait: string,
  filter: OthersFilter
): SimulationResult[] {
  const [min, max] = FILTER_RANGES[filter];
  const otherTraits = ['INT', 'WORK', 'NEPO', 'CHAR', 'RISK'].filter(t => t !== excludeTrait);
  
  return results.filter(r => {
    return otherTraits.every(t => {
      const val = r.traits[t as keyof typeof r.traits];
      return val >= min && val <= max;
    });
  });
}

function filterByAllTraits(
  results: SimulationResult[],
  filter: OthersFilter
): SimulationResult[] {
  const [min, max] = FILTER_RANGES[filter];
  const allTraits = ['INT', 'WORK', 'NEPO', 'CHAR', 'RISK'];
  
  return results.filter(r => {
    return allTraits.every(t => {
      const val = r.traits[t as keyof typeof r.traits];
      return val >= min && val <= max;
    });
  });
}

interface ControlledScatterPlotProps {
  results: SimulationResult[];
  xKey: string;
  xLabel: string;
  color: string;
  yMax: number;
  xMin?: number;
  xMax?: number;
}

function ControlledScatterPlot({ results, xKey, xLabel, color, yMax, xMin: forcedXMin, xMax: forcedXMax }: ControlledScatterPlotProps) {
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
    y: r.lifetimeEarnings
  }));
  
  const xValues = data.map(d => d.x);
  const minX = forcedXMin !== undefined ? forcedXMin : Math.min(...xValues);
  const maxX = forcedXMax !== undefined ? forcedXMax : Math.max(...xValues);
  const xRange = maxX - minX || 1;
  const yRange = yMax;
  
  const width = 300;
  const height = 250;
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  const sampleSize = Math.min(results.length, 500);
  const step = Math.ceil(results.length / sampleSize);
  const sampledData = data.filter((_, i) => i % step === 0);
  
  // Calculate line of best fit using least squares regression
  const n = data.length;
  const sumX = data.reduce((acc, d) => acc + d.x, 0);
  const sumY = data.reduce((acc, d) => acc + d.y, 0);
  const sumXY = data.reduce((acc, d) => acc + d.x * d.y, 0);
  const sumXX = data.reduce((acc, d) => acc + d.x * d.x, 0);
  
  const slope = n > 1 ? (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX) : 0;
  const intercept = n > 0 ? (sumY - slope * sumX) / n : 0;
  
  // Calculate line endpoints
  const lineY1 = slope * minX + intercept;
  const lineY2 = slope * maxX + intercept;
  
  // Convert to SVG coordinates
  const lineStartX = padding.left;
  const lineEndX = padding.left + chartWidth;
  const lineStartY = padding.top + chartHeight - (lineY1 / yRange) * chartHeight;
  const lineEndY = padding.top + chartHeight - (lineY2 / yRange) * chartHeight;
  
  // Format slope for display ($ per trait point)
  const slopeK = slope / 1000;
  const slopeDisplay = slopeK >= 0 ? `+$${Math.round(slopeK)}K` : `-$${Math.round(Math.abs(slopeK))}K`;

  return (
    <svg 
      viewBox={`0 0 ${width} ${height}`} 
      className="w-full h-auto"
      data-testid={`controlled-scatter-${xKey}`}
    >
      {/* Clip path to contain points within chart area */}
      <defs>
        <clipPath id={`clip-${xKey}`}>
          <rect 
            x={padding.left} 
            y={padding.top} 
            width={chartWidth} 
            height={chartHeight} 
          />
        </clipPath>
      </defs>
      
      {/* Data points - clipped to chart bounds */}
      <g clipPath={`url(#clip-${xKey})`}>
        {sampledData.map((point, i) => {
          const x = padding.left + ((point.x - minX) / xRange) * chartWidth;
          const y = padding.top + chartHeight - (point.y / yRange) * chartHeight;
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
      </g>
      
      {/* Line of best fit */}
      <line
        x1={lineStartX}
        y1={Math.max(0, Math.min(height, lineStartY))}
        x2={lineEndX}
        y2={Math.max(0, Math.min(height, lineEndY))}
        stroke={color}
        strokeWidth="2"
        strokeDasharray="4,2"
        opacity="0.8"
      />
      
      {/* Bottom axis */}
      <line
        x1={padding.left}
        y1={padding.top + chartHeight}
        x2={width - padding.right}
        y2={padding.top + chartHeight}
        stroke="hsl(var(--border))"
      />
      {/* Left axis */}
      <line
        x1={padding.left}
        y1={padding.top}
        x2={padding.left}
        y2={padding.top + chartHeight}
        stroke="hsl(var(--border))"
      />
      {/* Top boundary dotted line */}
      <line
        x1={padding.left}
        y1={padding.top}
        x2={width - padding.right}
        y2={padding.top}
        stroke="hsl(var(--border))"
        strokeDasharray="4,4"
        opacity="0.6"
      />
      
      {/* Y-axis labels */}
      {[0, 0.5, 1].map(pct => (
        <text
          key={pct}
          x={padding.left - 5}
          y={padding.top + chartHeight - pct * chartHeight + 4}
          textAnchor="end"
          className="fill-muted-foreground text-[8px] font-mono"
        >
          {formatCurrency(pct * yMax)}
        </text>
      ))}
      
      {/* X-axis tick labels */}
      {[0, 0.5, 1].map(pct => {
        const xVal = minX + pct * xRange;
        const xPos = padding.left + pct * chartWidth;
        return (
          <text
            key={pct}
            x={xPos}
            y={padding.top + chartHeight + 12}
            textAnchor="middle"
            className="fill-muted-foreground text-[8px] font-mono"
          >
            {Number.isInteger(xVal) ? xVal : xVal.toFixed(1)}
          </text>
        );
      })}
      
      {/* X-axis label */}
      <text
        x={width / 2}
        y={height - 5}
        textAnchor="middle"
        className="fill-muted-foreground text-[10px]"
      >
        {xLabel}
      </text>
      
      {/* Y-axis label */}
      <text
        x={10}
        y={height / 2}
        textAnchor="middle"
        transform={`rotate(-90, 10, ${height / 2})`}
        className="fill-muted-foreground text-[10px]"
      >
        Lifetime Earnings
      </text>
      
      {/* Slope indicator */}
      <text
        x={width - padding.right - 5}
        y={padding.top + 12}
        textAnchor="end"
        className="text-[9px] font-mono font-bold"
        fill={color}
      >
        {slopeDisplay}/pt
      </text>
    </svg>
  );
}

interface ControlledTraitGridProps {
  results: SimulationResult[];
}

export function ControlledTraitGrid({ results }: ControlledTraitGridProps) {
  const [filter, setFilter] = useState<OthersFilter>('average');
  
  const traitPlots = [
    { key: 'INT', label: 'Intelligence', color: 'hsl(var(--chart-1))' },
    { key: 'WORK', label: 'Work Ethic', color: 'hsl(var(--chart-2))' },
    { key: 'NEPO', label: 'Nepotism', color: 'hsl(var(--chart-3))' },
    { key: 'CHAR', label: 'Charisma', color: 'hsl(var(--chart-4))' },
    { key: 'RISK', label: 'Risk Tolerance', color: 'hsl(var(--chart-5))' },
  ];
  
  // Fixed Y-axis at 6M for consistency, points above will overflow
  const yMax = 6_000_000;

  return (
    <div className="space-y-3" data-testid="controlled-trait-grid">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Filter:</span>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as OthersFilter)}
          className="text-sm bg-background border border-border rounded px-2 py-1"
          data-testid="trait-filter-dropdown"
        >
          <option value="low">{FILTER_LABELS.low}</option>
          <option value="average">{FILTER_LABELS.average}</option>
          <option value="high">{FILTER_LABELS.high}</option>
        </select>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {traitPlots.map(({ key, label, color }) => {
          const filtered = filterByOtherTraits(results, key, filter);
          return (
            <div key={key} className="p-3 rounded-md bg-card border border-card-border flex flex-col items-center">
              <div className="text-sm font-medium text-center mb-1">{label}</div>
              <div className="text-xs text-center text-muted-foreground mb-2">
                n={filtered.length}
              </div>
              <ControlledScatterPlot 
                results={filtered} 
                xKey={key} 
                xLabel={label} 
                color={color} 
                yMax={yMax}
                xMin={0}
                xMax={20}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ControlledLuckGridProps {
  results: SimulationResult[];
}

export function ControlledLuckGrid({ results }: ControlledLuckGridProps) {
  const [filter, setFilter] = useState<OthersFilter>('average');
  
  // Use z-scored values for consistent scales across all luck types
  // All z-scores have mean 0 and approximately unit variance
  const zScorePlots = [
    { 
      key: 'opportunityLuckZ', 
      label: 'Opportunity Luck (Z)', 
      color: 'hsl(var(--chart-5))',
      description: 'Luck from trait-based opportunities (normalized)'
    },
    { 
      key: 'rollLuckZ', 
      label: 'Roll Luck (Z)', 
      color: 'hsl(var(--chart-4))',
      description: 'Luck from all dice rolls combined (normalized)'
    },
    { 
      key: 'totalLuckZ', 
      label: 'Total Luck (Z)', 
      color: 'hsl(var(--chart-1))',
      description: 'Average of opportunity and roll luck z-scores'
    },
  ];
  
  // Roll luck breakdown by phase with individual x-axis ranges
  const rollLuckBreakdown: { key: keyof LuckAnalysis; label: string; color: string; description: string; range: [number, number] }[] = [
    { 
      key: 'educationRollLuck', 
      label: 'Education Roll Luck', 
      color: 'hsl(var(--chart-2))',
      description: 'Roll luck from education stage',
      range: [-1, 1]
    },
    { 
      key: 'careerRollLuck', 
      label: 'Career Roll Luck', 
      color: 'hsl(var(--chart-3))',
      description: 'Roll luck from career determination',
      range: [-1, 1]
    },
    { 
      key: 'eventRollLuck', 
      label: 'Event Roll Luck', 
      color: 'hsl(var(--chart-4))',
      description: 'Roll luck from life events',
      range: [-3, 3]
    },
  ];
  
  // Fixed Y-axis at 6M for consistency, points above will overflow
  const yMax = 6_000_000;
  
  // Fixed X-axis range for z-scores: -3 to 3 covers 99.7% of data
  const zScoreRange: [number, number] = [-3, 3];
  
  // Calculate dynamic range for raw roll luck values
  const filtered = filterByAllTraits(results, filter);

  return (
    <div className="space-y-4" data-testid="controlled-luck-grid">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground">Trait Filter:</span>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as OthersFilter)}
          className="text-sm bg-background border border-border rounded px-2 py-1"
          data-testid="luck-filter-dropdown"
        >
          <option value="low">{FILTER_LABELS.low}</option>
          <option value="average">{FILTER_LABELS.average}</option>
          <option value="high">{FILTER_LABELS.high}</option>
        </select>
        <span className="text-[10px] text-muted-foreground">n={filtered.length}</span>
      </div>
      
      {/* Z-Score Section */}
      <div>
        <div className="text-sm font-semibold mb-2">Normalized Luck (Z-Scores)</div>
        <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2 space-y-1 mb-3">
          <div><strong>Z-scores explained:</strong> Values centered at 0 (average luck). Positive = lucky, negative = unlucky.</div>
          <div>Most agents fall between -2 and +2. Values beyond +/-3 are extremely rare.</div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {zScorePlots.map(({ key, label, color, description }) => {
            return (
              <div key={key} className="p-3 rounded-md bg-card border border-card-border flex flex-col items-center">
                <div className="text-sm font-medium text-center mb-0.5">{label}</div>
                <div className="text-[10px] text-muted-foreground text-center mb-1">{description}</div>
                <ControlledScatterPlot 
                  results={filtered} 
                  xKey={key} 
                  xLabel={label} 
                  color={color} 
                  yMax={yMax}
                  xMin={zScoreRange[0]}
                  xMax={zScoreRange[1]}
                />
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Roll Luck Breakdown Section */}
      <div>
        <div className="text-sm font-semibold mb-2">Roll Luck by Phase (Raw $ Impact)</div>
        <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2 mb-3">
          How much each life phase's dice rolls deviated from expected value (in dollars).
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rollLuckBreakdown.map(({ key, label, color, description, range }) => {
            return (
              <div key={key} className="p-3 rounded-md bg-card border border-card-border flex flex-col items-center">
                <div className="text-sm font-medium text-center mb-0.5">{label}</div>
                <div className="text-[10px] text-muted-foreground text-center mb-1">{description}</div>
                <ControlledScatterPlot 
                  results={filtered} 
                  xKey={key} 
                  xLabel={label} 
                  color={color} 
                  yMax={yMax}
                  xMin={range[0]}
                  xMax={range[1]}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
