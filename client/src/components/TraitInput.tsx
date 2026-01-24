import { Button } from '@/components/ui/button';
import { getMod, type Traits, type TraitName } from '@/lib/sim';
import { Minus, Plus } from 'lucide-react';

interface TraitInputProps {
  traits: Traits;
  onChange: (traits: Traits) => void;
  disabled?: boolean;
}

const TRAIT_LABELS: Record<TraitName, { name: string; description: string }> = {
  INT: { name: 'INT', description: 'Intelligence' },
  WORK: { name: 'WORK', description: 'Work Ethic' },
  NEPO: { name: 'NEPO', description: 'Nepotism' },
  CHAR: { name: 'CHAR', description: 'Charisma' },
  RISK: { name: 'RISK', description: 'Risk Tolerance' },
};

const TRAIT_ORDER: TraitName[] = ['INT', 'WORK', 'NEPO', 'CHAR', 'RISK'];

export function TraitInput({ traits, onChange, disabled }: TraitInputProps) {
  const handleChange = (trait: TraitName, delta: number) => {
    const newValue = Math.max(0, Math.min(20, traits[trait] + delta));
    onChange({ ...traits, [trait]: newValue });
  };

  return (
    <div className="flex flex-col gap-1" data-testid="trait-input-grid">
      {TRAIT_ORDER.map((trait) => {
        const { name, description } = TRAIT_LABELS[trait];
        const value = traits[trait];
        const mod = getMod(value);
        const modStr = mod >= 0 ? `+${mod}` : `${mod}`;

        return (
          <div
            key={trait}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/50 border"
            data-testid={`trait-card-${trait.toLowerCase()}`}
          >
            <div className="w-28 shrink-0">
              <span className="font-bold text-xs">{name}</span>
              <span className="text-[10px] text-muted-foreground ml-1">{description}</span>
            </div>
            
            <div className="flex items-center gap-1 ml-auto">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleChange(trait, -1)}
                disabled={disabled || value <= 0}
                className="h-6 w-6"
                data-testid={`button-decrement-${trait.toLowerCase()}`}
              >
                <Minus className="h-2.5 w-2.5" />
              </Button>
              
              <div className="w-8 text-center">
                <div className="font-mono font-bold text-sm" data-testid={`value-${trait.toLowerCase()}`}>
                  {value}
                </div>
              </div>
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleChange(trait, 1)}
                disabled={disabled || value >= 20}
                className="h-6 w-6"
                data-testid={`button-increment-${trait.toLowerCase()}`}
              >
                <Plus className="h-2.5 w-2.5" />
              </Button>
              
              <div className="w-10 text-center">
                <span className={`font-mono text-sm font-semibold ${mod >= 0 ? 'text-chart-2' : 'text-destructive'}`}>
                  ({modStr})
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface TraitDisplayProps {
  traits: Traits;
  compact?: boolean;
}

const getTotalColor = (total: number) => {
  if (total >= 75) return 'text-chart-4';
  if (total >= 60) return 'text-chart-2';
  if (total >= 45) return 'text-foreground';
  if (total >= 35) return 'text-orange-500';
  return 'text-destructive';
};

const getTraitValueColor = (value: number) => {
  if (value >= 16) return 'text-chart-4';
  if (value >= 13) return 'text-chart-2';
  if (value >= 8) return 'text-foreground';
  if (value >= 5) return 'text-orange-500';
  return 'text-destructive';
};

export function TraitDisplay({ traits, compact }: TraitDisplayProps) {
  const total = TRAIT_ORDER.reduce((sum, trait) => sum + traits[trait], 0);
  
  if (compact) {
    return (
      <div className="flex items-center gap-1 sm:gap-1.5 font-mono text-[10px] sm:text-xs flex-wrap" data-testid="trait-display-compact">
        {TRAIT_ORDER.map((trait, i) => {
          const value = traits[trait];
          return (
            <span key={trait} className="text-muted-foreground" data-testid={`trait-badge-${trait.toLowerCase()}`}>
              <span className="font-semibold text-foreground">{trait}</span>
              <span className="text-muted-foreground">:</span>
              <span className={getTraitValueColor(value)}>{value}</span>
              {i < TRAIT_ORDER.length - 1 && <span className="mx-0.5 text-muted-foreground/50">|</span>}
            </span>
          );
        })}
        <span className="mx-1 text-muted-foreground">=</span>
        <span className={`font-bold ${getTotalColor(total)}`} title={`Total: ${total} (avg: 55)`}>
          {total}
        </span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-5 gap-2" data-testid="trait-display">
      {TRAIT_ORDER.map((trait) => {
        const { name } = TRAIT_LABELS[trait];
        const value = traits[trait];
        const mod = getMod(value);
        const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
        return (
          <div
            key={trait}
            className="text-center p-2 rounded-md bg-muted"
            data-testid={`trait-stat-${trait.toLowerCase()}`}
          >
            <div className="text-xs text-muted-foreground">{name}</div>
            <div className="font-mono font-semibold">{value}</div>
            <div className={`text-xs font-mono ${mod >= 0 ? 'text-chart-2' : 'text-destructive'}`}>
              {modStr}
            </div>
          </div>
        );
      })}
    </div>
  );
}
