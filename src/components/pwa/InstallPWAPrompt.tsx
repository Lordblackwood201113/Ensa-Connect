import { useState, useEffect } from 'react';
import { X, Download, Share, Plus } from 'lucide-react';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';
import { cn } from '../../lib/utils';

export function InstallPWAPrompt() {
  const { isInstallable, isInstalled, isIOS, install, dismiss } = useInstallPrompt();
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isInstallable && !isInstalled) {
      // Petit délai pour l'animation d'entrée
      const timer = setTimeout(() => {
        setIsVisible(true);
        setIsAnimating(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isInstallable, isInstalled]);

  const handleInstall = async () => {
    if (!isIOS) {
      await install();
    }
    handleDismiss();
  };

  const handleDismiss = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      dismiss();
    }, 300);
  };

  if (!isVisible || isInstalled) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity duration-300",
          isAnimating ? "opacity-100" : "opacity-0"
        )}
        onClick={handleDismiss}
      />

      {/* Modal */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 transform transition-all duration-300 ease-out",
          isAnimating ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="bg-white rounded-t-3xl shadow-2xl p-5 pb-8 safe-area-inset-bottom mx-auto max-w-lg">
          {/* Handle bar */}
          <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4" />

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors touch-manipulation"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Content */}
          <div className="text-center">
            {/* App Icon */}
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl overflow-hidden shadow-lg border-2 border-brand-primary/30">
              <img
                src="/logo-192.png"
                alt="ENSA Connect"
                className="w-full h-full object-cover"
              />
            </div>

            <h2 className="text-xl font-bold text-brand-black mb-2">
              Installer ENSA Connect
            </h2>

            <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
              Accédez rapidement à l'application depuis votre écran d'accueil
            </p>

            {isIOS ? (
              // Instructions pour iOS
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-2xl p-4">
                  <p className="text-sm text-gray-600 mb-3">
                    Pour installer sur votre iPhone/iPad :
                  </p>
                  <ol className="text-left text-sm space-y-3">
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-brand-black text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                      <span className="flex items-center gap-2 pt-0.5">
                        Appuyez sur <Share className="w-5 h-5 text-blue-500 inline" /> en bas de Safari
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-brand-black text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                      <span className="flex items-center gap-2 pt-0.5">
                        Faites défiler et appuyez sur <Plus className="w-4 h-4 inline" /> "Sur l'écran d'accueil"
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-brand-black text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                      <span className="pt-0.5">Appuyez sur "Ajouter"</span>
                    </li>
                  </ol>
                </div>

                <button
                  onClick={handleDismiss}
                  className="w-full py-3.5 bg-brand-black text-white font-semibold rounded-xl active:scale-[0.98] transition-transform touch-manipulation"
                >
                  J'ai compris
                </button>
              </div>
            ) : (
              // Bouton d'installation pour Android/Desktop
              <div className="space-y-3">
                <button
                  onClick={handleInstall}
                  className="w-full py-3.5 bg-brand-black text-white font-semibold rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform touch-manipulation"
                >
                  <Download className="w-5 h-5" />
                  Installer l'application
                </button>

                <button
                  onClick={handleDismiss}
                  className="w-full py-3 text-gray-500 font-medium text-sm hover:text-gray-700 transition-colors touch-manipulation"
                >
                  Plus tard
                </button>
              </div>
            )}

            {/* Benefits */}
            <div className="mt-6 pt-5 border-t border-gray-100">
              <div className="flex justify-center gap-6 text-xs text-gray-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-brand-primary rounded-full" />
                  Accès rapide
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-brand-primary rounded-full" />
                  Hors ligne
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-brand-primary rounded-full" />
                  Notifications
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
