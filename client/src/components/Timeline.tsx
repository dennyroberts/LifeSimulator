import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  type StageResult, 
  formatCurrency, 
  formatPercent,
  formatEV 
} from '@/lib/sim';
import { GraduationCap, Briefcase, Check, X, AlertTriangle } from 'lucide-react';

interface TimelineProps {
  stages: StageResult[];
}

export function Timeline({ stages }: TimelineProps) {
  return (
    <div className="flex flex-col gap-4" data-testid="timeline">
      {stages.map((stage) => (
        <TimelineCard key={stage.stage} stage={stage} />
      ))}
    </div>
  );
}

function TimelineCard({ stage }: { stage: StageResult }) {
  if (stage.isEducation && stage.education) {
    return <EducationCard stage={stage} />;
  }
  
  if (stage.eventOutcome) {
    return <EventCard stage={stage} />;
  }
  
  return null;
}

function EducationCard({ stage }: { stage: StageResult }) {
  const edu = stage.education!;
  
  return (
    <Card className="border-l-4 border-l-chart-1" data-testid="education-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-md bg-chart-1/10">
              <GraduationCap className="h-5 w-5 text-chart-1" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Stage 1</div>
              <CardTitle className="text-lg">Where You Land After High School</CardTitle>
            </div>
          </div>
          <Badge variant="secondary" className="font-mono" data-testid="education-result">
            {edu.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 rounded-md bg-muted">
            <div className="text-xs text-muted-foreground mb-1">Roll</div>
            <div className="font-mono text-lg">
              <span className="text-xl font-bold">{edu.roll}</span>
              <span className="text-muted-foreground"> + </span>
              <span className={edu.totalMod >= 0 ? 'text-chart-2' : 'text-destructive'}>
                {edu.totalMod >= 0 ? '+' : ''}{edu.totalMod}
              </span>
              <span className="text-muted-foreground"> = </span>
              <span className="font-bold">{edu.total}</span>
            </div>
          </div>
          
          <div className="p-3 rounded-md bg-muted">
            <div className="text-xs text-muted-foreground mb-1">Growth Bonus</div>
            <div className={`font-mono text-lg font-semibold ${edu.growthDelta > 0 ? 'text-chart-2' : 'text-muted-foreground'}`}>
              {formatPercent(edu.growthDelta)}
            </div>
          </div>
          
          <div className="p-3 rounded-md bg-chart-1/10 border border-chart-1/20">
            <div className="text-xs text-muted-foreground mb-1">Income After Stage</div>
            <div className="font-mono text-lg font-bold text-chart-1" data-testid="education-income">
              {formatCurrency(stage.incomeAfter)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EventCard({ stage }: { stage: StageResult }) {
  const outcome = stage.eventOutcome!;
  const event = outcome.event;
  
  const rarityColors: Record<string, string> = {
    common: 'bg-muted text-muted-foreground',
    uncommon: 'bg-chart-2/20 text-chart-2',
    rare: 'bg-chart-3/20 text-chart-3',
    jackpot: 'bg-chart-4/20 text-chart-4',
    sinkhole: 'bg-destructive/20 text-destructive',
  };
  
  const getBorderColor = () => {
    if (outcome.gateFailed) return 'border-l-muted-foreground';
    if (outcome.success) return 'border-l-chart-2';
    return 'border-l-destructive';
  };
  
  return (
    <Card className={`border-l-4 ${getBorderColor()}`} data-testid={`event-card-${stage.stage}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-md bg-muted">
              <Briefcase className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Stage {stage.stage}</div>
              <CardTitle className="text-lg">{event.name}</CardTitle>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={rarityColors[event.rarity]} data-testid={`event-rarity-${stage.stage}`}>
              {event.rarity}
            </Badge>
            {outcome.gateFailed ? (
              <Badge variant="outline" className="gap-1" data-testid={`event-status-${stage.stage}`}>
                <AlertTriangle className="h-3 w-3" />
                Gate Failed
              </Badge>
            ) : outcome.success ? (
              <Badge className="bg-chart-2/20 text-chart-2 gap-1" data-testid={`event-status-${stage.stage}`}>
                <Check className="h-3 w-3" />
                Success
              </Badge>
            ) : (
              <Badge className="bg-destructive/20 text-destructive gap-1" data-testid={`event-status-${stage.stage}`}>
                <X className="h-3 w-3" />
                Failed
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {event.riskGated && (
            <div className="p-3 rounded-md bg-muted">
              <div className="text-xs text-muted-foreground mb-1">Risk Gate (DC {outcome.gateDC})</div>
              <div className="font-mono">
                <span className="text-lg font-bold">{outcome.gateRoll}</span>
                <span className="text-muted-foreground"> + </span>
                <span className={outcome.gateMod! >= 0 ? 'text-chart-2' : 'text-destructive'}>
                  {outcome.gateMod! >= 0 ? '+' : ''}{outcome.gateMod}
                </span>
                <span className="text-muted-foreground"> = </span>
                <span className={`font-bold ${outcome.gatePass ? 'text-chart-2' : 'text-destructive'}`}>
                  {(outcome.gateRoll || 0) + (outcome.gateMod || 0)}
                </span>
              </div>
            </div>
          )}
          
          {event.rollRequired && !outcome.gateFailed && (
            <div className="p-3 rounded-md bg-muted">
              <div className="text-xs text-muted-foreground mb-1">Main Check (DC {outcome.mainDC})</div>
              <div className="font-mono">
                <span className="text-lg font-bold">{outcome.mainRoll}</span>
                <span className="text-muted-foreground"> + </span>
                <span className={outcome.mainMod! >= 0 ? 'text-chart-2' : 'text-destructive'}>
                  {outcome.mainMod! >= 0 ? '+' : ''}{outcome.mainMod}
                </span>
                <span className="text-muted-foreground"> = </span>
                <span className={`font-bold ${outcome.success ? 'text-chart-2' : 'text-destructive'}`}>
                  {(outcome.mainRoll || 0) + (outcome.mainMod || 0)}
                </span>
              </div>
            </div>
          )}
          
          <div className="p-3 rounded-md bg-muted">
            <div className="text-xs text-muted-foreground mb-1">Effects Applied</div>
            <div className="flex flex-col gap-1 font-mono text-sm">
              <div>
                <span className="text-muted-foreground">Jump: </span>
                <span className={outcome.jumpPct !== 0 ? (outcome.jumpPct > 0 ? 'text-chart-2' : 'text-destructive') : ''}>
                  {formatPercent(outcome.jumpPct)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Growth: </span>
                <span className={outcome.growthDelta !== 0 ? (outcome.growthDelta > 0 ? 'text-chart-2' : 'text-destructive') : ''}>
                  {formatPercent(outcome.growthDelta)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="p-3 rounded-md bg-chart-1/10 border border-chart-1/20">
            <div className="text-xs text-muted-foreground mb-1">Income After Stage</div>
            <div className="font-mono text-lg font-bold text-chart-1" data-testid={`event-income-${stage.stage}`}>
              {formatCurrency(stage.incomeAfter)}
            </div>
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
