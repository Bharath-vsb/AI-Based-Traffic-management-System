import { useState, useRef, useEffect } from "react";
import { LiveTrafficLane, LiveTrafficLaneRef } from "@/components/LiveTrafficLane";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Play, Square, Activity, Video } from "lucide-react";
import { analyzeTrafficPixels } from "@/utils/trafficAnalysis";

interface LaneData {
  vehicleCount: number;
  hasEmergency: boolean;
  congestionLevel: number;
  signalState: "green" | "yellow" | "red";
  waitingTime: number;
  greenDuration: number;
}

export default function LiveVideo() {
  const [laneCount, setLaneCount] = useState<number | null>(null);
  const [lanes, setLanes] = useState<LaneData[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [activeLaneIndex, setActiveLaneIndex] = useState(0);
  
  const laneRefs = useRef<(LiveTrafficLaneRef | null)[]>([]);
  const isRunningRef = useRef(false);

  // Sync state ref for loops
  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  const initializeLanes = (count: number) => {
    setLaneCount(count);
    laneRefs.current = new Array(count).fill(null);
    setLanes(
      Array.from({ length: count }, () => ({
        vehicleCount: 0,
        hasEmergency: false,
        congestionLevel: 0,
        signalState: "red" as const,
        waitingTime: 0,
        greenDuration: 0,
      }))
    );
  };

  const startLiveOptimization = async () => {
    if (!laneCount) return;
    
    setIsRunning(true);
    isRunningRef.current = true; // Sync ref immediately to prevent initial freeze
    setActiveLaneIndex(0);
    toast.success("Started continuous live video optimization");

    // Start the continuous loop
    runOptimizationLoop(0);
  };

  const stopLiveOptimization = () => {
    setIsRunning(false);
    toast.info("Stopped live optimization");
    
    // Reset signals
    setLanes(prev => prev.map(lane => ({
      ...lane,
      signalState: "red",
      waitingTime: 0,
      greenDuration: 0
    })));
  };

  const runOptimizationLoop = async (currentLaneIdx: number) => {
    if (!isRunningRef.current) return;

    setActiveLaneIndex(currentLaneIdx);
    const laneRef = laneRefs.current[currentLaneIdx];
    
    let vehicleCount = 0;
    let hasEmergency = false;
    let congestionLevel = 0;

    // 1. Capture and analyze frame
    if (laneRef) {
      const imageData = laneRef.captureFrame();
      if (imageData) {
        const result = analyzeTrafficPixels(imageData.data, imageData.width, imageData.height);
        vehicleCount = result.vehicleCount;
        hasEmergency = result.hasEmergency;
        congestionLevel = result.congestionLevel;
      } else {
        console.warn(`Failed to capture frame from Lane ${currentLaneIdx + 1}`);
      }
    }

    // 2. Calculate dynamic green time based purely on real-time data
    const SECONDS_PER_VEHICLE = hasEmergency ? 2 : 3;
    const baseGreenTime = vehicleCount * SECONDS_PER_VEHICLE;
    
    // Limits
    let greenTime = Math.max(10, Math.min(90, baseGreenTime));
    if (hasEmergency) {
      greenTime = Math.max(25, greenTime); // Ensure minimum time for emergency
      toast.error(`🚨 EMERGENCY VEHICLE DETECTED in Lane ${currentLaneIdx + 1}! Priority clearance active.`);
    }

    // Skip empty lanes to optimize flow
    if (vehicleCount === 0 && !hasEmergency) {
      setLanes(prev => prev.map((lane, idx) => ({
        ...lane,
        vehicleCount: idx === currentLaneIdx ? vehicleCount : lane.vehicleCount,
        hasEmergency: idx === currentLaneIdx ? hasEmergency : lane.hasEmergency,
        congestionLevel: idx === currentLaneIdx ? congestionLevel : lane.congestionLevel,
        signalState: "red", // Keep red to indicate it's skipped
        greenDuration: 0,
        waitingTime: idx === currentLaneIdx ? 0 : lane.waitingTime
      })));

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          if (!isRunningRef.current) { resolve(); return; }
          const nextLaneIdx = (currentLaneIdx + 1) % (laneCount || 1);
          runOptimizationLoop(nextLaneIdx).then(resolve);
        }, 1500); // Wait 1.5s so UI can display 0 vehicles before moving
      });
    }

    // Update state
    setLanes(prev => prev.map((lane, idx) => ({
      ...lane,
      vehicleCount: idx === currentLaneIdx ? vehicleCount : lane.vehicleCount,
      hasEmergency: idx === currentLaneIdx ? hasEmergency : lane.hasEmergency,
      congestionLevel: idx === currentLaneIdx ? congestionLevel : lane.congestionLevel,
      signalState: idx === currentLaneIdx ? "green" : "red",
      greenDuration: idx === currentLaneIdx ? greenTime : 0,
      waitingTime: idx === currentLaneIdx ? 0 : lane.waitingTime // We update waiting time dynamically below
    })));

    // 3. Countdown green time
    let remaining = greenTime;
    
    return new Promise<void>((resolve) => {
      const timer = setInterval(() => {
        if (!isRunningRef.current) {
          clearInterval(timer);
          resolve();
          return;
        }

        remaining--;

        setLanes(prev => prev.map((lane, idx) => {
          if (idx === currentLaneIdx) {
            return { ...lane, greenDuration: remaining };
          }
          return lane;
        }));

        if (remaining <= 0) {
          clearInterval(timer);
          // Switch to yellow briefly before moving to next lane
          setLanes(prev => prev.map((lane, idx) => ({
            ...lane,
            signalState: idx === currentLaneIdx ? "yellow" : lane.signalState
          })));
          
          setTimeout(() => {
            if (!isRunningRef.current) { resolve(); return; }
            
            // Move to next lane
            const nextLaneIdx = (currentLaneIdx + 1) % (laneCount || 1);
            runOptimizationLoop(nextLaneIdx).then(resolve);
          }, 2000); // 2 second yellow light
        }
      }, 1000);
    });
  };

  return (
    <div className="min-h-screen p-6 animate-fade-in">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center space-y-4 animate-fade-in-up py-8">
          <div className="inline-block mb-4">
            <Badge className="bg-primary/20 text-primary border-primary/30 px-4 py-2 text-sm font-semibold backdrop-blur-sm">
              🎥 Real-Time Camera Feed
            </Badge>
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-gradient mb-4 tracking-tight leading-tight flex items-center justify-center gap-4">
            Live Video Optimization
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
            Continuously capture and analyze video frames from external cameras to dynamically adjust traffic lights in real-time.
          </p>
        </div>

        {laneCount !== null && (
          <div className="flex justify-center gap-4 mt-6 animate-scale-in">
            {!isRunning ? (
              <Button
                onClick={startLiveOptimization}
                size="lg"
                className="gradient-primary shadow-glow hover:scale-105 transition-all duration-300 font-bold px-10 py-6 text-base"
              >
                <Play className="w-6 h-6 mr-2" />
                Start Live Optimization
              </Button>
            ) : (
              <Button
                onClick={stopLiveOptimization}
                variant="destructive"
                size="lg"
                className="shadow-glow hover:scale-105 transition-all duration-300 font-bold px-10 py-6 text-base"
              >
                <Square className="w-6 h-6 mr-2" />
                Stop System
              </Button>
            )}
          </div>
        )}

        {laneCount === null ? (
          <Card className="glass-card shadow-card p-16 animate-scale-in glow-border">
            <div className="text-center space-y-10">
              <div>
                <h2 className="text-4xl font-black mb-4 text-gradient">Configure Camera System</h2>
                <p className="text-muted-foreground text-xl font-medium">Select the number of live camera feeds to monitor</p>
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
            {isRunning && (
              <Card className="p-8 glass-card shadow-glow glow-border animate-fade-in">
                <div className="flex items-center justify-center gap-4">
                  <Video className="w-7 h-7 text-primary animate-pulse drop-shadow-lg" />
                  <span className="font-bold text-xl">
                    Live Analysis Active: Lane {activeLaneIndex + 1} 
                    {lanes[activeLaneIndex] && (
                      <span className={`ml-2 font-black ${
                        lanes[activeLaneIndex].signalState === 'green' ? 'text-signal-green' : 
                        lanes[activeLaneIndex].signalState === 'yellow' ? 'text-signal-yellow' : 'text-signal-red'
                      }`}>
                        ({lanes[activeLaneIndex].signalState.toUpperCase()})
                      </span>
                    )}
                  </span>
                </div>
              </Card>
            )}

            <div className={`grid gap-6 ${laneCount === 2 ? 'grid-cols-1 md:grid-cols-2' : laneCount === 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
              {lanes.map((lane, index) => (
                <LiveTrafficLane
                  key={index}
                  ref={(el) => laneRefs.current[index] = el}
                  laneNumber={index + 1}
                  signalState={lane.signalState}
                  vehicleCount={lane.vehicleCount}
                  hasEmergency={lane.hasEmergency}
                  congestionLevel={lane.congestionLevel}
                  waitingTime={lane.waitingTime}
                  greenDuration={lane.greenDuration}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
