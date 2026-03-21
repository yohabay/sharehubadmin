'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, User, MapPin, Calendar, Star, 
  CheckCircle, XCircle, MessageSquare, Heart,
  Settings, Trash2, Edit, Shield, Eye, EyeOff,
  Users, FileText, Save, X, RefreshCw
} from 'lucide-react';

interface UserProfile {
  id: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  location: string;
  user_type: string;
  verified: boolean;
  rating: number;
  follower_count: number;
  following_count: number;
  post_count: number;
  is_admin: boolean;
  created_at: string;
}

interface Post {
  id: string;
  title: string;
  description: string;
  type: string;
  category: string;
  status: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
}

interface Activity {
  id: string;
  type: string;
  description: string;
  created_at: string;
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  
  const [user, setUser] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'posts' | 'activity'>('overview');
  const [editing, setEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState({
    display_name: '',
    bio: '',
    location: '',
    user_type: 'both',
    verified: false,
    is_admin: false,
    phone: '',
  });

  const supabaseClient = supabase!;

  useEffect(() => {
    if (userId) {
      fetchUser();
      fetchUserPosts();
    }
  }, [userId]);

  async function fetchUser() {
    setLoading(true);
    const { data } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      setUser(data);
      setFormData({
        display_name: data.display_name || '',
        bio: data.bio || '',
        location: data.location || '',
        user_type: data.user_type || 'both',
        verified: data.verified || false,
        is_admin: data.is_admin || false,
        phone: data.phone || '',
      });
    }
    setLoading(false);
  }

