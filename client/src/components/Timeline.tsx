import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  type StageResult,
  type TraitContribution,
  formatCurrency, 
  formatPercent,
  formatEV 
} from '@/lib/sim';
import { GraduationCap, Briefcase, Check, X, AlertTriangle, Sparkles, Skull, Baby, Cross } from 'lucide-react';

interface TimelineProps {
  stages: StageResult[];
}

const stageToAge = (stageNum: number) => 20 + (stageNum - 1) * 8;

export function Timeline({ stages }: TimelineProps) {
  return (
    <div className="space-y-2" data-testid="timeline">
      <div className="relative h-8 mx-2">
        <div className="absolute top-3 left-0 right-0 h-0.5 bg-border" />
        <div className="flex justify-between">
          {stages.map((stage) => {
            const age = stageToAge(stage.stage);
            return (
              <div key={stage.stage} className="flex flex-col items-center">
                <div className="text-[10px] text-muted-foreground font-mono mb-0.5 flex items-center gap-0.5">
                  {stage.stage === 1 && <Baby className="h-3 w-3" />}
                  {age}
                  {stage.stage === 8 && <Cross className="h-3 w-3" />}
                </div>
                <div className="w-2 h-2 rounded-full bg-chart-1 border-2 border-background" />
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex flex-row gap-2">
        {stages.map((stage) => (
          <TimelineCard key={stage.stage} stage={stage} />
        ))}
      </div>
    </div>
  );
}

function TimelineCard({ stage }: { stage: StageResult }) {
  if (stage.isEducation && stage.education) {
    return <CompactEducationCard stage={stage} />;
  }
  
  if (stage.eventOutcome) {
    return <CompactEventCard stage={stage} />;
  }
  
  return null;
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
        
        <div className="p-2 rounded bg-muted mb-2">
          <div className="text-[10px] text-muted-foreground">Roll</div>
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
  
  return (
    <Card className={`border-t-4 ${getBorderColor()} flex-1 min-w-0`} data-testid={`event-card-${stage.stage}`}>
      <CardContent className="p-3 flex flex-col h-full">
        <div className="flex items-center justify-between gap-1 mb-2">
          <div className="flex items-center gap-1.5">
            <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground">Age {age}</span>
          </div>
        </div>
        
        <div className="text-xs font-medium mb-1 leading-tight" title={event.name}>
          {event.name}
        </div>
        
        {outcome.traitContributions && outcome.traitContributions.length > 0 && (
          <div className="text-[9px] text-muted-foreground mb-2 font-mono">
            {outcome.traitContributions.map((tc, i) => (
              <span key={tc.trait}>
                {i > 0 && ', '}
                <span className={tc.contribution >= 0 ? 'text-chart-2' : 'text-destructive'}>
                  {tc.trait} {tc.contribution >= 0 ? '+' : ''}{tc.contribution}
                </span>
              </span>
            ))}
          </div>
        )}
        
        <div className="flex flex-wrap gap-1 mb-2">
          <Badge className={`${rarityColors[event.rarity]} text-[10px] px-1.5 py-0`} data-testid={`event-rarity-${stage.stage}`}>
            {event.rarity}
          </Badge>
          <div className={`flex items-center gap-0.5 text-[10px] font-medium ${getStatusColor()}`} data-testid={`event-status-${stage.stage}`}>
            {getStatusIcon()}
            {getStatusText()}
          </div>
        </div>
        
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
        
        {outcome.gateFailed && event.riskGated && (
          <div className="p-2 rounded bg-muted mb-2">
            <div className="text-[10px] text-muted-foreground">Risk Gate (DC {outcome.gateDC})</div>
            <div className="font-mono text-sm">
              <span className="font-bold">{outcome.gateRoll}</span>
              <span className="text-muted-foreground">+</span>
              <span className={outcome.gateMod! >= 0 ? 'text-chart-2' : 'text-destructive'}>
                {outcome.gateMod! >= 0 ? '+' : ''}{outcome.gateMod}
              </span>
              <span className="text-muted-foreground">=</span>
              <span className="font-bold text-destructive">
                {(outcome.gateRoll || 0) + (outcome.gateMod || 0)}
              </span>
            </div>
          </div>
        )}
        
        <div className="p-2 rounded bg-muted mb-2">
          {outcome.isCritical && (
            <div className={`text-[9px] font-bold mb-1 ${outcome.criticalType === 'success' ? 'text-chart-4' : 'text-destructive'}`}>
              Critical (2x)
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
