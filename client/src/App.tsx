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
              <div className="mt-3 pt-3 border-t text-sm text-muted-foreground leading-relaxed max-w-3xl">
                <p>
                  <strong className="text-foreground">Welcome to life simulator!</strong> This app allows you to simulate life trajectories using D&D-style d20 mechanics. Each life consists of 8 big events, some good, some bad. Each agent has five traits: intelligence, work ethic, charisma, risk tolerance, and social capital (aka family money / influence). These traits influence their success or failure in each event. 

                  Most events roll against multiple traits (for example, getting into an elite university requires intelligence, work ethic, and social capital). At the end, you see how much money the agent has accumulated (a proxy for life success), as well as how "lucky" they were (both in terms of dice rolls and in terms of which events they experienced).
                </p>
                <p className="mt-1.5">
                  <strong className="text-foreground">How to use:</strong> In <em>Single Life</em>, configure an agent's traits and run their simulation to see each life event unfold.  
                  In <em>Mass Simulation</em>, run thousands of random agents to see statistical patterns. 
                  You can also run simulations using the same seed (which means every agent will have the same life events) to compare different trait configurations.
                  Share results via URL — seeds make simulations reproducible.
                </p>
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

              <TabsContent value="single" className="mt-0">
                <SingleLife />
              </TabsContent>

              <TabsContent value="mass" className="mt-0">
                <MassSim />
              </TabsContent>
            </Tabs>
          </main>

          <footer className="border-t mt-12">
            <div className="container max-w-7xl mx-auto px-4 py-6">
              <p className="text-center text-sm text-muted-foreground">
                A simulation exploring how traits and luck influence life outcomes.
                Built with D&D-style d20 mechanics.
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
