'use client'

import { useState, useEffect, useCallback, useMemo, useRef, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { getDataClientUrl } from '@/lib/dataClient'
import { createAdminAuthClient, setAdminTokenCookie, readLegacySession, ADMIN_LEGACY_SESSION_KEY } from '@/lib/adminAuth'
import { searchPlaces, reverseGeocode, type PlaceResult } from '@/lib/places'
import { generateTitleSuggestions, generateDescriptionSuggestions, suggestCategory, POST_CATEGORIES, CONDITIONS, URGENCIES, STEP_TITLES, STEP_SUBTITLES, INTENT_LABELS } from '@/lib/postSuggestions'
import Link from 'next/link'
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  MessageSquare, 
  Star, 
  Settings, 
  BarChart3,
  Search,
  Bell,
  RefreshCw,
  Menu,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Check,
  X,
  XCircle,
  Download,
  UsersRound,
  MessageCircle,
  Shield,
  LogOut,
  Plus,
  Package,
  ChevronDown,
  Tag,
  DollarSign,
  ArrowLeftRight,
  ShoppingBag,
  Type as TypeIcon,
  AlignLeft,
  Sparkles,
  Bot,
  ArrowUpRight,
  PenLine,
  Camera,
  ImagePlus,
  SlidersHorizontal,
  LayoutGrid,
  MapPin,
  Map,
  BadgeCheck,
  Clock,
  Lightbulb,
  CheckCircle2,
  Loader2,
  Crosshair,
  type LucideIcon
} from 'lucide-react'
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend, 
  ArcElement,
  PointElement,
  LineElement
} from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import { createClient } from '@supabase/supabase-js'

// Register ChartJS components
ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend, 
  ArcElement,
  PointElement,
  LineElement
)

// Supabase client - talks to our /api/supabase proxy so the service-role key
// is applied server-side (admin writes keep working under hardened RLS).
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZibXZ1aGNydnN3YnR0Ymhpb3V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3ODIzMzcsImV4cCI6MjA3OTM1ODMzN30.7RYZa52neesxSUJ8vKbWD-MUGIa1hj0-za2fjxv0Cwo'
// Data client: a REST wrapper around /api/supabase only. Auth lives in
// authClient — this one must never own a session of its own.
const supabase = createClient(getDataClientUrl(), supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})

// Session client: shares ADMIN_STORAGE_KEY with the login page so it can
// refresh the token that the /api/supabase cookie is built from.
const authClient = createAdminAuthClient()

// Real Supabase host — used only to build public storage URLs for uploaded photos.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fbmvuhcrvswbttbhioux.supabase.co'

// Wizard pieces shared by the create-post modal (mirrors the mobile screen).
const STEP_ICONS: LucideIcon[] = [PenLine, Camera, SlidersHorizontal, CheckCircle2]

function WizardStepIcon({ step }: { step: number }) {
  const Icon = STEP_ICONS[step] || PenLine
  return <Icon size={22} />
}

function SuggestionBox({
  title,
  suggestions,
  onSelect,
  onDismiss,
  previewLines,
}: {
  title: string
  suggestions: string[]
  onSelect: (value: string) => void
  onDismiss: () => void
  previewLines?: number
}) {
  return (
    <div className="mt-2 rounded-lg border border-primary-200 bg-primary-50/60 p-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-medium text-primary-600">
          <Bot size={16} />
          {title}
        </span>
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs text-slate-400 hover:text-slate-600"
        >
          Dismiss
        </button>
      </div>
      <div className="mt-1.5 space-y-0.5">
        {suggestions.map(suggestion => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onSelect(suggestion)}
            className="w-full flex items-start gap-2 text-left px-2 py-1.5 rounded-md hover:bg-white border border-transparent hover:border-primary-100 text-sm text-slate-700"
          >
            <span
              className="flex-1"
              style={
                previewLines
                  ? {
                      display: '-webkit-box',
                      WebkitLineClamp: previewLines,
                      WebkitBoxOrient: 'vertical' as const,
                      overflow: 'hidden',
                    }
                  : undefined
              }
            >
              {suggestion}
            </span>
            <ArrowUpRight size={15} className="mt-0.5 shrink-0 text-slate-400" />
          </button>
        ))}
      </div>
    </div>
  )
}

function ReviewRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <Icon size={18} className="mt-0.5 shrink-0 text-slate-400" />
      <span className="w-24 shrink-0 text-xs text-slate-500">{label}</span>
      <span className="flex-1 text-sm font-semibold text-slate-800 break-words">
        {value || '—'}
      </span>
    </div>
  )
}

// Types
interface Profile {
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

interface Post {
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

interface Message {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  read: boolean
  created_at: string
}

interface Comment {
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: string
}

interface UserRating {
  id: string
  rater_id: string
  rated_user_id: string
  rating: number
  created_at: string
}

// Navigation items
const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'posts', label: 'Posts', icon: FileText },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'comments', label: 'Comments', icon: MessageCircle },
  { id: 'ratings', label: 'Ratings', icon: Star },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
]

// Helper functions
function getInitials(name: string): string {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function formatDate(dateString: string): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function formatRelativeTime(dateString: string): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)
  
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return formatDate(dateString)
}

