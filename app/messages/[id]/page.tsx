'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, User, CheckCircle, XCircle, 
  MessageSquare, Trash2, Send, Calendar, Mail,
  Eye, EyeOff, Reply
} from 'lucide-react';

interface MessageDetail {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
  sender?: {
    display_name: string;
    avatar_url: string;
    verified: boolean;
  };
  receiver?: {
    display_name: string;
    avatar_url: string;
    verified: boolean;
  };
}

export default function MessageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const messageId = params.id as string;
  
  const [message, setMessage] = useState<MessageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const supabaseClient = supabase!;

  useEffect(() => {
    if (messageId) {
      fetchMessage();
    }
  }, [messageId]);

  async function fetchMessage() {
    setLoading(true);
    
    const { data } = await supabaseClient
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .single();

    if (data) {
      const { data: senderData } = await supabaseClient
        .from('profiles')
        .select('display_name, avatar_url, verified')
        .eq('id', data.sender_id)
        .single();

      const { data: receiverData } = await supabaseClient
        .from('profiles')
        .select('display_name, avatar_url, verified')
        .eq('id', data.receiver_id)
        .single();

      setMessage({ 
        ...data, 
        sender: senderData, 
        receiver: receiverData 
      });
    }
    setLoading(false);
  }

  async function handleMarkAsRead() {
    setSaving(true);
    await supabaseClient
      .from('messages')
      .update({ read: true })
      .eq('id', messageId);
    
    setMessage(prev => prev ? { ...prev, read: true } : null);
    setSaving(false);
  }

  async function handleMarkAsUnread() {
    setSaving(true);
    await supabaseClient
      .from('messages')
      .update({ read: false })
      .eq('id', messageId);
    
    setMessage(prev => prev ? { ...prev, read: false } : null);
    setSaving(false);
  }

  async function handleDelete() {
    setSaving(true);
    const { error } = await supabaseClient
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (!error) {
      router.push('/?tab=messages');
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-600">Loading message...</p>
        </div>
      </div>
    );
  }

  if (!message) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-slate-200 flex items-center justify-center">
            <Mail className="w-12 h-12 text-slate-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Message not found</h2>
          <button 
            onClick={() => router.back()}
            className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50">
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
                <h1 className="text-xl font-bold text-slate-900">Message Details</h1>
                <p className="text-sm text-slate-500">View and manage message</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {message.read ? (
                <button
                  onClick={handleMarkAsUnread}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-xl hover:bg-amber-200 transition"
                >
                  <EyeOff className="w-4 h-4" />
                  Mark Unread
                </button>
              ) : (
                <button
                  onClick={handleMarkAsRead}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-xl hover:bg-green-200 transition"
                >
                  <Eye className="w-4 h-4" />
                  Mark Read
                </button>
              )}
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Banner */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {message.read ? (
                <>
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <span className="font-medium text-green-700">Message has been read</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-6 h-6 text-amber-600" />
                  <span className="font-medium text-amber-700">Message is unread</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 text-slate-500">
              <Calendar className="w-5 h-5" />
              <span>{new Date(message.created_at).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Message Content */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
          {/* Sender */}
          <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                {message.sender?.display_name?.charAt(0).toUpperCase() || 'S'}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-lg text-slate-900">{message.sender?.display_name || 'Unknown'}</span>
                  {message.sender?.verified && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                </div>
                <span className="text-slate-500 text-sm">From</span>
              </div>
              <button
                onClick={() => router.push(`/users/${message.sender_id}`)}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
              >
                View Profile
              </button>
            </div>
          </div>

          {/* Message Content */}
          <div className="p-8">
            <div className="mb-6">
              <span className="text-slate-500 text-sm mb-3 block">Message Content:</span>
              <div className="p-6 bg-slate-50 rounded-2xl">
                <p className="text-slate-900 text-lg whitespace-pre-wrap leading-relaxed">
                  {message.content}
                </p>
              </div>
            </div>
          </div>

          {/* Receiver */}
          <div className="p-6 border-t bg-gradient-to-r from-green-50 to-teal-50">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center text-white font-bold text-xl">
                {message.receiver?.display_name?.charAt(0).toUpperCase() || 'R'}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-lg text-slate-900">{message.receiver?.display_name || 'Unknown'}</span>
                  {message.receiver?.verified && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                </div>
                <span className="text-slate-500 text-sm">To</span>
              </div>
              <button
                onClick={() => router.push(`/users/${message.receiver_id}`)}
                className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition"
              >
                View Profile
              </button>
            </div>
          </div>
        </div>

        {/* Message ID */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="font-semibold text-slate-900 mb-3">Message Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="text-slate-500">Message ID</label>
              <p className="font-mono text-xs bg-slate-50 p-2 rounded break-all">{message.id}</p>
            </div>
            <div>
              <label className="text-slate-500">Sent</label>
              <p>{new Date(message.created_at).toLocaleString()}</p>
            </div>
            <div>
              <label className="text-slate-500">Sender ID</label>
              <p className="font-mono text-xs bg-slate-50 p-2 rounded break-all">{message.sender_id}</p>
            </div>
            <div>
              <label className="text-slate-500">Receiver ID</label>
              <p className="font-mono text-xs bg-slate-50 p-2 rounded break-all">{message.receiver_id}</p>
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
              <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Message?</h3>
              <p className="text-slate-600 mb-6">
                This will permanently delete this message. This action cannot be undone.
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
