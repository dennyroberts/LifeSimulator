import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { getMod, type Traits, type TraitName } from '@/lib/sim';

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
  const handleChange = (trait: TraitName, value: number) => {
    const clamped = Math.max(0, Math.min(20, value));
    onChange({ ...traits, [trait]: clamped });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4" data-testid="trait-input-grid">
      {TRAIT_ORDER.map((trait) => {
        const { name, description } = TRAIT_LABELS[trait];
        const value = traits[trait];
        const mod = getMod(value);
        const modStr = mod >= 0 ? `+${mod}` : `${mod}`;

        return (
          <div
            key={trait}
            className="flex flex-col gap-2 p-4 rounded-md bg-card border border-card-border"
            data-testid={`trait-card-${trait.toLowerCase()}`}
          >
            <div className="flex items-center justify-between gap-2">
              <Label className="font-semibold text-sm">{name}</Label>
              <span className="text-xs text-muted-foreground">{description}</span>
            </div>
            
            <div className="flex items-center gap-3">
              <Slider
                value={[value]}
                onValueChange={([v]) => handleChange(trait, v)}
                min={0}
                max={20}
                step={1}
                disabled={disabled}
                className="flex-1"
                data-testid={`slider-${trait.toLowerCase()}`}
              />
              <Input
                type="number"
                value={value}
                onChange={(e) => handleChange(trait, parseInt(e.target.value) || 0)}
                min={0}
                max={20}
                disabled={disabled}
                className="w-16 text-center font-mono"
                data-testid={`input-${trait.toLowerCase()}`}
              />
            </div>
            
            <div className="text-center">
              <span className="font-mono text-sm text-muted-foreground">
                Mod: <span className={mod >= 0 ? 'text-chart-2' : 'text-destructive'}>{modStr}</span>
              </span>
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
