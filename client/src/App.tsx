import { useState } from 'react';
import { queryClient } from './lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SingleLife } from '@/components/SingleLife';
import { MassSim } from '@/components/MassSim';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Dices, Users, Brain } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('single');

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-background">
          {/* Mobile disclaimer */}
          <div className="sm:hidden bg-fuchsia-500 border-b border-fuchsia-600 px-4 py-2.5 text-center text-sm text-white font-medium">
            <span className="font-bold">Mobile users:</span> There's a lot of info here! For the best experience, check this site out on desktop.
          </div>
          <header className="border-b bg-background">
            <div className="container max-w-7xl mx-auto px-4 py-3">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-chart-1/10">
                    <Brain className="h-6 w-6 text-chart-1" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold tracking-tight">LIFE SIMULATOR</h1>
                    <p className="text-sm text-muted-foreground">
                      A D20-based life trajectory simulator
                    </p>
                  </div>
                </div>
                <ThemeToggle />
              </div>
              <div className="mt-3 pt-3 border-t text-sm leading-relaxed">
                <p className="text-foreground font-medium mb-1">
                  Welcome to Life Simulator!
                </p>
                <p className="text-muted-foreground text-sm mb-2">
                  Read the full writeup with analysis on{' '}
                  <a
                    href="https://dennyroberts.substack.com/p/i-simulated-millions-of-lives-to"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground hover:underline"
                  >
                    Substack
                  </a>
                </p>
                <p className="text-muted-foreground mb-3">Simulate life trajectories using D&D-style d20 mechanics. Each life consists of 8 major events — some good, some bad. Sims have five traits that influence outcomes:</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-3">
                  <span><strong className="text-foreground">INT</strong> Intelligence</span>
                  <span><strong className="text-foreground">WORK</strong> Work Ethic</span>
                  <span><strong className="text-foreground">CHAR</strong> Charisma</span>
                  <span><strong className="text-foreground">NEPO</strong> Nepotism (family wealth/influence)</span>
                  <span><strong className="text-foreground">RISK</strong> Risk Tolerance</span>
                </div>
                <p className="text-muted-foreground text-xs mb-3">
                  <strong className="text-foreground">Note on RISK:</strong> Some life events are risk-gated — a risk-averse agent won't take the big swings that could yield huge rewards or fail spectacularly.
                </p>
                <p className="text-muted-foreground mb-3">
                  Most events roll against multiple traits (e.g., elite university admission checks INT + WORK + NEPO). 
                  Track accumulated wealth as a proxy for success, plus analyze luck — both from dice rolls and from which events occurred.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-2 rounded bg-muted/50">
                    <strong className="text-foreground">Single Life:</strong>
                    <span className="text-muted-foreground ml-1">Configure traits, run simulation, watch events unfold.</span>
                  </div>
                  <div className="p-2 rounded bg-muted/50">
                    <strong className="text-foreground">Mass Simulation:</strong>
                    <span className="text-muted-foreground ml-1">Run thousands of agents to see statistical patterns.</span>
                  </div>
                  <div className="p-2 rounded bg-muted/50">
                    <strong className="text-foreground">World Mode:</strong>
                    <span className="text-muted-foreground ml-1">Test meritocracy vs. nepotism theories.</span>
                  </div>
                  <div className="p-2 rounded bg-muted/50">
                    <strong className="text-foreground">Same Deck:</strong>
                    <span className="text-muted-foreground ml-1">Give all agents identical events to compare traits.</span>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="container max-w-7xl mx-auto px-4 py-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex justify-center mb-6">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger
                    value="single"
                    className="gap-2"
                    data-testid="tab-single-life"
                  >
                    <Dices className="h-4 w-4" />
                    Single Life
                  </TabsTrigger>
                  <TabsTrigger
                    value="mass"
                    className="gap-2"
                    data-testid="tab-mass-sim"
                  >
                    <Users className="h-4 w-4" />
                    Mass Simulation
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className={activeTab === 'single' ? '' : 'hidden'}>
                <SingleLife />
              </div>

              <div className={activeTab === 'mass' ? '' : 'hidden'}>
                <MassSim />
              </div>
            </Tabs>
          </main>

          <footer className="border-t mt-12">
            <div className="container max-w-7xl mx-auto px-4 py-6">
              <p className="text-center text-sm text-muted-foreground">
                A hobby project to explore life trajectories, by{' '}
                <a 
                  href="https://dennisroberts.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-foreground hover:underline"
                >
                  Dennis Roberts
                </a>
              </p>
            </div>
          </footer>
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
