import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDistanceToNow(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'à l\'instant';
  if (diffInSeconds < 3600) return `il y a ${Math.floor(diffInSeconds / 60)} min`;
  if (diffInSeconds < 86400) return `il y a ${Math.floor(diffInSeconds / 3600)} h`;
  if (diffInSeconds < 604800) return `il y a ${Math.floor(diffInSeconds / 86400)} j`;
  
  return date.toLocaleDateString('fr-FR');
}

/**
 * Classes CSS pour le footer de modal/chat avec safe area
 * Basé sur design.json - Modal.footer
 * Utilisé pour les footers de modals et composants de chat
 */
export const MODAL_FOOTER_CLASSES = 'border-t border-gray-100 p-3 sm:p-4 bg-white shrink-0 safe-area-inset-bottom';


/**
 * Calcule le score de complétion du profil basé sur les champs remplis
 * @param profile - Les données du profil
 * @param experiencesCount - Nombre d'expériences professionnelles
 * @param educationsCount - Nombre de formations
 * @returns Score de complétion entre 0 et 100
 */
export function calculateCompletionScore(
  profile: {
    first_name?: string | null;
    last_name?: string | null;
    promotion?: string | null;
    study_track?: string | null;
    city?: string | null;
    company?: string | null;
    job_title?: string | null;
    avatar_url?: string | null;
    cover_url?: string | null;
    linkedin_url?: string | null;
    phone?: string | null;
  },
  experiencesCount: number = 0,
  educationsCount: number = 0
): number {
  let score = 0;

  // Informations de base (10%)
  if (profile.first_name && profile.last_name) {
    score += 10;
  }

  // Promotion (10%)
  if (profile.promotion) {
    score += 10;
  }

  // Filière (10%)
  if (profile.study_track) {
    score += 10;
  }

  // Ville actuelle (10%)
  if (profile.city) {
    score += 10;
  }

  // Photo de profil (15%)
  if (profile.avatar_url) {
    score += 15;
  }

  // Photo de couverture (5%)
  if (profile.cover_url) {
    score += 5;
  }

  // Entreprise actuelle (10%)
  if (profile.company) {
    score += 10;
  }

  // Poste actuel (10%)
  if (profile.job_title) {
    score += 10;
  }

  // LinkedIn (5%)
  if (profile.linkedin_url) {
    score += 5;
  }

  // Téléphone (5%)
  if (profile.phone) {
    score += 5;
  }

  // Au moins 1 expérience professionnelle (5%)
  if (experiencesCount > 0) {
    score += 5;
  }

  // Au moins 1 formation (5%)
  if (educationsCount > 0) {
    score += 5;
  }

  return Math.min(score, 100);
}
