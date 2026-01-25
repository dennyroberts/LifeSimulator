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
import { IncomeHistogram, ScatterGrid, ControlledTraitGrid, ControlledLuckGrid } from './Charts';
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
import { Play, Users, Settings, RefreshCw, TrendingUp, TrendingDown, BarChart3, Sparkles, Skull, BookOpen, Loader2, GraduationCap, Briefcase, Filter, Search, X, ChevronDown, ChevronRight, Plus, Clover, Save, Pencil, Trash2, Star } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

type AgentCount = 1000 | 10000 | 50000 | 100000 | 500000;

export function MassSim() {
  const [worldMode, setWorldMode] = useState<WorldMode>('normal');
  const [sameDeck, setSameDeck] = useState(false);
  const [aspirationsEnabled, setAspirationsEnabled] = useState(true);
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
        sameDeck,
        aspirationsEnabled
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
            
            <div className="flex flex-col gap-2 pt-7">
              <div className="flex items-center space-x-3">
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
              <div className="flex items-center space-x-3">
                <Switch
                  id="aspirations-enabled"
                  checked={aspirationsEnabled}
                  onCheckedChange={setAspirationsEnabled}
                  data-testid="switch-aspirations"
                />
                <Label htmlFor="aspirations-enabled" className="cursor-pointer">
                  Career aspirations
                </Label>
              </div>
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
                <div className="text-base sm:text-lg font-mono flex flex-col sm:flex-row sm:items-center gap-0 sm:gap-1">
                  <span className="text-destructive">{formatCurrency(stats.min)}</span>
                  <span className="text-muted-foreground hidden sm:inline">→</span>
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
          
          <CollapsiblePanel 
            title="Lifetime Earnings Distribution" 
            icon={<BarChart3 className="h-4 w-4" />}
            defaultExpanded={true}
            testId="earnings-histogram"
          >
            <IncomeHistogram results={results} compact />
          </CollapsiblePanel>
          
          <CollapsiblePanel 
            title="Trait Correlation with Success (Controlled)" 
            icon={<BarChart3 className="h-4 w-4" />}
            defaultExpanded={true}
            testId="controlled-trait-scatter"
          >
            <ControlledTraitGrid results={results} />
          </CollapsiblePanel>
          
          <CollapsiblePanel 
            title="Luck Correlation with Success (Controlled)" 
            icon={<Clover className="h-4 w-4" />}
            defaultExpanded={true}
            testId="controlled-luck-scatter"
          >
            <ControlledLuckGrid results={results} />
          </CollapsiblePanel>
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

function AgentCard({ agentData, rank, isTop = false }: { 
  agentData: AgentWithScenarios; 
  rank: number;
  isTop?: boolean;
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
      <div className="flex flex-col gap-2 sm:gap-3">
        {/* Mobile: Stacked header with name, grade, earnings */}
        <div className="flex items-start gap-2 sm:gap-3">
          <div className="text-lg font-mono text-muted-foreground w-6 shrink-0">
            {rank}
          </div>
          <div className="flex-1 min-w-0">
            {/* Row 1: Name + Grade + Earnings */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold">{actual.name}</span>
              <div className="flex items-center gap-1">
                <span className={`text-xl sm:text-2xl font-bold ${actualGrade.color}`}>{actualGrade.grade}</span>
                <div className="flex flex-col text-[9px] sm:text-[10px] font-bold leading-tight">
                  <span className={bestGrade.color} title="Best possible">{bestGrade.grade}</span>
                  <span className={worstGrade.color} title="Worst possible">{worstGrade.grade}</span>
                </div>
              </div>
              <span className={`text-sm sm:text-lg font-mono font-bold ${isTop ? 'text-chart-2' : 'text-destructive'}`}>
                {formatCurrency(actual.lifetimeEarnings)}
              </span>
            </div>
            {/* Row 2: Traits */}
            <div className="mt-1">
              <TraitDisplay traits={actual.traits} compact />
            </div>
            {/* Row 3: Career + Bio button */}
            <div className="flex items-center gap-x-3 gap-y-1 mt-1 text-xs flex-wrap">
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
          {/* Luck section - hidden on mobile, show inline on desktop */}
          <div className="hidden sm:block text-right shrink-0 space-y-1">
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
        {/* Mobile luck row - compact horizontal */}
        <div className="sm:hidden flex items-center gap-2 text-[10px] border-t pt-2">
          <Clover className="h-3 w-3 text-chart-2 shrink-0" />
          <div className="flex items-center gap-3 font-mono">
            <span>
              <span className="text-muted-foreground">Edu:</span>
              <span className={actual.luck.educationRollLuck >= 0 ? 'text-chart-2' : 'text-destructive'}>
                {formatEV(actual.luck.educationRollLuck)}
              </span>
            </span>
            <span>
              <span className="text-muted-foreground">Car:</span>
              <span className={actual.luck.careerRollLuck >= 0 ? 'text-chart-2' : 'text-destructive'}>
                {formatEV(actual.luck.careerRollLuck)}
              </span>
            </span>
            <span>
              <span className="text-muted-foreground">Evt:</span>
              <span className={actual.luck.eventRollLuck >= 0 ? 'text-chart-2' : 'text-destructive'}>
                {formatEV(actual.luck.eventRollLuck)}
              </span>
            </span>
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
      {/* Desktop: horizontal layout */}
      <div className="hidden sm:block">
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
      
      {/* Mobile: snaking timeline with connecting lines */}
      <div className="sm:hidden">
        <SnakingTimeline stages={stages} />
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
  if (stage.isEducation && stage.education) {
    const edu = stage.education;
    const isCrit20 = edu.roll === 20;
    const isCrit1 = edu.roll === 1;
    
    return (
      <div className="flex-1 min-w-0">
        <Popover>
          <PopoverTrigger asChild>
            <div 
              className={`p-1.5 rounded text-[10px] border cursor-pointer hover:brightness-110 transition-all ${
                isCrit20 ? 'bg-chart-4/10 border-chart-4/30' : 
                isCrit1 ? 'bg-destructive/10 border-destructive/30' : 
                'bg-chart-1/10 border-chart-1/20'
              }`}
              data-testid={`mini-event-${stage.stage}`}
            >
              <div className="flex items-center gap-0.5 mb-0.5">
                <GraduationCap className="h-3 w-3 text-chart-1" />
                {isCrit20 && <Sparkles className="h-2.5 w-2.5 text-chart-4" />}
                {isCrit1 && <Skull className="h-2.5 w-2.5 text-destructive" />}
              </div>
              <div className="font-medium text-foreground leading-tight">Education</div>
              <div className="text-muted-foreground leading-tight">{edu.label}</div>
              {edu.traitContributions && edu.traitContributions.length > 0 && (
                <div className="font-mono text-[8px] mt-0.5">
                  {edu.traitContributions.filter(tc => tc.contribution !== 0).map((tc, i) => (
                    <span key={tc.trait} className={tc.contribution >= 0 ? 'text-chart-2' : 'text-destructive'}>
                      {i > 0 && ' '}{tc.trait}{formatMod(tc.contribution)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0 border-none shadow-xl" side="top" align="center">
            <DetailedCard stage={stage} />
          </PopoverContent>
        </Popover>
      </div>
    );
  }
  
  if (stage.isCareer && stage.career) {
    const career = stage.career;
    const isCrit20 = career.isNat20;
    const isCrit1 = career.roll === 1;
    
    return (
      <div className="flex-1 min-w-0">
        <Popover>
          <PopoverTrigger asChild>
            <div 
              className={`p-1.5 rounded text-[10px] border cursor-pointer hover:brightness-110 transition-all ${
                isCrit20 ? 'bg-chart-4/10 border-chart-4/30' : 
                isCrit1 ? 'bg-destructive/10 border-destructive/30' : 
                'bg-chart-3/10 border-chart-3/20'
              }`}
              data-testid={`mini-event-${stage.stage}`}
            >
              <div className="flex items-center gap-0.5 mb-0.5">
                <Briefcase className="h-3 w-3 text-chart-3" />
                {isCrit20 && <Sparkles className="h-2.5 w-2.5 text-chart-4" />}
                {isCrit1 && <Skull className="h-2.5 w-2.5 text-destructive" />}
              </div>
              <div className="font-medium text-foreground leading-tight">Career</div>
              <div className="text-muted-foreground leading-tight">{career.career.name}</div>
              {career.traitContributions && career.traitContributions.length > 0 && (
                <div className="font-mono text-[8px] mt-0.5">
                  {career.traitContributions.map((tc, i) => (
                    <span key={tc.trait} className={tc.contribution >= 0 ? 'text-chart-2' : 'text-destructive'}>
                      {i > 0 && ' '}{tc.trait}{formatMod(tc.contribution)}
                    </span>
                  ))}
                  {career.educationBonus !== 0 && (
                    <span className={career.educationBonus >= 0 ? 'text-chart-2' : 'text-destructive'}>
                      {' '}Edu{formatMod(career.educationBonus)}
                    </span>
                  )}
                </div>
              )}
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0 border-none shadow-xl" side="top" align="center">
            <DetailedCard stage={stage} />
          </PopoverContent>
        </Popover>
      </div>
    );
  }
  
  if (stage.eventOutcome) {
    const outcome = stage.eventOutcome;
    const event = outcome.event;
    const isCritSuccess = outcome.isCritical && outcome.criticalType === 'success';
    const isCritFail = outcome.isCritical && outcome.criticalType === 'failure';
    
    const EventIcon = getEventIcon(event.icon);
    
    const getBorderClass = () => {
      if (outcome.gateFailed) return 'border-muted';
      if (isCritSuccess) return 'border-chart-4/30';
      if (isCritFail) return 'border-destructive/30';
      if (outcome.success) return 'border-chart-2/30';
      return 'border-destructive/30';
    };
    
    const getBgClass = () => {
      if (outcome.gateFailed) return 'bg-muted/30';
      if (isCritSuccess) return 'bg-chart-4/10';
      if (isCritFail) return 'bg-destructive/10';
      if (outcome.success) return 'bg-chart-2/10';
      return 'bg-destructive/10';
    };
    
    const getOutcomeText = () => {
      if (outcome.gateFailed) return 'Skipped';
      if (outcome.success) return 'Pass';
      return 'Fail';
    };
    
    const getOutcomeColor = () => {
      if (outcome.gateFailed) return 'text-muted-foreground';
      if (outcome.success) return 'text-chart-2';
      return 'text-destructive';
    };
    
    return (
      <div className="flex-1 min-w-0">
        <Popover>
          <PopoverTrigger asChild>
            <div 
              className={`p-1.5 rounded text-[10px] border cursor-pointer hover:brightness-110 transition-all ${getBgClass()} ${getBorderClass()}`}
              data-testid={`mini-event-${stage.stage}`}
            >
              <div className="flex items-center gap-0.5 mb-0.5">
                <EventIcon className="h-3 w-3 text-muted-foreground" />
                {isCritSuccess && <Sparkles className="h-2.5 w-2.5 text-chart-4" />}
                {isCritFail && <Skull className="h-2.5 w-2.5 text-destructive" />}
                <span className={`${rarityColors[event.rarity]} uppercase font-bold`}>
                  {event.rarity.charAt(0)}
                </span>
              </div>
              <div className="font-medium text-foreground leading-tight">{event.name}</div>
              {event.riskGated && !outcome.gateFailed && (
                <div className="text-[9px] font-bold text-chart-4">Risked it!</div>
              )}
              <div className={`${getOutcomeColor()} font-semibold`}>{getOutcomeText()}</div>
              {outcome.traitContributions && outcome.traitContributions.length > 0 && !outcome.gateFailed && (
                <div className="font-mono text-[8px] mt-0.5">
                  {outcome.traitContributions.map((tc, i) => {
                    const isDeciding = outcome.decidingTrait === tc.trait;
                    return (
                      <span 
                        key={tc.trait} 
                        className={`${tc.contribution >= 0 ? 'text-chart-2' : 'text-destructive'} ${isDeciding ? 'font-bold' : ''} inline-flex items-center`}
                      >
                        {i > 0 && ' '}{isDeciding && <Star className="h-2 w-2 fill-current" />}{tc.trait}{formatMod(tc.contribution)}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0 border-none shadow-xl" side="top" align="center">
            <DetailedCard stage={stage} />
          </PopoverContent>
        </Popover>
      </div>
    );
  }
  
  return null;
}

// Compact version for mobile - just shows icons and key info
function MiniEventCardCompact({ stage }: { stage: SimulationResult['stages'][0] }) {
  const age = stageToAge(stage.stage);
  
  if (stage.isEducation && stage.education) {
    const edu = stage.education;
    return (
      <Popover>
        <PopoverTrigger asChild>
          <div 
            className="p-1 rounded text-[9px] border cursor-pointer bg-chart-1/10 border-chart-1/20 flex items-center gap-1"
            data-testid={`mini-compact-${stage.stage}`}
          >
            <GraduationCap className="h-3 w-3 text-chart-1 shrink-0" />
            <span className="font-mono text-muted-foreground">{age}</span>
            <span className="truncate max-w-[50px]">{edu.label}</span>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0 border-none shadow-xl" side="top" align="center">
          <DetailedCard stage={stage} />
        </PopoverContent>
      </Popover>
    );
  }
  
  if (stage.isCareer && stage.career) {
    const career = stage.career;
    return (
      <Popover>
        <PopoverTrigger asChild>
          <div 
            className="p-1 rounded text-[9px] border cursor-pointer bg-chart-3/10 border-chart-3/20 flex items-center gap-1"
            data-testid={`mini-compact-${stage.stage}`}
          >
            <Briefcase className="h-3 w-3 text-chart-3 shrink-0" />
            <span className="font-mono text-muted-foreground">{age}</span>
            <span className="truncate max-w-[50px]">{career.career.name}</span>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0 border-none shadow-xl" side="top" align="center">
          <DetailedCard stage={stage} />
        </PopoverContent>
      </Popover>
    );
  }
  
  if (stage.eventOutcome) {
    const outcome = stage.eventOutcome;
    const event = outcome.event;
    const Icon = getEventIcon(event?.icon);
    const success = outcome.success;
    
    return (
      <Popover>
        <PopoverTrigger asChild>
          <div 
            className={`p-1 rounded text-[9px] border cursor-pointer flex items-center gap-1 ${
              success ? 'bg-chart-2/10 border-chart-2/20' : 'bg-destructive/10 border-destructive/20'
            }`}
            data-testid={`mini-compact-${stage.stage}`}
          >
            <Icon className={`h-3 w-3 shrink-0 ${success ? 'text-chart-2' : 'text-destructive'}`} />
            <span className="font-mono text-muted-foreground">{age}</span>
            <span className={`${success ? 'text-chart-2' : 'text-destructive'}`}>
              {success ? 'Pass' : 'Fail'}
            </span>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0 border-none shadow-xl" side="top" align="center">
          <DetailedCard stage={stage} />
        </PopoverContent>
      </Popover>
    );
  }
  
  return null;
}


// Snaking timeline for mobile - continuous curved line with dots and event cards
function SnakingTimeline({ stages }: { stages: SimulationResult['stages'] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pathData, setPathData] = useState<string>('');
  const itemsPerRow = 3;
  const rows: { stage: SimulationResult['stages'][0]; originalIndex: number }[][] = [];
  
  for (let i = 0; i < stages.length; i += itemsPerRow) {
    const row = stages.slice(i, i + itemsPerRow).map((stage, idx) => ({
      stage,
      originalIndex: i + idx
    }));
    rows.push(row);
  }
  
  // Calculate SVG path after render
  useEffect(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const containerWidth = containerRect.width;
    
    // Get all dots and sort by their original index
    const dotElements = Array.from(container.querySelectorAll('[data-dot-index]'));
    if (dotElements.length === 0) return;
    
    // Sort dots by their original timeline index
    dotElements.sort((a, b) => {
      const aIdx = parseInt(a.getAttribute('data-dot-index') || '0');
      const bIdx = parseInt(b.getAttribute('data-dot-index') || '0');
      return aIdx - bIdx;
    });
    
    const points: { x: number; y: number; index: number }[] = dotElements.map((dot) => {
      const rect = dot.getBoundingClientRect();
      return {
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top + rect.height / 2,
        index: parseInt(dot.getAttribute('data-dot-index') || '0')
      };
    });
    
    if (points.length < 2) return;
    
    // Build path through all points with smooth curves at row transitions
    let path = `M ${points[0].x} ${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const rowIndex = Math.floor(i / itemsPerRow);
      const prevRowIndex = Math.floor((i - 1) / itemsPerRow);
      
      if (rowIndex !== prevRowIndex) {
        // Transitioning between rows - draw curved connector
        const curveRadius = 10;
        // Keep curves within container bounds
        const maxX = containerWidth - 4;
        const minX = 4;
        
        // Previous row ended on the right (even row) -> curve on right
        // Previous row ended on the left (odd row) -> curve on left
        const prevRowWasEven = prevRowIndex % 2 === 0;
        
        if (prevRowWasEven) {
          // Curve on the right side (row 0->1, 2->3, etc)
          const curveX = Math.min(prev.x + curveRadius, maxX);
          path += ` L ${curveX} ${prev.y}`;
          path += ` Q ${curveX + curveRadius} ${prev.y}, ${curveX + curveRadius} ${prev.y + curveRadius}`;
          path += ` L ${curveX + curveRadius} ${curr.y - curveRadius}`;
          path += ` Q ${curveX + curveRadius} ${curr.y}, ${curveX} ${curr.y}`;
          path += ` L ${curr.x} ${curr.y}`;
        } else {
          // Curve on the left side (row 1->2, 3->4, etc)
          const curveX = Math.max(prev.x - curveRadius, minX);
          path += ` L ${curveX} ${prev.y}`;
          path += ` Q ${curveX - curveRadius} ${prev.y}, ${curveX - curveRadius} ${prev.y + curveRadius}`;
          path += ` L ${curveX - curveRadius} ${curr.y - curveRadius}`;
          path += ` Q ${curveX - curveRadius} ${curr.y}, ${curveX} ${curr.y}`;
          path += ` L ${curr.x} ${curr.y}`;
        }
      } else {
        // Same row - straight line
        path += ` L ${curr.x} ${curr.y}`;
      }
    }
    
    setPathData(path);
  }, [stages, rows.length]);
  
  return (
    <div ref={containerRef} className="relative px-4">
      {/* SVG overlay for the continuous snaking line */}
      {pathData && (
        <svg 
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ zIndex: 0 }}
        >
          <path
            d={pathData}
            fill="none"
            stroke="hsl(var(--muted-foreground) / 0.35)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      
      {rows.map((row, rowIndex) => {
        const isReversed = rowIndex % 2 === 1;
        const displayRow = isReversed ? [...row].reverse() : row;
        const isLastRow = rowIndex === rows.length - 1;
        
        return (
          <div key={rowIndex} className="relative">
            {/* Age labels and dots */}
            <div className="relative h-7 flex justify-between items-start">
              {displayRow.map(({ stage, originalIndex }) => {
                const age = stageToAge(stage.stage);
                return (
                  <div key={stage.stage} className="flex flex-col items-center z-10">
                    <div className="text-[10px] text-muted-foreground font-mono leading-none">{age}</div>
                    <div 
                      data-dot-index={originalIndex}
                      className="w-3 h-3 rounded-full bg-chart-1 border-2 border-background mt-1" 
                    />
                  </div>
                );
              })}
            </div>
            
            {/* Event cards */}
            <div className={`flex gap-1.5 mt-1 ${isReversed ? 'flex-row-reverse' : ''}`}>
              {row.map(({ stage }) => (
                <MiniEventCardWithName key={stage.stage} stage={stage} />
              ))}
            </div>
            
            {/* Spacing between rows for the curve */}
            {!isLastRow && <div className="h-8" />}
          </div>
        );
      })}
    </div>
  );
}

// Compact event card that shows the event name (allows text wrapping)
function MiniEventCardWithName({ stage }: { stage: SimulationResult['stages'][0] }) {
  if (stage.isEducation && stage.education) {
    const edu = stage.education;
    return (
      <Popover>
        <PopoverTrigger asChild>
          <div 
            className="flex-1 p-1.5 rounded text-[10px] border cursor-pointer bg-chart-1/10 border-chart-1/20 min-w-0"
            data-testid={`mini-named-${stage.stage}`}
          >
            <div className="flex items-center gap-1 mb-0.5">
              <GraduationCap className="h-3 w-3 text-chart-1 shrink-0" />
              <span className="font-medium text-chart-1">Education</span>
            </div>
            <div className="text-muted-foreground leading-tight">{edu.label}</div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0 border-none shadow-xl" side="top" align="center">
          <DetailedCard stage={stage} />
        </PopoverContent>
      </Popover>
    );
  }
  
  if (stage.isCareer && stage.career) {
    const career = stage.career;
    return (
      <Popover>
        <PopoverTrigger asChild>
          <div 
            className="flex-1 p-1.5 rounded text-[10px] border cursor-pointer bg-chart-3/10 border-chart-3/20 min-w-0"
            data-testid={`mini-named-${stage.stage}`}
          >
            <div className="flex items-center gap-1 mb-0.5">
              <Briefcase className="h-3 w-3 text-chart-3 shrink-0" />
              <span className="font-medium text-chart-3">Career</span>
            </div>
            <div className="text-muted-foreground leading-tight">{career.career.name}</div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0 border-none shadow-xl" side="top" align="center">
          <DetailedCard stage={stage} />
        </PopoverContent>
      </Popover>
    );
  }
  
  if (stage.eventOutcome) {
    const outcome = stage.eventOutcome;
    const event = outcome.event;
    const Icon = getEventIcon(event?.icon);
    const success = outcome.success;
    
    return (
      <Popover>
        <PopoverTrigger asChild>
          <div 
            className={`flex-1 p-1.5 rounded text-[10px] border cursor-pointer min-w-0 ${
              success ? 'bg-chart-2/10 border-chart-2/20' : 'bg-destructive/10 border-destructive/20'
            }`}
            data-testid={`mini-named-${stage.stage}`}
          >
            <div className="flex items-center gap-1 mb-0.5">
              <Icon className={`h-3 w-3 shrink-0 ${success ? 'text-chart-2' : 'text-destructive'}`} />
              <span className={`font-medium ${success ? 'text-chart-2' : 'text-destructive'}`}>
                {success ? 'Pass' : 'Fail'}
              </span>
            </div>
            <div className="text-muted-foreground leading-tight">{event?.name || 'Event'}</div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0 border-none shadow-xl" side="top" align="center">
          <DetailedCard stage={stage} />
        </PopoverContent>
      </Popover>
    );
  }
  
  return null;
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
  eduLuckRange: [number, number];  // rollLuckZ filter
  eduLuckAny: boolean;
  careerLuckRange: [number, number];  // opportunityLuckZ filter
  careerLuckAny: boolean;
  eventLuckRange: [number, number];  // totalLuckZ filter
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
  eduLuckRange: [-3, 3], eduLuckAny: true,  // rollLuckZ filter
  careerLuckRange: [-3, 3], careerLuckAny: true,  // opportunityLuckZ filter
  eventLuckRange: [-3, 3], eventLuckAny: true,  // totalLuckZ filter
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
  if (!filters.eduLuckAny) parts.push(`RollZ:${filters.eduLuckRange[0]}~${filters.eduLuckRange[1]}`);
  if (!filters.careerLuckAny) parts.push(`OppZ:${filters.careerLuckRange[0]}~${filters.careerLuckRange[1]}`);
  if (!filters.eventLuckAny) parts.push(`TotalZ:${filters.eventLuckRange[0]}~${filters.eventLuckRange[1]}`);
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
  const [minInput, setMinInput] = useState(String(range[0]));
  const [maxInput, setMaxInput] = useState(String(range[1]));
  
  // Sync local state when range prop changes
  useEffect(() => {
    setMinInput(String(range[0]));
    setMaxInput(String(range[1]));
  }, [range[0], range[1]]);
  
  const handleMinBlur = () => {
    const num = parseFloat(minInput);
    if (!isNaN(num)) {
      const clamped = Math.max(min, Math.min(num, range[1]));
      setRange([clamped, range[1]]);
      setMinInput(String(clamped));
    } else {
      setMinInput(String(range[0]));
    }
  };
  
  const handleMaxBlur = () => {
    const num = parseFloat(maxInput);
    if (!isNaN(num)) {
      const clamped = Math.max(range[0], Math.min(num, max));
      setRange([range[0], clamped]);
      setMaxInput(String(clamped));
    } else {
      setMaxInput(String(range[1]));
    }
  };
  
  // Calculate bar position as percentage
  const rangeSpan = max - min;
  const leftPct = ((range[0] - min) / rangeSpan) * 100;
  const widthPct = ((range[1] - range[0]) / rangeSpan) * 100;
  
  // Checkbox checked = filtering enabled (entering values), unchecked = any
  const isFiltering = !isAny;
  
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex items-center gap-1.5 shrink-0">
        <Checkbox
          id={checkboxId}
          checked={isFiltering}
          onCheckedChange={(checked) => setIsAny(checked !== true)}
          className="h-3 w-3"
          data-testid={`checkbox-any-${filterId}`}
        />
        <Label htmlFor={checkboxId} className="text-xs font-medium cursor-pointer w-14">{label}</Label>
      </div>
      {isFiltering ? (
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <input
            type="text"
            value={minInput}
            onChange={(e) => setMinInput(e.target.value)}
            onBlur={handleMinBlur}
            className="w-8 text-[10px] font-mono px-1 py-0.5 bg-muted border-0 rounded text-center"
            data-testid={`input-min-${filterId}`}
          />
          <div className="relative h-1.5 bg-muted rounded-full flex-1 min-w-[40px]">
            <div 
              className="absolute h-full bg-primary rounded-full"
              style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 2)}%` }}
            />
          </div>
          <input
            type="text"
            value={maxInput}
            onChange={(e) => setMaxInput(e.target.value)}
            onBlur={handleMaxBlur}
            className="w-8 text-[10px] font-mono px-1 py-0.5 bg-muted border-0 rounded text-center"
            data-testid={`input-max-${filterId}`}
          />
        </div>
      ) : (
        <span className="text-[10px] text-muted-foreground">Any</span>
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
  const [allFilteredAgents, setAllFilteredAgents] = useState<SimulationResult[]>([]);
  const [cohortStats, setCohortStats] = useState<CohortStats | null>(null);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(() => loadSavedSearches());
  const [loadedSearchId, setLoadedSearchId] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Helper to get random sample from array
  const getRandomSample = <T,>(arr: T[], n: number): T[] => {
    if (arr.length <= n) return [...arr];
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
  };
  
  const handleRefreshSample = () => {
    const randomFive = getRandomSample(allFilteredAgents, 5);
    setMatchingAgents(randomFive);
  };
  
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
      
      // Use z-scored luck values for consistent filtering (all on -3 to 3 scale)
      if (!filters.eduLuckAny && (agent.luck.rollLuckZ < filters.eduLuckRange[0] || agent.luck.rollLuckZ > filters.eduLuckRange[1])) return false;
      if (!filters.careerLuckAny && (agent.luck.opportunityLuckZ < filters.careerLuckRange[0] || agent.luck.opportunityLuckZ > filters.careerLuckRange[1])) return false;
      if (!filters.eventLuckAny && (agent.luck.totalLuckZ < filters.eventLuckRange[0] || agent.luck.totalLuckZ > filters.eventLuckRange[1])) return false;
      
      if (filters.profession !== 'any') {
        const careerStage = agent.stages.find(s => s.career);
        const careerName = careerStage?.career?.career?.name;
        if (careerName !== filters.profession) return false;
      }
      
      return true;
    });
    
    // Store all filtered agents and pick 5 random ones
    setAllFilteredAgents(filtered);
    const randomFive = getRandomSample(filtered, 5);
    setMatchingAgents(randomFive);
    
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
    setAllFilteredAgents([]);
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
      // Migrate old saved searches: merge with defaults to handle missing/removed fields
      const migratedFilters = { ...defaultFilters, ...search.filters };
      setFilters(migratedFilters);
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
        <div className="flex flex-col gap-2">
          {/* Row 1: Cohort name (full width) */}
          <input
            type="text"
            value={cohortName}
            onChange={(e) => {
              setCohortName(e.target.value);
              setHasUnsavedChanges(true);
            }}
            className="text-sm font-semibold bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none px-1"
            data-testid={`cohort-name-${id}`}
          />
          {/* Row 2: Toggle + action buttons */}
          <div className="flex items-center justify-between gap-2">
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 hover-elevate rounded p-1 -ml-1 shrink-0"
              data-testid={`toggle-cohort-${id}`}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <Filter className="h-4 w-4" />
              <span className="text-xs text-muted-foreground">{isExpanded ? 'Hide filters' : 'Show filters'}</span>
            </button>
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
        <CardContent className="space-y-3 pt-0">
          {/* Two-column layout: Traits on left, Other filters on right */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Left: 5 Traits stacked */}
            <div className="flex flex-col gap-1.5 lg:w-[280px] shrink-0">
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
            </div>
            
            {/* Right: Other filters */}
            <div className="flex flex-col gap-1.5 flex-1">
              <RangeSliderFilter
                label="Total"
                filterId={`total-${id}`}
                range={filters.totalRange}
                setRange={(r) => updateFilter('totalRange', r)}
                isAny={filters.totalAny}
                setIsAny={(v) => updateFilter('totalAny', v)}
                min={10}
                max={100}
              />
              <div className="text-[9px] text-muted-foreground px-1 mt-1">
                Z-scores: 0=avg, +/-1=common, +/-2=rare, +/-3=extreme
              </div>
              <RangeSliderFilter
                label="Roll Z"
                filterId={`roll-luck-z-${id}`}
                range={filters.eduLuckRange}
                setRange={(r) => updateFilter('eduLuckRange', r)}
                isAny={filters.eduLuckAny}
                setIsAny={(v) => updateFilter('eduLuckAny', v)}
                min={-3}
                max={3}
                step={0.5}
              />
              <RangeSliderFilter
                label="Opp Z"
                filterId={`opp-luck-z-${id}`}
                range={filters.careerLuckRange}
                setRange={(r) => updateFilter('careerLuckRange', r)}
                isAny={filters.careerLuckAny}
                setIsAny={(v) => updateFilter('careerLuckAny', v)}
                min={-3}
                max={3}
                step={0.5}
              />
              <RangeSliderFilter
                label="Total Z"
                filterId={`total-luck-z-${id}`}
                range={filters.eventLuckRange}
                setRange={(r) => updateFilter('eventLuckRange', r)}
                isAny={filters.eventLuckAny}
                setIsAny={(v) => updateFilter('eventLuckAny', v)}
                min={-3}
                max={3}
                step={0.5}
              />
              <div className="flex items-center gap-2">
                <Label className="text-xs font-medium shrink-0 w-14">Career</Label>
                <Select value={filters.profession} onValueChange={(v) => updateFilter('profession', v)}>
                  <SelectTrigger className="h-6 text-xs flex-1" data-testid={`filter-profession-${id}`}>
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
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-muted-foreground">
                  {matchingAgents.length} random agents from {cohortStats?.count.toLocaleString()} matches
                </div>
                {allFilteredAgents.length > 5 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleRefreshSample}
                    className="h-7 text-xs gap-1"
                    data-testid={`refresh-sample-${id}`}
                  >
                    <RefreshCw className="h-3 w-3" />
                    Show different 5
                  </Button>
                )}
              </div>
              {agentsWithScenarios.map((agentData, i) => (
                <AgentCard 
                  key={i} 
                  agentData={agentData} 
                  rank={i + 1}
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
