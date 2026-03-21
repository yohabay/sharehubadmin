'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, User, CheckCircle, Trash2, 
  Calendar, Star, Edit, Save, X, ThumbsUp
} from 'lucide-react';

interface RatingDetail {
  id: string;
  rater_id: string;
  rated_user_id: string;
  rating: number;
  review: string;
  created_at: string;
  updated_at: string;
  rater?: {
    display_name: string;
    avatar_url: string;
    verified: boolean;
  };
  rated_user?: {
    display_name: string;
    avatar_url: string;
    verified: boolean;
    rating: number;
  };
}

export default function RatingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ratingId = params.id as string;
  
  const [rating, setRating] = useState<RatingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editData, setEditData] = useState({
    rating: 5,
    review: '',
  });

  const supabaseClient = supabase!;

  useEffect(() => {
    if (ratingId) {
      fetchRating();
    }
  }, [ratingId]);

  async function fetchRating() {
    setLoading(true);
    
    const { data } = await supabaseClient
      .from('ratings')
      .select('*')
      .eq('id', ratingId)
      .single();

    if (data) {
      const { data: raterData } = await supabaseClient
        .from('profiles')
        .select('display_name, avatar_url, verified')
        .eq('id', data.rater_id)
        .single();

      const { data: ratedUserData } = await supabaseClient
        .from('profiles')
        .select('display_name, avatar_url, verified, rating')
        .eq('id', data.rated_user_id)
        .single();

      setRating({ ...data, rater: raterData, rated_user: ratedUserData });
      setEditData({
        rating: data.rating,
        review: data.review || '',
      });
    }
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    const { error } = await supabaseClient
      .from('ratings')
      .update({ 
        rating: editData.rating,
        review: editData.review,
      })
      .eq('id', ratingId);

    if (!error) {
      setEditing(false);
      fetchRating();
    }
    setSaving(false);
  }

  async function handleDelete() {
    setSaving(true);
    const { error } = await supabaseClient
      .from('ratings')
      .delete()
      .eq('id', ratingId);

    if (!error) {
      router.push('/?tab=ratings');
    }
    setSaving(false);
  }

  // Render stars
  const renderStars = (count: number, size: number = 6) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-${size} h-${size}`}
            fill={star <= count ? '#fbbf24' : 'none'}
            stroke={star <= count ? '#fbbf24' : '#9ca3af'}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-amber-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-600">Loading rating...</p>
        </div>
      </div>
    );
  }

  if (!rating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-slate-200 flex items-center justify-center">
            <Star className="w-12 h-12 text-slate-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Rating not found</h2>
          <button 
            onClick={() => router.back()}
            className="mt-4 px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-amber-50">
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
                <h1 className="text-xl font-bold text-slate-900">Rating Details</h1>
                <p className="text-sm text-slate-500">View and manage rating</p>
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
                  className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition"
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
        {/* Rating Card */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex items-center gap-2 text-slate-500 mb-4">
            <Calendar className="w-5 h-5" />
            <span>{new Date(rating.created_at).toLocaleString()}</span>
            {rating.updated_at !== rating.created_at && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">
                Edited
              </span>
            )}
          </div>

          {/* Star Rating */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Rating</label>
            {editing ? (
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setEditData({ ...editData, rating: star })}
                    className="p-1 hover:scale-110 transition"
                  >
                    <Star
                      className="w-10 h-10"
                      fill={star <= editData.rating ? '#fbbf24' : 'none'}
                      stroke={star <= editData.rating ? '#fbbf24' : '#9ca3af'}
                    />
                  </button>
                ))}
                <span className="ml-4 text-2xl font-bold text-amber-600">{editData.rating}/5</span>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className="w-8 h-8"
                    fill={star <= rating.rating ? '#fbbf24' : 'none'}
                    stroke={star <= rating.rating ? '#fbbf24' : '#9ca3af'}
                  />
                ))}
                <span className="text-2xl font-bold text-amber-700">{rating.rating}/5</span>
              </div>
            )}
          </div>

          {/* Review */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Review</label>
            {editing ? (
              <textarea
                value={editData.review}
                onChange={(e) => setEditData({ ...editData, review: e.target.value })}
                rows={4}
                className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-amber-500"
                placeholder="Write a review..."
              />
            ) : (
              <div className="p-6 bg-slate-50 rounded-xl text-slate-700 whitespace-pre-wrap">
                {rating.review || 'No review written'}
              </div>
            )}
          </div>
        </div>

        {/* Rater Info */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <ThumbsUp className="w-5 h-5 text-amber-500" />
            Given by
          </h3>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
              {rating.rater?.display_name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-lg">{rating.rater?.display_name || 'Unknown'}</span>
                {rating.rater?.verified && (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                )}
              </div>
            </div>
            <button
              onClick={() => router.push(`/users/${rating.rater_id}`)}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
            >
              View Profile
            </button>
          </div>
        </div>

        {/* Rated User Info */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" />
            Given to
          </h3>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center text-white text-2xl font-bold">
              {rating.rated_user?.display_name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-lg">{rating.rated_user?.display_name || 'Unknown'}</span>
                {rating.rated_user?.verified && (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                )}
              </div>
              <div className="flex items-center gap-1 text-sm text-slate-500 mt-1">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span>{rating.rated_user?.rating?.toFixed(1) || '0.0'} average rating</span>
              </div>
            </div>
            <button
              onClick={() => router.push(`/users/${rating.rated_user_id}`)}
              className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition"
            >
              View Profile
            </button>
          </div>
        </div>

        {/* Rating ID */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="font-semibold text-slate-900 mb-3">Rating Information</h3>
          <div className="space-y-3 text-sm">
            <div>
              <label className="text-slate-500">Rating ID</label>
              <p className="font-mono text-xs bg-slate-50 p-2 rounded break-all">{rating.id}</p>
            </div>
            <div>
              <label className="text-slate-500">Rater ID</label>
              <p className="font-mono text-xs bg-slate-50 p-2 rounded break-all">{rating.rater_id}</p>
            </div>
            <div>
              <label className="text-slate-500">Rated User ID</label>
              <p className="font-mono text-xs bg-slate-50 p-2 rounded break-all">{rating.rated_user_id}</p>
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
              <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Rating?</h3>
              <p className="text-slate-600 mb-6">
                This will permanently delete this rating. This action cannot be undone.
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
