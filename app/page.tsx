'use client'

import { useState, useEffect, useCallback } from 'react'

// Global error handler for uncaught promise rejections
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason)
    event.preventDefault()
  })

  window.onerror = (message, source, lineno, colno, error) => {
    console.error('Global error:', { message, source, lineno, colno, error })
    return false
  }
}
import { useRouter } from 'next/navigation'
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
  XCircle,
  Download,
  UsersRound,
  MessageCircle,
  Shield,
  LogOut
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
  LineElement,
  Filler
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
  LineElement,
  Filler
)

// Supabase client - use environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fbmvuhcrvswbttbhioux.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZibXZ1aGNydnN3YnR0Ymhpb3V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3ODIzMzcsImV4cCI6MjA3OTM1ODMzN30.7RYZa52neesxSUJ8vKbWD-MUGIa1hj0-za2fjxv0Cwo'
const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
  const [isLoadingAuth, setIsLoadingAuth] = useState(true)
  const itemsPerPage = 10

  // Check authentication
  useEffect(() => {
    const checkAuth = () => {
      try {
        const session = localStorage.getItem('admin_session')
        if (!session || session === 'null' || session === 'undefined' || session === 'null') {
          router.push('/login')
          return
        }
        const parsedSession = JSON.parse(session)
        if (!parsedSession || !parsedSession.access_token) {
          router.push('/login')
          return
        }
        setIsAuthenticated(true)
      } catch (error) {
        console.error('Session parsing error:', error)
        localStorage.removeItem('admin_session')
        router.push('/login')
      } finally {
        setIsLoadingAuth(false)
      }
    }
    checkAuth()
  }, [router])

  // Fetch data from Supabase
  const fetchData = useCallback(async () => {
    if (!supabase) {
      console.error('Supabase client not initialized')
      setLoading(false)
      return
    }
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

      setDataLoaded(true)
      showToast('Data loaded successfully from Supabase', 'success')
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

  // Logout function
  const handleLogout = () => {
    localStorage.removeItem('admin_session')
    router.push('/login')
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
    labels: ['Needs', 'Offers'],
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

  // Show loading while checking authentication
  if (isLoadingAuth || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
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
                              {post.type}
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
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Joined</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Verified</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginate(filteredProfiles).map(profile => (
                      <tr 
                        key={profile.id} 
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
                  <option value="need">Need</option>
                  <option value="offer">Offer</option>
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
                            {post.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{post.category || '-'}</td>
                        <td className="px-4 py-3 text-slate-600">${post.price || 0}</td>
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
                      defaultValue={supabaseUrl}
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
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
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
