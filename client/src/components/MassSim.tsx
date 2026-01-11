import { useState, useMemo, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
  runMassSimulation,
  formatCurrency,
  formatEV,
} from '@/lib/sim';
import { Play, Users, Settings, RefreshCw, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';

type AgentCount = 1000 | 10000 | 50000;

export function MassSim() {
  const [worldMode, setWorldMode] = useState<WorldMode>('normal');
  const [sameDeck, setSameDeck] = useState(false);
  const [seed, setSeed] = useState(() => String(Math.floor(Math.random() * 1000000)));
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
        `${seed}|batch${i}`,
        sameDeck
      );
      
      batchResults.forEach((r, idx) => {
        allResults.push({
          ...r,
          name: `Agent_${batchStart + idx + 1}`
        });
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
              <Label htmlFor="seed-mass">Seed</Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  id="seed-mass"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  placeholder="Seed"
                  data-testid="input-seed-mass"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRandomSeed}
                  data-testid="button-random-seed-mass"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
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
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Income Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <IncomeHistogram results={results} />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Trait & Luck Correlations</CardTitle>
            </CardHeader>
            <CardContent>
              <ScatterGrid results={results} />
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-chart-2" />
                  Top 10 Performers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AgentTable agents={topAgents} isTop />
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
                <AgentTable agents={bottomAgents} isTop={false} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function AgentTable({ agents, isTop }: { agents: SimulationResult[]; isTop: boolean }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Traits</TableHead>
            <TableHead className="text-right">Income</TableHead>
            <TableHead className="text-right">Luck</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {agents.map((agent, i) => (
            <TableRow key={i} data-testid={`agent-row-${isTop ? 'top' : 'bottom'}-${i}`}>
              <TableCell className="font-mono text-muted-foreground">
                {isTop ? i + 1 : agents.length - i}
              </TableCell>
              <TableCell className="font-medium">{agent.name}</TableCell>
              <TableCell>
                <TraitDisplay traits={agent.traits} compact />
              </TableCell>
              <TableCell className={`text-right font-mono font-semibold ${isTop ? 'text-chart-2' : 'text-destructive'}`}>
                {formatCurrency(agent.peakIncome)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex flex-col items-end gap-0.5 text-xs font-mono">
                  <span className={agent.luck.opportunityLuck >= 0 ? 'text-chart-2' : 'text-destructive'}>
                    Opp: {formatEV(agent.luck.opportunityLuck)}
                  </span>
                  <span className={agent.luck.rollLuck >= 0 ? 'text-chart-2' : 'text-destructive'}>
                    Roll: {formatEV(agent.luck.rollLuck)}
                  </span>
                  <span className={`font-semibold ${agent.luck.netLuck >= 0 ? 'text-chart-4' : 'text-muted-foreground'}`}>
                    Net: {formatEV(agent.luck.netLuck)}
                  </span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
