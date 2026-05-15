import { useState, useEffect } from "react";
import { TrafficLane } from "@/components/TrafficLane";
import { OptimizationPanel } from "@/components/OptimizationPanel";
import { OptimizationResults } from "@/components/OptimizationResults";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Play, RotateCcw, Activity, ArrowRight, AlertTriangle } from "lucide-react";
import { analyzeTrafficImage, GeneticAlgorithm } from "@/utils/trafficAnalysis";

interface LaneData {
  image: File | null;
  vehicleCount: number;
  hasEmergency: boolean;
  congestionLevel: number;
  signalState: "green" | "yellow" | "red";
  waitingTime: number;
  greenDuration: number;
}

const Index = () => {
  const [laneCount, setLaneCount] = useState<number | null>(null);
  const [lanes, setLanes] = useState<LaneData[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [avgWaitTime, setAvgWaitTime] = useState(0);
  const [throughput, setThroughput] = useState(0);
  const [currentGreenLane, setCurrentGreenLane] = useState(0);
  const [ga] = useState(() => new GeneticAlgorithm());
  const [showResults, setShowResults] = useState(false);
  const [optimizationStartTime, setOptimizationStartTime] = useState<number>(0);
  const [totalVehiclesAtStart, setTotalVehiclesAtStart] = useState(0);

  const initializeLanes = (count: number) => {
    setLaneCount(count);
    setLanes(
      Array.from({ length: count }, () => ({
        image: null,
        vehicleCount: 0,
        hasEmergency: false,
        congestionLevel: 0,
        signalState: "red" as const,
        waitingTime: 0,
        greenDuration: 0,
      }))
    );
  };

  const handleImageUpload = async (laneNumber: number, file: File) => {
    setIsAnalyzing(true);
    toast.info(`Analyzing Lane ${laneNumber} with AI Vision...`);

    try {
      const analysis = await analyzeTrafficImage(file);
      
      setLanes(prev => {
        const updated = [...prev];
        updated[laneNumber - 1] = {
          ...updated[laneNumber - 1],
          image: file,
          ...analysis,
          signalState: "red", // Keep red until optimization starts
          waitingTime: 0,
          greenDuration: 0,
        };
        
        return updated;
      });

      toast.success(`Lane ${laneNumber} analyzed: ${analysis.vehicleCount} vehicles detected`);
      
      if (analysis.hasEmergency) {
        toast.error(`🚨 EMERGENCY VEHICLE in Lane ${laneNumber}!`, {
          description: "Ambulance detected - PRIORITY CLEARANCE will be given",
          duration: 5000,
        });
      }
    } catch (error) {
      toast.error("Failed to analyze image");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startOptimization = () => {
    const uploadedLanes = lanes.filter(lane => lane.image !== null);
    
    if (uploadedLanes.length === 0) {
      toast.error("Please upload at least one lane image");
      return;
    }

    // Calculate total vehicles at start
    const totalVehicles = lanes.reduce((sum, lane) => sum + lane.vehicleCount, 0);
    
    if (totalVehicles === 0) {
      toast.error("No vehicles detected in any lane");
      return;
    }

    // Reset metrics and results before starting
    setShowResults(false);
    setIsOptimizing(true);
    setGeneration(0);
    setAvgWaitTime(0);
    setThroughput(0);
    setCurrentGreenLane(0);
    setOptimizationStartTime(Date.now());
    setTotalVehiclesAtStart(totalVehicles);
    
    toast.success("Starting genetic algorithm optimization...", {
      description: `Optimizing traffic flow for ${totalVehicles} vehicles`,
    });
    
    // Initialize GA and begin optimization
    ga.initialize(laneCount || 4);
    runGeneticAlgorithm();
  };

  const runGeneticAlgorithm = () => {
    const congestionLevels = lanes.map(lane => lane.congestionLevel);
    const emergencyFlags = lanes.map(lane => lane.hasEmergency);
    const vehicleCounts = lanes.map(lane => lane.vehicleCount);

    let currentGen = 0;
    const maxGenerations = 100; // More generations for better optimization
    let cycleIndex = 0;

    const runCycle = () => {
      // Check if all lanes have 0 vehicles - stop optimization and show results
      const totalVehicles = lanes.reduce((sum, lane) => sum + lane.vehicleCount, 0);
      if (totalVehicles === 0) {
        const optimizationTime = Math.round((Date.now() - optimizationStartTime) / 1000);
        
        setIsOptimizing(false);
        setShowResults(true);
        
        toast.success("All lanes cleared!", {
          description: "Traffic optimization complete - no vehicles remaining",
        });
        return;
      }

      const best = ga.evolve(congestionLevels, emergencyFlags, vehicleCounts);
      currentGen++;
      
      setGeneration(currentGen);

      // Determine lane priority order (EMERGENCY ABSOLUTE FIRST, then by congestion)
      const laneOrder = lanes
        .map((lane, idx) => {
          // Calculate time needed to clear HALF the vehicles
          const halfVehicles = Math.ceil(lane.vehicleCount / 2);
          // Emergency: 2s per vehicle, Regular: 3s per vehicle
          const timePerVehicle = lane.hasEmergency ? 2 : 3;
          const halfClearanceTime = halfVehicles * timePerVehicle;
          
          return {
            idx, 
            priority: lane.hasEmergency ? 100000 : lane.congestionLevel,
            vehicleCount: lane.vehicleCount,
            halfVehicles,
            // Green time = time to clear 50% of vehicles
            greenTime: lane.hasEmergency 
              ? Math.max(15, halfClearanceTime) // Min 15s for emergency
              : Math.max(10, halfClearanceTime), // Min 10s for regular
            isEmergency: lane.hasEmergency
          };
        })
        .filter(lane => lane.vehicleCount > 0) // Only process lanes with vehicles
        .sort((a, b) => {
          // CRITICAL: Emergency lanes ALWAYS go first, regardless of any other factor
          if (a.isEmergency && !b.isEmergency) return -1;
          if (!a.isEmergency && b.isEmergency) return 1;
          // Then sort by priority (congestion)
          return b.priority - a.priority;
        });

      const currentLaneIdx = laneOrder[cycleIndex % laneOrder.length].idx;
      const nextLaneIdx = laneOrder[(cycleIndex + 1) % laneOrder.length].idx;
      const currentGreenTime = laneOrder[cycleIndex % laneOrder.length].greenTime;

      // Calculate waiting times based on sum of green durations before each lane
      const newWaitTimes = lanes.map((_, idx) => {
        if (idx === currentLaneIdx) return 0;
        
        const lanePosition = laneOrder.findIndex(item => item.idx === idx);
        const currentPosition = cycleIndex % laneOrder.length;
        
        let waitTime = 0;
        let pos = currentPosition;
        
        // Sum up green times of all lanes that will go before this one
        while (pos !== lanePosition) {
          waitTime += laneOrder[pos % laneOrder.length].greenTime;
          pos = (pos + 1) % laneOrder.length;
        }
        
        return waitTime;
      });

      // Set initial green durations and waiting times
      setLanes(prev => prev.map((lane, idx) => ({
        ...lane,
        waitingTime: newWaitTimes[idx],
        greenDuration: laneOrder.find(item => item.idx === idx)?.greenTime || 0,
      })));

      setCurrentGreenLane(currentLaneIdx + 1);

      const totalWait = newWaitTimes.reduce((sum, time) => sum + time, 0);
      setAvgWaitTime(Math.round(totalWait / lanes.length));
      
      // Throughput calculation based on half-clearance strategy
      const clearingRate = lanes[currentLaneIdx].hasEmergency ? 2.0 : 3.0;
      const halfVehicles = Math.ceil(lanes[currentLaneIdx].vehicleCount / 2);
      setThroughput(prev => prev + halfVehicles);

      // Countdown mechanism - automatically switch after clearing half the vehicles
      let remainingTime = currentGreenTime;
      const initialVehicleCount = lanes[currentLaneIdx].vehicleCount;
      const initialCongestion = lanes[currentLaneIdx].congestionLevel;
      const targetVehiclesToClear = Math.ceil(initialVehicleCount / 2); // Clear 50%
      
      const countdownInterval = setInterval(() => {
        remainingTime--;
        
        // Update ONLY the current green lane's duration, vehicle count, and congestion
        setLanes(prev => prev.map((lane, idx) => {
          if (idx === currentLaneIdx && lane.signalState === "green") {
            // Vehicle movement: Emergency 2s per vehicle, Regular 3s per vehicle
            const elapsedTime = currentGreenTime - remainingTime;
            const clearingRate = lane.hasEmergency ? 2.0 : 3.0;
            const vehiclesMoved = Math.floor(elapsedTime / clearingRate);
            const vehiclesRemaining = Math.max(0, initialVehicleCount - vehiclesMoved);
            
            // AUTO-SWITCH: If we've cleared 50% of vehicles, end the green phase early
            if (vehiclesMoved >= targetVehiclesToClear && remainingTime > 2) {
              remainingTime = 2; // Give 2 seconds before switching
            }
            
            // Accurate congestion calculation based on remaining vehicles
            let newCongestion = 0;
            if (initialVehicleCount > 0 && vehiclesRemaining > 0) {
              const remainingRatio = vehiclesRemaining / initialVehicleCount;
              newCongestion = Math.round(remainingRatio * initialCongestion);
            }
            
            // Show toast when lane is cleared
            if (vehiclesRemaining === 0 && initialVehicleCount > 0) {
              toast.success(`Lane ${currentLaneIdx + 1} cleared!`, {
                description: "You can upload a new image for this lane",
              });
            }
            
            return { 
              ...lane, 
              greenDuration: remainingTime,
              vehicleCount: vehiclesRemaining,
              congestionLevel: newCongestion
            };
          } else if (lane.waitingTime > 0) {
            // Other lanes only reduce waiting time, no vehicle movement
            return { ...lane, waitingTime: lane.waitingTime - 1 };
          }
          return lane;
        }));

        setAvgWaitTime(prev => Math.max(0, prev - 1));
        
        // When countdown reaches 0, change signal lights
        if (remainingTime <= 0) {
          clearInterval(countdownInterval);
          
          // Update signal states: one green, one yellow (next priority), rest red
          const newSignals = lanes.map((_, idx) => {
            if (idx === laneOrder[(cycleIndex + 1) % laneOrder.length].idx) return "green";
            if (idx === laneOrder[(cycleIndex + 2) % laneOrder.length].idx) return "yellow";
            return "red";
          });

          setLanes(prev => prev.map((lane, idx) => ({
            ...lane,
            signalState: newSignals[idx] as "green" | "yellow" | "red",
          })));
        }
      }, 1000);

      // Update initial signal states for current cycle
      const initialSignals = lanes.map((_, idx) => {
        if (idx === currentLaneIdx) return "green";
        if (idx === nextLaneIdx) return "yellow";
        return "red";
      });

      setLanes(prev => prev.map((lane, idx) => ({
        ...lane,
        signalState: initialSignals[idx] as "green" | "yellow" | "red",
      })));

      cycleIndex++;

      if (currentGen >= maxGenerations) {
        setTimeout(() => {
          setIsOptimizing(false);
          toast.success("Optimization complete!", {
            description: `Average wait time optimized`,
          });
        }, currentGreenTime * 1000);
      } else {
        // Next cycle runs after current lane's green duration completes
        setTimeout(runCycle, currentGreenTime * 1000);
      }
    };

    runCycle();
  };

  const reset = () => {
    setLaneCount(null);
    setLanes([]);
    setGeneration(0);
    setAvgWaitTime(0);
    setThroughput(0);
    setCurrentGreenLane(0);
    setIsOptimizing(false);
    setShowResults(false);
    setOptimizationStartTime(0);
    setTotalVehiclesAtStart(0);
    toast.info("System reset");
  };

  return (
    <div className="min-h-screen p-6 animate-fade-in">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 animate-fade-in-up py-8">
          <div className="inline-block mb-4">
            <Badge className="bg-primary/20 text-primary border-primary/30 px-4 py-2 text-sm font-semibold backdrop-blur-sm">
              ✨ AI-Powered Traffic Optimization
            </Badge>
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-gradient mb-4 tracking-tight leading-tight">
            Smart Traffic Control
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
            Advanced vehicle detection with genetic algorithm optimization for intelligent traffic management
          </p>
        </div>
          {laneCount !== null && (
            <div className="flex justify-center gap-4 mt-6 animate-scale-in">
              <Button
                onClick={startOptimization}
                disabled={isOptimizing || isAnalyzing || lanes.every(lane => lane.image === null)}
                size="lg"
                className="gradient-primary shadow-glow hover:scale-105 transition-all duration-300 font-bold px-10 py-6 text-base"
              >
                <Play className="w-6 h-6 mr-2" />
                {isOptimizing ? "Optimizing Traffic Flow..." : "Start Traffic Optimization"}
              </Button>
              <Button 
                onClick={reset} 
                variant="outline" 
                size="lg" 
                className="backdrop-blur-sm hover:scale-105 transition-all duration-300 font-bold px-10 py-6 text-base"
              >
                <RotateCcw className="w-6 h-6 mr-2" />
                Reset
              </Button>
            </div>
          )}

        {/* Lane Selection */}
        {laneCount === null ? (
          <Card className="glass-card shadow-card p-16 animate-scale-in glow-border">
            <div className="text-center space-y-10">
              <div>
                <h2 className="text-4xl font-black mb-4 text-gradient">Configure Your System</h2>
                <p className="text-muted-foreground text-xl font-medium">Select the number of traffic lanes to monitor</p>
              </div>
              <div className="flex justify-center gap-8">
                {[2, 3, 4].map((count) => (
                  <Button
                    key={count}
                    onClick={() => initializeLanes(count)}
                    size="lg"
                    variant="outline"
                    className="h-40 w-40 text-5xl font-black hover:scale-110 hover:shadow-glow transition-all duration-300 glass-card glow-border"
                  >
                    {count}
                  </Button>
                ))}
              </div>
            </div>
          </Card>
        ) : (
          <>
            {/* Emergency Alert Banner */}
            {lanes.some(lane => lane.hasEmergency && lane.vehicleCount > 0) && (
              <Card className="p-10 bg-gradient-to-r from-emergency via-emergency to-emergency/80 border-4 border-white shadow-glow animate-pulse-glow backdrop-blur-sm">
                <div className="flex items-center justify-center gap-8">
                  <div className="w-6 h-6 rounded-full bg-white animate-ping" />
                  <AlertTriangle className="w-12 h-12 text-white drop-shadow-lg" />
                  <div className="flex flex-col">
                    <span className="text-3xl font-black text-white tracking-wider drop-shadow-lg">
                      🚨 EMERGENCY VEHICLE DETECTED 🚨
                    </span>
                    <span className="text-lg text-white/95 font-semibold">
                      Priority lane clearance in progress - All other lanes on hold
                    </span>
                  </div>
                  <AlertTriangle className="w-12 h-12 text-white drop-shadow-lg" />
                  <div className="w-6 h-6 rounded-full bg-white animate-ping" />
                </div>
              </Card>
            )}

            {/* Current Status */}
            {isOptimizing && (
              <Card className="p-8 glass-card shadow-glow glow-border animate-fade-in">
                <div className="flex items-center justify-center gap-4">
                  <Activity className="w-7 h-7 animate-spin text-primary drop-shadow-lg" />
                  <span className="font-bold text-xl">
                    Currently Active: Lane {currentGreenLane} <span className="text-signal-green font-black">(GREEN)</span>
                    {lanes[currentGreenLane - 1]?.hasEmergency && (
                      <span className="text-emergency ml-2 font-black animate-pulse">⚡ EMERGENCY PRIORITY</span>
                    )}
                  </span>
                </div>
              </Card>
            )}

            {/* Traffic Lanes Grid */}
            <div className={`grid gap-6 ${laneCount === 2 ? 'grid-cols-1 md:grid-cols-2' : laneCount === 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
              {lanes.map((lane, index) => (
                <TrafficLane
                  key={index}
                  laneNumber={index + 1}
                  onImageUpload={handleImageUpload}
                  signalState={lane.signalState}
                  vehicleCount={lane.vehicleCount}
                  hasEmergency={lane.hasEmergency}
                  congestionLevel={lane.congestionLevel}
                  waitingTime={lane.waitingTime}
                  greenDuration={lane.greenDuration}
                />
              ))}
            </div>

            {/* Optimization Panel */}
            {!showResults ? (
              <OptimizationPanel
                isOptimizing={isOptimizing}
                generation={generation}
                avgWaitTime={avgWaitTime}
                throughput={throughput}
              />
            ) : (
              <OptimizationResults
                totalVehiclesCleared={totalVehiclesAtStart}
                finalAvgWaitTime={avgWaitTime}
                totalThroughput={throughput}
                generationsCompleted={generation}
                optimizationTime={Math.round((Date.now() - optimizationStartTime) / 1000)}
              />
            )}
          </>
        )}

        {/* Footer Info */}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-4">
          <Activity className="w-4 h-4" />
          <span>Real-time AI-powered traffic optimization using YOLO and Genetic Algorithms</span>
        </div>
      </div>
    </div>
  );
};

export default Index;
