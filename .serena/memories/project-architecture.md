# ENSA Connect - Architecture du Projet

## Vue d'ensemble

ENSA Connect est une application de réseau social pour les alumni de l'École Nationale Supérieure d'Agriculture (ENSA) de Meknès, Maroc.

## Stack Technique

| Composant | Technologie |
|-----------|-------------|
| Frontend | React 19 + TypeScript |
| Build | Vite 7 |
| Styling | TailwindCSS 4 |
| Backend | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| Cartes | Leaflet + react-leaflet |
| PWA | vite-plugin-pwa |
| Icônes | lucide-react |

## Structure des Dossiers

```
src/
├── assets/          # Images, fonts
├── components/      # Composants réutilisables
│   ├── connections/ # Système de connexions
│   ├── directory/   # Annuaire (carte, cards)
│   ├── discussions/ # Forum Q&A
│   ├── events/      # Événements
│   ├── jobs/        # Offres d'emploi
│   ├── layout/      # Sidebar, navigation
│   ├── messaging/   # Messagerie instantanée
│   ├── notifications/
│   └── ui/          # Composants UI génériques
├── context/         # React Context (Auth)
├── layouts/         # DashboardLayout
├── lib/             # Services et utilitaires
│   ├── connections.ts
│   ├── geocoding.ts
│   ├── messaging.ts
│   ├── supabase.ts
│   └── utils.ts
├── pages/           # Pages de l'application
└── types/           # Types TypeScript
```

## Pages et Routes

| Route | Page | Description |
|-------|------|-------------|
| `/login` | Login | Authentification |
| `/onboarding` | Onboarding | Premier setup profil |
| `/dashboard` | Directory | Annuaire des membres |
| `/promo` | Promo | Ma promotion |
| `/events` | Events | Événements |
| `/jobs` | Jobs | Offres d'emploi |
| `/discussions` | Discussions | Forum Q&A |
| `/messages` | Messages | Messagerie privée |
| `/connections` | Connections | Réseau de contacts |
| `/member/:id` | ProfileView | Profil d'un membre |
| `/profile/edit` | EditProfile | Édition de profil |

## Modèles de Données (Supabase)

### profiles
- id, first_name, last_name, promotion, city, company, job_title
- study_track, avatar_url, cover_url, email, linkedin_url, phone
- is_phone_visible, completion_score, onboarding_completed

### experiences
- id, user_id, title, company, start_date, end_date, is_current, description

### educations
- id, user_id, school, degree, field_of_study, start_date, end_date

### events
- id, title, description, event_date, location, image_url, organizer_id

### jobs
- id, title, company, location, contract_type, description, requirements, apply_link, poster_id

### discussions
- id, title, content, author_id, is_closed

### replies
- id, content, discussion_id, author_id

### notifications
- id, user_id, type, title, message, link, is_read

### connections
- id, requester_id, receiver_id, status (pending/accepted/rejected/blocked)

### conversations
- id, created_at, updated_at

### conversation_participants
- id, conversation_id, user_id, joined_at, last_read_at

### messages
- id, conversation_id, sender_id, content, created_at, edited_at, is_deleted

## Authentification

- Supabase Auth avec email/password
- Context `AuthProvider` avec `useAuth()` hook
- `ProtectedRoute` pour les routes authentifiées
- Profil chargé automatiquement après login

## Patterns de Code

### Chargement de données
```typescript
const [data, setData] = useState<T[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetchData();
}, []);

const fetchData = async () => {
  setLoading(true);
  const { data, error } = await supabase.from('table').select('*');
  if (data) setData(data);
  setLoading(false);
};
```

### Composants UI
- `Button` - Boutons avec variants (primary, secondary, ghost, outline)
- `Card` - Conteneurs avec bordures et ombres
- `Input` - Champs de formulaire
- `Modal` - Modales avec overlay
- `Avatar` - Photos de profil

## Variables d'Environnement

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
VITE_GOOGLE_MAPS_API_KEY=xxx
```

## Commandes NPM

```bash
npm run dev          # Développement
npm run build        # Build production
npm run preview      # Preview build
npm run lint         # ESLint
```
