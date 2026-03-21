'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, User, CheckCircle, Trash2, 
  Calendar, MessageSquare, Edit, Save, X,
  FileText
} from 'lucide-react';

interface CommentDetail {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user?: {
    display_name: string;
    avatar_url: string;
    verified: boolean;
  };
  post?: {
    title: string;
    type: string;
    status: string;
  };
}

export default function CommentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const commentId = params.id as string;
  
  const [comment, setComment] = useState<CommentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editContent, setEditContent] = useState('');

  const supabaseClient = supabase!;

  useEffect(() => {
    if (commentId) {
      fetchComment();
    }
  }, [commentId]);

  async function fetchComment() {
    setLoading(true);
    
    const { data } = await supabaseClient
      .from('comments')
      .select('*')
      .eq('id', commentId)
      .single();

    if (data) {
      const { data: userData } = await supabaseClient
        .from('profiles')
        .select('display_name, avatar_url, verified')
        .eq('id', data.user_id)
        .single();

      const { data: postData } = await supabaseClient
        .from('posts')
        .select('title, type, status')
        .eq('id', data.post_id)
        .single();

      setComment({ ...data, user: userData, post: postData });
      setEditContent(data.content);
    }
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    const { error } = await supabaseClient
      .from('comments')
      .update({ content: editContent })
      .eq('id', commentId);

    if (!error) {
      setEditing(false);
      fetchComment();
    }
    setSaving(false);
  }

  async function handleDelete() {
    setSaving(true);
    const { error } = await supabaseClient
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (!error) {
      router.push('/?tab=comments');
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-pink-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-600">Loading comment...</p>
        </div>
      </div>
    );
  }

  if (!comment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-slate-200 flex items-center justify-center">
            <MessageSquare className="w-12 h-12 text-slate-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Comment not found</h2>
          <button 
            onClick={() => router.back()}
            className="mt-4 px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-pink-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => router.back()}
                className="p-2 hover:bg-slate-100 rounded-xl transition"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Comment Details</h1>
                <p className="text-sm text-slate-500">View and manage comment</p>
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
                  className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-xl hover:bg-pink-700 transition"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
              )}
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Comment Content */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex items-center gap-2 text-slate-500 mb-4">
            <Calendar className="w-5 h-5" />
            <span>{new Date(comment.created_at).toLocaleString()}</span>
            {comment.updated_at !== comment.created_at && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">
                Edited
              </span>
            )}
          </div>

          <label className="block text-sm font-medium text-slate-700 mb-2">Comment:</label>
          {editing ? (
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={6}
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-lg focus:ring-2 focus:ring-pink-500"
            />
          ) : (
            <div className="p-6 bg-slate-50 rounded-2xl text-slate-900 text-lg whitespace-pre-wrap leading-relaxed">
              {comment.content}
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h3 className="font-semibold text-slate-900 mb-4">Commented by</h3>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
              {comment.user?.display_name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-lg">{comment.user?.display_name || 'Unknown'}</span>
                {comment.user?.verified && (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                )}
              </div>
            </div>
            <button
              onClick={() => router.push(`/users/${comment.user_id}`)}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
            >
              View Profile
            </button>
          </div>
        </div>

        {/* Post Info */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h3 className="font-semibold text-slate-900 mb-4">Comment on post</h3>
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                comment.post?.type === 'need' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
              }`}>
                {comment.post?.type === 'need' ? 'Need' : 'Offer'}
              </span>
              <span className="font-medium">{comment.post?.title || 'Unknown Post'}</span>
              <span className={`px-2 py-0.5 rounded text-xs ${
                comment.post?.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'
              }`}>
                {comment.post?.status}
              </span>
            </div>
            <button
              onClick={() => router.push(`/posts/${comment.post_id}`)}
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 transition"
            >
              View Post
            </button>
          </div>
        </div>

        {/* Comment ID */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="font-semibold text-slate-900 mb-3">Comment Information</h3>
          <div className="space-y-3 text-sm">
            <div>
              <label className="text-slate-500">Comment ID</label>
              <p className="font-mono text-xs bg-slate-50 p-2 rounded break-all">{comment.id}</p>
            </div>
            <div>
              <label className="text-slate-500">User ID</label>
              <p className="font-mono text-xs bg-slate-50 p-2 rounded break-all">{comment.user_id}</p>
            </div>
            <div>
              <label className="text-slate-500">Post ID</label>
              <p className="font-mono text-xs bg-slate-50 p-2 rounded break-all">{comment.post_id}</p>
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
              <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Comment?</h3>
              <p className="text-slate-600 mb-6">
                This will permanently delete this comment. This action cannot be undone.
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
