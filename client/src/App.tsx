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
          <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container max-w-7xl mx-auto px-4 py-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-chart-1/10">
                    <Brain className="h-6 w-6 text-chart-1" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold tracking-tight">
                      Intelligence Is Overrated?
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      Life Sim — D20 Career Simulator
                    </p>
                  </div>
                </div>
                <ThemeToggle />
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
