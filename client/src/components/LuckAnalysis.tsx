import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type LuckAnalysis as LuckAnalysisType, formatEV } from '@/lib/sim';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, TrendingUp, TrendingDown, Minus, Sparkles, Dices, Calculator } from 'lucide-react';
import { useState } from 'react';

interface LuckAnalysisProps {
  luck: LuckAnalysisType;
  embedded?: boolean;
  compact?: boolean;
}

export function LuckAnalysis({ luck, embedded = false, compact = false }: LuckAnalysisProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const getLuckIcon = (value: number) => {
    if (value > 0.01) return <TrendingUp className="h-4 w-4 text-chart-2" />;
    if (value < -0.01) return <TrendingDown className="h-4 w-4 text-destructive" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };
  
  const getLuckColor = (value: number) => {
    if (value > 0.01) return 'text-chart-2';
    if (value < -0.01) return 'text-destructive';
    return 'text-muted-foreground';
  };

  // Identity check uses eventRollLuck only (education/career are separate EV ledgers)
  const identity = luck.evRealized - luck.evBaselineHand;
  const eventComponents = luck.opportunityLuck + luck.eventRollLuck + luck.traitAdvantage;
  const identityMatch = Math.abs(identity - eventComponents) < 0.001;

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-3 text-xs" data-testid="luck-analysis-compact">
        <div className="flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-chart-4" />
          <span className="text-muted-foreground">Luck:</span>
        </div>
        <div className="flex items-center gap-1">
          <Dices className="h-3 w-3 text-chart-3" />
          <span className="text-muted-foreground">Opp</span>
          <span className={`font-mono font-medium ${getLuckColor(luck.opportunityLuck)}`}>
            {formatEV(luck.opportunityLuck)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Dices className="h-3 w-3 text-chart-1" />
          <span className="text-muted-foreground">Roll</span>
          <span className={`font-mono font-medium ${getLuckColor(luck.rollLuck)}`}>
            {formatEV(luck.rollLuck)}
          </span>
        </div>
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-chart-4/10">
          <span className="text-muted-foreground">Net</span>
          <span className={`font-mono font-medium ${getLuckColor(luck.netLuck)}`}>
            {formatEV(luck.netLuck)}
          </span>
        </div>
      </div>
    );
  }

  if (embedded) {
    return (
      <div className="space-y-3" data-testid="luck-analysis">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-chart-4" />
          <span className="text-sm font-medium">Luck Analysis</span>
        </div>
        
        <div className="flex items-center justify-between p-2 rounded-md bg-muted">
          <div className="flex items-center gap-1.5">
            <Dices className="h-3 w-3 text-chart-3" />
            <span className="text-xs text-muted-foreground">Opportunity</span>
          </div>
          <div className="flex items-center gap-1">
            {getLuckIcon(luck.opportunityLuck)}
            <span className={`font-mono text-sm font-bold ${getLuckColor(luck.opportunityLuck)}`}>
              {formatEV(luck.opportunityLuck)}
            </span>
          </div>
        </div>
        
        <div className="p-2 rounded-md bg-muted space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Dices className="h-3 w-3 text-chart-1" />
              <span className="text-xs text-muted-foreground">Roll Luck</span>
            </div>
            <div className="flex items-center gap-1">
              {getLuckIcon(luck.rollLuck)}
              <span className={`font-mono text-sm font-bold ${getLuckColor(luck.rollLuck)}`}>
                {formatEV(luck.rollLuck)}
              </span>
            </div>
          </div>
          <div className="pl-4 space-y-0.5 text-[10px]">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Edu</span>
              <span className={`font-mono ${getLuckColor(luck.educationRollLuck)}`}>
                {formatEV(luck.educationRollLuck)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Career</span>
              <span className={`font-mono ${getLuckColor(luck.careerRollLuck)}`}>
                {formatEV(luck.careerRollLuck)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Events</span>
              <span className={`font-mono ${getLuckColor(luck.eventRollLuck)}`}>
                {formatEV(luck.eventRollLuck)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between p-2 rounded-md bg-chart-4/10 border border-chart-4/20">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-chart-4" />
            <span className="text-xs font-medium">Net Luck</span>
          </div>
          <div className="flex items-center gap-1">
            {getLuckIcon(luck.netLuck)}
            <span className={`font-mono text-sm font-bold ${getLuckColor(luck.netLuck)}`}>
              {formatEV(luck.netLuck)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card data-testid="luck-analysis">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-chart-4" />
          Luck Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded-md bg-muted">
          <div className="flex items-center gap-2">
            <Dices className="h-4 w-4 text-chart-3" />
            <span className="text-sm text-muted-foreground">Opportunity Luck</span>
          </div>
          <div className="flex items-center gap-1">
            {getLuckIcon(luck.opportunityLuck)}
            <span className={`font-mono text-lg font-bold ${getLuckColor(luck.opportunityLuck)}`} data-testid="luck-opportunity">
              {formatEV(luck.opportunityLuck)}
            </span>
          </div>
        </div>
        
        <div className="p-3 rounded-md bg-muted space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Dices className="h-4 w-4 text-chart-1" />
              <span className="text-sm text-muted-foreground">Roll Luck</span>
            </div>
            <div className="flex items-center gap-1">
              {getLuckIcon(luck.rollLuck)}
              <span className={`font-mono text-lg font-bold ${getLuckColor(luck.rollLuck)}`} data-testid="luck-roll">
                {formatEV(luck.rollLuck)}
              </span>
            </div>
          </div>
          <div className="pl-6 space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Education Roll</span>
              <span className={`font-mono ${getLuckColor(luck.educationRollLuck)}`}>
                {formatEV(luck.educationRollLuck)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Career Roll</span>
              <span className={`font-mono ${getLuckColor(luck.careerRollLuck)}`}>
                {formatEV(luck.careerRollLuck)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Life Events</span>
              <span className={`font-mono ${getLuckColor(luck.eventRollLuck)}`}>
                {formatEV(luck.eventRollLuck)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between p-3 rounded-md bg-chart-4/10 border border-chart-4/20">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-chart-4" />
            <span className="text-sm font-medium">Net Luck</span>
          </div>
          <div className="flex items-center gap-1">
            {getLuckIcon(luck.netLuck)}
            <span className={`font-mono text-lg font-bold ${getLuckColor(luck.netLuck)}`} data-testid="luck-net">
              {formatEV(luck.netLuck)}
            </span>
          </div>
        </div>
        
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full justify-center py-2" data-testid="ev-details-trigger">
            <Calculator className="h-4 w-4" />
            EV Breakdown Details
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <div className="p-4 rounded-md bg-muted space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">EV Baseline (Deck)</div>
                  <div className="font-mono font-semibold">{formatEV(luck.evBaselineHand)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">EV Hand (Intrinsic)</div>
                  <div className="font-mono font-semibold">{formatEV(luck.evHand)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">EV Expected (Agent)</div>
                  <div className="font-mono font-semibold">{formatEV(luck.evExpected)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">EV Realized</div>
                  <div className="font-mono font-semibold">{formatEV(luck.evRealized)}</div>
                </div>
              </div>
              
              <div className="pt-3 border-t border-border">
                <div className="text-xs text-muted-foreground mb-2">Identity Check:</div>
                <div className="font-mono text-xs">
                  EV_realized - EV_baseline = {formatEV(identity)}
                </div>
                <div className="font-mono text-xs">
                  Opp + Trait + EventRoll = {formatEV(eventComponents)}
                </div>
                <div className={`text-xs mt-1 ${identityMatch ? 'text-chart-2' : 'text-chart-4'}`}>
                  {identityMatch ? 'Events ledger verified' : `Difference: ${formatEV(identity - eventComponents)}`}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  (Education/Career roll luck tracked separately)
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