export default function AdminPanel() {
  const router = useRouter()
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  
  // Data states
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [ratings, setRatings] = useState<UserRating[]>([])
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [userTypeFilter, setUserTypeFilter] = useState('')
  const [postTypeFilter, setPostTypeFilter] = useState('')
  const [postStatusFilter, setPostStatusFilter] = useState('')
  const [messageReadFilter, setMessageReadFilter] = useState('')
  
  // Pagination
  const [currentPageNum, setCurrentPageNum] = useState(1)
  const itemsPerPage = 10

  // Admin "create post" modal — mirrors the mobile app's 4-step wizard
  const [showCreatePost, setShowCreatePost] = useState(false)
  const [creatingPost, setCreatingPost] = useState(false)
  const [createStep, setCreateStep] = useState(0)
  const [newPostFiles, setNewPostFiles] = useState<File[]>([])
  const [newPost, setNewPost] = useState({
    user_id: '',
    type: 'need' as 'need' | 'offer',
    title: '',
    description: '',
    category: '',
    location: '',
    price: '',
    condition: '',
    urgency: '',
    status: 'active' as 'active' | 'completed' | 'closed',
  })

  // Which user's products are expanded in the users list
  const [expandedUser, setExpandedUser] = useState<string | null>(null)

  // AI-ish title/description suggestions for the create-post form
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([])
  const [showTitleSuggestions, setShowTitleSuggestions] = useState(false)
  const [descriptionSuggestions, setDescriptionSuggestions] = useState<string[]>([])
  const [showDescriptionSuggestions, setShowDescriptionSuggestions] = useState(false)

  // Location autocomplete (same Nominatim search the app's picker uses)
  const [locationSuggestions, setLocationSuggestions] = useState<PlaceResult[]>([])
  const [locationSearching, setLocationSearching] = useState(false)
  const [locationLocating, setLocationLocating] = useState(false)

  const photoInputRef = useRef<HTMLInputElement | null>(null)
  const locationDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (locationDebounceRef.current) clearTimeout(locationDebounceRef.current)
    }
  }, [])

  // Object URLs for photo previews — created once per set, revoked on change.
  const photoPreviews = useMemo(
    () => newPostFiles.map(file => ({ file, url: URL.createObjectURL(file) })),
    [newPostFiles]
  )
  useEffect(() => {
    return () => {
      photoPreviews.forEach(preview => URL.revokeObjectURL(preview.url))
    }
  }, [photoPreviews])

  // Check authentication, and keep the /api/supabase cookie in sync with the
  // live session (Supabase access tokens expire after ~1 hour, the cookie is
  // allowed 7 days — without this every call 401s once the token lapses).
  useEffect(() => {
    let active = true

    const bootstrap = async () => {
      const { data } = await authClient.auth.getSession()
      if (!active) return

      if (data.session) {
        setAdminTokenCookie(data.session.access_token)
        setIsAuthenticated(true)
        return
      }

      // One-time migration: sessions written before the shared storage key
      // existed live under a legacy key. Restoring one hands the refresh token
      // to authClient so it can keep the cookie fresh from here on.
      const legacy = readLegacySession()
      if (legacy?.access_token && legacy?.refresh_token) {
        const { data: restored } = await authClient.auth.setSession({
          access_token: legacy.access_token,
          refresh_token: legacy.refresh_token,
        })
        if (!active) return
        if (restored.session) {
          setAdminTokenCookie(restored.session.access_token)
          setIsAuthenticated(true)
          return
        }
      }

      // Nothing recoverable — the stored token has expired. Back to login.
      setAdminTokenCookie()
      router.push('/login')
    }

    bootstrap()

    const { data: listener } = authClient.auth.onAuthStateChange((_event, session) => {
      setAdminTokenCookie(session?.access_token)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [router])

  // Fetch data from Supabase
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError)
      } else {
        setProfiles(profilesData || [])
      }

      // Fetch posts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (postsError) {
        console.error('Error fetching posts:', postsError)
      } else {
        setPosts(postsData || [])
      }

      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (messagesError) {
        console.error('Error fetching messages:', messagesError)
      } else {
        setMessages(messagesData || [])
      }

      // Fetch comments
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (commentsError) {
        console.error('Error fetching comments:', commentsError)
      } else {
        setComments(commentsData || [])
      }

      // Fetch ratings
      const { data: ratingsData, error: ratingsError } = await supabase
        .from('user_ratings')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (ratingsError) {
        console.error('Error fetching ratings:', ratingsError)
      } else {
        setRatings(ratingsData || [])
      }

      const firstError =
        profilesError || postsError || messagesError || commentsError || ratingsError
      setDataLoaded(true)
      if (firstError) {
        console.error('Data load error:', firstError)
        // The proxy returns an already-actionable message for 401s (it says
        // whether the cookie is missing or Supabase rejected the token), so
        // only add hints for failures that are genuinely about configuration.
        const hint = /credential|missing/i.test(firstError.message)
          ? ' (check SUPABASE_SERVICE_ROLE_KEY in DealOra_admin/.env.local)'
          : /forbidden/i.test(firstError.message)
            ? ' (this account is not listed in ADMIN_EMAILS in .env.local)'
            : ''
        showToast(`Could not load data: ${firstError.message}${hint}`, 'error')
      } else {
        showToast('Data loaded successfully from Supabase', 'success')
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      showToast('Error loading data from Supabase', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial data fetch
  useEffect(() => {
    if (isAuthenticated) {
      fetchData()
    }
  }, [isAuthenticated, fetchData])

  // Show toast notification
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ---- Create-post wizard helpers (mirror the mobile app) ----

  // Buying/Selling toggle — stored as the DB's need/offer, labelled like the app.
  const handleTypeChange = (type: 'need' | 'offer') => {
    setNewPost(prev => ({ ...prev, type }))
    const trimmed = newPost.title.trim()
    if (trimmed.length >= 3) {
      const suggestions = generateTitleSuggestions(trimmed, type)
      setTitleSuggestions(suggestions)
      setShowTitleSuggestions(suggestions.length > 0)
    }
  }

  // Title suggestions while typing, plus the mobile's auto category pick.
  const handleTitleChange = (value: string) => {
    const trimmed = value.trim()
    if (trimmed.length >= 3) {
      const suggestions = generateTitleSuggestions(trimmed, newPost.type)
      setTitleSuggestions(suggestions)
      setShowTitleSuggestions(suggestions.length > 0)
    } else {
      setTitleSuggestions([])
      setShowTitleSuggestions(false)
    }

    const suggested =
      value.length >= 5 && !newPost.category ? suggestCategory(value, newPost.description) : ''
    setNewPost(prev => ({
      ...prev,
      title: value,
      category: suggested && suggested !== 'Other' ? suggested : prev.category,
    }))
  }

  const handleSelectTitle = (suggestion: string) => {
    setNewPost(prev => ({ ...prev, title: suggestion }))
    setTitleSuggestions([])
    setShowTitleSuggestions(false)
  }

  // Sparkle button in the title field, exactly like the mobile suffix icon.
  const toggleTitleSuggestions = () => {
    if (showTitleSuggestions) {
      setTitleSuggestions([])
      setShowTitleSuggestions(false)
      return
    }
    if (newPost.title.trim().length >= 3) {
      const suggestions = generateTitleSuggestions(newPost.title.trim(), newPost.type)
      setTitleSuggestions(suggestions)
      setShowTitleSuggestions(suggestions.length > 0)
    } else {
      showToast('Type at least 3 characters to get suggestions', 'error')
    }
  }

  // Description drafts on demand (the mobile app's "Suggest" button)
  const handleSuggestDescription = () => {
    const drafts = generateDescriptionSuggestions({
      title: newPost.title,
      type: newPost.type,
      category: newPost.category || undefined,
      condition: newPost.condition,
      location: newPost.location,
      price: newPost.price,
    })
    if (drafts.length === 0) return
    setDescriptionSuggestions(drafts)
    setShowDescriptionSuggestions(true)
  }

  const handleSelectDescription = (suggestion: string) => {
    setNewPost(prev => ({ ...prev, description: suggestion }))
    setDescriptionSuggestions([])
    setShowDescriptionSuggestions(false)
  }

  // Photos: up to 5, uploaded to the same `post-images` bucket the app uses.
  const handleAddPhotos = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    // Snapshot now: the caller clears the input right after this returns, which
    // empties the live FileList before React runs the state updater.
    const picked = Array.from(fileList)
    setNewPostFiles(prev => [...prev, ...picked].slice(0, 5))
  }

  const handleRemovePhoto = (index: number) => {
    setNewPostFiles(prev => prev.filter((_, i) => i !== index))
  }

  // Location search mirrors the app's picker: min 3 characters, 450ms debounce.
  const handleLocationChange = (value: string) => {
    setNewPost(prev => ({ ...prev, location: value }))
    if (locationDebounceRef.current) clearTimeout(locationDebounceRef.current)

    if (value.trim().length < 3) {
      setLocationSuggestions([])
      setLocationSearching(false)
      return
    }

    setLocationSearching(true)
    locationDebounceRef.current = setTimeout(async () => {
      const results = await searchPlaces(value)
      setLocationSuggestions(results)
      setLocationSearching(false)
    }, 450)
  }

  const handleSelectLocation = (place: PlaceResult) => {
    if (locationDebounceRef.current) clearTimeout(locationDebounceRef.current)
    setNewPost(prev => ({ ...prev, location: place.name }))
    setLocationSuggestions([])
    setLocationSearching(false)
  }

  const handleUseCurrentLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      showToast('Could not get your location. Enable location access and try again.', 'error')
      return
    }

    setLocationLocating(true)
    navigator.geolocation.getCurrentPosition(
      async position => {
        const place = await reverseGeocode(
          position.coords.latitude,
          position.coords.longitude
        )
        setLocationLocating(false)
        if (!place) {
          showToast('Could not get your location. Enable location access and try again.', 'error')
          return
        }
        handleSelectLocation(place)
      },
      () => {
        setLocationLocating(false)
        showToast('Could not get your location. Enable location access and try again.', 'error')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // Per-step validation, with the mobile app's exact messages.
  const validateCreateStep = (step: number): boolean => {
    switch (step) {
      case 0:
        if (!newPost.title.trim()) {
          showToast('Please enter a title for your post', 'error')
          return false
        }
        return true
      case 1:
        if (newPost.type === 'offer' && newPostFiles.length === 0) {
          showToast('Please add at least one photo for your listing', 'error')
          return false
        }
        return true
      case 2: {
        const priceText = newPost.price.trim()
        if (!priceText) {
          showToast(
            newPost.type === 'offer'
              ? 'Please enter a price for your listing'
              : 'Please enter your maximum budget',
            'error'
          )
          return false
        }
        const price = parseFloat(priceText)
        if (isNaN(price) || price <= 0) {
          showToast('Please enter a valid price', 'error')
          return false
        }
        return true
      }
      default:
        return true
    }
  }

  const isLastCreateStep = createStep === STEP_TITLES.length - 1
  const isSelling = newPost.type === 'offer'

  const handleStepNext = () => {
    if (!validateCreateStep(createStep)) return
    setCreateStep(prev => Math.min(prev + 1, STEP_TITLES.length - 1))
  }

  const handleStepBack = () => setCreateStep(prev => Math.max(prev - 1, 0))

  // Logout function
  const handleLogout = () => {
    localStorage.removeItem(ADMIN_LEGACY_SESSION_KEY)
    setAdminTokenCookie()
    router.push('/login')
    // Revoke server-side too, otherwise the refresh token stays valid for 7 days.
    authClient.auth.signOut().catch(() => {})
  }

  // Filter data based on search and filters
  const filteredProfiles = profiles.filter(p => 
    (p.display_name || '').toLowerCase().includes(searchTerm.toLowerCase()) &&
    (userTypeFilter === '' || p.user_type === userTypeFilter)
  )

  const filteredPosts = posts.filter(p => 
    (p.title || '').toLowerCase().includes(searchTerm.toLowerCase()) &&
    (postTypeFilter === '' || p.type === postTypeFilter) &&
    (postStatusFilter === '' || p.status === postStatusFilter)
  )

  const filteredMessages = messages.filter(m => 
    (m.content || '').toLowerCase().includes(searchTerm.toLowerCase()) &&
    (messageReadFilter === '' || (messageReadFilter === 'read' && m.read) || (messageReadFilter === 'unread' && !m.read))
  )

  // Paginate data
  const paginate = (data: any[]) => {
    const start = (currentPageNum - 1) * itemsPerPage
    return data.slice(start, start + itemsPerPage)
  }

  // Actions
  const handleVerifyUser = async (userId: string, currentVerified: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ verified: !currentVerified })
        .eq('id', userId)

      if (error) throw error

      setProfiles(profiles.map(p => 
        p.id === userId ? { ...p, verified: !currentVerified } : p
      ))
      showToast('User verification updated', 'success')
    } catch (error) {
      console.error('Error updating user:', error)
      showToast('Error updating user', 'error')
    }
  }

  const handleDeleteUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId)

      if (error) throw error

      setProfiles(profiles.filter(p => p.id !== userId))
      showToast('User deleted successfully', 'success')
    } catch (error) {
      console.error('Error deleting user:', error)
      showToast('Error deleting user', 'error')
    }
  }

  const handleDeletePost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)

      if (error) throw error

      setPosts(posts.filter(p => p.id !== postId))
      showToast('Post deleted successfully', 'success')
    } catch (error) {
      console.error('Error deleting post:', error)
      showToast('Error deleting post', 'error')
    }
  }

  const handleUpdatePostStatus = async (postId: string, status: 'active' | 'completed' | 'closed') => {
    try {
      const { error } = await supabase
        .from('posts')
        .update({ status })
        .eq('id', postId)

      if (error) throw error

      setPosts(posts.map(p => 
        p.id === postId ? { ...p, status } : p
      ))
      showToast('Post status updated', 'success')
    } catch (error) {
      console.error('Error updating post:', error)
      showToast('Error updating post', 'error')
    }
  }

  const closeCreatePost = () => {
    setShowCreatePost(false)
    setCreateStep(0)
    setNewPostFiles([])
    setTitleSuggestions([])
    setShowTitleSuggestions(false)
    setDescriptionSuggestions([])
    setShowDescriptionSuggestions(false)
    setLocationSuggestions([])
    setLocationSearching(false)
    if (locationDebounceRef.current) clearTimeout(locationDebounceRef.current)
    setNewPost({
      user_id: '',
      type: 'need',
      title: '',
      description: '',
      category: '',
      location: '',
      price: '',
      condition: '',
      urgency: '',
      status: 'active',
    })
  }

  const handleCreatePost = async () => {
    if (!newPost.user_id) {
      showToast('Please select the user this post belongs to', 'error')
      return
    }
    if (!newPost.title.trim()) {
      showToast('Please enter a title for your post', 'error')
      return
    }

    const priceText = newPost.price.trim()
    if (!priceText) {
      showToast(
        newPost.type === 'offer'
          ? 'Please enter a price for your listing'
          : 'Please enter your maximum budget',
        'error'
      )
      return
    }
    const price = parseFloat(priceText)
    if (isNaN(price) || price <= 0) {
      showToast('Please enter a valid price', 'error')
      return
    }

    if (newPost.type === 'offer' && newPostFiles.length === 0) {
      showToast('Please add at least one photo for your listing', 'error')
      return
    }

    setCreatingPost(true)
    try {
      // Upload to the same `post-images` bucket the mobile app writes to.
      const imageUrls: string[] = []
      for (const file of newPostFiles) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const path = `${Date.now()}_${safeName}`
        const { error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(path, file, { upsert: true })
        if (uploadError) throw new Error(uploadError.message || 'Photo upload failed')
        imageUrls.push(`${supabaseUrl}/storage/v1/object/public/post-images/${path}`)
      }

      const { data, error } = await supabase
        .from('posts')
        .insert({
          user_id: newPost.user_id,
          type: newPost.type,
          title: newPost.title.trim(),
          description: newPost.description.trim() || null,
          category: newPost.category.trim() || null,
          location: newPost.location.trim() || null,
          price,
          images: imageUrls.length > 0 ? imageUrls : null,
          status: newPost.status,
        })
        .select()
        .single()

      if (error) throw error

      if (data) setPosts([data, ...posts])
      showToast('Post created successfully', 'success')
      closeCreatePost()
    } catch (error: any) {
      console.error('Error creating post:', error)
      showToast(error?.message || 'Error creating post', 'error')
    } finally {
      setCreatingPost(false)
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)

      if (error) throw error

      setMessages(messages.filter(m => m.id !== messageId))
      showToast('Message deleted successfully', 'success')
    } catch (error) {
      console.error('Error deleting message:', error)
      showToast('Error deleting message', 'error')
    }
  }

  const handleMarkAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ read: true })
        .eq('id', messageId)

      if (error) throw error

      setMessages(messages.map(m => 
        m.id === messageId ? { ...m, read: true } : m
      ))
      showToast('Message marked as read', 'success')
    } catch (error) {
      console.error('Error marking message as read:', error)
      showToast('Error updating message', 'error')
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)

      if (error) throw error

      setComments(comments.filter(c => c.id !== commentId))
      showToast('Comment deleted successfully', 'success')
    } catch (error) {
      console.error('Error deleting comment:', error)
      showToast('Error deleting comment', 'error')
    }
  }

  const handleDeleteRating = async (ratingId: string) => {
    try {
      const { error } = await supabase
        .from('user_ratings')
        .delete()
        .eq('id', ratingId)

      if (error) throw error

      setRatings(ratings.filter(r => r.id !== ratingId))
      showToast('Rating deleted successfully', 'success')
    } catch (error) {
      console.error('Error deleting rating:', error)
      showToast('Error deleting rating', 'error')
    }
  }

  const handleRefresh = () => {
    fetchData()
  }

  // Chart data
  const postsChartData = {
    labels: ['Buy', 'Sell'],
    datasets: [{
      data: [
        posts.filter(p => p.type === 'need').length,
        posts.filter(p => p.type === 'offer').length
      ],
      backgroundColor: ['#3b82f6', '#10b981'],
      borderWidth: 0
    }]
  }

  const activityChartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{
      label: 'New Users',
      data: [12, 19, 15, 25, 22, 30, 28],
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      tension: 0.4
    }, {
      label: 'New Posts',
      data: [8, 12, 10, 18, 15, 22, 20],
      borderColor: '#10b981',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      fill: true,
      tension: 0.4
    }]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const
      }
    }
  }

  // Render stars for ratings
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        size={14} 
        className={i < Math.floor(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
      />
    ))
  }

  // Get profile by ID
  const getProfileById = (id: string) => profiles.find(p => p.id === id)

  // Get post by ID
  const getPostById = (id: string) => posts.find(p => p.id === id)

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-slate-500">Loading...</p>
        </div>
      </div>
    )
  }

  // Render page content (same as before - I'll include it all)
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <div className="animate-fadeIn">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="card p-6 flex items-center gap-4">
                <div className="w-14 h-14 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="w-7 h-7 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Users</p>
                  <p className="text-2xl font-bold">{profiles.length}</p>
                </div>
              </div>
              <div className="card p-6 flex items-center gap-4">
                <div className="w-14 h-14 rounded-lg bg-green-100 flex items-center justify-center">
                  <FileText className="w-7 h-7 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Posts</p>
                  <p className="text-2xl font-bold">{posts.length}</p>
                </div>
              </div>
              <div className="card p-6 flex items-center gap-4">
                <div className="w-14 h-14 rounded-lg bg-purple-100 flex items-center justify-center">
                  <MessageSquare className="w-7 h-7 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Messages</p>
                  <p className="text-2xl font-bold">{messages.length}</p>
                </div>
              </div>
              <div className="card p-6 flex items-center gap-4">
                <div className="w-14 h-14 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <Shield className="w-7 h-7 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Verified</p>
                  <p className="text-2xl font-bold">{profiles.filter(p => p.verified).length}</p>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="card p-6">
                <h3 className="text-lg font-semibold mb-4">Posts by Type</h3>
                <div className="h-64">
                  <Doughnut data={postsChartData} options={chartOptions} />
                </div>
              </div>
              <div className="card p-6">
                <h3 className="text-lg font-semibold mb-4">Activity Overview</h3>
                <div className="h-64">
                  <Line data={activityChartData} options={chartOptions} />
                </div>
              </div>
            </div>

            {/* Recent Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                  <h3 className="font-semibold">Recent Users</h3>
                  <button 
                    onClick={() => setCurrentPage('users')}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    View All
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">User</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Verified</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profiles.slice(0, 5).map(profile => (
                        <tr key={profile.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-medium">
                                {getInitials(profile.display_name)}
                              </div>
                              <span className="font-medium">{profile.display_name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`badge ${profile.user_type === 'needs' ? 'bg-blue-100 text-blue-800' : profile.user_type === 'offers' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'}`}>
                              {profile.user_type}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {profile.verified ? (
                              <Check className="w-5 h-5 text-green-500" />
                            ) : (
                              <XCircle className="w-5 h-5 text-gray-300" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="card">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                  <h3 className="font-semibold">Recent Posts</h3>
                  <button 
                    onClick={() => setCurrentPage('posts')}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    View All
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Image</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Title</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {posts.slice(0, 5).map(post => (
                        <tr key={post.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3">
                            {post.images && post.images.length > 0 ? (
                              <img 
                                src={post.images[0]} 
                                alt={post.title}
                                className="w-12 h-12 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
                                <FileText className="w-5 h-5 text-slate-400" />
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 font-medium">{post.title}</td>
                          <td className="px-4 py-3">
                            <span className={`badge ${post.type === 'need' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                              {post.type === 'need' ? 'Buy' : 'Sell'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`badge ${post.status === 'active' ? 'bg-green-100 text-green-800' : post.status === 'completed' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                              {post.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )

      case 'users':
        return (
          <div className="animate-fadeIn">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div className="flex flex-wrap gap-3">
                <select 
                  className="form-select w-40"
                  value={userTypeFilter}
                  onChange={(e) => setUserTypeFilter(e.target.value)}
                >
                  <option value="">All Types</option>
                  <option value="needs">Needs</option>
                  <option value="offers">Offers</option>
                  <option value="both">Both</option>
                </select>
                <input
                  type="text"
                  placeholder="Search users..."
                  className="form-input w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="btn btn-secondary">
                <Download size={16} />
                Export
              </button>
            </div>

            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">User</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Location</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Rating</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Followers</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Products</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Joined</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Verified</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginate(filteredProfiles).map(profile => (
                      <Fragment key={profile.id}>
                      <tr 
                        className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition"
                        onClick={() => router.push(`/users/${profile.id}`)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-medium">
                              {getInitials(profile.display_name)}
                            </div>
                            <div>
                              <p className="font-medium">{profile.display_name}</p>
                              <p className="text-xs text-slate-500">{profile.bio?.slice(0, 30) || '-'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`badge ${profile.user_type === 'needs' ? 'bg-blue-100 text-blue-800' : profile.user_type === 'offers' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'}`}>
                            {profile.user_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{profile.location || '-'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {renderStars(profile.rating)}
                            <span className="ml-1 text-sm text-slate-600">{profile.rating?.toFixed(1) || '0.0'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{profile.follower_count || 0}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setExpandedUser(expandedUser === profile.id ? null : profile.id)
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm transition"
                            title="View products"
                          >
                            <Package size={14} />
                            {posts.filter(p => p.user_id === profile.id).length}
                            <ChevronDown size={14} className={`transition-transform ${expandedUser === profile.id ? 'rotate-180' : ''}`} />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{formatDate(profile.created_at)}</td>
                        <td className="px-4 py-3">
                          {profile.verified ? (
                            <span className="badge bg-green-100 text-green-800">Verified</span>
                          ) : (
                            <span className="badge bg-gray-100 text-gray-600">Pending</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleVerifyUser(profile.id, profile.verified)}
                              className="p-2 rounded-lg hover:bg-green-100 text-green-600"
                              title={profile.verified ? 'Unverify' : 'Verify'}
                            >
                              <Shield size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteUser(profile.id)}
                              className="p-2 rounded-lg hover:bg-red-100 text-red-600"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedUser === profile.id && (
                        <tr className="bg-slate-50/70">
                          <td colSpan={9} className="px-4 py-3">
                            <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                              <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-2 text-sm font-medium text-slate-700">
                                <Package size={16} className="text-slate-500" />
                                {profile.display_name}&apos;s Products
                              </div>
                              {posts.filter(p => p.user_id === profile.id).length === 0 ? (
                                <p className="px-4 py-3 text-sm text-slate-500">No products yet.</p>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="bg-slate-50">
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Title</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Type</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Category</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Price</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Created</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {posts.filter(p => p.user_id === profile.id).map(post => (
                                        <tr
                                          key={post.id}
                                          className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer"
                                          onClick={() => router.push(`/posts/${post.id}`)}
                                        >
                                          <td className="px-4 py-2 font-medium text-slate-800">{post.title}</td>
                                          <td className="px-4 py-2">
                                            <span className={`badge ${post.type === 'need' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>{post.type === 'need' ? 'Buy' : 'Sell'}</span>
                                          </td>
                                          <td className="px-4 py-2 text-slate-600">{post.category || '-'}</td>
                                          <td className="px-4 py-2 text-slate-600">{post.price ?? 0} Birr</td>
                                          <td className="px-4 py-2">
                                            <span className={`badge ${post.status === 'active' ? 'bg-green-100 text-green-800' : post.status === 'completed' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>{post.status}</span>
                                          </td>
                                          <td className="px-4 py-2 text-slate-600">{formatDate(post.created_at)}</td>
                                          <td className="px-4 py-2">
                                            <button
                                              onClick={(e) => { e.stopPropagation(); handleDeletePost(post.id) }}
                                              className="p-1.5 rounded-lg hover:bg-red-100 text-red-600"
                                              title="Delete"
                                            >
                                              <Trash2 size={14} />
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-slate-200 flex justify-between items-center">
                <p className="text-sm text-slate-500">
                  Showing {((currentPageNum - 1) * itemsPerPage) + 1} to {Math.min(currentPageNum * itemsPerPage, filteredProfiles.length)} of {filteredProfiles.length} users
                </p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setCurrentPageNum(Math.max(1, currentPageNum - 1))}
                    disabled={currentPageNum === 1}
                    className="btn btn-secondary btn-sm"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button 
                    onClick={() => setCurrentPageNum(Math.min(Math.ceil(filteredProfiles.length / itemsPerPage), currentPageNum + 1))}
                    disabled={currentPageNum >= Math.ceil(filteredProfiles.length / itemsPerPage)}
                    className="btn btn-secondary btn-sm"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )

      case 'posts':
        return (
          <div className="animate-fadeIn">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div className="flex flex-wrap gap-3">
                <select 
                  className="form-select w-40"
                  value={postTypeFilter}
                  onChange={(e) => setPostTypeFilter(e.target.value)}
                >
                  <option value="">All Types</option>
                  <option value="need">Buy</option>
                  <option value="offer">Sell</option>
                </select>
                <select 
                  className="form-select w-40"
                  value={postStatusFilter}
                  onChange={(e) => setPostStatusFilter(e.target.value)}
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="closed">Closed</option>
                </select>
                <input
                  type="text"
                  placeholder="Search posts..."
                  className="form-input w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setNewPost(prev => ({ ...prev, user_id: prev.user_id || profiles[0]?.id || '' }))
                    setCreateStep(0)
                    setNewPostFiles([])
                    setTitleSuggestions([])
                    setShowTitleSuggestions(false)
                    setDescriptionSuggestions([])
                    setShowDescriptionSuggestions(false)
                    setShowCreatePost(true)
                  }}
                  className="btn btn-primary"
                >
                  <Plus size={16} />
                  Create Post
                </button>
                <button className="btn btn-secondary">
                  <Download size={16} />
                  Export
                </button>
              </div>
            </div>

            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Image</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Title</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Price</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Likes</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Created</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginate(filteredPosts).map(post => (
                      <tr 
                        key={post.id} 
                        className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition"
                        onClick={() => router.push(`/posts/${post.id}`)}
                      >
                        <td className="px-4 py-3">
                          {post.images && post.images.length > 0 ? (
                            <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100">
                              <img 
                                src={post.images[0]} 
                                alt={post.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIGZpbGw9IiNlMmU4ZjAiLz48dGV4dCB4PSIzMiIgeT0iMzUiIGZvbnQtZmFtaWx5PSJhcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk0YTNiOCI+dGV4dDogaW1hZ2U8L3RleHQ+PC9zdmc+'
                                }}
                              />
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded-lg flex-shrink-0 bg-slate-100 flex items-center justify-center">
                              <FileText className="w-6 h-6 text-slate-400" />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium">{post.title}</p>
                            <p className="text-xs text-slate-500">{post.description?.slice(0, 40) || '-'}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`badge ${post.type === 'need' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                            {post.type === 'need' ? 'Buy' : 'Sell'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{post.category || '-'}</td>
                        <td className="px-4 py-3 text-slate-600">{post.price || 0} Birr</td>
                        <td className="px-4 py-3 text-slate-600">{post.likes_count || 0}</td>
                        <td className="px-4 py-3">
                          <span className={`badge ${post.status === 'active' ? 'bg-green-100 text-green-800' : post.status === 'completed' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                            {post.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{formatDate(post.created_at)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <select
                              value={post.status}
                              onChange={(e) => handleUpdatePostStatus(post.id, e.target.value as any)}
                              className="form-select w-28 text-sm"
                            >
                              <option value="active">Active</option>
                              <option value="completed">Completed</option>
                              <option value="closed">Closed</option>
                            </select>
                            <button 
                              onClick={() => handleDeletePost(post.id)}
                              className="p-2 rounded-lg hover:bg-red-100 text-red-600"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-slate-200 flex justify-between items-center">
                <p className="text-sm text-slate-500">
                  Showing {((currentPageNum - 1) * itemsPerPage) + 1} to {Math.min(currentPageNum * itemsPerPage, filteredPosts.length)} of {filteredPosts.length} posts
                </p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setCurrentPageNum(Math.max(1, currentPageNum - 1))}
                    disabled={currentPageNum === 1}
                    className="btn btn-secondary btn-sm"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button 
                    onClick={() => setCurrentPageNum(Math.min(Math.ceil(filteredPosts.length / itemsPerPage), currentPageNum + 1))}
                    disabled={currentPageNum >= Math.ceil(filteredPosts.length / itemsPerPage)}
                    className="btn btn-secondary btn-sm"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )

      case 'messages':
        return (
          <div className="animate-fadeIn">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div className="flex flex-wrap gap-3">
                <select 
                  className="form-select w-40"
                  value={messageReadFilter}
                  onChange={(e) => setMessageReadFilter(e.target.value)}
                >
                  <option value="">All Messages</option>
                  <option value="read">Read</option>
                  <option value="unread">Unread</option>
                </select>
                <input
                  type="text"
                  placeholder="Search messages..."
                  className="form-input w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="btn btn-secondary">
                <Download size={16} />
                Export
              </button>
            </div>

            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">From</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">To</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Message</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginate(filteredMessages).map(message => {
                      const sender = getProfileById(message.sender_id)
                      const receiver = getProfileById(message.receiver_id)
                      return (
                        <tr 
                          key={message.id} 
                          className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition"
                          onClick={() => router.push(`/messages/${message.id}`)}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-medium">
                                {sender ? getInitials(sender.display_name) : '?'}
                              </div>
                              <span className="font-medium">{sender?.display_name || 'Unknown'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-medium">
                                {receiver ? getInitials(receiver.display_name) : '?'}
                              </div>
                              <span className="font-medium">{receiver?.display_name || 'Unknown'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 max-w-xs">
                            <p className="truncate">{message.content}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`badge ${message.read ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                              {message.read ? 'Read' : 'Unread'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{formatRelativeTime(message.created_at)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {!message.read && (
                                <button 
                                  onClick={() => handleMarkAsRead(message.id)}
                                  className="p-2 rounded-lg hover:bg-blue-100 text-blue-600"
                                  title="Mark as read"
                                >
                                  <Check size={16} />
                                </button>
                              )}
                              <button 
                                onClick={() => handleDeleteMessage(message.id)}
                                className="p-2 rounded-lg hover:bg-red-100 text-red-600"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-slate-200 flex justify-between items-center">
                <p className="text-sm text-slate-500">
                  Showing {((currentPageNum - 1) * itemsPerPage) + 1} to {Math.min(currentPageNum * itemsPerPage, filteredMessages.length)} of {filteredMessages.length} messages
                </p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setCurrentPageNum(Math.max(1, currentPageNum - 1))}
                    disabled={currentPageNum === 1}
                    className="btn btn-secondary btn-sm"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button 
                    onClick={() => setCurrentPageNum(Math.min(Math.ceil(filteredMessages.length / itemsPerPage), currentPageNum + 1))}
                    disabled={currentPageNum >= Math.ceil(filteredMessages.length / itemsPerPage)}
                    className="btn btn-secondary btn-sm"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )

      case 'comments':
        return (
          <div className="animate-fadeIn">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div className="flex flex-wrap gap-3">
                <input
                  type="text"
                  placeholder="Search comments..."
                  className="form-input w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="btn btn-secondary">
                <Download size={16} />
                Export
              </button>
            </div>

            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">User</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Post</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Content</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginate(comments).map(comment => {
                      const user = getProfileById(comment.user_id)
                      const post = getPostById(comment.post_id)
                      return (
                        <tr 
                          key={comment.id} 
                          className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition"
                          onClick={() => router.push(`/comments/${comment.id}`)}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-medium">
                                {user ? getInitials(user.display_name) : '?'}
                              </div>
                              <span className="font-medium">{user?.display_name || 'Unknown'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600 max-w-xs">
                            <p className="truncate">{post?.title || 'Unknown Post'}</p>
                          </td>
                          <td className="px-4 py-3 max-w-xs">
                            <p className="truncate">{comment.content}</p>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{formatRelativeTime(comment.created_at)}</td>
                          <td className="px-4 py-3">
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteComment(comment.id); }}
                              className="p-2 rounded-lg hover:bg-red-100 text-red-600"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-slate-200 flex justify-between items-center">
                <p className="text-sm text-slate-500">
                  Showing {((currentPageNum - 1) * itemsPerPage) + 1} to {Math.min(currentPageNum * itemsPerPage, comments.length)} of {comments.length} comments
                </p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setCurrentPageNum(Math.max(1, currentPageNum - 1))}
                    disabled={currentPageNum === 1}
                    className="btn btn-secondary btn-sm"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button 
                    onClick={() => setCurrentPageNum(Math.min(Math.ceil(comments.length / itemsPerPage), currentPageNum + 1))}
                    disabled={currentPageNum >= Math.ceil(comments.length / itemsPerPage)}
                    className="btn btn-secondary btn-sm"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )

      case 'ratings':
        return (
          <div className="animate-fadeIn">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div className="flex flex-wrap gap-3">
                <input
                  type="text"
                  placeholder="Search ratings..."
                  className="form-input w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="btn btn-secondary">
                <Download size={16} />
                Export
              </button>
            </div>

            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Rater</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Rated User</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Rating</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginate(ratings).map(rating => {
                      const rater = getProfileById(rating.rater_id)
                      const ratedUser = getProfileById(rating.rated_user_id)
                      return (
                        <tr 
                          key={rating.id} 
                          className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition"
                          onClick={() => router.push(`/ratings/${rating.id}`)}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-medium">
                                {rater ? getInitials(rater.display_name) : '?'}
                              </div>
                              <span className="font-medium">{rater?.display_name || 'Unknown'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-medium">
                                {ratedUser ? getInitials(ratedUser.display_name) : '?'}
                              </div>
                              <span className="font-medium">{ratedUser?.display_name || 'Unknown'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {renderStars(rating.rating)}
                              <span className="ml-1 text-sm font-medium">{rating.rating}.0</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{formatDate(rating.created_at)}</td>
                          <td className="px-4 py-3">
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteRating(rating.id); }}
                              className="p-2 rounded-lg hover:bg-red-100 text-red-600"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-slate-200 flex justify-between items-center">
                <p className="text-sm text-slate-500">
                  Showing {((currentPageNum - 1) * itemsPerPage) + 1} to {Math.min(currentPageNum * itemsPerPage, ratings.length)} of {ratings.length} ratings
                </p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setCurrentPageNum(Math.max(1, currentPageNum - 1))}
                    disabled={currentPageNum === 1}
                    className="btn btn-secondary btn-sm"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button 
                    onClick={() => setCurrentPageNum(Math.min(Math.ceil(ratings.length / itemsPerPage), currentPageNum + 1))}
                    disabled={currentPageNum >= Math.ceil(ratings.length / itemsPerPage)}
                    className="btn btn-secondary btn-sm"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )

      case 'analytics':
        return (
          <div className="animate-fadeIn">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="card p-6">
                <h3 className="text-lg font-semibold mb-4">Users Over Time</h3>
                <div className="h-64">
                  <Bar 
                    data={{
                      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                      datasets: [{
                        label: 'New Users',
                        data: [12, 19, 15, 25, 22, 30],
                        backgroundColor: '#3b82f6'
                      }]
                    }} 
                    options={chartOptions} 
                  />
                </div>
              </div>
              <div className="card p-6">
                <h3 className="text-lg font-semibold mb-4">Posts Over Time</h3>
                <div className="h-64">
                  <Bar 
                    data={{
                      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                      datasets: [{
                        label: 'New Posts',
                        data: [8, 12, 10, 18, 15, 22],
                        backgroundColor: '#10b981'
                      }]
                    }} 
                    options={chartOptions} 
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="card p-6">
                <h3 className="text-lg font-semibold mb-4">Posts by Type</h3>
                <div className="h-64">
                  <Doughnut data={postsChartData} options={chartOptions} />
                </div>
              </div>
              <div className="card p-6">
                <h3 className="text-lg font-semibold mb-4">User Types Distribution</h3>
                <div className="h-64">
                  <Doughnut 
                    data={{
                      labels: ['Needs', 'Offers', 'Both'],
                      datasets: [{
                        data: [
                          profiles.filter(p => p.user_type === 'needs').length,
                          profiles.filter(p => p.user_type === 'offers').length,
                          profiles.filter(p => p.user_type === 'both').length
                        ],
                        backgroundColor: ['#3b82f6', '#10b981', '#8b5cf6'],
                        borderWidth: 0
                      }]
                    }} 
                    options={chartOptions} 
                  />
                </div>
              </div>
            </div>
            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-4">Summary Statistics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500">Total Users</p>
                  <p className="text-2xl font-bold">{profiles.length}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500">Verified Users</p>
                  <p className="text-2xl font-bold">{profiles.filter(p => p.verified).length}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500">Active Posts</p>
                  <p className="text-2xl font-bold">{posts.filter(p => p.status === 'active').length}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500">Avg Rating</p>
                  <p className="text-2xl font-bold">
                    {(profiles.reduce((sum, p) => sum + (p.rating || 0), 0) / profiles.filter(p => (p.rating || 0) > 0).length || 0).toFixed(1)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )

      case 'settings':
        return (
          <div className="animate-fadeIn">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card p-6">
                <h3 className="text-lg font-semibold mb-4">Supabase Configuration</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Supabase URL</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      defaultValue={process.env.NEXT_PUBLIC_SUPABASE_URL || ''}
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Supabase Anon Key</label>
                    <input 
                      type="password" 
                      className="form-input" 
                      defaultValue={supabaseAnonKey.substring(0, 20) + '...'}
                      readOnly
                    />
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg text-green-700 text-sm">
                    ✓ Connected to Supabase
                  </div>
                </div>
              </div>
              <div className="card p-6">
                <h3 className="text-lg font-semibold mb-4">Database Status</h3>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">Profiles</span>
                    <span className="font-medium">{profiles.length} records</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">Posts</span>
                    <span className="font-medium">{posts.length} records</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">Messages</span>
                    <span className="font-medium">{messages.length} records</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">Comments</span>
                    <span className="font-medium">{comments.length} records</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-600">Ratings</span>
                    <span className="font-medium">{ratings.length} records</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside 
        className={`fixed left-0 top-0 h-full bg-slate-800 text-white transition-all duration-300 z-50 ${
          sidebarOpen ? 'w-64' : 'w-16'
        }`}
      >
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center">
              <UsersRound className="w-6 h-6" />
            </div>
            {sidebarOpen && (
              <div>
                <h1 className="font-bold text-lg">ShareHub</h1>
                <span className="text-xs text-slate-400">ADMIN</span>
              </div>
            )}
          </div>
        </div>
        
        <nav className="p-3 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  currentPage === item.id 
                    ? 'bg-primary-600 text-white' 
                    : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <Icon size={20} />
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            )
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-slate-700 space-y-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
          >
            <LogOut size={20} />
            {sidebarOpen && <span>Logout</span>}
          </button>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
          >
            {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
            {sidebarOpen && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        {/* Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-slate-100"
              >
                <Menu size={20} />
              </button>
              <h2 className="text-xl font-semibold text-slate-800">
                {navItems.find(n => n.id === currentPage)?.label}
              </h2>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-10 pr-4 py-2 w-64 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <button 
                onClick={handleRefresh}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
                title="Refresh"
                disabled={loading}
              >
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              </button>
              
              <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 relative">
                <Bell size={20} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              
              <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium">
                  A
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium">Administrator</p>
                  <p className="text-xs text-slate-500">Super Admin</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">
          {!dataLoaded && loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="spinner mx-auto mb-4"></div>
                <p className="text-slate-500">Loading data from Supabase...</p>
              </div>
            </div>
          ) : (
            renderPage()
          )}
        </div>
      </main>

      {/* Create Post Modal — 4-step wizard matching the mobile app */}
      {showCreatePost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Step header */}
            <div className="px-6 pt-6 pb-5 bg-primary-600 text-white sticky top-0 z-10">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                  <WizardStepIcon step={createStep} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white/85">
                    Step {createStep + 1} of {STEP_TITLES.length}
                  </p>
                  <h3 className="text-xl font-extrabold tracking-tight">
                    {STEP_TITLES[createStep]}
                  </h3>
                </div>
                <button
                  onClick={closeCreatePost}
                  className="p-2 -m-1 rounded-lg hover:bg-white/20 text-white shrink-0"
                  aria-label="Close create post"
                >
                  <XCircle size={20} />
                </button>
              </div>
              <p className="mt-1.5 text-[13px] leading-snug text-white/90">
                {STEP_SUBTITLES[createStep]}
              </p>
              <div className="mt-4 flex gap-1.5">
                {STEP_TITLES.map((_, index) => (
                  <div
                    key={index}
                    className={`h-1.5 flex-1 rounded-full ${
                      index <= createStep ? 'bg-white' : 'bg-white/30'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="p-6 space-y-4">
              {createStep === 0 && (
                <>
                  {/* Intent */}
                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary-50 text-primary-600">
                        <ArrowLeftRight size={18} />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-slate-800">
                          What do you want to do?
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Choose whether you are buying or selling
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
                      <button
                        type="button"
                        onClick={() => handleTypeChange('need')}
                        className={`flex items-center justify-center gap-2 rounded-md py-2.5 text-sm font-medium transition ${
                          newPost.type === 'need'
                            ? 'bg-white text-primary-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        <ShoppingBag size={18} />
                        Buying
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTypeChange('offer')}
                        className={`flex items-center justify-center gap-2 rounded-md py-2.5 text-sm font-medium transition ${
                          newPost.type === 'offer'
                            ? 'bg-white text-primary-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        <Tag size={18} />
                        Selling
                      </button>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary-50 text-primary-600">
                        <PenLine size={18} />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-slate-800">Details</h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Describe what you are posting
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Title <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            maxLength={100}
                            className="form-input w-full pr-11"
                            placeholder="What do you want to buy or sell?"
                            value={newPost.title}
                            onChange={(e) => handleTitleChange(e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={toggleTitleSuggestions}
                            className="absolute right-1.5 top-1/2 z-10 -translate-y-1/2 p-1.5 rounded-full hover:bg-primary-50 text-primary-600"
                            aria-label="Get title suggestions"
                          >
                            <Sparkles size={18} />
                          </button>
                        </div>
                        {showTitleSuggestions && titleSuggestions.length > 0 && (
                          <SuggestionBox
                            title="AI title suggestions"
                            suggestions={titleSuggestions}
                            onSelect={handleSelectTitle}
                            onDismiss={() => {
                              setTitleSuggestions([])
                              setShowTitleSuggestions(false)
                            }}
                          />
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Description
                        </label>
                        <textarea
                          className="form-input w-full"
                          rows={4}
                          maxLength={500}
                          placeholder="Add more details..."
                          value={newPost.description}
                          onChange={(e) => setNewPost({ ...newPost, description: e.target.value })}
                        />
                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-xs text-slate-500">Not sure what to write?</span>
                          <button
                            type="button"
                            onClick={handleSuggestDescription}
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
                          >
                            <Sparkles size={14} />
                            Suggest
                          </button>
                        </div>
                        {showDescriptionSuggestions && descriptionSuggestions.length > 0 && (
                          <SuggestionBox
                            title="AI description suggestions"
                            suggestions={descriptionSuggestions}
                            onSelect={handleSelectDescription}
                            onDismiss={() => {
                              setDescriptionSuggestions([])
                              setShowDescriptionSuggestions(false)
                            }}
                            previewLines={3}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {createStep === 1 && (
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary-50 text-primary-600">
                      <Camera size={18} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-slate-800">Photos</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {isSelling
                          ? 'Required — add at least one photo'
                          : 'Optional — listings with photos sell faster'}
                      </p>
                    </div>
                  </div>

                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={e => {
                      handleAddPhotos(e.target.files)
                      e.target.value = ''
                    }}
                  />

                  <div className="mt-3">
                    {photoPreviews.length === 0 ? (
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="w-full h-[148px] rounded-xl border-2 border-dashed border-primary-500/40 bg-primary-50 flex flex-col items-center justify-center gap-1.5 text-primary-600 hover:bg-primary-100 transition"
                      >
                        <span className="p-3 rounded-full bg-primary-100">
                          <ImagePlus size={26} />
                        </span>
                        <span className="text-sm font-semibold">Add photos</span>
                        <span className="text-xs text-slate-500">Up to 5 images</span>
                      </button>
                    ) : (
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {photoPreviews.map((preview, index) => (
                          <div
                            key={`${preview.file.name}-${index}`}
                            className="relative shrink-0 w-[104px] h-[104px] rounded-lg overflow-hidden border border-slate-200"
                          >
                            <img
                              src={preview.url}
                              alt={preview.file.name}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(index)}
                              className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-black transition"
                              aria-label="Remove photo"
                            >
                              <XCircle size={16} />
                            </button>
                          </div>
                        ))}
                        {photoPreviews.length < 5 && (
                          <button
                            type="button"
                            onClick={() => photoInputRef.current?.click()}
                            className="shrink-0 w-[104px] h-[104px] rounded-lg border-2 border-dashed border-primary-500/40 bg-primary-50 text-primary-600 flex flex-col items-center justify-center hover:bg-primary-100 transition"
                          >
                            <ImagePlus size={22} />
                            <span className="text-xs mt-1">Add</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {createStep === 2 && (
                <>
                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary-50 text-primary-600">
                        <LayoutGrid size={18} />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-slate-800">
                          Category &amp; Location
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Help the right people find you
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Category
                        </label>
                        <select
                          className="form-select w-full"
                          value={newPost.category}
                          onChange={e => setNewPost({ ...newPost, category: e.target.value })}
                        >
                          <option value="">Select a category</option>
                          {POST_CATEGORIES.map(category => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                        {!newPost.category && (
                          <p className="text-xs text-slate-400 mt-1">
                            Picked for you automatically once your title is specific enough
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Location
                        </label>
                        <div className="relative">
                          <MapPin className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 w-4 h-4 text-slate-500" />
                          <input
                            type="text"
                            className="form-input w-full pl-9 pr-10"
                            placeholder="Search area, e.g. Bole, Addis Ababa"
                            value={newPost.location}
                            onChange={e => handleLocationChange(e.target.value)}
                            autoComplete="off"
                          />
                          {locationSearching ? (
                            <Loader2 className="pointer-events-none absolute right-3 top-1/2 z-10 -translate-y-1/2 w-4 h-4 text-primary-600 animate-spin" />
                          ) : newPost.location ? (
                            <button
                              type="button"
                              onClick={() => handleLocationChange('')}
                              className="absolute right-2.5 top-1/2 z-10 -translate-y-1/2 rounded p-0.5 text-slate-500 hover:text-slate-700"
                              aria-label="Clear location"
                            >
                              <X size={16} />
                            </button>
                          ) : (
                            <Map
                              className="pointer-events-none absolute right-3 top-1/2 z-10 -translate-y-1/2 w-4 h-4 text-slate-500"
                              aria-hidden
                            />
                          )}

                          {locationSuggestions.length > 0 && (
                            <div className="absolute z-20 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                              {locationSuggestions.map((place, index) => (
                                <button
                                  key={`${place.name}-${index}`}
                                  type="button"
                                  onClick={() => handleSelectLocation(place)}
                                  className="w-full flex items-start gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 border-b border-slate-100 last:border-0"
                                >
                                  <MapPin size={16} className="mt-0.5 shrink-0 text-primary-600" />
                                  <span className="line-clamp-2">{place.name}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="mt-2 flex items-center justify-between gap-3">
                          <button
                            type="button"
                            onClick={handleUseCurrentLocation}
                            disabled={locationLocating}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50"
                          >
                            {locationLocating ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Crosshair size={14} />
                            )}
                            {locationLocating ? 'Getting your location…' : 'Use my current location'}
                          </button>
                          <span className="text-xs text-slate-400">
                            Type 3+ letters and pick a suggestion
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary-50 text-primary-600">
                        <DollarSign size={18} />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-slate-800">
                          {isSelling ? 'Price & Condition' : 'Budget & Urgency'}
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {isSelling ? 'Set your asking price' : 'Tell sellers your budget'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          {isSelling ? 'Price (Required)' : 'Max Budget (Required)'}
                        </label>
                        <div className="relative">
                          <Tag className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 w-4 h-4 text-slate-500" />
                          <input
                            type="number"
                            min="0"
                            step="any"
                            className="form-input w-full pl-9"
                            placeholder={isSelling ? 'e.g. 500 Birr' : 'e.g. 1000 Birr'}
                            value={newPost.price}
                            onChange={e => setNewPost({ ...newPost, price: e.target.value })}
                          />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {isSelling
                            ? 'What is your asking price in Birr?'
                            : 'What is your maximum budget in Birr?'}
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          {isSelling ? 'Condition (Optional)' : 'Urgency (Optional)'}
                        </label>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-slate-500">
                            {isSelling ? <BadgeCheck size={16} /> : <Clock size={16} />}
                          </span>
                          {isSelling ? (
                            <select
                              className="form-select w-full pl-9"
                              value={newPost.condition}
                              onChange={e => setNewPost({ ...newPost, condition: e.target.value })}
                            >
                              <option value="">Select condition</option>
                              {CONDITIONS.map(condition => (
                                <option key={condition} value={condition}>
                                  {condition}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <select
                              className="form-select w-full pl-9"
                              value={newPost.urgency}
                              onChange={e => setNewPost({ ...newPost, urgency: e.target.value })}
                            >
                              <option value="">How soon do you need this?</option>
                              {URGENCIES.map(urgency => (
                                <option key={urgency} value={urgency}>
                                  {urgency}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {createStep === 3 && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 p-4">
                    {photoPreviews.length > 0 && (
                      <div className="pb-3 mb-3 border-b border-slate-100">
                        <p className="text-xs font-medium text-slate-500 mb-2">Photos</p>
                        <div className="flex gap-2 overflow-x-auto">
                          {photoPreviews.map((preview, index) => (
                            <div
                              key={`${preview.file.name}-${index}`}
                              className="shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-slate-200"
                            >
                              <img
                                src={preview.url}
                                alt={preview.file.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <ReviewRow icon={ArrowLeftRight} label="Type" value={INTENT_LABELS[newPost.type]} />
                    <ReviewRow icon={TypeIcon} label="Title" value={newPost.title.trim()} />
                    {newPost.description.trim() && (
                      <ReviewRow icon={AlignLeft} label="Description" value={newPost.description.trim()} />
                    )}
                    {newPost.category && (
                      <ReviewRow icon={LayoutGrid} label="Category" value={newPost.category} />
                    )}
                    {newPost.location.trim() && (
                      <ReviewRow icon={MapPin} label="Location" value={newPost.location.trim()} />
                    )}
                    <ReviewRow
                      icon={DollarSign}
                      label={isSelling ? 'Price' : 'Max budget'}
                      value={newPost.price ? `${newPost.price} Birr` : ''}
                    />
                    {isSelling && newPost.condition && (
                      <ReviewRow icon={BadgeCheck} label="Condition" value={newPost.condition} />
                    )}
                    {!isSelling && newPost.urgency && (
                      <ReviewRow icon={Clock} label="Urgency" value={newPost.urgency} />
                    )}
                  </div>

                  <div className="rounded-xl border border-primary-200 bg-primary-50 p-4 flex items-start gap-3">
                    <Lightbulb size={20} className="mt-0.5 shrink-0 text-primary-600" />
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Looks good! Tap Publish Post to make it live.
                    </p>
                  </div>

                  {/* Admin-only controls (the app has no equivalent) */}
                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-slate-100 text-slate-500">
                        <Shield size={18} />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-slate-800">Admin</h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Choose who owns this post and its status
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Post Owner
                        </label>
                        <select
                          className="form-select w-full"
                          value={newPost.user_id}
                          onChange={e => setNewPost({ ...newPost, user_id: e.target.value })}
                        >
                          <option value="">Select a user...</option>
                          {profiles.map(profile => (
                            <option key={profile.id} value={profile.id}>
                              {profile.display_name} ({profile.user_type})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Status
                        </label>
                        <select
                          className="form-select w-full"
                          value={newPost.status}
                          onChange={e =>
                            setNewPost({
                              ...newPost,
                              status: e.target.value as 'active' | 'completed' | 'closed',
                            })
                          }
                        >
                          <option value="active">Active</option>
                          <option value="completed">Completed</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 sticky bottom-0">
              {createStep > 0 && (
                <button
                  type="button"
                  onClick={handleStepBack}
                  className="btn btn-secondary px-4"
                  disabled={creatingPost}
                  aria-label="Back"
                >
                  <ChevronLeft size={20} />
                </button>
              )}
              <button
                type="button"
                onClick={isLastCreateStep ? handleCreatePost : handleStepNext}
                className="btn btn-primary flex-1"
                disabled={creatingPost}
              >
                {creatingPost
                  ? 'Creating...'
                  : isLastCreateStep
                    ? 'Publish Post'
                    : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 toast ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>
          {toast.type === 'success' ? <Check size={20} /> : <XCircle size={20} />}
          {toast.message}
        </div>
      )}
    </div>
  )
}
