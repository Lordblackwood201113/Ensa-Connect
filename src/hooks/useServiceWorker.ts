import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function useServiceWorker() {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      console.log('[SW] Service worker registered:', swUrl);

      // Vérifier les mises à jour toutes les heures
      if (registration) {
        setInterval(() => {
          console.log('[SW] Checking for updates...');
          registration.update();
        }, 60 * 60 * 1000); // 1 heure

        // Vérifier immédiatement au démarrage
        registration.update();
      }
    },
    onRegisterError(error) {
      console.error('[SW] Registration error:', error);
    },
    onNeedRefresh() {
      console.log('[SW] New content available, showing update prompt');
      setShowUpdatePrompt(true);
    },
    onOfflineReady() {
      console.log('[SW] App ready for offline use');
    },
  });

  // Synchroniser l'état du prompt avec needRefresh
  useEffect(() => {
    if (needRefresh) {
      setShowUpdatePrompt(true);
    }
  }, [needRefresh]);

  const updateApp = async () => {
    console.log('[SW] Updating service worker...');
    await updateServiceWorker(true);
    // Forcer le rechargement après la mise à jour
    window.location.reload();
  };

  const dismissUpdate = () => {
    setShowUpdatePrompt(false);
    setNeedRefresh(false);
  };

  return {
    showUpdatePrompt,
    updateApp,
    dismissUpdate,
    needRefresh,
  };
}
