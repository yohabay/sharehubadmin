'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// Create client with fallback values
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fbmvuhcrvswbttbhioux.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZibXZ1aGNydnN3YnR0Ymhpb3V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3ODIzMzcsImV4cCI6MjA3OTM1ODMzN30.7RYZa52neesxSUJ8vKbWD-MUGIa1hj0-za2fjxv0Cwo'
const supabase = createClient(supabaseUrl, supabaseAnonKey)
import { 
  ArrowLeft, Heart, MessageSquare, Share2, MapPin, 
  Calendar, Edit, Trash2, CheckCircle, XCircle, Eye,
  FileText, Save, X, Image, DollarSign, Tag
} from 'lucide-react';

interface PostDetail {
  id: string;
  user_id: string;
  type: string;
  title: string;
  description: string;
  category: string;
  location: string;
  price: number;
  images: string[];
  status: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
  user?: {
    display_name: string;
    avatar_url: string;
    verified: boolean;
    rating: number;
  };
}

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: {
    display_name: string;
    avatar_url: string;
  };
}

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;
  
  const [post, setPost] = useState<PostDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'comments'>('details');
  const [editing, setEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    location: '',
    price: 0,
    status: 'active',
  });

  useEffect(() => {
    if (postId) {
      fetchPost();
      fetchComments();
    }
  }, [postId]);

  async function fetchPost() {
    setLoading(true);
    
    const { data: postData } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (postData) {
      const { data: userData } = await supabase
        .from('profiles')
        .select('display_name, avatar_url, verified, rating')
        .eq('id', postData.user_id)
        .single();

      setPost({ ...postData, user: userData });
      setFormData({
        title: postData.title || '',
        description: postData.description || '',
        category: postData.category || '',
        location: postData.location || '',
        price: postData.price || 0,
        status: postData.status || 'active',
      });
    }
    setLoading(false);
  }

  async function fetchComments() {
    const { data } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: false });

    if (data) {
      const commentsWithUsers = await Promise.all(
        data.map(async (comment) => {
          const { data: userData } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('id', comment.user_id)
            .single();
          return { ...comment, user: userData };
        })
      );
      setComments(commentsWithUsers);
    }
  }

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from('posts')
      .update({
        title: formData.title,
        description: formData.description,
        category: formData.category,
        location: formData.location,
        price: formData.price,
        status: formData.status,
      })
      .eq('id', postId);

    if (!error) {
      setEditing(false);
      fetchPost();
    }
    setSaving(false);
  }

  async function handleStatusChange(newStatus: string) {
    setFormData({ ...formData, status: newStatus });
    await supabase
      .from('posts')
      .update({ status: newStatus })
      .eq('id', postId);
    fetchPost();
  }

  async function handleDelete() {
    setSaving(true);
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);

    if (!error) {
      router.push('/?tab=posts');
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-600">Loading post...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-slate-200 flex items-center justify-center">
            <FileText className="w-12 h-12 text-slate-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Post not found</h2>
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
                <h1 className="text-xl font-bold text-slate-900">Post Management</h1>
                <p className="text-sm text-slate-500">View and manage post</p>
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
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
                >
                  <Edit className="w-4 h-4" />
                  Edit Post
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Images */}
            {post.images && post.images.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 border-b">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <Image className="w-5 h-5" />
                    Images ({post.images.length})
                  </h3>
                </div>
                <div className="p-4">
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {post.images.map((img, idx) => (
                      <div 
                        key={idx}
                        className="flex-shrink-0 w-40 h-40 rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition"
                        onClick={() => setSelectedImage(img)}
                      >
                        <img 
                          src={img} 
                          alt={`Post image ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Post Details Card */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6">
                {/* Type & Category */}
                <div className="flex items-center gap-2 mb-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    post.type === 'need' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {post.type === 'need' ? 'Need Help' : 'Offering Help'}
                  </span>
                  <span className="px-3 py-1 rounded-full text-sm bg-slate-100 text-slate-700">
                    {post.category}
                  </span>
                  
                  {/* Status Dropdown */}
                  <div className="relative ml-auto">
                    <select
                      value={formData.status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      className={`px-3 py-1 rounded-full text-sm font-medium border-0 cursor-pointer ${
                        post.status === 'active' ? 'bg-green-100 text-green-700' :
                        post.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        post.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-700'
                      }`}
                    >
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>

                {/* Title */}
                {editing ? (
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full text-2xl font-bold border border-slate-300 rounded-xl px-4 py-3 mb-4 focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">{post.title}</h2>
                )}

                {/* Price */}
                {post.price > 0 && (
                  <div className="mb-4 p-4 bg-green-50 rounded-xl">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-6 h-6 text-green-600" />
                      <span className="text-3xl font-bold text-green-700">
                        ${post.price.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Description */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                  {editing ? (
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={8}
                      className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <div className="p-4 bg-slate-50 rounded-xl text-slate-700 whitespace-pre-wrap">
                      {post.description}
                    </div>
                  )}
                </div>

                {/* Location */}
                <div className="flex items-center gap-2 p-4 bg-slate-50 rounded-xl mb-4">
                  <MapPin className="w-5 h-5 text-slate-400" />
                  {editing ? (
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="flex-1 border border-slate-300 rounded-lg px-3 py-1"
                      placeholder="Location"
                    />
                  ) : (
                    <span className="text-slate-700">{post.location || 'No location specified'}</span>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6 py-4 border-t">
                  <div className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-red-500" />
                    <span className="font-medium">{post.likes_count || 0} likes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-blue-500" />
                    <span className="font-medium">{post.comments_count || 0} comments</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 ml-auto">
                    <Calendar className="w-5 h-5" />
                    <span>{new Date(post.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Comments Section */}
            <div className="bg-white rounded-2xl shadow-sm">
              <div className="border-b px-6 py-4">
                <h3 className="font-semibold text-lg text-slate-900">
                  Comments ({comments.length})
                </h3>
              </div>
              <div className="p-6">
                {comments.length > 0 ? (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div 
                        key={comment.id} 
                        className="flex gap-3 p-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition"
                        onClick={() => router.push(`/comments/${comment.id}`)}
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium flex-shrink-0">
                          {comment.user?.display_name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{comment.user?.display_name || 'Unknown'}</span>
                            <span className="text-slate-500 text-sm">
                              {new Date(comment.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-slate-700">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No comments yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* User Info */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Posted by</h3>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
                  {post.user?.display_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{post.user?.display_name || 'Unknown'}</span>
                    {post.user?.verified && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-slate-500">
                    <span>★ {post.user?.rating?.toFixed(1) || '0.0'}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => router.push(`/users/${post.user_id}`)}
                className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
              >
                View Profile
              </button>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="font-semibold text-slate-900 mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <button className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition text-left">
                  <Eye className="w-5 h-5 text-blue-600" />
                  <span>View on App</span>
                </button>
                <button className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition text-left">
                  <Share2 className="w-5 h-5 text-green-600" />
                  <span>Share Post</span>
                </button>
                <button className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition text-left">
                  <MessageSquare className="w-5 h-5 text-purple-600" />
                  <span>Contact User</span>
                </button>
              </div>
            </div>

            {/* Edit Form in Sidebar */}
            {editing && (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Edit Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select category</option>
                      <option value="food">Food</option>
                      <option value="transport">Transport</option>
                      <option value="shopping">Shopping</option>
                      <option value="services">Services</option>
                      <option value="home">Home</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Price ($)</label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Post ID */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="font-semibold text-slate-900 mb-3">Post Information</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <label className="text-slate-500">Post ID</label>
                  <p className="font-mono text-xs bg-slate-50 p-2 rounded break-all">{post.id}</p>
                </div>
                <div>
                  <label className="text-slate-500">User ID</label>
                  <p className="font-mono text-xs bg-slate-50 p-2 rounded break-all">{post.user_id}</p>
                </div>
                <div>
                  <label className="text-slate-500">Created</label>
                  <p>{new Date(post.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-slate-500">Last Updated</label>
                  <p>{new Date(post.updated_at).toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Delete Button */}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex items-center justify-center gap-2 p-4 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition"
            >
              <Trash2 className="w-5 h-5" />
              <span className="font-medium">Delete Post</span>
            </button>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="max-w-4xl w-full">
            <img 
              src={selectedImage} 
              alt="Full size" 
              className="w-full h-auto rounded-xl"
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Post?</h3>
              <p className="text-slate-600 mb-6">
                This will permanently delete this post and all comments. This action cannot be undone.
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
