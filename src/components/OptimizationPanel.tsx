import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Activity, Zap, Clock } from "lucide-react";

interface OptimizationPanelProps {
  isOptimizing: boolean;
  generation: number;
  avgWaitTime: number;
  throughput: number;
}

export const OptimizationPanel = ({
  isOptimizing,
  generation,
  avgWaitTime,
  throughput,
}: OptimizationPanelProps) => {
  return (
    <Card className="p-8 space-y-8 glass-card glow-border shadow-glow">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black text-gradient">Optimization Metrics</h2>
        <Badge 
          variant={isOptimizing ? "default" : "secondary"} 
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold backdrop-blur-sm"
        >
          <Activity className={`w-5 h-5 ${isOptimizing ? "animate-spin" : ""}`} />
          {isOptimizing ? "Active" : "Ready"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-3 p-6 glass-card glow-border rounded-xl hover:shadow-glow transition-all">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Zap className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold">Generation</span>
          </div>
          <p className="text-4xl font-black text-primary drop-shadow-lg">{generation}</p>
        </div>

        <div className="space-y-3 p-6 glass-card glow-border rounded-xl hover:shadow-glow transition-all">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-5 h-5 text-accent" />
            <span className="text-sm font-semibold">Avg Wait Time</span>
          </div>
          <p className="text-4xl font-black text-foreground drop-shadow-lg">{avgWaitTime.toFixed(1)}s</p>
        </div>

        <div className="space-y-3 p-6 glass-card glow-border rounded-xl hover:shadow-glow transition-all">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Activity className="w-5 h-5 text-secondary" />
            <span className="text-sm font-semibold">Throughput</span>
          </div>
          <p className="text-4xl font-black text-foreground drop-shadow-lg">{throughput}</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Optimization Progress</span>
          <span className="text-foreground font-semibold">{Math.min(generation * 10, 100)}%</span>
        </div>
        <Progress value={Math.min(generation * 10, 100)} className="h-2" />
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Traffic Throughput</h3>
        <div className="flex items-end gap-1 h-20">
          {Array.from({ length: 12 }).map((_, i) => {
            const height = Math.random() * 60 + 20;
            return (
              <div
                key={i}
                className="flex-1 bg-primary/20 rounded-t transition-all hover:bg-primary/40"
                style={{ height: `${height}%` }}
              />
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Total Vehicles Processed</p>
          <p className="text-2xl font-bold text-foreground">{throughput}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground mb-1">System Efficiency</p>
          <p className="text-2xl font-bold text-primary">
            {Math.min(100, Math.round((throughput / (generation * 10)) * 100))}%
          </p>
        </div>
      </div>
    </Card>
  );
};
