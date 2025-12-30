/**
 * PWA Install Prompt Component
 *
 * Displays an install banner when the PWA can be installed.
 * Handles the beforeinstallprompt event and provides install UI.
 */

import { useEffect, useState } from "react";
import { X, Download } from "lucide-react";
import { Button } from "~/components/ui/button";

// BeforeInstallPromptEvent is not in standard TypeScript DOM types
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if user previously dismissed
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
      // Don't show if dismissed within last 7 days
      if (daysSinceDismissed < 7) {
        setIsDismissed(true);
      }
    }

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsDismissed(true);
      return;
    }

    const handler = (e: Event) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    const promptEvent = deferredPrompt as BeforeInstallPromptEvent;
    promptEvent.prompt();
    // Wait for the user to respond to the prompt
    await promptEvent.userChoice;
    // The deferredPrompt can only be used once
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setIsDismissed(true);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  };

  if (!showPrompt || isDismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom duration-300">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
        <div className="flex items-start space-x-3">
          {/* Icon */}
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Download className="w-6 h-6 text-white" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              Install Finance Hub
            </h3>
            <p className="text-xs text-gray-600 mb-3">
              Install our app for faster access and offline support
            </p>
            <div className="flex space-x-2">
              <Button
                size="sm"
                onClick={handleInstall}
                className="text-xs"
              >
                Install
              </Button>
              <button
                onClick={handleDismiss}
                className="text-xs text-gray-600 hover:text-gray-900 px-2 py-1"
              >
                Not now
              </button>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>
    </div>
  );
}
