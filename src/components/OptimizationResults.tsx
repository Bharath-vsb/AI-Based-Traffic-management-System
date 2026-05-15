import { Card } from "@/components/ui/card";
import { CheckCircle2, Clock, Car, TrendingUp } from "lucide-react";

interface OptimizationResultsProps {
  totalVehiclesCleared: number;
  finalAvgWaitTime: number;
  totalThroughput: number;
  generationsCompleted: number;
  optimizationTime: number;
}

export const OptimizationResults = ({
  totalVehiclesCleared,
  finalAvgWaitTime,
  totalThroughput,
  generationsCompleted,
  optimizationTime,
}: OptimizationResultsProps) => {
  return (
    <Card className="p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30">
      <div className="flex items-center gap-3 mb-6">
        <CheckCircle2 className="w-8 h-8 text-green-500" />
        <div>
          <h3 className="text-2xl font-bold text-foreground">Optimization Complete!</h3>
          <p className="text-sm text-muted-foreground">
            All lanes have been successfully cleared
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-background/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Car className="w-4 h-4 text-blue-500" />
            <p className="text-xs text-muted-foreground">Vehicles Cleared</p>
          </div>
          <p className="text-2xl font-bold text-foreground">{totalVehiclesCleared}</p>
        </div>

        <div className="bg-background/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-purple-500" />
            <p className="text-xs text-muted-foreground">Avg Wait Time</p>
          </div>
          <p className="text-2xl font-bold text-foreground">{finalAvgWaitTime}s</p>
        </div>

        <div className="bg-background/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-orange-500" />
            <p className="text-xs text-muted-foreground">Throughput</p>
          </div>
          <p className="text-2xl font-bold text-foreground">{totalThroughput}</p>
        </div>

        <div className="bg-background/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <p className="text-xs text-muted-foreground">Generations</p>
          </div>
          <p className="text-2xl font-bold text-foreground">{generationsCompleted}</p>
        </div>
      </div>

      <div className="mt-4 text-center">
        <p className="text-sm text-muted-foreground">
          Total optimization time: <span className="font-semibold text-foreground">{optimizationTime}s</span>
        </p>
      </div>
    </Card>
  );
};
