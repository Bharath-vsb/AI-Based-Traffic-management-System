import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, AlertTriangle, Car, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TrafficLaneProps {
  laneNumber: number;
  onImageUpload: (laneNumber: number, file: File) => void;
  signalState: "green" | "yellow" | "red";
  vehicleCount: number;
  hasEmergency: boolean;
  congestionLevel: number;
  waitingTime: number;
  greenDuration: number;
}

export const TrafficLane = ({
  laneNumber,
  onImageUpload,
  signalState,
  vehicleCount,
  hasEmergency,
  congestionLevel,
  waitingTime,
  greenDuration,
}: TrafficLaneProps) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Show upload interface when vehicle count is 0
  const showUploadInterface = !preview || vehicleCount === 0;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageUpload(laneNumber, file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      onImageUpload(laneNumber, file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getSignalColor = () => {
    switch (signalState) {
      case "green":
        return "bg-signal-green";
      case "yellow":
        return "bg-signal-yellow";
      case "red":
        return "bg-signal-red";
    }
  };

  const getCongestionLabel = () => {
    if (congestionLevel < 30) return "Low";
    if (congestionLevel < 70) return "Medium";
    return "High";
  };

  return (
    <Card className={`relative p-6 space-y-4 transition-all backdrop-blur-sm ${
      hasEmergency 
        ? "glass-card border-4 border-emergency shadow-2xl shadow-emergency/50 ring-4 ring-emergency/40 animate-pulse" 
        : "glass-card glow-border hover:shadow-glow"
    }`}>
      {/* Emergency Alert Banner - Top of card */}
      {hasEmergency && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10 bg-emergency px-4 py-2 rounded-full flex items-center gap-2 animate-pulse shadow-lg border-2 border-white">
          <div className="w-3 h-3 rounded-full bg-white animate-ping absolute" />
          <AlertTriangle className="w-5 h-5 relative z-10" />
          <span className="text-sm font-black tracking-wider relative z-10">🚨 EMERGENCY ALERT 🚨</span>
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-black text-foreground">Lane {laneNumber}</h3>
          {hasEmergency && (
            <Badge variant="destructive" className="bg-emergency animate-pulse gap-1 text-xs font-black px-3 py-1">
              <AlertTriangle className="w-4 h-4" />
              PRIORITY
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className={`w-5 h-5 rounded-full ${getSignalColor()} ${signalState === "green" ? "animate-pulse shadow-lg" : ""}`} />
          <Badge 
            variant={signalState === "green" ? "default" : signalState === "yellow" ? "secondary" : "destructive"}
            className="font-black px-3 py-1"
          >
            {signalState.toUpperCase()}
          </Badge>
        </div>
      </div>

      <div
        className={`relative border-2 border-dashed rounded-lg overflow-hidden transition-all ${
          isDragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {showUploadInterface && vehicleCount === 0 ? (
          <label className="flex flex-col items-center justify-center aspect-video cursor-pointer hover:bg-muted/50 transition-colors bg-muted/30">
            <Upload className="w-8 h-8 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground">Lane cleared! Upload new traffic image</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </label>
        ) : preview ? (
          <div className="relative aspect-video">
            <img src={preview} alt={`Lane ${laneNumber}`} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
            {hasEmergency && (
              <>
                <div className="absolute inset-0 bg-emergency/20 animate-pulse pointer-events-none" />
                <div className="absolute top-2 right-2 bg-emergency px-4 py-2 rounded-lg flex items-center gap-2 animate-pulse shadow-2xl border-2 border-white">
                  <div className="w-2 h-2 rounded-full bg-white animate-ping" />
                  <AlertTriangle className="w-6 h-6" />
                  <div className="flex flex-col">
                    <span className="text-xs font-black">EMERGENCY VEHICLE</span>
                    <span className="text-xs">Clear Lane Immediately</span>
                  </div>
                </div>
              </>
            )}
            {vehicleCount === 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                <Button
                  onClick={() => document.getElementById(`lane-${laneNumber}-input`)?.click()}
                  size="lg"
                  className="gap-2"
                >
                  <Upload className="w-5 h-5" />
                  Upload New Image
                </Button>
              </div>
            )}
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center aspect-video cursor-pointer hover:bg-muted/50 transition-colors">
            <Upload className="w-8 h-8 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground">Upload traffic image</span>
            <input 
              id={`lane-${laneNumber}-input`}
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleFileChange} 
            />
          </label>
        )}
      </div>

      {preview && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2 p-2 bg-secondary rounded">
              <Car className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">Vehicles:</span>
              <span className="font-semibold text-foreground">{vehicleCount}</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-secondary rounded">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-muted-foreground">Congestion:</span>
              <span className="font-semibold text-foreground">{getCongestionLabel()}</span>
            </div>
          </div>
          
          {/* Waiting Time Display */}
          <div className="p-3 bg-muted/50 rounded-lg border border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Waiting Time</span>
              </div>
              <span className="text-2xl font-bold text-foreground">
                {waitingTime}s
              </span>
            </div>
            {waitingTime > 0 && (
              <p className="text-xs text-muted-foreground">
                Estimated time until green signal
              </p>
            )}
            {waitingTime === 0 && signalState === "green" && (
              <p className="text-xs text-signal-green font-medium">
                Currently active - vehicles moving
              </p>
            )}
          </div>

          {/* Green Signal Duration */}
          {greenDuration > 0 && (
            <div className="p-3 bg-signal-green/10 rounded-lg border border-signal-green/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-signal-green animate-pulse" />
                  <span className="text-sm font-medium text-foreground">Movement Time</span>
                </div>
                <span className="text-2xl font-bold text-signal-green">
                  {greenDuration}s
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Time allocated for vehicles to move through this lane
              </p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
