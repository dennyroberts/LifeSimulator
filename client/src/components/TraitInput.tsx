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
  SOC: { name: 'SOC', description: 'Social Capital' },
  CHAR: { name: 'CHAR', description: 'Charisma' },
  RISK: { name: 'RISK', description: 'Risk Tolerance' },
};

const TRAIT_ORDER: TraitName[] = ['INT', 'WORK', 'SOC', 'CHAR', 'RISK'];

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
            <div className="flex-1 min-w-0">
              <span className="font-bold text-xs">{name}</span>
              <span className="text-[10px] text-muted-foreground ml-1 truncate">{description}</span>
            </div>
            
            <div className="flex items-center gap-1">
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

export function TraitDisplay({ traits, compact }: TraitDisplayProps) {
  if (compact) {
    return (
      <div className="flex gap-1 flex-wrap" data-testid="trait-display-compact">
        {TRAIT_ORDER.map((trait) => {
          const value = traits[trait];
          const mod = getMod(value);
          const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
          return (
            <span
              key={trait}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-mono bg-muted"
              data-testid={`trait-badge-${trait.toLowerCase()}`}
            >
              <span className="font-semibold">{trait}</span>
              <span>{value}</span>
              <span className={`text-[10px] ${mod >= 0 ? 'text-chart-2' : 'text-destructive'}`}>
                ({modStr})
              </span>
            </span>
          );
        })}
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
