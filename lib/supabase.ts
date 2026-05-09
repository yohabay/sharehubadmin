import { createClient } from '@supabase/supabase-js'

// These should be set in environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fbmvuhcrvswbttbhioux.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZibXZ1aGNydnN3YnR0Ymhpb3V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3ODIzMzcsImV4cCI6MjA3OTM1ODMzN30.7RYZa52neesxSUJ8vKbWD-MUGIa1hj0-za2fjxv0Cwo'

// Create client only if credentials are available
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// Types based on the database schema
export interface Profile {
  id: string
  display_name: string
  bio: string | null
  location: string | null
  photo_url: string | null
  user_type: 'needs' | 'offers' | 'both'
  phone: string | null
  verified: boolean
  rating: number
  follower_count: number
  following_count: number
  created_at: string
  updated_at: string
}

export interface Post {
  id: string
  user_id: string
  type: 'need' | 'offer'
  title: string
  description: string | null
  category: string | null
  location: string | null
  price: number | null
  images: string[] | null
  status: 'active' | 'completed' | 'closed'
  likes_count: number
  comments_count: number
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  read: boolean
  created_at: string
}

export interface Comment {
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
}

export interface UserRating {
  id: string
  rater_id: string
  rated_user_id: string
  rating: number
  created_at: string
  updated_at: string
}

// Dashboard statistics
export interface DashboardStats {
  totalUsers: number
  totalPosts: number
  totalMessages: number
  totalComments: number
  verifiedUsers: number
  activePosts: number
  needsPosts: number
  offersPosts: number
}

// Helper function to format date
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Helper function to format relative time
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  return formatDate(dateString)
}

// Get initials from name
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Truncate text
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}
