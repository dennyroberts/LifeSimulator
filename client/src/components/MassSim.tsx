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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { DetailedCard } from './Timeline';
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
import { Play, Users, Settings, RefreshCw, TrendingUp, TrendingDown, BarChart3, Sparkles, Skull, BookOpen, Loader2, GraduationCap, Briefcase, Filter, Search, X, ChevronDown, ChevronRight, Plus, Clover, Save, Pencil, Trash2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import * as LucideIcons from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

type AgentCount = 1000 | 10000 | 50000 | 100000 | 500000;

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
    
    const sorted = [...results].sort((a, b) => b.lifetimeEarnings - a.lifetimeEarnings);
    const topAgents = sorted.slice(0, 10);
    const bottomAgents = sorted.slice(-10).reverse();
    
    const earnings = results.map(r => r.lifetimeEarnings);
    const mean = earnings.reduce((a, b) => a + b, 0) / earnings.length;
    const sortedEarnings = [...earnings].sort((a, b) => a - b);
    const median = sortedEarnings[Math.floor(sortedEarnings.length / 2)];
    const min = sortedEarnings[0];
    const max = sortedEarnings[sortedEarnings.length - 1];
    
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
              <div className="flex flex-wrap gap-2 mt-1.5">
                {([1000, 10000, 50000, 100000, 500000] as AgentCount[]).map((count) => (
                  <Button
                    key={count}
                    variant={agentCount === count ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAgentCount(count)}
                    data-testid={`button-count-${count}`}
                  >
                    {count === 1000 ? '1K' : count === 10000 ? '10K' : count === 50000 ? '50K' : count === 100000 ? '100K' : '500K'}
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
                <div className="text-sm text-muted-foreground">Mean Lifetime Earnings</div>
                <div className="text-2xl font-bold font-mono text-chart-1" data-testid="stat-mean">
                  {formatCurrency(stats.mean)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Median Lifetime Earnings</div>
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
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CollapsiblePanel 
              title="Top 10 Performers" 
              icon={<TrendingUp className="h-5 w-5 text-chart-2" />}
              defaultExpanded={true}
              testId="top-performers"
            >
              <AgentTable agents={topAgents} isTop worldMode={worldMode} seed={seed} />
            </CollapsiblePanel>
            
            <CollapsiblePanel 
              title="Bottom 10 Performers" 
              icon={<TrendingDown className="h-5 w-5 text-destructive" />}
              testId="bottom-performers"
              defaultExpanded={true}
            >
              <AgentTable agents={bottomAgents} isTop={false} worldMode={worldMode} seed={seed} />
            </CollapsiblePanel>
          </div>
          
          <CompareCohorts results={results} worldMode={worldMode} seed={seed} />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CollapsiblePanel 
              title="Lifetime Earnings Distribution" 
              icon={<BarChart3 className="h-4 w-4" />}
              defaultExpanded={true}
              testId="earnings-histogram"
            >
              <IncomeHistogram results={results} compact />
            </CollapsiblePanel>
            
            <CollapsiblePanel 
              title="Trait & Luck Correlations" 
              icon={<BarChart3 className="h-4 w-4" />}
              defaultExpanded={true}
              testId="correlations-scatter"
            >
              <ScatterGrid results={results} compact />
            </CollapsiblePanel>
          </div>
        </>
      )}
    </div>
  );
}

function CollapsiblePanel({ 
  title, 
  icon, 
  children, 
  defaultExpanded = true,
  testId
}: { 
  title: string; 
  icon: React.ReactNode; 
  children: React.ReactNode;
  defaultExpanded?: boolean;
  testId?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const slugified = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const panelTestId = testId || slugified || 'panel';
  
  return (
    <Card data-testid={`panel-${panelTestId}`}>
      <CardHeader className="pb-2">
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 hover-elevate rounded p-1 -ml-1 w-full text-left"
          data-testid={`toggle-${panelTestId}`}
        >
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <CardTitle className="flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
        </button>
      </CardHeader>
      {isExpanded && (
        <CardContent>
          {children}
        </CardContent>
      )}
    </Card>
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
  
  const agentData = { name: agent.name, traits: agent.traits, index: agent.agentIndex, aspiration: agent.aspiration };
  const best = simulateLife(agentData, worldMode, seed, true, sharedEvents, 19);
  const worst = simulateLife(agentData, worldMode, seed, true, sharedEvents, 2);
  
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
          rank={i + 1}
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
  
  const [biography, setBiography] = useState<string | null>(null);
  const [bioLoading, setBioLoading] = useState(false);
  const [bioError, setBioError] = useState(false);
  
  const careerStage = actual.stages.find(s => s.career);
  const careerName = careerStage?.career?.career?.name;
  
  const handleGenerateBio = async () => {
    if (bioLoading) return;
    setBioLoading(true);
    setBioError(false);
    try {
      const letterGrade = actualGrade.grade;
      const response = await apiRequest('POST', '/api/generate-biography', {
        name: actual.name,
        traits: actual.traits,
        stages: actual.stages,
        careerName: careerName || 'General',
        letterGrade,
      });
      const data = await response.json();
      setBiography(data.biography);
    } catch (error) {
      console.error('Failed to generate biography:', error);
      setBioError(true);
    } finally {
      setBioLoading(false);
    }
  };

  return (
    <Card className="p-3" data-testid={`agent-card-${isTop ? 'top' : 'bottom'}-${rank}`}>
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="text-lg font-mono text-muted-foreground w-6 shrink-0">
            {rank}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-semibold truncate">{actual.name}</span>
              <div className="flex items-center gap-1">
                <span className={`text-3xl font-bold ${actualGrade.color}`}>{actualGrade.grade}</span>
                <div className="flex flex-col text-xs font-bold leading-tight">
                  <span className={bestGrade.color} title="Best possible">{bestGrade.grade}</span>
                  <span className={worstGrade.color} title="Worst possible">{worstGrade.grade}</span>
                </div>
              </div>
              <span className={`text-xl font-mono font-bold ${isTop ? 'text-chart-2' : 'text-destructive'}`}>
                {formatCurrency(actual.lifetimeEarnings)}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-1 text-xs flex-wrap">
              <TraitDisplay traits={actual.traits} compact />
            </div>
            <div className="flex items-center gap-4 mt-1 text-xs">
              {careerName && (
                <span className="text-muted-foreground">
                  Career: <span className="text-foreground font-medium">{careerName}</span>
                </span>
              )}
              {actual.aspiration && (
                <span className="text-muted-foreground">
                  Aspired: <span className="text-foreground">{actual.aspiration}</span>
                </span>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={handleGenerateBio}
                disabled={bioLoading}
                className="shrink-0 h-6 text-xs"
                data-testid={`button-bio-${rank}`}
              >
                {bioLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <BookOpen className="h-3 w-3" />
                )}
                <span className="ml-1">{biography ? 'Regen' : 'Bio'}</span>
              </Button>
            </div>
          </div>
          <div className="text-right shrink-0 space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <Clover className="h-3 w-3 text-chart-2" />
              <span>Luck</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <div className="text-muted-foreground">Edu</div>
                <div className={`font-mono font-semibold ${actual.luck.educationRollLuck >= 0 ? 'text-chart-2' : 'text-destructive'}`}>
                  {formatEV(actual.luck.educationRollLuck)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Career</div>
                <div className={`font-mono font-semibold ${actual.luck.careerRollLuck >= 0 ? 'text-chart-2' : 'text-destructive'}`}>
                  {formatEV(actual.luck.careerRollLuck)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Events</div>
                <div className={`font-mono font-semibold ${actual.luck.eventRollLuck >= 0 ? 'text-chart-2' : 'text-destructive'}`}>
                  {formatEV(actual.luck.eventRollLuck)}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <MiniTimeline stages={actual.stages} />
        </div>
        
        {bioError && (
          <div className="text-xs text-destructive p-2 bg-destructive/10 rounded" data-testid={`bio-error-${rank}`}>
            Failed to generate bio. Click to retry.
          </div>
        )}
        {biography && !bioError && (
          <div className="text-xs text-muted-foreground leading-relaxed p-2 bg-muted rounded whitespace-pre-wrap" data-testid={`bio-${rank}`}>
            {biography}
          </div>
        )}
      </div>
    </Card>
  );
}

const stageToAge = (stageNum: number) => {
  if (stageNum === 1) return 18;
  if (stageNum === 2) return 24;
  return 24 + (stageNum - 2) * 6;
};

const rarityColors: Record<string, string> = {
  common: 'text-muted-foreground',
  uncommon: 'text-chart-2',
  rare: 'text-chart-3',
  jackpot: 'text-chart-4',
  sinkhole: 'text-destructive',
};

function MiniTimeline({ stages }: { stages: SimulationResult['stages'] }) {
  return (
    <div className="relative" data-testid="mini-timeline">
      <div className="relative h-6 mb-1">
        <div className="absolute top-3.5 left-0 right-0 h-0.5 bg-border" />
        <div className="flex justify-between">
          {stages.map((stage) => {
            const age = stageToAge(stage.stage);
            return (
              <div key={stage.stage} className="flex flex-col items-center z-10 bg-background px-0.5">
                <div className="text-[10px] text-muted-foreground font-mono leading-tight">{age}</div>
                <div className="w-2 h-2 rounded-full bg-chart-1 border border-background" />
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="flex gap-1">
        {stages.map((stage) => (
          <MiniEventCard key={stage.stage} stage={stage} />
        ))}
      </div>
    </div>
  );
}

const getEventIcon = (iconName?: string) => {
  if (!iconName) return Briefcase;
  const Icon = (LucideIcons as Record<string, any>)[iconName];
  return Icon || Briefcase;
};

function formatMod(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

function MiniEventCard({ stage }: { stage: SimulationResult['stages'][0] }) {
  const isEducation = stage.isEducation && stage.education;
  const isCareer = stage.isCareer && stage.career;
  const outcome = stage.eventOutcome;

  let miniContent = null;
  let tooltipTitle = "";
  let tooltipBody = "";
  let bgColor = "bg-muted/10";
  let borderColor = "border-muted/20";

  if (isEducation) {
    const edu = stage.education!;
    tooltipTitle = `Education: ${edu.label}`;
    tooltipBody = edu.outcomeMessage || "";
    bgColor = "bg-chart-1/10";
    borderColor = "border-chart-1/20";
    miniContent = (
      <div className="flex flex-col items-center justify-center h-full">
        <GraduationCap className="h-3 w-3 text-chart-1" />
        <div className="text-[8px] font-bold text-chart-1 mt-0.5 leading-none">{edu.label.split(' ')[0]}</div>
      </div>
    );
  } else if (isCareer) {
    const career = stage.career!;
    tooltipTitle = `Career: ${career.career.name}`;
    tooltipBody = career.outcomeMessage || "";
    bgColor = "bg-chart-3/10";
    borderColor = "border-chart-3/20";
    miniContent = (
      <div className="flex flex-col items-center justify-center h-full">
        <Briefcase className="h-3 w-3 text-chart-3" />
        <div className="text-[8px] font-bold text-chart-3 mt-0.5 leading-none">{career.career.name.split(' ')[0]}</div>
      </div>
    );
  } else if (outcome) {
    const event = outcome.event;
    tooltipTitle = event.name;
    tooltipBody = outcome.outcomeMessage || "";
    const EventIcon = getEventIcon(event.icon);
    borderColor = outcome.gateFailed ? 'border-muted-foreground/20' : outcome.success ? 'border-chart-2/20' : 'border-destructive/20';
    bgColor = outcome.gateFailed ? 'bg-muted' : outcome.success ? 'bg-chart-2/10' : 'bg-destructive/10';
    const iconColor = outcome.gateFailed ? 'text-muted-foreground' : outcome.success ? 'text-chart-2' : 'text-destructive';
    
    miniContent = (
      <div className="flex flex-col items-center justify-center h-full">
        <EventIcon className={`h-3 w-3 ${iconColor}`} />
        <div className={`text-[8px] font-bold ${iconColor} mt-0.5 leading-none`}>
          {outcome.gateFailed ? 'SKIP' : outcome.success ? 'PASS' : 'FAIL'}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0">
      <Popover>
        <PopoverTrigger asChild>
          <div 
            className={`w-full h-10 rounded border ${bgColor} ${borderColor} hover:bg-opacity-80 cursor-pointer transition-colors p-0.5 overflow-hidden`}
            data-testid={`mini-event-${stage.stage}`}
          >
            {miniContent}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0 border-none shadow-xl" side="top" align="center">
          <DetailedCard stage={stage} />
        </PopoverContent>
      </Popover>
    </div>
  );
}


const careerList = [
  'Food Service', 'Retail', 'Construction', 'Truck Driver', 'Healthcare',
  'Creative Fields', 'Marketing', 'Tech', 'Finance', 'Lawyer', 'Doctor'
];

interface CohortFilters {
  intRange: [number, number];
  intAny: boolean;
  workRange: [number, number];
  workAny: boolean;
  nepoRange: [number, number];
  nepoAny: boolean;
  charRange: [number, number];
  charAny: boolean;
  riskRange: [number, number];
  riskAny: boolean;
  totalRange: [number, number];
  totalAny: boolean;
  eduLuckRange: [number, number];
  eduLuckAny: boolean;
  careerLuckRange: [number, number];
  careerLuckAny: boolean;
  eventLuckRange: [number, number];
  eventLuckAny: boolean;
  profession: string;
}

interface CohortStats {
  count: number;
  avgEarnings: number;
  avgGrade: string;
  avgIntValue: number;
  avgWorkValue: number;
  avgNepoValue: number;
  avgCharValue: number;
  avgRiskValue: number;
}

const defaultFilters: CohortFilters = {
  intRange: [9, 11], intAny: false,
  workRange: [9, 11], workAny: false,
  nepoRange: [9, 11], nepoAny: false,
  charRange: [9, 11], charAny: false,
  riskRange: [9, 11], riskAny: false,
  totalRange: [10, 100], totalAny: true,
  eduLuckRange: [-1, 1], eduLuckAny: true,
  careerLuckRange: [-1, 1], careerLuckAny: true,
  eventLuckRange: [-1, 1], eventLuckAny: true,
  profession: 'any',
};

interface SavedSearch {
  id: string;
  name: string;
  filters: CohortFilters;
}

const SAVED_SEARCHES_KEY = 'life-sim-saved-searches';

function loadSavedSearches(): SavedSearch[] {
  try {
    const saved = localStorage.getItem(SAVED_SEARCHES_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveSavedSearches(searches: SavedSearch[]) {
  localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(searches));
}

function formatFilterSummary(filters: CohortFilters): string {
  const parts: string[] = [];
  
  if (!filters.intAny) parts.push(`INT:${filters.intRange[0]}-${filters.intRange[1]}`);
  if (!filters.workAny) parts.push(`WORK:${filters.workRange[0]}-${filters.workRange[1]}`);
  if (!filters.nepoAny) parts.push(`NEPO:${filters.nepoRange[0]}-${filters.nepoRange[1]}`);
  if (!filters.charAny) parts.push(`CHAR:${filters.charRange[0]}-${filters.charRange[1]}`);
  if (!filters.riskAny) parts.push(`RISK:${filters.riskRange[0]}-${filters.riskRange[1]}`);
  if (!filters.totalAny) parts.push(`Total:${filters.totalRange[0]}-${filters.totalRange[1]}`);
  if (!filters.eduLuckAny) parts.push(`EduLuck:${filters.eduLuckRange[0]}~${filters.eduLuckRange[1]}`);
  if (!filters.careerLuckAny) parts.push(`CareerLuck:${filters.careerLuckRange[0]}~${filters.careerLuckRange[1]}`);
  if (!filters.eventLuckAny) parts.push(`EventLuck:${filters.eventLuckRange[0]}~${filters.eventLuckRange[1]}`);
  if (filters.profession !== 'any') parts.push(`Career:${filters.profession}`);
  
  return parts.length > 0 ? parts.join(' | ') : 'All agents (no filters)';
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function RangeSliderFilter({ 
  label,
  filterId,
  range, 
  setRange, 
  isAny, 
  setIsAny, 
  min, 
  max, 
  step = 1,
  formatValue = (v: number) => String(v)
}: {
  label: string;
  filterId: string;
  range: [number, number];
  setRange: (r: [number, number]) => void;
  isAny: boolean;
  setIsAny: (v: boolean) => void;
  min: number;
  max: number;
  step?: number;
  formatValue?: (v: number) => string;
}) {
  const checkboxId = `any-${filterId}`;
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">{label}</Label>
        <div className="flex items-center gap-1">
          <Checkbox
            id={checkboxId}
            checked={isAny}
            onCheckedChange={(checked) => setIsAny(checked === true)}
            className="h-3 w-3"
            data-testid={`checkbox-any-${filterId}`}
          />
          <Label htmlFor={checkboxId} className="text-[10px] text-muted-foreground cursor-pointer">Any</Label>
        </div>
      </div>
      {!isAny && (
        <>
          <Slider
            value={range}
            onValueChange={(v) => setRange(v as [number, number])}
            min={min}
            max={max}
            step={step}
            className="w-full"
            data-testid={`slider-${filterId}`}
          />
          <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
            <span>{formatValue(range[0])}</span>
            <span>{formatValue(range[1])}</span>
          </div>
        </>
      )}
    </div>
  );
}

function CohortPanel({ 
  id,
  results, 
  worldMode, 
  seed,
  onRemove,
  canRemove
}: { 
  id: number;
  results: SimulationResult[]; 
  worldMode: WorldMode;
  seed: string;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [cohortName, setCohortName] = useState(`Cohort ${id}`);
  const [filters, setFilters] = useState<CohortFilters>({ ...defaultFilters });
  const [matchingAgents, setMatchingAgents] = useState<SimulationResult[]>([]);
  const [cohortStats, setCohortStats] = useState<CohortStats | null>(null);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(() => loadSavedSearches());
  const [loadedSearchId, setLoadedSearchId] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const updateFilter = <K extends keyof CohortFilters>(key: K, value: CohortFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  };
  
  const handleSearch = () => {
    const filtered = results.filter(agent => {
      if (!filters.intAny && (agent.traits.INT < filters.intRange[0] || agent.traits.INT > filters.intRange[1])) return false;
      if (!filters.workAny && (agent.traits.WORK < filters.workRange[0] || agent.traits.WORK > filters.workRange[1])) return false;
      if (!filters.nepoAny && (agent.traits.NEPO < filters.nepoRange[0] || agent.traits.NEPO > filters.nepoRange[1])) return false;
      if (!filters.charAny && (agent.traits.CHAR < filters.charRange[0] || agent.traits.CHAR > filters.charRange[1])) return false;
      if (!filters.riskAny && (agent.traits.RISK < filters.riskRange[0] || agent.traits.RISK > filters.riskRange[1])) return false;
      
      const totalTraits = agent.traits.INT + agent.traits.WORK + agent.traits.NEPO + agent.traits.CHAR + agent.traits.RISK;
      if (!filters.totalAny && (totalTraits < filters.totalRange[0] || totalTraits > filters.totalRange[1])) return false;
      
      if (!filters.eduLuckAny && (agent.luck.educationRollLuck < filters.eduLuckRange[0] || agent.luck.educationRollLuck > filters.eduLuckRange[1])) return false;
      if (!filters.careerLuckAny && (agent.luck.careerRollLuck < filters.careerLuckRange[0] || agent.luck.careerRollLuck > filters.careerLuckRange[1])) return false;
      if (!filters.eventLuckAny && (agent.luck.eventRollLuck < filters.eventLuckRange[0] || agent.luck.eventRollLuck > filters.eventLuckRange[1])) return false;
      
      if (filters.profession !== 'any') {
        const careerStage = agent.stages.find(s => s.career);
        const careerName = careerStage?.career?.career?.name;
        if (careerName !== filters.profession) return false;
      }
      
      return true;
    });
    
    const sortedFiltered = [...filtered].sort((a, b) => b.lifetimeEarnings - a.lifetimeEarnings);
    const displayAgents = sortedFiltered.slice(0, 5);
    setMatchingAgents(displayAgents);
    
    if (filtered.length > 0) {
      const avgEarnings = filtered.reduce((sum, a) => sum + a.lifetimeEarnings, 0) / filtered.length;
      const avgInt = filtered.reduce((sum, a) => sum + a.traits.INT, 0) / filtered.length;
      const avgWork = filtered.reduce((sum, a) => sum + a.traits.WORK, 0) / filtered.length;
      const avgNepo = filtered.reduce((sum, a) => sum + a.traits.NEPO, 0) / filtered.length;
      const avgChar = filtered.reduce((sum, a) => sum + a.traits.CHAR, 0) / filtered.length;
      const avgRisk = filtered.reduce((sum, a) => sum + a.traits.RISK, 0) / filtered.length;
      
      const gradeResult = getLifetimeGrade(avgEarnings);
      
      setCohortStats({
        count: filtered.length,
        avgEarnings,
        avgGrade: gradeResult.grade,
        avgIntValue: avgInt,
        avgWorkValue: avgWork,
        avgNepoValue: avgNepo,
        avgCharValue: avgChar,
        avgRiskValue: avgRisk,
      });
    } else {
      setCohortStats(null);
    }
  };
  
  const handleClear = () => {
    setFilters({ ...defaultFilters });
    setMatchingAgents([]);
    setCohortStats(null);
    setLoadedSearchId(null);
    setHasUnsavedChanges(false);
    setCohortName(`Cohort ${id}`);
  };
  
  const handleSaveSearch = () => {
    const newSearch: SavedSearch = {
      id: loadedSearchId || generateId(),
      name: cohortName,
      filters: { ...filters }
    };
    
    let updated: SavedSearch[];
    if (loadedSearchId) {
      updated = savedSearches.map(s => s.id === loadedSearchId ? newSearch : s);
    } else {
      updated = [...savedSearches, newSearch];
    }
    
    setSavedSearches(updated);
    saveSavedSearches(updated);
    setLoadedSearchId(newSearch.id);
    setHasUnsavedChanges(false);
  };
  
  const handleLoadSearch = (searchId: string) => {
    const search = savedSearches.find(s => s.id === searchId);
    if (search) {
      setFilters({ ...search.filters });
      setCohortName(search.name);
      setLoadedSearchId(search.id);
      setHasUnsavedChanges(false);
      setCohortStats(null);
      setMatchingAgents([]);
    }
  };
  
  const handleDeleteSavedSearch = (searchId: string) => {
    const updated = savedSearches.filter(s => s.id !== searchId);
    setSavedSearches(updated);
    saveSavedSearches(updated);
    if (loadedSearchId === searchId) {
      setLoadedSearchId(null);
    }
  };
  
  const agentsWithScenarios = useMemo(() => {
    return matchingAgents.map(agent => computeBestWorst(agent, worldMode, seed));
  }, [matchingAgents, worldMode, seed]);

  return (
    <Card data-testid={`cohort-panel-${id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 hover-elevate rounded p-1 -ml-1 shrink-0"
            data-testid={`toggle-cohort-${id}`}
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <Filter className="h-4 w-4" />
          </button>
          <input
            type="text"
            value={cohortName}
            onChange={(e) => {
              setCohortName(e.target.value);
              setHasUnsavedChanges(true);
            }}
            className="flex-1 text-sm font-semibold bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none px-1 min-w-0"
            data-testid={`cohort-name-${id}`}
          />
          <div className="flex items-center gap-1 shrink-0">
            {savedSearches.length > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1" data-testid={`load-search-${id}`}>
                    <BookOpen className="h-3 w-3" />
                    Load saved
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-1" align="end">
                  <div className="space-y-0.5">
                    {savedSearches.map(search => (
                      <div 
                        key={search.id} 
                        className="flex items-center justify-between gap-1 px-2 py-1.5 rounded hover-elevate cursor-pointer text-sm"
                      >
                        <button
                          onClick={() => handleLoadSearch(search.id)}
                          className="flex-1 text-left truncate"
                          data-testid={`load-saved-${search.id}`}
                        >
                          {search.name}
                        </button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-5 w-5 shrink-0 hover:text-destructive"
                          onClick={() => handleDeleteSavedSearch(search.id)}
                          data-testid={`delete-saved-${search.id}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleSaveSearch}
              className="h-7 text-xs gap-1"
              data-testid={`save-cohort-${id}`}
            >
              <Save className="h-3 w-3" />
              {loadedSearchId ? (hasUnsavedChanges ? 'Update' : 'Saved') : 'Save'}
            </Button>
            {cohortStats && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleClear}
                className="h-7 text-xs gap-1"
                data-testid={`clear-cohort-${id}`}
              >
                <X className="h-3 w-3" />
                Clear
              </Button>
            )}
            {canRemove && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onRemove}
                className="h-7 text-xs text-destructive"
                data-testid={`remove-cohort-${id}`}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        
        {!isExpanded && cohortStats && (
          <div className="mt-2 pt-2 border-t space-y-1">
            <div className="flex items-center gap-4 text-xs">
              <span className="font-mono">{cohortStats.count.toLocaleString()} agents</span>
              <span className="font-mono text-chart-1">{formatCurrency(cohortStats.avgEarnings)} avg</span>
              <span className="font-bold">{cohortStats.avgGrade}</span>
            </div>
            <div className="text-[10px] text-muted-foreground font-mono truncate">
              {formatFilterSummary(filters)}
            </div>
          </div>
        )}
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="space-y-4 pt-0">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <RangeSliderFilter
              label="INT"
              filterId={`int-${id}`}
              range={filters.intRange}
              setRange={(r) => updateFilter('intRange', r)}
              isAny={filters.intAny}
              setIsAny={(v) => updateFilter('intAny', v)}
              min={2}
              max={20}
            />
            <RangeSliderFilter
              label="WORK"
              filterId={`work-${id}`}
              range={filters.workRange}
              setRange={(r) => updateFilter('workRange', r)}
              isAny={filters.workAny}
              setIsAny={(v) => updateFilter('workAny', v)}
              min={2}
              max={20}
            />
            <RangeSliderFilter
              label="NEPO"
              filterId={`nepo-${id}`}
              range={filters.nepoRange}
              setRange={(r) => updateFilter('nepoRange', r)}
              isAny={filters.nepoAny}
              setIsAny={(v) => updateFilter('nepoAny', v)}
              min={2}
              max={20}
            />
            <RangeSliderFilter
              label="CHAR"
              filterId={`char-${id}`}
              range={filters.charRange}
              setRange={(r) => updateFilter('charRange', r)}
              isAny={filters.charAny}
              setIsAny={(v) => updateFilter('charAny', v)}
              min={2}
              max={20}
            />
            <RangeSliderFilter
              label="RISK"
              filterId={`risk-${id}`}
              range={filters.riskRange}
              setRange={(r) => updateFilter('riskRange', r)}
              isAny={filters.riskAny}
              setIsAny={(v) => updateFilter('riskAny', v)}
              min={2}
              max={20}
            />
            <RangeSliderFilter
              label="Total Traits"
              filterId={`total-${id}`}
              range={filters.totalRange}
              setRange={(r) => updateFilter('totalRange', r)}
              isAny={filters.totalAny}
              setIsAny={(v) => updateFilter('totalAny', v)}
              min={10}
              max={100}
            />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <RangeSliderFilter
              label="Education Luck"
              filterId={`edu-luck-${id}`}
              range={filters.eduLuckRange}
              setRange={(r) => updateFilter('eduLuckRange', r)}
              isAny={filters.eduLuckAny}
              setIsAny={(v) => updateFilter('eduLuckAny', v)}
              min={-10}
              max={10}
              formatValue={(v) => v >= 0 ? `+${v}` : String(v)}
            />
            <RangeSliderFilter
              label="Career Luck"
              filterId={`career-luck-${id}`}
              range={filters.careerLuckRange}
              setRange={(r) => updateFilter('careerLuckRange', r)}
              isAny={filters.careerLuckAny}
              setIsAny={(v) => updateFilter('careerLuckAny', v)}
              min={-10}
              max={10}
              formatValue={(v) => v >= 0 ? `+${v}` : String(v)}
            />
            <RangeSliderFilter
              label="Event Luck"
              filterId={`event-luck-${id}`}
              range={filters.eventLuckRange}
              setRange={(r) => updateFilter('eventLuckRange', r)}
              isAny={filters.eventLuckAny}
              setIsAny={(v) => updateFilter('eventLuckAny', v)}
              min={-10}
              max={10}
              formatValue={(v) => v >= 0 ? `+${v}` : String(v)}
            />
            <div className="space-y-1">
              <Label className="text-xs font-medium">Profession</Label>
              <Select value={filters.profession} onValueChange={(v) => updateFilter('profession', v)}>
                <SelectTrigger className="h-8 text-xs" data-testid={`filter-profession-${id}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  {careerList.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button onClick={handleSearch} className="gap-2" data-testid={`search-cohort-${id}`}>
            <Search className="h-4 w-4" />
            Search Cohort
          </Button>
          
          {cohortStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t">
              <div>
                <div className="text-xs text-muted-foreground">Matching Agents</div>
                <div className="text-lg font-bold font-mono">{cohortStats.count.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Avg Lifetime Earnings</div>
                <div className="text-xl font-bold font-mono text-chart-1">{formatCurrency(cohortStats.avgEarnings)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Avg Grade</div>
                <div className="text-2xl font-bold">{cohortStats.avgGrade}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Avg Traits</div>
                <div className="text-xs font-mono">
                  <span className="text-chart-1">I:{cohortStats.avgIntValue.toFixed(1)}</span>{' '}
                  <span className="text-chart-2">W:{cohortStats.avgWorkValue.toFixed(1)}</span>{' '}
                  <span className="text-chart-3">N:{cohortStats.avgNepoValue.toFixed(1)}</span>{' '}
                  <span className="text-chart-4">C:{cohortStats.avgCharValue.toFixed(1)}</span>{' '}
                  <span className="text-destructive">R:{cohortStats.avgRiskValue.toFixed(1)}</span>
                </div>
              </div>
            </div>
          )}
          
          {matchingAgents.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="text-sm font-medium text-muted-foreground">
                Top {matchingAgents.length} of {cohortStats?.count.toLocaleString()} matching agents (by earnings)
              </div>
              {agentsWithScenarios.map((agentData, i) => (
                <AgentCard 
                  key={i} 
                  agentData={agentData} 
                  rank={i + 1}
                  isTop={true}
                />
              ))}
            </div>
          )}
          
          {cohortStats && matchingAgents.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-4">
              No agents match your filters. Try adjusting the criteria.
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function CompareCohorts({ results, worldMode, seed }: { 
  results: SimulationResult[]; 
  worldMode: WorldMode;
  seed: string;
}) {
  const [cohortIds, setCohortIds] = useState<number[]>([1, 2]);
  const [nextId, setNextId] = useState(3);
  
  const addCohort = () => {
    setCohortIds(prev => [...prev, nextId]);
    setNextId(prev => prev + 1);
  };
  
  const removeCohort = (id: number) => {
    setCohortIds(prev => prev.filter(cid => cid !== id));
  };

  return (
    <div className="space-y-4" data-testid="compare-cohorts">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {cohortIds.map(id => (
          <CohortPanel
            key={id}
            id={id}
            results={results}
            worldMode={worldMode}
            seed={seed}
            onRemove={() => removeCohort(id)}
            canRemove={cohortIds.length > 1}
          />
        ))}
      </div>
      
      <Button onClick={addCohort} variant="outline" className="gap-2 w-full" data-testid="add-cohort">
        <Plus className="h-4 w-4" />
        Add Another Cohort
      </Button>
    </div>
  );
}
