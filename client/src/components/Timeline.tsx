import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  type StageResult,
  type TraitContribution,
  formatCurrency, 
  formatPercent,
  formatEV 
} from '@/lib/sim';
import * as LucideIcons from 'lucide-react';
import { GraduationCap, Briefcase, Check, X, AlertTriangle, Sparkles, Skull, Baby, Cross, Star } from 'lucide-react';

const getEventIcon = (iconName?: string) => {
  if (!iconName) return Briefcase;
  const Icon = (LucideIcons as Record<string, any>)[iconName];
  return Icon || Briefcase;
};

interface TimelineProps {
  stages: StageResult[];
}

const stageToAge = (stageNum: number) => {
  if (stageNum === 1) return 18;
  if (stageNum === 2) return 24;
  return 24 + (stageNum - 2) * 6;
};

export function Timeline({ stages }: TimelineProps) {
  return (
    <div className="space-y-2" data-testid="timeline">
      <TimelineAgeRail stages={stages} />
      
      {/* Desktop: Horizontal card layout */}
      <div className="hidden md:flex flex-row gap-2">
        {stages.map((stage) => (
          <TimelineCard key={stage.stage} stage={stage} />
        ))}
      </div>
      
      {/* Mobile: Vertical scrollable layout with continuous line */}
      <div className="md:hidden relative max-h-[70vh] overflow-y-auto pr-1">
        {/* Continuous vertical line */}
        <div className="absolute left-[18px] top-4 bottom-4 w-0.5 bg-border" />
        
        <div className="flex flex-col gap-1">
          {stages.map((stage) => {
            const age = stageToAge(stage.stage);
            return (
              <div key={stage.stage} className="flex items-stretch gap-2 relative">
                {/* Age marker column */}
                <div className="flex flex-col items-center shrink-0 w-10 py-2">
                  <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-0.5">
                    {stage.stage === 1 && <Baby className="h-3 w-3" />}
                    {age}
                    {stage.stage === 9 && <Cross className="h-3 w-3" />}
                  </div>
                  <div className="w-2 h-2 rounded-full bg-chart-1 border-2 border-background mt-0.5 z-10" />
                </div>
                {/* Card */}
                <div className="flex-1 min-w-0 py-1">
                  <MobileTimelineCard stage={stage} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TimelineAgeRail({ stages }: { stages: StageResult[] }) {
  return (
    <div className="hidden md:block relative h-8 mx-2">
      <div className="absolute top-4 left-0 right-0 h-0.5 bg-border" />
      <div className="flex justify-between">
        {stages.map((stage) => {
          const age = stageToAge(stage.stage);
          return (
            <div key={stage.stage} className="flex flex-col items-center z-10 bg-background px-0.5">
              <div className="text-[10px] text-muted-foreground font-mono mb-0.5 flex items-center gap-0.5 leading-tight">
                {stage.stage === 1 && <Baby className="h-3 w-3" />}
                {age}
                {stage.stage === 9 && <Cross className="h-3 w-3" />}
              </div>
              <div className="w-2 h-2 rounded-full bg-chart-1 border-2 border-background" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DetailedCard({ stage }: { stage: StageResult }) {
  return <TimelineCard stage={stage} />;
}

function TimelineCard({ stage }: { stage: StageResult }) {
  if (stage.isEducation && stage.education) {
    return <CompactEducationCard stage={stage} />;
  }
  
  if (stage.isCareer && stage.career) {
    return <CompactCareerCard stage={stage} />;
  }
  
  if (stage.eventOutcome) {
    return <CompactEventCard stage={stage} />;
  }
  
  return null;
}

function MobileTimelineCard({ stage }: { stage: StageResult }) {
  if (stage.isEducation && stage.education) {
    return <MobileEducationCard stage={stage} />;
  }
  
  if (stage.isCareer && stage.career) {
    return <MobileCareerCard stage={stage} />;
  }
  
  if (stage.eventOutcome) {
    return <MobileEventCard stage={stage} />;
  }
  
  return null;
}

function MobileEducationCard({ stage }: { stage: StageResult }) {
  const edu = stage.education!;
  
  return (
    <Card className="border-l-4 border-l-chart-1" data-testid="mobile-education-card">
      <CardContent className="p-2">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-1.5">
            <GraduationCap className="h-3 w-3 text-chart-1 shrink-0" />
            <span className="text-xs font-medium">Education</span>
          </div>
          <Badge variant="secondary" className="text-[9px] px-1 py-0">
            {edu.label}
          </Badge>
        </div>
        {edu.outcomeMessage && (
          <div className="text-[10px] italic mb-1 text-chart-1" data-testid="mobile-edu-outcome">
            "{edu.outcomeMessage}"
          </div>
        )}
        <div className="flex items-center gap-3 text-xs flex-wrap">
          <div className="font-mono">
            <span className="text-muted-foreground">Roll: </span>
            <span className="font-bold">{edu.roll}</span>
            <span className="text-muted-foreground">+</span>
            <span className={edu.totalMod >= 0 ? 'text-chart-2' : 'text-destructive'}>
              {edu.totalMod >= 0 ? '+' : ''}{edu.totalMod}
            </span>
            <span className="text-muted-foreground">=</span>
            <span className="font-bold">{edu.total}</span>
          </div>
          {edu.traitContributions && edu.traitContributions.some(tc => tc.contribution !== 0) && (
            <div className="font-mono text-[10px] text-muted-foreground">
              ({edu.traitContributions.filter(tc => tc.contribution !== 0).map((tc, i) => (
                <span key={tc.trait}>
                  {i > 0 && ' '}
                  <span className={tc.contribution >= 0 ? 'text-chart-2' : 'text-destructive'}>
                    {tc.trait}{tc.contribution >= 0 ? '+' : ''}{tc.contribution}
                  </span>
                </span>
              ))})
            </div>
          )}
          <div className="font-mono">
            <span className="text-muted-foreground">Growth: </span>
            <span className={edu.growthDelta > 0 ? 'text-chart-2' : 'text-muted-foreground'}>
              {formatPercent(edu.growthDelta)}
            </span>
          </div>
          <div className="ml-auto font-mono font-bold text-chart-1">
            {formatCurrency(stage.incomeAfter)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MobileCareerCard({ stage }: { stage: StageResult }) {
  const career = stage.career!;
  
  return (
    <Card className="border-l-4 border-l-chart-3" data-testid="mobile-career-card">
      <CardContent className="p-2">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-1.5">
            <Briefcase className="h-3 w-3 text-chart-3 shrink-0" />
            <span className="text-xs font-medium">Career</span>
          </div>
          <Badge variant="secondary" className="text-[9px] px-1 py-0">
            {career.career.name}
          </Badge>
        </div>
        {career.outcomeMessage && (
          <div className={`text-[10px] italic mb-1 ${career.isNat20 ? 'text-chart-4' : 'text-chart-3'}`} data-testid="mobile-career-outcome">
            "{career.outcomeMessage}"
          </div>
        )}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <div className="font-mono">
            <span className="text-muted-foreground">Roll: </span>
            <span className={career.isNat20 ? 'text-chart-4 font-bold' : 'font-bold'}>{career.roll}</span>
            <span className="text-muted-foreground">+</span>
            <span className={career.totalMod >= 0 ? 'text-chart-2' : 'text-destructive'}>
              {career.totalMod >= 0 ? '+' : ''}{career.totalMod}
            </span>
            <span className="text-muted-foreground">=</span>
            <span className="font-bold">{career.total}</span>
          </div>
          {career.isNat20 && (
            <span className="text-chart-4 text-[10px] font-bold">+20% salary</span>
          )}
          <div className="ml-auto font-mono font-bold text-chart-1 shrink-0">
            {formatCurrency(career.finalSalary)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MobileEventCard({ stage }: { stage: StageResult }) {
  const outcome = stage.eventOutcome!;
  const event = outcome.event;
  
  const getBorderColor = () => {
    if (outcome.gateFailed) return 'border-l-muted-foreground';
    if (outcome.success) return 'border-l-chart-2';
    return 'border-l-destructive';
  };
  
  const getStatusText = () => {
    if (outcome.gateFailed) return "Skipped";
    if (outcome.success) return "Pass";
    return "Fail";
  };
  
  const getStatusColor = () => {
    if (outcome.gateFailed) return 'text-muted-foreground';
    if (outcome.success) return 'text-chart-2';
    return 'text-destructive';
  };
  
  const EventIcon = getEventIcon(event.icon);
  
  return (
    <Card className={`border-l-4 ${getBorderColor()}`} data-testid={`mobile-event-card-${stage.stage}`}>
      <CardContent className="p-2">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <EventIcon className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="text-xs font-medium truncate">{event.name}</span>
          </div>
          <span className={`text-[10px] font-medium shrink-0 ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>
        {outcome.outcomeMessage && (
          <div className={`text-[10px] italic mb-1 ${getStatusColor()}`} data-testid={`mobile-outcome-${stage.stage}`}>
            "{outcome.outcomeMessage}"
          </div>
        )}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          {!outcome.gateFailed && event.rollRequired && (
            <div className="font-mono">
              <span className="text-muted-foreground">DC{outcome.mainDC}: </span>
              <span className={outcome.isCritical ? (outcome.criticalType === 'success' ? 'text-chart-4 font-bold' : 'text-destructive font-bold') : ''}>
                {outcome.mainRoll}
              </span>
              <span className="text-muted-foreground">+</span>
              <span className={outcome.mainMod! >= 0 ? 'text-chart-2' : 'text-destructive'}>
                {outcome.mainMod! >= 0 ? '+' : ''}{outcome.mainMod}
              </span>
              <span className="text-muted-foreground">=</span>
              <span className={outcome.success ? 'text-chart-2' : 'text-destructive'}>
                {(outcome.mainRoll || 0) + (outcome.mainMod || 0)}
              </span>
            </div>
          )}
          {outcome.traitContributions && outcome.traitContributions.length > 0 && (
            <div className="font-mono text-[10px] text-muted-foreground">
              ({outcome.traitContributions.map((tc, i) => {
                const isDeciding = outcome.decidingTrait === tc.trait;
                return (
                  <span key={tc.trait}>
                    {i > 0 && ' '}
                    <span className={`${tc.contribution >= 0 ? 'text-chart-2' : 'text-destructive'} ${isDeciding ? 'font-bold' : ''} inline-flex items-center`}>
                      {isDeciding && <Star className="h-2.5 w-2.5 fill-current mr-0.5" />}{tc.trait}{tc.contribution >= 0 ? '+' : ''}{tc.contribution}
                    </span>
                  </span>
                );
              })})
            </div>
          )}
          <div className="ml-auto font-mono font-bold text-chart-1 shrink-0">
            {formatCurrency(outcome.incomeAfter)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CompactEducationCard({ stage }: { stage: StageResult }) {
  const edu = stage.education!;
  const age = stageToAge(stage.stage);
  
  return (
    <Card className="border-t-4 border-t-chart-1 flex-1 min-w-0" data-testid="education-card">
      <CardContent className="p-3 flex flex-col h-full">
        <div className="flex items-center justify-between gap-1 mb-2">
          <div className="flex items-center gap-1.5">
            <GraduationCap className="h-4 w-4 text-chart-1 shrink-0" />
            <span className="text-xs text-muted-foreground">Age {age}</span>
          </div>
        </div>
        
        <div className="text-sm font-medium mb-2 leading-tight">
          Education
        </div>
        
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 mb-2 self-start" data-testid="education-result">
          {edu.label}
        </Badge>
        
        {edu.outcomeMessage && (
          <div className="text-[11px] italic mb-2 px-2 py-1 rounded bg-chart-1/10" data-testid="edu-outcome">
            "{edu.outcomeMessage}"
          </div>
        )}
        
        <div className="p-2 rounded bg-muted mb-2">
          <div className="text-[10px] text-muted-foreground">Roll</div>
          {edu.traitContributions && edu.traitContributions.some(tc => tc.contribution !== 0) && (
            <div className="text-[10px] font-mono mt-1 mb-1 space-y-0.5">
              {edu.traitContributions.filter(tc => tc.contribution !== 0).map((tc) => (
                <div key={tc.trait} className={tc.contribution >= 0 ? 'text-chart-2' : 'text-destructive'}>
                  {tc.trait} {tc.contribution >= 0 ? '+' : ''}{tc.contribution}
                </div>
              ))}
            </div>
          )}
          <div className="font-mono text-sm">
            <span className="font-bold">{edu.roll}</span>
            <span className="text-muted-foreground">+</span>
            <span className={edu.totalMod >= 0 ? 'text-chart-2' : 'text-destructive'}>
              {edu.totalMod >= 0 ? '+' : ''}{edu.totalMod}
            </span>
            <span className="text-muted-foreground">=</span>
            <span className="font-bold">{edu.total}</span>
          </div>
        </div>
        
        <div className="p-2 rounded bg-muted mb-2">
          <div className="text-[10px] text-muted-foreground">Growth</div>
          <div className={`font-mono text-sm font-semibold ${edu.growthDelta > 0 ? 'text-chart-2' : 'text-muted-foreground'}`}>
            {formatPercent(edu.growthDelta)}
          </div>
        </div>
        
        <div className="mt-auto p-2 rounded bg-chart-1/10 border border-chart-1/20">
          <div className="text-[10px] text-muted-foreground">Income</div>
          <div className="font-mono text-sm font-bold text-chart-1" data-testid="education-income">
            {formatCurrency(stage.incomeAfter)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CompactCareerCard({ stage }: { stage: StageResult }) {
  const career = stage.career!;
  const age = stageToAge(stage.stage);
  
  return (
    <Card className="border-t-4 border-t-chart-3 flex-1 min-w-0" data-testid="career-card">
      <CardContent className="p-3 flex flex-col h-full">
        <div className="flex items-center justify-between gap-1 mb-2">
          <div className="flex items-center gap-1.5">
            <Briefcase className="h-4 w-4 text-chart-3 shrink-0" />
            <span className="text-xs text-muted-foreground">Age {age}</span>
          </div>
        </div>
        
        <div className="text-sm font-medium mb-2 leading-tight">
          Career Placement
        </div>
        
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 mb-2 self-start" data-testid="career-result">
          {career.career.name}
        </Badge>
        
        {career.outcomeMessage && (
          <div className={`text-[11px] italic mb-2 px-2 py-1 rounded ${career.isNat20 ? 'bg-chart-4/10' : 'bg-chart-3/10'}`} data-testid="career-outcome">
            "{career.outcomeMessage}"
          </div>
        )}
        
        <div className={`p-2 rounded mb-2 ${career.isNat20 ? 'bg-chart-4/20 border border-chart-4/40' : 'bg-muted'}`}>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground">Roll</span>
            {career.isNat20 && (
              <span className="text-[9px] font-bold text-chart-4 flex items-center gap-0.5">
                <Sparkles className="h-3 w-3" />
                NAT 20! +20% salary
              </span>
            )}
          </div>
          {career.traitContributions && career.traitContributions.length > 0 && (
            <div className="text-[10px] font-mono mt-1 mb-1 space-y-0.5">
              {career.traitContributions.map((tc) => (
                <div key={tc.trait} className={tc.contribution >= 0 ? 'text-chart-2' : 'text-destructive'}>
                  {tc.trait} {tc.contribution >= 0 ? '+' : ''}{tc.contribution}
                </div>
              ))}
              <div className="text-muted-foreground">
                Edu {career.educationBonus >= 0 ? '+' : ''}{career.educationBonus}
              </div>
            </div>
          )}
          <div className="font-mono text-sm">
            <span className={`font-bold ${career.isNat20 ? 'text-chart-4' : ''}`}>{career.roll}</span>
            <span className="text-muted-foreground">+</span>
            <span className={career.totalMod >= 0 ? 'text-chart-2' : 'text-destructive'}>
              {career.totalMod >= 0 ? '+' : ''}{career.totalMod}
            </span>
            <span className="text-muted-foreground">=</span>
            <span className="font-bold">{career.total}</span>
          </div>
        </div>
        
        <div className="p-2 rounded bg-muted mb-2">
          <div className="text-[10px] text-muted-foreground">Base Growth</div>
          <div className="font-mono text-sm font-semibold text-chart-2">
            {formatPercent(career.finalGrowth)}
          </div>
        </div>
        
        <div className="mt-auto p-2 rounded bg-chart-1/10 border border-chart-1/20">
          <div className="text-[10px] text-muted-foreground">Starting Salary</div>
          <div className="font-mono text-sm font-bold text-chart-1" data-testid="career-salary">
            {formatCurrency(career.finalSalary)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CompactEventCard({ stage }: { stage: StageResult }) {
  const outcome = stage.eventOutcome!;
  const event = outcome.event;
  const age = stageToAge(stage.stage);
  
  const rarityColors: Record<string, string> = {
    common: 'bg-muted text-muted-foreground',
    uncommon: 'bg-chart-2/20 text-chart-2',
    rare: 'bg-chart-3/20 text-chart-3',
    jackpot: 'bg-chart-4/20 text-chart-4',
    sinkhole: 'bg-destructive/20 text-destructive',
  };
  
  const getBorderColor = () => {
    if (outcome.gateFailed) return 'border-t-muted-foreground';
    if (outcome.success) return 'border-t-chart-2';
    return 'border-t-destructive';
  };
  
  const getStatusIcon = () => {
    if (outcome.gateFailed) {
      return <AlertTriangle className="h-3 w-3 text-muted-foreground" />;
    }
    if (outcome.success) {
      return <Check className="h-3 w-3 text-chart-2" />;
    }
    return <X className="h-3 w-3 text-destructive" />;
  };
  
  const getStatusText = () => {
    if (outcome.gateFailed) return "Didn't risk";
    if (outcome.success) return "Success";
    return "Failed";
  };
  
  const getStatusColor = () => {
    if (outcome.gateFailed) return 'text-muted-foreground';
    if (outcome.success) return 'text-chart-2';
    return 'text-destructive';
  };
  
  const EventIcon = getEventIcon(event.icon);
  
  return (
    <Card className={`border-t-4 ${getBorderColor()} flex-1 min-w-0`} data-testid={`event-card-${stage.stage}`}>
      <CardContent className="p-3 flex flex-col h-full">
        <div className="flex items-center justify-between gap-1 mb-2">
          <div className="flex items-center gap-1.5">
            <EventIcon className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground">Age {age}</span>
          </div>
        </div>
        
        <div className="text-xs font-medium mb-2 leading-tight" title={event.name}>
          {event.name}
        </div>
        
        <div className="flex flex-wrap gap-1 mb-2">
          <Badge className={`${rarityColors[event.rarity]} text-[10px] px-1.5 py-0`} data-testid={`event-rarity-${stage.stage}`}>
            {event.rarity}
          </Badge>
          <div className={`flex items-center gap-0.5 text-[10px] font-medium ${getStatusColor()}`} data-testid={`event-status-${stage.stage}`}>
            {getStatusIcon()}
            {getStatusText()}
          </div>
        </div>
        
        {outcome.outcomeMessage && (
          <div className={`text-[11px] italic mb-2 px-2 py-1 rounded ${outcome.success ? 'bg-chart-2/10' : outcome.gateFailed ? 'bg-muted' : 'bg-destructive/10'}`} data-testid={`outcome-${stage.stage}`}>
            "{outcome.outcomeMessage}"
          </div>
        )}
        
        {event.riskGated && outcome.gateRoll !== undefined && (
          <div className={`p-2 rounded mb-2 ${outcome.gateFailed ? 'bg-muted' : 'bg-chart-2/10 border border-chart-2/20'}`}>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">Risk Gate (DC {outcome.gateDC})</span>
              {!outcome.gateFailed && (
                <span className="text-[9px] font-bold text-chart-2">RISKED IT</span>
              )}
              {outcome.gateFailed && (
                <span className="text-[9px] font-bold text-muted-foreground">PASSED</span>
              )}
            </div>
            <div className="font-mono text-sm">
              <span className="font-bold">{outcome.gateRoll}</span>
              <span className="text-muted-foreground">+</span>
              <span className={outcome.gateMod! >= 0 ? 'text-chart-2' : 'text-destructive'}>
                {outcome.gateMod! >= 0 ? '+' : ''}{outcome.gateMod}
              </span>
              <span className="text-muted-foreground">=</span>
              <span className={`font-bold ${outcome.gateFailed ? 'text-muted-foreground' : 'text-chart-2'}`}>
                {(outcome.gateRoll || 0) + (outcome.gateMod || 0)}
              </span>
            </div>
            <div className="text-[9px] mt-1 text-muted-foreground">
              {outcome.gateFailed ? "Didn't meet DC → skipped event" : "Met DC → took the risk"}
            </div>
          </div>
        )}
        
        {!outcome.gateFailed && event.rollRequired && (
          <div className={`p-2 rounded mb-2 ${outcome.isCritical ? (outcome.criticalType === 'success' ? 'bg-chart-4/20 border border-chart-4/40' : 'bg-destructive/20 border border-destructive/40') : 'bg-muted'}`}>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">Roll (DC {outcome.mainDC})</span>
              {outcome.isCritical && (
                <span className={`text-[9px] font-bold flex items-center gap-0.5 ${outcome.criticalType === 'success' ? 'text-chart-4' : 'text-destructive'}`}>
                  {outcome.criticalType === 'success' ? <Sparkles className="h-3 w-3" /> : <Skull className="h-3 w-3" />}
                  NAT {outcome.mainRoll}!
                </span>
              )}
            </div>
            {outcome.traitContributions && outcome.traitContributions.length > 0 && (
              <div className="text-[10px] font-mono mt-1 mb-1 space-y-0.5">
                {outcome.traitContributions.map((tc) => {
                  const isDeciding = outcome.decidingTrait === tc.trait;
                  return (
                    <div 
                      key={tc.trait} 
                      className={`${tc.contribution >= 0 ? 'text-chart-2' : 'text-destructive'} ${isDeciding ? 'font-bold' : ''} flex items-center gap-0.5`}
                    >
                      {isDeciding && <Star className="h-2.5 w-2.5 fill-current" />}{tc.trait} {tc.contribution >= 0 ? '+' : ''}{tc.contribution}
                    </div>
                  );
                })}
              </div>
            )}
            <div className="font-mono text-sm">
              <span className={`font-bold ${outcome.isCritical ? (outcome.criticalType === 'success' ? 'text-chart-4' : 'text-destructive') : ''}`}>{outcome.mainRoll}</span>
              <span className="text-muted-foreground">+</span>
              <span className={outcome.mainMod! >= 0 ? 'text-chart-2' : 'text-destructive'}>
                {outcome.mainMod! >= 0 ? '+' : ''}{outcome.mainMod}
              </span>
              <span className="text-muted-foreground">=</span>
              <span className={`font-bold ${outcome.success ? 'text-chart-2' : 'text-destructive'}`}>
                {(outcome.mainRoll || 0) + (outcome.mainMod || 0)}
              </span>
            </div>
          </div>
        )}
        
        <div className="p-2 rounded bg-muted mb-2">
          {outcome.isCritical && (
            <div className={`text-[9px] font-bold mb-1 ${outcome.criticalType === 'success' ? 'text-chart-4' : 'text-destructive'}`}>
              Critical (1.5x)
            </div>
          )}
          <div className="font-mono text-xs space-y-0.5">
            <div>
              <span className="text-muted-foreground">Jump: </span>
              <span className={outcome.jumpPct !== 0 ? (outcome.jumpPct > 0 ? 'text-chart-2' : 'text-destructive') : 'text-muted-foreground'}>
                {formatPercent(outcome.jumpPct)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Growth: </span>
              <span className={outcome.growthDelta !== 0 ? (outcome.growthDelta > 0 ? 'text-chart-2' : 'text-destructive') : 'text-muted-foreground'}>
                {formatPercent(outcome.growthDelta)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="mt-auto p-2 rounded bg-chart-1/10 border border-chart-1/20">
          <div className="text-[10px] text-muted-foreground">Income</div>
          <div className="font-mono text-sm font-bold text-chart-1" data-testid={`event-income-${stage.stage}`}>
            {formatCurrency(stage.incomeAfter)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface CompactEventListProps {
  stages: StageResult[];
}

export function CompactEventList({ stages }: CompactEventListProps) {
  return (
    <div className="flex flex-col gap-1" data-testid="compact-event-list">
      {stages.filter(s => !s.isEducation && s.eventOutcome).map((stage) => {
        const outcome = stage.eventOutcome!;
        return (
          <div key={stage.stage} className="flex items-center gap-2 text-sm">
            {outcome.gateFailed ? (
              <AlertTriangle className="h-3 w-3 text-muted-foreground shrink-0" />
            ) : outcome.success ? (
              <Check className="h-3 w-3 text-chart-2 shrink-0" />
            ) : (
              <X className="h-3 w-3 text-destructive shrink-0" />
            )}
            <span className="truncate">{outcome.event.name}</span>
          </div>
        );
      })}
    </div>
  );
}
