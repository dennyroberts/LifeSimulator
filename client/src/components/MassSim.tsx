import { useState, useMemo, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TraitDisplay } from './TraitInput';
import { CompactEventList } from './Timeline';
import { IncomeHistogram, ScatterGrid } from './Charts';
import {
  type WorldMode,
  type SimulationResult,
  type Event,
  type CareerAspiration,
  runMassSimulation,
  formatCurrency,
  formatEV,
  getLifetimeGrade,
  simulateLife,
} from '@/lib/sim';
import { Play, Users, Settings, RefreshCw, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';

type AgentCount = 1000 | 10000 | 50000;

export function MassSim() {
  const [worldMode, setWorldMode] = useState<WorldMode>('normal');
  const [sameDeck, setSameDeck] = useState(false);
  const [seed, setSeed] = useState(() => String(Math.floor(Math.random() * 1000000)));
  const [seedLocked, setSeedLocked] = useState(false);
  const [agentCount, setAgentCount] = useState<AgentCount>(10000);
  const [results, setResults] = useState<SimulationResult[] | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  const handleRandomSeed = () => {
    setSeed(String(Math.floor(Math.random() * 1000000)));
  };
  
  const handleRun = async () => {
    setIsRunning(true);
    setProgress(0);
    
    const currentSeed = seedLocked ? seed : String(Math.floor(Math.random() * 1000000));
    if (!seedLocked) {
      setSeed(currentSeed);
    }
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const batchSize = 1000;
    const batches = Math.ceil(agentCount / batchSize);
    const allResults: SimulationResult[] = [];
    
    for (let i = 0; i < batches; i++) {
      if (!isMountedRef.current) return;
      
      const batchStart = i * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, agentCount);
      const batchCount = batchEnd - batchStart;
      
      const batchResults = runMassSimulation(
        batchCount,
        worldMode,
        `${currentSeed}|batch${i}`,
        sameDeck
      );
      
      batchResults.forEach((r) => {
        allResults.push(r);
      });
      
      if (!isMountedRef.current) return;
      setProgress(((i + 1) / batches) * 100);
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    if (!isMountedRef.current) return;
    setResults(allResults);
    setIsRunning(false);
  };
  
  const { topAgents, bottomAgents, stats } = useMemo(() => {
    if (!results) return { topAgents: [], bottomAgents: [], stats: null };
    
    const sorted = [...results].sort((a, b) => b.peakIncome - a.peakIncome);
    const topAgents = sorted.slice(0, 10);
    const bottomAgents = sorted.slice(-10).reverse();
    
    const incomes = results.map(r => r.peakIncome);
    const mean = incomes.reduce((a, b) => a + b, 0) / incomes.length;
    const sortedIncomes = [...incomes].sort((a, b) => a - b);
    const median = sortedIncomes[Math.floor(sortedIncomes.length / 2)];
    const min = sortedIncomes[0];
    const max = sortedIncomes[sortedIncomes.length - 1];
    
    return {
      topAgents,
      bottomAgents,
      stats: { mean, median, min, max, count: results.length }
    };
  }, [results]);

  return (
    <div className="space-y-6" data-testid="mass-sim-view">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Mass Simulation Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <Label>Number of Agents</Label>
              <div className="flex gap-2 mt-1.5">
                {([1000, 10000, 50000] as AgentCount[]).map((count) => (
                  <Button
                    key={count}
                    variant={agentCount === count ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAgentCount(count)}
                    data-testid={`button-count-${count}`}
                  >
                    {count === 1000 ? '1K' : count === 10000 ? '10K' : '50K'}
                  </Button>
                ))}
              </div>
            </div>
            
            <div>
              <Label htmlFor="world-mode-mass">World Mode</Label>
              <Select value={worldMode} onValueChange={(v) => setWorldMode(v as WorldMode)}>
                <SelectTrigger className="mt-1.5" data-testid="select-world-mode-mass">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="nepo">Nepotism</SelectItem>
                  <SelectItem value="meritocracy">Meritocracy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Label htmlFor="seed-mass">Seed</Label>
                <div className="flex items-center gap-1.5">
                  <Checkbox
                    id="seed-lock-mass"
                    checked={seedLocked}
                    onCheckedChange={(checked) => setSeedLocked(checked === true)}
                    data-testid="checkbox-seed-lock-mass"
                  />
                  <Label htmlFor="seed-lock-mass" className="text-xs text-muted-foreground cursor-pointer">
                    Lock
                  </Label>
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  id="seed-mass"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  placeholder="Seed"
                  className="font-mono"
                  disabled={!seedLocked}
                  data-testid="input-seed-mass"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRandomSeed}
                  disabled={!seedLocked}
                  data-testid="button-random-seed-mass"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {seedLocked ? 'Seed is fixed for reproducible results' : 'Seed randomizes each run'}
              </p>
            </div>
            
            <div className="flex items-center space-x-3 pt-7">
              <Switch
                id="same-deck-mass"
                checked={sameDeck}
                onCheckedChange={setSameDeck}
                data-testid="switch-same-deck-mass"
              />
              <Label htmlFor="same-deck-mass" className="cursor-pointer">
                Same deck
              </Label>
            </div>
          </div>
          
          <div className="mt-6">
            <Button
              onClick={handleRun}
              disabled={isRunning}
              className="gap-2"
              size="lg"
              data-testid="button-run-mass-simulation"
            >
              <Play className="h-4 w-4" />
              {isRunning ? 'Simulating...' : `Simulate ${agentCount.toLocaleString()} Lives`}
            </Button>
            
            {isRunning && (
              <div className="mt-4 max-w-md">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-muted-foreground mt-1">
                  Processing... {Math.round(progress)}%
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {stats && results && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Total Agents</div>
                <div className="text-2xl font-bold font-mono" data-testid="stat-total">
                  {stats.count.toLocaleString()}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Mean Income</div>
                <div className="text-2xl font-bold font-mono text-chart-1" data-testid="stat-mean">
                  {formatCurrency(stats.mean)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Median Income</div>
                <div className="text-2xl font-bold font-mono text-chart-2" data-testid="stat-median">
                  {formatCurrency(stats.median)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Range</div>
                <div className="text-lg font-mono">
                  <span className="text-destructive">{formatCurrency(stats.min)}</span>
                  <span className="text-muted-foreground mx-1">→</span>
                  <span className="text-chart-2">{formatCurrency(stats.max)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <BarChart3 className="h-4 w-4" />
                  Income Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <IncomeHistogram results={results} compact />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Trait & Luck Correlations</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ScatterGrid results={results} compact />
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-chart-2" />
                  Top 10 Performers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AgentTable agents={topAgents} isTop worldMode={worldMode} seed={seed} />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-destructive" />
                  Bottom 10 Performers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AgentTable agents={bottomAgents} isTop={false} worldMode={worldMode} seed={seed} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

interface AgentWithScenarios {
  actual: SimulationResult;
  best: SimulationResult;
  worst: SimulationResult;
}

function computeBestWorst(agent: SimulationResult, worldMode: WorldMode, seed: string): AgentWithScenarios {
  const sharedEvents = new Map<number, Event>();
  agent.stages.forEach(stage => {
    if (stage.eventOutcome?.event) {
      sharedEvents.set(stage.stage, stage.eventOutcome.event);
    }
  });
  
  const agentData = { name: agent.name, traits: agent.traits, index: agent.stages[0]?.stage || 0, aspiration: agent.aspiration };
  const best = simulateLife(agentData, worldMode, seed, true, sharedEvents, 20);
  const worst = simulateLife(agentData, worldMode, seed, true, sharedEvents, 1);
  
  return { actual: agent, best, worst };
}

function AgentTable({ agents, isTop, worldMode, seed }: { 
  agents: SimulationResult[]; 
  isTop: boolean;
  worldMode: WorldMode;
  seed: string;
}) {
  const agentsWithScenarios = useMemo(() => {
    return agents.map(agent => computeBestWorst(agent, worldMode, seed));
  }, [agents, worldMode, seed]);

  return (
    <div className="space-y-3" data-testid={`agent-list-${isTop ? 'top' : 'bottom'}`}>
      {agentsWithScenarios.map((agentData, i) => (
        <AgentCard 
          key={i} 
          agentData={agentData} 
          rank={isTop ? i + 1 : agents.length - i}
          isTop={isTop}
        />
      ))}
    </div>
  );
}

function AgentCard({ agentData, rank, isTop }: { 
  agentData: AgentWithScenarios; 
  rank: number;
  isTop: boolean;
}) {
  const { actual, best, worst } = agentData;
  const actualGrade = getLifetimeGrade(actual.lifetimeEarnings);
  const bestGrade = getLifetimeGrade(best.lifetimeEarnings);
  const worstGrade = getLifetimeGrade(worst.lifetimeEarnings);

  return (
    <Card className="p-3" data-testid={`agent-card-${isTop ? 'top' : 'bottom'}-${rank}`}>
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="text-lg font-mono text-muted-foreground w-6 shrink-0">
            {rank}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold truncate">{actual.name}</span>
              <div className="flex items-center gap-1">
                <span className={`text-2xl font-bold ${actualGrade.color}`}>{actualGrade.grade}</span>
                <div className="flex flex-col text-[10px] font-bold leading-tight">
                  <span className={bestGrade.color} title="Best possible">{bestGrade.grade}</span>
                  <span className={worstGrade.color} title="Worst possible">{worstGrade.grade}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-1 text-xs flex-wrap">
              <span className={`font-mono font-semibold ${isTop ? 'text-chart-2' : 'text-destructive'}`}>
                {formatCurrency(actual.lifetimeEarnings)}
              </span>
              <TraitDisplay traits={actual.traits} compact />
              {actual.aspiration && (
                <span className="text-muted-foreground">
                  Aspires: <span className="text-foreground">{actual.aspiration}</span>
                </span>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] text-muted-foreground">Roll Luck</div>
            <div className={`text-sm font-mono font-semibold ${actual.luck.rollLuck >= 0 ? 'text-chart-2' : 'text-destructive'}`}>
              {formatEV(actual.luck.rollLuck)}
            </div>
          </div>
        </div>
        
        <MiniTimeline stages={actual.stages} />
      </div>
    </Card>
  );
}

function MiniTimeline({ stages }: { stages: SimulationResult['stages'] }) {
  const eventStages = stages.filter(s => s.eventOutcome);
  const education = stages.find(s => s.isEducation);
  const career = stages.find(s => s.isCareer);
  
  return (
    <div className="flex flex-wrap gap-1 text-[10px]" data-testid="mini-timeline">
      {education && (
        <div className="px-1.5 py-0.5 rounded bg-chart-1/20 text-chart-1 font-medium truncate max-w-[80px]" title={education.education?.label}>
          {education.education?.label}
        </div>
      )}
      {career && (
        <div className="px-1.5 py-0.5 rounded bg-chart-2/20 text-chart-2 font-medium truncate max-w-[100px]" title={career.career?.career.name}>
          {career.career?.career.name}
        </div>
      )}
      {eventStages.map((stage) => {
        const outcome = stage.eventOutcome!;
        const bgColor = outcome.gateFailed 
          ? 'bg-muted/50' 
          : outcome.success 
            ? 'bg-chart-2/20' 
            : 'bg-destructive/20';
        const textColor = outcome.gateFailed 
          ? 'text-muted-foreground' 
          : outcome.success 
            ? 'text-chart-2' 
            : 'text-destructive';
        
        return (
          <div 
            key={stage.stage} 
            className={`px-1.5 py-0.5 rounded ${bgColor} ${textColor} truncate max-w-[100px]`}
            title={`${outcome.event.name}: ${outcome.success ? 'Success' : outcome.gateFailed ? 'Skipped' : 'Failed'}`}
          >
            {outcome.success ? '+' : outcome.gateFailed ? '~' : '-'} {outcome.event.name}
          </div>
        );
      })}
    </div>
  );
}