  async function fetchUserPosts() {
    const { data } = await supabaseClient
      .from('posts')
      .select('id, title, description, type, category, status, likes_count, comments_count, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (data) setPosts(data);
  }

  async function handleSave() {
    setSaving(true);
    const { error } = await supabaseClient
      .from('profiles')
      .update({
        display_name: formData.display_name,
        bio: formData.bio,
        location: formData.location,
        user_type: formData.user_type,
        verified: formData.verified,
        is_admin: formData.is_admin,
        phone: formData.phone,
      })
      .eq('id', userId);

    if (!error) {
      setEditing(false);
      fetchUser();
    }
    setSaving(false);
  }

  async function handleVerifyToggle() {
    const newVerified = !formData.verified;
    setFormData({ ...formData, verified: newVerified });
    await supabaseClient
      .from('profiles')
      .update({ verified: newVerified })
      .eq('id', userId);
    fetchUser();
  }

  async function handleAdminToggle() {
    const newAdmin = !formData.is_admin;
    setFormData({ ...formData, is_admin: newAdmin });
    await supabaseClient
      .from('profiles')
      .update({ is_admin: newAdmin })
      .eq('id', userId);
    fetchUser();
  }

  async function handleDelete() {
    setSaving(true);
    const { error } = await supabaseClient
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (!error) {
      router.push('/?tab=users');
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-600">Loading user...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-slate-200 flex items-center justify-center">
            <User className="w-12 h-12 text-slate-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">User not found</h2>
          <button 
            onClick={() => router.back()}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => router.back()}
                className="p-2 hover:bg-slate-100 rounded-xl transition"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-900">User Management</h1>
                <p className="text-sm text-slate-500">View and manage user profile</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {editing ? (
                <>
                  <button
                    onClick={() => setEditing(false)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
                >
                  <Edit className="w-4 h-4" />
                  Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Card */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Avatar */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="text-center">
                <div className="relative inline-block">
                  <div className="w-28 h-28 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.display_name} className="w-full h-full rounded-2xl object-cover" />
                    ) : (
                      user.display_name?.charAt(0).toUpperCase() || 'U'
                    )}
                  </div>
                  {user.verified && (
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center border-4 border-white">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>
                
                <h2 className="mt-4 text-xl font-bold text-slate-900">{user.display_name}</h2>
                
                <div className="flex items-center justify-center gap-2 mt-2">
                  {user.is_admin && (
                    <span className="flex items-center gap-1 bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
                      <Shield className="w-4 h-4" /> Administrator
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-center gap-4 mt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-900">{user.post_count || 0}</div>
                    <div className="text-xs text-slate-500">Posts</div>
                  </div>
                  <div className="w-px h-10 bg-slate-200"></div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-900">{user.follower_count || 0}</div>
                    <div className="text-xs text-slate-500">Followers</div>
                  </div>
                  <div className="w-px h-10 bg-slate-200"></div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-900">{user.following_count || 0}</div>
                    <div className="text-xs text-slate-500">Following</div>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-amber-50 rounded-xl">
                  <div className="flex items-center justify-center gap-2">
                    <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                    <span className="font-bold text-amber-700">{user.rating?.toFixed(1) || '0.0'}</span>
                    <span className="text-amber-600">rating</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Admin Actions */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Admin Controls</h3>
              <div className="space-y-3">
                <button
                  onClick={handleVerifyToggle}
                  className="w-full flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition"
                >
                  <div className="flex items-center gap-3">
                    {formData.verified ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-slate-400" />
                    )}
                    <span className="font-medium">Verified Account</span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm ${formData.verified ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                    {formData.verified ? 'Yes' : 'No'}
                  </span>
                </button>

                <button
                  onClick={handleAdminToggle}
                  className="w-full flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition"
                >
                  <div className="flex items-center gap-3">
                    <Shield className={`w-5 h-5 ${formData.is_admin ? 'text-purple-600' : 'text-slate-400'}`} />
                    <span className="font-medium">Admin Access</span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm ${formData.is_admin ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-600'}`}>
                    {formData.is_admin ? 'Admin' : 'User'}
                  </span>
                </button>

                <hr className="my-3" />

                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition"
                >
                  <Trash2 className="w-5 h-5" />
                  <span className="font-medium">Delete User</span>
                </button>
              </div>
            </div>

            {/* User Info */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-500">Location</label>
                  <div className="flex items-center gap-2 mt-1">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span>{user.location || 'Not specified'}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-slate-500">Member Since</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>{user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-slate-500">User Type</label>
                  <div className="mt-1">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      user.user_type === 'both' ? 'bg-purple-100 text-purple-700' :
                      user.user_type === 'needs' ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {user.user_type === 'both' ? 'Needs & Offers' : 
                       user.user_type === 'needs' ? 'Needs' : 'Offers'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Main Content */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="bg-white rounded-2xl shadow-sm mb-6">
              <div className="border-b">
                <nav className="flex px-4">
                  {['overview', 'posts', 'activity'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab as any)}
                      className={`px-4 py-4 font-medium border-b-2 transition ${
                        activeTab === tab 
                          ? 'border-blue-600 text-blue-600' 
                          : 'border-transparent text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-6">
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Bio */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Bio</label>
                      {editing ? (
                        <textarea
                          value={formData.bio}
                          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                          rows={4}
                          className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Write a bio..."
                        />
                      ) : (
                        <div className="p-4 bg-slate-50 rounded-xl text-slate-700">
                          {user.bio || 'No bio available'}
                        </div>
                      )}
                    </div>

                    {/* Edit Form */}
                    {editing && (
                      <div className="space-y-4 pt-4 border-t">
                        <h4 className="font-semibold text-slate-900">Edit Information</h4>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Display Name</label>
                          <input
                            type="text"
                            value={formData.display_name}
                            onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                            className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Location</label>
                          <input
                            type="text"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="City, Country"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">User Type</label>
                          <select
                            value={formData.user_type}
                            onChange={(e) => setFormData({ ...formData, user_type: e.target.value })}
                            className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="both">Both (Needs & Offers)</option>
                            <option value="needs">Needs Only</option>
                            <option value="offers">Offers Only</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Phone</label>
                          <input
                            type="text"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Phone number"
                          />
                        </div>
                      </div>
                    )}

                    {/* User ID */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">User ID</label>
                      <p className="text-slate-500 text-sm font-mono bg-slate-100 p-3 rounded-xl break-all">{user.id}</p>
                    </div>
                  </div>
                )}

                {activeTab === 'posts' && (
                  <div>
                    {posts.length > 0 ? (
                      <div className="grid gap-4">
                        {posts.map((post) => (
                          <div 
                            key={post.id}
                            className="p-4 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer transition"
                            onClick={() => router.push(`/posts/${post.id}`)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    post.type === 'need' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                                  }`}>
                                    {post.type === 'need' ? 'Need' : 'Offer'}
                                  </span>
                                  <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700">
                                    {post.category}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded text-xs ${
                                    post.status === 'active' ? 'bg-green-100 text-green-700' :
                                    post.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-slate-100 text-slate-700'
                                  }`}>
                                    {post.status}
                                  </span>
                                </div>
                                <h4 className="font-semibold text-slate-900">{post.title}</h4>
                                <p className="text-slate-500 text-sm mt-1 line-clamp-2">{post.description}</p>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-slate-500 ml-4">
                                <span className="flex items-center gap-1">
                                  <Heart className="w-4 h-4" /> {post.likes_count || 0}
                                </span>
                                <span className="flex items-center gap-1">
                                  <MessageSquare className="w-4 h-4" /> {post.comments_count || 0}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">No posts yet</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'activity' && (
                  <div className="text-center py-12">
                    <RefreshCw className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">Activity log coming soon</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Delete User?</h3>
              <p className="text-slate-600 mb-6">
                This will permanently delete {user.display_name}'s account and all associated data. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50"
                >
                  {saving ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
