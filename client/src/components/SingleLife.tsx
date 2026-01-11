import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
} from '@/lib/sim';
import { createRng } from '@/lib/rng';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dices, Play, User, Settings, RefreshCw, Share2, Trophy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function SingleLife() {
  const { toast } = useToast();
  
  const [name, setName] = useState('');
  const [avatarKey, setAvatarKey] = useState(() => Date.now());
  const [traits, setTraits] = useState<Traits>({
    INT: 10,
    WORK: 10,
    SOC: 10,
    CHAR: 10,
    RISK: 10,
  });
  const [worldMode, setWorldMode] = useState<WorldMode>('normal');
  const [sameDeck, setSameDeck] = useState(false);
  const [seed, setSeed] = useState(() => String(Math.floor(Math.random() * 1000000)));
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [hasRun, setHasRun] = useState(false);
  
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
    const agentName = name || 'Anonymous';
    const simResult = simulateLife(
      { name: agentName, traits, index: 0 },
      worldMode,
      seed,
      sameDeck
    );
    setResult(simResult);
    setHasRun(true);
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

  return (
    <div className="space-y-6" data-testid="single-life-view">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Agent Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex flex-col items-center gap-3 md:w-40 shrink-0">
              <Avatar className="h-24 w-24 border-2">
                <AvatarImage
                  src={`https://thispersondoesnotexist.com?${avatarKey}`}
                  alt="Agent avatar"
                />
                <AvatarFallback>
                  <User className="h-10 w-10 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNewAvatar}
                className="gap-1.5 w-full"
                data-testid="button-new-avatar"
              >
                <RefreshCw className="h-3 w-3" />
                New Face
              </Button>
              <div className="w-full">
                <Label htmlFor="name" className="text-xs">Name</Label>
                <div className="flex gap-1 mt-1">
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Name"
                    className="h-8 text-sm"
                    data-testid="input-agent-name"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleRandomName}
                    title="Generate random name"
                    className="h-8 w-8 shrink-0"
                    data-testid="button-random-name"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm">Traits (0-20)</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRandomTraits}
                  className="gap-1.5 h-7 text-xs"
                  data-testid="button-random-traits"
                >
                  <Dices className="h-3 w-3" />
                  Random
                </Button>
              </div>
              <TraitInput traits={traits} onChange={setTraits} />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Simulation Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label htmlFor="world-mode">World Mode</Label>
              <Select value={worldMode} onValueChange={(v) => setWorldMode(v as WorldMode)}>
                <SelectTrigger className="mt-1.5" data-testid="select-world-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="nepo">Nepotism</SelectItem>
                  <SelectItem value="meritocracy">Meritocracy</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {worldMode === 'normal' && 'Balanced trait multipliers'}
                {worldMode === 'nepo' && 'Social & Charisma boosted, INT & WORK reduced'}
                {worldMode === 'meritocracy' && 'INT & WORK boosted, Social & Charisma reduced'}
              </p>
            </div>
            
            <div>
              <Label htmlFor="seed">Seed</Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  id="seed"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  placeholder="Seed for reproducibility"
                  data-testid="input-seed"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRandomSeed}
                  title="Generate random seed"
                  data-testid="button-random-seed"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 pt-7">
              <Switch
                id="same-deck"
                checked={sameDeck}
                onCheckedChange={setSameDeck}
                data-testid="switch-same-deck"
              />
              <Label htmlFor="same-deck" className="cursor-pointer">
                Same deck for everyone
              </Label>
            </div>
          </div>
          
          <div className="flex gap-3 mt-6">
            <Button
              onClick={handleRun}
              className="gap-2"
              size="lg"
              data-testid="button-run-simulation"
            >
              <Play className="h-4 w-4" />
              Run Simulation
            </Button>
            {hasRun && (
              <Button
                variant="outline"
                onClick={handleShare}
                className="gap-2"
                data-testid="button-share"
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      
      {result && (
        <>
          <Card className="border-chart-4/30 bg-gradient-to-br from-chart-4/5 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-chart-4" />
                Final Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Agent</div>
                  <div className="text-2xl font-bold mb-3" data-testid="result-agent-name">
                    {result.name}
                  </div>
                  <TraitDisplay traits={result.traits} />
                </div>
                <div className="flex flex-col justify-center">
                  <div className="text-sm text-muted-foreground mb-1">Final Income</div>
                  <div className="text-4xl font-mono font-bold text-chart-4" data-testid="result-final-income">
                    {formatCurrency(result.finalIncome)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    After 8 life stages
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Income Progression</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                <IncomeChart stages={result.stages} />
              </CardContent>
            </Card>
            
            <LuckAnalysis luck={result.luck} />
          </div>
          
          <div>
            <h2 className="text-xl font-semibold mb-4">Life Timeline</h2>
            <Timeline stages={result.stages} />
          </div>
        </>
      )}
    </div>
  );
}
