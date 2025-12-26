import { RefreshCw, X } from 'lucide-react';
import { useServiceWorker } from '../../hooks/useServiceWorker';
import { cn } from '../../lib/utils';

export function UpdatePrompt() {
  const { showUpdatePrompt, updateApp, dismissUpdate } = useServiceWorker();

  if (!showUpdatePrompt) return null;

  return (
    <div
      className={cn(
        "fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 z-50",
        "animate-in slide-in-from-bottom-4 fade-in duration-300"
      )}
    >
      <div className="bg-brand-black text-white rounded-2xl shadow-2xl p-4 max-w-sm mx-auto sm:mx-0">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="p-2 bg-brand-primary/20 rounded-xl shrink-0">
            <RefreshCw className="w-5 h-5 text-brand-primary" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm mb-1">
              Mise à jour disponible
            </h3>
            <p className="text-xs text-gray-400 mb-3">
              Une nouvelle version de l'application est disponible.
            </p>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={updateApp}
                className="flex-1 py-2 px-3 bg-brand-primary text-white font-semibold text-xs rounded-xl hover:bg-brand-primary/90 active:scale-[0.98] transition-all touch-manipulation"
              >
                Mettre à jour
              </button>
              <button
                onClick={dismissUpdate}
                className="py-2 px-3 text-gray-400 hover:text-white text-xs rounded-xl hover:bg-white/10 transition-colors touch-manipulation"
              >
                Plus tard
              </button>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={dismissUpdate}
            className="p-1 text-gray-500 hover:text-white rounded-lg transition-colors touch-manipulation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
