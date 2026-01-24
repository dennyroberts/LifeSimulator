import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  type CareerAspiration,
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
  const [aspiration, setAspiration] = useState<CareerAspiration>(null);
  const [sameDeck, setSameDeck] = useState(false);
  const [seed, setSeed] = useState(() => String(Math.floor(Math.random() * 1000000)));
  const [seedLocked, setSeedLocked] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [bestResult, setBestResult] = useState<SimulationResult | null>(null);
  const [worstResult, setWorstResult] = useState<SimulationResult | null>(null);
  const [timelineView, setTimelineView] = useState<'actual' | 'best' | 'worst'>('actual');
  const [hasRun, setHasRun] = useState(false);
  const [biography, setBiography] = useState<string | null>(null);
  const [biographyLoading, setBiographyLoading] = useState(false);
  const [hoveredStageIndex, setHoveredStageIndex] = useState<number | null>(null);
  const bioScrollRef = useRef<HTMLDivElement>(null);
  const sentenceRefs = useRef<Map<number, HTMLSpanElement>>(new Map());
  
  const stageToAge = (stageIndex: number) => {
    if (stageIndex === 0) return 18;
    if (stageIndex === 1) return 24;
    return 24 + (stageIndex - 1) * 6;
  };
  
  const parsedBiography = useMemo(() => {
    if (!biography) return { paragraphs: [], lastSentence: '', mainBio: '', ageSentenceMap: new Map() };
    
    const lastSentenceMatch = biography.match(/[^.!?]*[.!?]$/);
    const lastSentence = lastSentenceMatch ? lastSentenceMatch[0].trim() : '';
    const mainBio = lastSentence ? biography.slice(0, biography.lastIndexOf(lastSentence)).trim() : biography;
    
    const abbreviations = ['St', 'Mr', 'Ms', 'Mrs', 'Rev', 'Dr', 'Jr', 'Sr', 'Prof', 'Gen', 'Col', 'Lt', 'Sgt', 'Capt', 'Inc', 'Ltd', 'Corp', 'vs', 'etc', 'e\\.g', 'i\\.e'];
    const abbrevPattern = abbreviations.join('|');
    const sentenceEndRegex = new RegExp(`(?<!\\b(?:${abbrevPattern}))\\.\\s+|[!?]\\s+`, 'g');
    
    const paragraphs = mainBio.split(/\n+/).filter(p => p.trim());
    const allParagraphs: { sentences: { text: string; age: number | null; idx: number }[] }[] = [];
    const ages = [18, 24, 30, 36, 42, 48, 54, 60, 66];
    let globalIdx = 0;
    
    paragraphs.forEach((para) => {
      const parts = para.split(sentenceEndRegex).filter(s => s.trim());
      const sentences: { text: string; age: number | null; idx: number }[] = [];
      
      parts.forEach((part) => {
        const trimmed = part.trim();
        if (!trimmed) return;
        
        let matchedAge: number | null = null;
        for (const age of ages) {
          if (trimmed.includes(`${age}`) || trimmed.includes(`age ${age}`) || trimmed.includes(`Age ${age}`)) {
            matchedAge = age;
            break;
          }
        }
        sentences.push({ text: trimmed, age: matchedAge, idx: globalIdx });
        globalIdx++;
      });
      
      if (sentences.length > 0) {
        allParagraphs.push({ sentences });
      }
    });
    
    const ageSentenceMap = new Map<number, number>();
    allParagraphs.forEach((para) => {
      para.sentences.forEach((s) => {
        if (s.age !== null) {
          ageSentenceMap.set(s.age, s.idx);
        }
      });
    });
    
    const allSentencesFlat = allParagraphs.flatMap(p => p.sentences);
    for (let i = 0; i < ages.length; i++) {
      const age = ages[i];
      if (!ageSentenceMap.has(age)) {
        const prevAge = ages[i - 1];
        const nextAge = ages[i + 1];
        const prevIdx = prevAge ? ageSentenceMap.get(prevAge) : undefined;
        const nextIdx = nextAge ? ageSentenceMap.get(nextAge) : undefined;
        
        if (prevIdx !== undefined && nextIdx !== undefined) {
          const expectedIdx = prevIdx + 1;
          if (expectedIdx < nextIdx && allSentencesFlat[expectedIdx]) {
            ageSentenceMap.set(age, expectedIdx);
            allSentencesFlat[expectedIdx].age = age;
          }
        }
      }
    }
    
    return { paragraphs: allParagraphs, lastSentence, mainBio, ageSentenceMap };
  }, [biography]);
  
  const handleChartHover = useCallback((stageIndex: number | null) => {
    setHoveredStageIndex(stageIndex);
    
    if (stageIndex !== null && parsedBiography.ageSentenceMap) {
      const age = stageToAge(stageIndex);
      const sentenceIdx = parsedBiography.ageSentenceMap.get(age);
      
      if (sentenceIdx !== undefined) {
        const el = sentenceRefs.current.get(sentenceIdx);
        const container = bioScrollRef.current;
        if (el && container) {
          const containerRect = container.getBoundingClientRect();
          const elRect = el.getBoundingClientRect();
          const scrollTop = container.scrollTop + (elRect.top - containerRect.top) - (containerRect.height / 2) + (elRect.height / 2);
          container.scrollTo({ top: scrollTop, behavior: 'smooth' });
        }
      }
    }
  }, [parsedBiography.ageSentenceMap]);
  
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
    const agent = { name: agentName, traits, index: 0, aspiration };
    
    const simResult = simulateLife(agent, worldMode, currentSeed, sameDeck);
    setResult(simResult);
    
    const sharedEvents = new Map<number, any>();
    simResult.stages.forEach(stage => {
      if (stage.eventOutcome?.event) {
        sharedEvents.set(stage.stage, stage.eventOutcome.event);
      }
    });
    
    const bestSimResult = simulateLife(agent, worldMode, currentSeed, true, sharedEvents, 19);
    setBestResult(bestSimResult);
    
    const worstSimResult = simulateLife(agent, worldMode, currentSeed, true, sharedEvents, 2);
    setWorstResult(worstSimResult);
    
    setTimelineView('actual');
    setHasRun(true);
    setBiography(null);
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

  useEffect(() => {
    if (!result) return;
    
    const generateBiography = async () => {
      setBiographyLoading(true);
      try {
        const careerStage = result.stages.find(s => s.career);
        const careerName = careerStage?.career?.career?.name || 'General';
        
        const letterGrade = getLifetimeGrade(result.lifetimeEarnings).grade;
        
        const response = await apiRequest('POST', '/api/generate-biography', {
          name: result.name,
          traits: result.traits,
          stages: result.stages,
          careerName,
          letterGrade,
        });
        
        const data = await response.json();
        setBiography(data.biography);
      } catch (error) {
        console.error('Failed to generate biography:', error);
      } finally {
        setBiographyLoading(false);
      }
    };
    
    generateBiography();
  }, [result]);

  return (
    <div className="space-y-6" data-testid="single-life-view">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              Character Creator
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
                    src={`/api/avatar/${avatarKey}`}
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
            
            <div>
              <Label htmlFor="aspiration" className="text-xs">Career Aspiration</Label>
              <Select 
                value={aspiration || 'none'} 
                onValueChange={(v) => setAspiration(v === 'none' ? null : v as CareerAspiration)}
              >
                <SelectTrigger className="mt-1 h-8" data-testid="select-aspiration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (take best available)</SelectItem>
                  <SelectItem value="Healthcare">Healthcare</SelectItem>
                  <SelectItem value="Creative Fields">Creative Fields</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Tech">Tech</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                  <SelectItem value="Lawyer">Lawyer</SelectItem>
                  <SelectItem value="Doctor">Doctor</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">
                If available, agent will choose this career over higher options
              </p>
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
              <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-6 gap-y-2 mb-4 pb-3 border-b">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <Avatar className="h-8 w-8 sm:h-10 sm:w-10 border shrink-0">
                    <AvatarImage
                      src={`/api/avatar/${avatarKey}`}
                      alt="Agent avatar"
                    />
                    <AvatarFallback>
                      {result.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">Agent</div>
                    <div className="text-base sm:text-lg font-bold truncate max-w-[120px] sm:max-w-none" data-testid="result-agent-name">
                      {result.name}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Peak</div>
                  <div className="text-sm sm:text-lg font-mono font-bold text-chart-4" data-testid="result-peak-income">
                    {formatCurrency(result.peakIncome)}
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Coins className="h-3 w-3" />
                      Lifetime
                    </div>
                    <div className="text-sm sm:text-lg font-mono font-bold text-chart-2" data-testid="result-lifetime-earnings">
                      {formatCurrency(result.lifetimeEarnings)}
                    </div>
                  </div>
                  <div className="flex items-end gap-1">
                    <div 
                      className={`text-4xl sm:text-6xl font-bold ${getLifetimeGrade(result.lifetimeEarnings).color}`}
                      data-testid="result-lifetime-grade"
                    >
                      {getLifetimeGrade(result.lifetimeEarnings).grade}
                    </div>
                    {bestResult && worstResult && (
                      <div className="flex flex-col text-[10px] sm:text-xs font-bold mb-1 gap-0.5">
                        <span 
                          className={getLifetimeGrade(bestResult.lifetimeEarnings).color}
                          data-testid="result-best-grade"
                          title="Best possible grade"
                        >
                          {getLifetimeGrade(bestResult.lifetimeEarnings).grade}
                        </span>
                        <span 
                          className={getLifetimeGrade(worstResult.lifetimeEarnings).color}
                          data-testid="result-worst-grade"
                          title="Worst possible grade"
                        >
                          {getLifetimeGrade(worstResult.lifetimeEarnings).grade}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="w-full sm:w-auto sm:ml-auto">
                  <div className="text-xs text-muted-foreground mb-1">Traits</div>
                  <TraitDisplay traits={result.traits} compact />
                </div>
              </div>
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1 flex flex-col">
                  <div className="mb-2">
                    <LuckAnalysis luck={result.luck} embedded compact />
                  </div>
                  <div className="flex justify-start flex-1">
                    <IncomeChart stages={result.stages} onHoverStage={handleChartHover} />
                  </div>
                </div>
                <div className="lg:w-[28rem] shrink-0">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold">Life Biography</h3>
                  </div>
                  {biographyLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating biography...
                    </div>
                  ) : biography ? (
                    (() => {
                      const highlightedAge = hoveredStageIndex !== null ? stageToAge(hoveredStageIndex) : null;
                      const highlightedSentenceIdx = highlightedAge && parsedBiography.ageSentenceMap 
                        ? parsedBiography.ageSentenceMap.get(highlightedAge) 
                        : null;
                      
                      return (
                        <div 
                          ref={bioScrollRef}
                          className="max-h-64 overflow-y-auto text-muted-foreground leading-relaxed scroll-smooth" 
                          data-testid="biography-text"
                        >
                          {parsedBiography.lastSentence && (
                            <p className="text-sm font-semibold mb-2" style={{ color: '#FFFFFF' }}>{parsedBiography.lastSentence}</p>
                          )}
                          {parsedBiography.paragraphs.map((para, pIdx) => (
                            <p key={pIdx} className="text-xs italic mb-2 last:mb-0">
                              {para.sentences.map((sentence) => (
                                <span
                                  key={sentence.idx}
                                  ref={(el) => {
                                    if (el) sentenceRefs.current.set(sentence.idx, el);
                                    else sentenceRefs.current.delete(sentence.idx);
                                  }}
                                  className={`transition-colors duration-300 ${
                                    highlightedSentenceIdx === sentence.idx 
                                      ? 'text-white' 
                                      : ''
                                  }`}
                                >
                                  {sentence.text.replace(/[.!?]+$/, '')}.{' '}
                                </span>
                              ))}
                            </p>
                          ))}
                        </div>
                      );
                    })()
                  ) : null}
                </div>
              </div>
              
            </CardContent>
          </Card>
          
          <div>
            <h2 className="text-xl font-semibold mb-4">Life Timeline</h2>
            <Tabs value={timelineView} onValueChange={(v) => setTimelineView(v as 'actual' | 'best' | 'worst')} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="actual" data-testid="tab-actual">
                  Actual Life
                </TabsTrigger>
                <TabsTrigger value="best" data-testid="tab-best" className="text-chart-2">
                  Best Possible (All 19s)
                </TabsTrigger>
                <TabsTrigger value="worst" data-testid="tab-worst" className="text-destructive">
                  Worst Possible (All 2s)
                </TabsTrigger>
              </TabsList>
              <TabsContent value="actual">
                <Timeline stages={result.stages} />
                <div className="mt-2 text-sm text-muted-foreground">
                  Lifetime Earnings: {formatCurrency(result.lifetimeEarnings)}
                </div>
              </TabsContent>
              <TabsContent value="best">
                {bestResult && (
                  <>
                    <Timeline stages={bestResult.stages} />
                    <div className="mt-2 text-sm text-chart-2">
                      Best Lifetime Earnings: {formatCurrency(bestResult.lifetimeEarnings)}
                    </div>
                  </>
                )}
              </TabsContent>
              <TabsContent value="worst">
                {worstResult && (
                  <>
                    <Timeline stages={worstResult.stages} />
                    <div className="mt-2 text-sm text-destructive">
                      Worst Lifetime Earnings: {formatCurrency(worstResult.lifetimeEarnings)}
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </>
      )}
    </div>
  );
}
