import { forwardRef, useImperativeHandle, useRef, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Car, Clock, Video, VideoOff, Camera } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface LiveTrafficLaneRef {
  captureFrame: () => ImageData | null;
}

interface LiveTrafficLaneProps {
  laneNumber: number;
  signalState: "green" | "yellow" | "red";
  vehicleCount: number;
  hasEmergency: boolean;
  congestionLevel: number;
  waitingTime: number;
  greenDuration: number;
}

export const LiveTrafficLane = forwardRef<LiveTrafficLaneRef, LiveTrafficLaneProps>(
  ({ laneNumber, signalState, vehicleCount, hasEmergency, congestionLevel, waitingTime, greenDuration }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hasVideo, setHasVideo] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");

    // Fetch available camera devices on mount
    useEffect(() => {
      const getDevices = async () => {
        try {
          const allDevices = await navigator.mediaDevices.enumerateDevices();
          const videoInputDevices = allDevices.filter(device => device.kind === 'videoinput');
          setDevices(videoInputDevices);
          if (videoInputDevices.length > 0 && !selectedDeviceId) {
            setSelectedDeviceId(videoInputDevices[0].deviceId);
          }
        } catch (err) {
          console.error("Error enumerating devices:", err);
        }
      };
      getDevices();
    }, []);

    useImperativeHandle(ref, () => ({
      captureFrame: () => {
        if (!videoRef.current || !canvasRef.current || !hasVideo) return null;
        
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        
        if (!ctx) return null;

        // Draw the current video frame onto the canvas
        // Scale down to 400px width for fast processing (similar to trafficAnalysis.ts)
        const targetWidth = 400;
        const scale = targetWidth / video.videoWidth;
        const targetHeight = Math.round(video.videoHeight * scale);

        canvas.width = targetWidth;
        canvas.height = targetHeight;
        
        ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
        return ctx.getImageData(0, 0, targetWidth, targetHeight);
      }
    }));

    useEffect(() => {
      let stream: MediaStream | null = null;

      const startVideo = async () => {
        if (!selectedDeviceId && devices.length > 0) return; // Wait for device selection

        try {
          // Default to back camera if no specific device is chosen yet
          const videoConstraints = selectedDeviceId 
            ? { deviceId: { exact: selectedDeviceId } }
            : { facingMode: "environment" };

          stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints });
          
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            setHasVideo(true);
            setError(null);
          }
        } catch (err) {
          console.error(`Lane ${laneNumber} camera error:`, err);
          setError("Camera access denied or unavailable.");
          setHasVideo(false);
        }
      };

      startVideo();

      return () => {
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
      };
    }, [laneNumber, selectedDeviceId, devices.length]);

    const getSignalColor = () => {
      switch (signalState) {
        case "green": return "bg-signal-green";
        case "yellow": return "bg-signal-yellow";
        case "red": return "bg-signal-red";
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
        {hasEmergency && (
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10 bg-emergency px-4 py-2 rounded-full flex items-center gap-2 animate-pulse shadow-lg border-2 border-white">
            <div className="w-3 h-3 rounded-full bg-white animate-ping absolute" />
            <AlertTriangle className="w-5 h-5 relative z-10 text-white" />
            <span className="text-sm font-black tracking-wider relative z-10 text-white">🚨 EMERGENCY ALERT 🚨</span>
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-black text-foreground">Lane {laneNumber}</h3>
            {hasEmergency && (
              <Badge variant="destructive" className="bg-emergency animate-pulse gap-1 text-xs font-black px-3 py-1">
                <AlertTriangle className="w-4 h-4" /> PRIORITY
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

        <div className="mb-2">
          <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId}>
            <SelectTrigger className="w-full bg-background/50 border-white/10 text-xs">
              <div className="flex items-center gap-2">
                <Camera className="w-3 h-3" />
                <SelectValue placeholder="Select Camera" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {devices.length === 0 && <SelectItem value="none" disabled>No cameras found</SelectItem>}
              {devices.map((device, index) => (
                <SelectItem key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${index + 1}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="relative border-2 border-border rounded-lg overflow-hidden bg-black/10 aspect-video flex items-center justify-center">
          {error ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground p-4 text-center">
              <VideoOff className="w-8 h-8" />
              <p className="text-sm">{error}</p>
            </div>
          ) : (
            <>
              {!hasVideo && <Video className="w-8 h-8 text-muted-foreground animate-pulse" />}
              <video 
                ref={videoRef}
                autoPlay 
                playsInline 
                muted 
                className={`w-full h-full object-cover ${hasVideo ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500`}
              />
              {/* Hidden canvas used exclusively for frame extraction */}
              <canvas ref={canvasRef} className="hidden" />
            </>
          )}

          {hasEmergency && hasVideo && (
            <div className="absolute inset-0 bg-emergency/20 animate-pulse pointer-events-none border-2 border-emergency/50" />
          )}
        </div>

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
          
          <div className="p-3 bg-muted/50 rounded-lg border border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Waiting Time</span>
              </div>
              <span className="text-2xl font-bold text-foreground">{waitingTime}s</span>
            </div>
            {waitingTime === 0 && signalState === "green" ? (
              <p className="text-xs text-signal-green font-medium">Currently active - vehicles moving</p>
            ) : (
              <p className="text-xs text-muted-foreground">Estimated time until green signal</p>
            )}
          </div>

          {greenDuration > 0 && (
            <div className="p-3 bg-signal-green/10 rounded-lg border border-signal-green/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-signal-green animate-pulse" />
                  <span className="text-sm font-medium text-foreground">Movement Time</span>
                </div>
                <span className="text-2xl font-bold text-signal-green">{greenDuration}s</span>
              </div>
              <p className="text-xs text-muted-foreground">Time allocated for vehicles to move through this lane</p>
            </div>
          )}
        </div>
      </Card>
    );
  }
);
LiveTrafficLane.displayName = "LiveTrafficLane";
