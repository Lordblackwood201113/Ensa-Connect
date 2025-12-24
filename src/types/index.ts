export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  promotion: string | null;
  city: string | null;
  company: string | null;
  job_title: string | null;
  study_track: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  email: string | null;
  linkedin_url: string | null;
  phone: string | null;
  is_phone_visible: boolean;
  completion_score: number;
  onboarding_completed?: boolean;
  must_change_password?: boolean;
}

export interface Experience {
  id: string;
  user_id: string;
  title: string;
  company: string;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
}

export interface Education {
  id: string;
  user_id: string;
  school: string;
  degree: string | null;
  field_of_study: string | null;
  start_date: number | null;
  end_date: number | null;
}

export interface Event {
  id: string;
  created_at: string;
  title: string;
  description: string;
  event_date: string;
  location: string;
  image_url: string | null;
  organizer_id: string;
  organizer?: Profile;
}

export interface Job {
  id: string;
  created_at: string;
  title: string;
  company: string;
  location: string;
  contract_type: 'CDI' | 'CDD' | 'Stage' | 'Freelance' | 'Alternance';
  description: string;
  requirements: string | null;
  apply_link: string | null;
  poster_id: string;
  poster?: Profile;
}

export interface Discussion {
  id: string;
  created_at: string;
  title: string;
  content: string;
  author_id: string;
  author?: Profile;
  is_closed: boolean;
  replies_count?: number;
}

export interface Reply {
  id: string;
  created_at: string;
  content: string;
  discussion_id: string;
  author_id: string;
  author?: Profile;
}

export interface Notification {
  id: string;
  created_at: string;
  user_id: string;
  type: 'discussion_reply' | 'connection_request' | 'connection_accepted' | 'new_message';
  title: string;
  message: string;
  link: string;
  is_read: boolean;
  discussion_id?: string;
  triggered_by_id?: string;
  triggered_by?: Profile;
}

// === CONNEXIONS ===
export type ConnectionStatus = 'pending' | 'accepted' | 'rejected' | 'blocked';

export interface Connection {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: ConnectionStatus;
  created_at: string;
  updated_at: string;
  requester?: Profile;
  receiver?: Profile;
}

// === MESSAGERIE ===
export interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  connection_id: string;
  last_message_at: string;
  created_at: string;
}

export interface ConversationWithDetails extends Conversation {
  other_participant: Profile;
  last_message: Message | null;
  unread_count: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  read_at: string | null;
  sender?: Profile;
}


