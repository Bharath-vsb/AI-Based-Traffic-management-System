import { Link, useLocation } from "react-router-dom";
import { Camera, Image as ImageIcon } from "lucide-react";

export function Navigation() {
  const location = useLocation();

  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full">
      <div className="container flex h-16 items-center">
        <div className="mr-4 hidden md:flex">
          <Link to="/" className="mr-6 flex items-center space-x-2">
            <span className="hidden font-bold sm:inline-block">
              AI Traffic System
            </span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link
              to="/"
              className={`transition-colors hover:text-foreground/80 flex items-center gap-2 ${
                location.pathname === "/" ? "text-foreground font-bold" : "text-foreground/60"
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              Static Analysis
            </Link>
            <Link
              to="/live"
              className={`transition-colors hover:text-foreground/80 flex items-center gap-2 ${
                location.pathname === "/live" ? "text-foreground font-bold" : "text-foreground/60"
              }`}
            >
              <Camera className="w-4 h-4" />
              Live Video Feed
            </Link>
          </nav>
        </div>
      </div>
    </nav>
  );
}
