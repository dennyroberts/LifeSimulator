import { type StageResult, type SimulationResult, formatCurrency } from '@/lib/sim';

interface IncomeChartProps {
  stages: StageResult[];
}

export function IncomeChart({ stages }: IncomeChartProps) {
  const incomes = stages.map(s => s.incomeAfter);
  const maxIncome = Math.max(...incomes);
  const minIncome = Math.min(...incomes);
  const range = maxIncome - minIncome || 1;
  
  const width = 600;
  const height = 300;
  const padding = { top: 30, right: 60, bottom: 40, left: 80 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  const points = stages.map((stage, i) => ({
    x: padding.left + (i / (stages.length - 1)) * chartWidth,
    y: padding.top + chartHeight - ((stage.incomeAfter - minIncome) / range) * chartHeight,
    income: stage.incomeAfter,
    stage: stage.stage
  }));
  
  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');
  
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
      className="w-full max-w-[600px] h-auto"
      data-testid="income-chart"
    >
      <defs>
        <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity="0.3" />
          <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity="0" />
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
        d={`${pathD} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`}
        fill="url(#incomeGradient)"
      />
      
      <path
        d={pathD}
        fill="none"
        stroke="hsl(var(--chart-1))"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {points.map((point) => (
        <g key={point.stage}>
          <circle
            cx={point.x}
            cy={point.y}
            r="6"
            fill="hsl(var(--background))"
            stroke="hsl(var(--chart-1))"
            strokeWidth="3"
          />
          <text
            x={point.x}
            y={height - 15}
            textAnchor="middle"
            className="fill-muted-foreground text-[11px]"
          >
            {point.stage}
          </text>
        </g>
      ))}
      
      <text
        x={width / 2}
        y={height - 2}
        textAnchor="middle"
        className="fill-muted-foreground text-xs"
      >
        Stage
      </text>
    </svg>
  );
}

interface HistogramProps {
  results: SimulationResult[];
  bins?: number;
}

export function IncomeHistogram({ results, bins = 25 }: HistogramProps) {
  const incomes = results.map(r => r.finalIncome);
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
    y: r.finalIncome
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
