import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TraitInput, TraitDisplay } from './TraitInput';
import { Timeline } from './Timeline';
import { IncomeChart } from './Charts';
import { LuckAnalysis } from './LuckAnalysis';
import {
  type Traits,
  type WorldMode,
  type SimulationResult,
  simulateLife,
  generateRandomTraits,
  generateRandomName,
  formatCurrency,
  getLifetimeGrade,
} from '@/lib/sim';
import { createRng } from '@/lib/rng';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dices, Play, User, Settings, RefreshCw, Share2, Trophy, Coins, Loader2, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export function SingleLife() {
  const { toast } = useToast();
  
  const [name, setName] = useState(() => {
    const rng = createRng(Date.now());
    return generateRandomName(rng);
  });
  const [avatarKey, setAvatarKey] = useState(() => Date.now());
  const [traits, setTraits] = useState<Traits>({
    INT: 10,
    WORK: 10,
    NEPO: 10,
    CHAR: 10,
    RISK: 10,
  });
  const [worldMode, setWorldMode] = useState<WorldMode>('normal');
  const [sameDeck, setSameDeck] = useState(false);
  const [seed, setSeed] = useState(() => String(Math.floor(Math.random() * 1000000)));
  const [seedLocked, setSeedLocked] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [hasRun, setHasRun] = useState(false);
  const [obituary, setObituary] = useState<string | null>(null);
  const [obituaryLoading, setObituaryLoading] = useState(false);
  
  const handleNewAvatar = () => {
    setAvatarKey(Date.now());
  };
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlSeed = params.get('seed');
    const urlWorld = params.get('world') as WorldMode | null;
    const urlSameDeck = params.get('sameDeck');
    const urlName = params.get('name');
    const urlTraits = params.get('traits');
    
    if (urlSeed) setSeed(urlSeed);
    if (urlWorld && ['normal', 'nepo', 'meritocracy'].includes(urlWorld)) {
      setWorldMode(urlWorld);
    }
    if (urlSameDeck) setSameDeck(urlSameDeck === 'true');
    if (urlName) setName(urlName);
    if (urlTraits) {
      try {
        const parsed = JSON.parse(urlTraits);
        if (parsed.INT !== undefined) setTraits(parsed);
      } catch { }
    }
  }, []);
  
  const updateUrl = useCallback(() => {
    const params = new URLSearchParams();
    params.set('seed', seed);
    params.set('world', worldMode);
    params.set('sameDeck', String(sameDeck));
    if (name) params.set('name', name);
    params.set('traits', JSON.stringify(traits));
    
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, [seed, worldMode, sameDeck, name, traits]);
  
  const handleRandomTraits = () => {
    const rng = createRng(Date.now());
    const newTraits = generateRandomTraits(rng);
    setTraits(newTraits);
  };
  
  const handleRandomName = () => {
    const rng = createRng(Date.now() + 1);
    const newName = generateRandomName(rng);
    setName(newName);
  };
  
  const handleRandomSeed = () => {
    setSeed(String(Math.floor(Math.random() * 1000000)));
  };
  
  const handleRun = () => {
    let currentSeed = seed;
    if (!seedLocked) {
      currentSeed = String(Math.floor(Math.random() * 1000000));
      setSeed(currentSeed);
    }
    const agentName = name || 'Anonymous';
    const simResult = simulateLife(
      { name: agentName, traits, index: 0 },
      worldMode,
      currentSeed,
      sameDeck
    );
    setResult(simResult);
    setHasRun(true);
    setObituary(null);
    updateUrl();
  };
  
  const handleShare = () => {
    updateUrl();
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: 'Link copied!',
      description: 'Simulation URL copied to clipboard',
    });
  };

  const generateObituary = async () => {
    if (!result) return;
    
    setObituaryLoading(true);
    try {
      const careerStage = result.stages.find(s => s.career);
      const careerField = careerStage?.career?.placement?.tier || 'General';
      
      const response = await apiRequest('POST', '/api/generate-obituary', {
        name: result.name,
        traits: result.traits,
        stages: result.stages,
        lifetimeEarnings: result.lifetimeEarnings,
        careerField,
      });
      
      const data = await response.json();
      setObituary(data.obituary);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate biography',
        variant: 'destructive',
      });
    } finally {
      setObituaryLoading(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="single-life-view">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              Who are you?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Agent Name"
                className="h-8"
                data-testid="input-agent-name"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleRandomName}
                title="Random name"
                className="h-8 w-8 shrink-0"
                data-testid="button-random-name"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
            
            <div className="flex gap-4">
              <div className="flex flex-col items-center gap-2 shrink-0">
                <Avatar className="h-24 w-24 border-2">
                  <AvatarImage
                    src={`https://thispersondoesnotexist.com?${avatarKey}`}
                    alt="Agent avatar"
                  />
                  <AvatarFallback>
                    <User className="h-8 w-8 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNewAvatar}
                  className="gap-1 h-7 text-xs"
                  data-testid="button-new-avatar"
                >
                  <RefreshCw className="h-3 w-3" />
                  New Face
                </Button>
              </div>
              
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-xs text-muted-foreground">Traits</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRandomTraits}
                    className="gap-1 h-6 text-xs px-2"
                    data-testid="button-random-traits"
                  >
                    <Dices className="h-3 w-3" />
                    Roll
                  </Button>
                </div>
                <TraitInput traits={traits} onChange={setTraits} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings className="h-4 w-4" />
              Simulation Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="world-mode" className="text-xs">World Mode</Label>
              <Select value={worldMode} onValueChange={(v) => setWorldMode(v as WorldMode)}>
                <SelectTrigger className="mt-1 h-8" data-testid="select-world-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="nepo">Nepotism</SelectItem>
                  <SelectItem value="meritocracy">Meritocracy</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">
                {worldMode === 'normal' && 'Balanced trait multipliers'}
                {worldMode === 'nepo' && 'NEPO & CHAR boosted, INT & WORK reduced'}
                {worldMode === 'meritocracy' && 'INT & WORK boosted, NEPO & CHAR reduced'}
              </p>
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Label htmlFor="seed" className="text-xs">Seed</Label>
                <div className="flex items-center gap-1.5">
                  <Checkbox
                    id="seed-locked"
                    checked={seedLocked}
                    onCheckedChange={(checked) => setSeedLocked(checked === true)}
                    data-testid="checkbox-seed-locked"
                  />
                  <Label htmlFor="seed-locked" className="text-xs text-muted-foreground cursor-pointer">
                    Lock
                  </Label>
                </div>
              </div>
              <div className="flex gap-1">
                <Input
                  id="seed"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  placeholder="Seed"
                  className="h-8 font-mono"
                  disabled={!seedLocked}
                  data-testid="input-seed"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRandomSeed}
                  title="Random seed"
                  className="h-8 w-8 shrink-0"
                  disabled={!seedLocked}
                  data-testid="button-random-seed"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {seedLocked ? 'Seed is fixed for reproducible results' : 'Seed randomizes each run'}
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="same-deck"
                checked={sameDeck}
                onCheckedChange={setSameDeck}
                data-testid="switch-same-deck"
              />
              <Label htmlFor="same-deck" className="cursor-pointer text-sm">
                Same deck for all
              </Label>
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleRun}
                className="gap-2 flex-1"
                data-testid="button-run-simulation"
              >
                <Play className="h-4 w-4" />
                Run Simulation
              </Button>
              {hasRun && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleShare}
                  title="Share"
                  data-testid="button-share"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {result && (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-chart-4" />
                Lifetime Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-4 pb-3 border-b">
                    <div>
                      <div className="text-xs text-muted-foreground">Agent</div>
                      <div className="text-lg font-bold" data-testid="result-agent-name">
                        {result.name}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Peak Salary</div>
                      <div className="text-lg font-mono font-bold text-chart-4" data-testid="result-peak-income">
                        {formatCurrency(result.peakIncome)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Coins className="h-3 w-3" />
                          Lifetime
                        </div>
                        <div className="text-lg font-mono font-bold text-chart-2" data-testid="result-lifetime-earnings">
                          {formatCurrency(result.lifetimeEarnings)}
                        </div>
                      </div>
                      <div 
                        className={`text-6xl font-bold ${getLifetimeGrade(result.lifetimeEarnings).color}`}
                        data-testid="result-lifetime-grade"
                      >
                        {getLifetimeGrade(result.lifetimeEarnings).grade}
                      </div>
                    </div>
                    <div className="lg:ml-auto">
                      <div className="text-xs text-muted-foreground mb-1">Traits</div>
                      <TraitDisplay traits={result.traits} compact />
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <IncomeChart stages={result.stages} />
                  </div>
                </div>
                <div className="lg:w-64 shrink-0">
                  <LuckAnalysis luck={result.luck} embedded />
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">Life Biography</h3>
                </div>
                {obituary ? (
                  <p className="text-sm italic text-muted-foreground leading-relaxed" data-testid="obituary-text">
                    {obituary}
                  </p>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateObituary}
                    disabled={obituaryLoading}
                    data-testid="button-generate-obituary"
                  >
                    {obituaryLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      'Generate AI Biography'
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
          
          <div>
            <h2 className="text-xl font-semibold mb-4">Life Timeline</h2>
            <Timeline stages={result.stages} />
          </div>
        </>
      )}
    </div>
  );
}
