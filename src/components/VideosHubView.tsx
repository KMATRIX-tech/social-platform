import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc
} from 'firebase/firestore';
import { Post } from '../types';
import { CrystalBadge } from './CrystalBadge';
import { VideoPlayer } from './VideoPlayer';
import { SongPlayerCard } from './SongPlayerCard';
import {
  Film,
  Heart,
  Bookmark,
  Share2,
  MessageCircle,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Sparkles,
  Upload,
  Check,
  Video as VideoIcon,
  Music
} from 'lucide-react';

interface VideosHubViewProps {
  onNavigateToFeed: () => void;
}

export const VideosHubView: React.FC<VideosHubViewProps> = ({ onNavigateToFeed }) => {
  const { currentUser, userProfile, toggleSavePost } = useAuth();
  const [videoPosts, setVideoPosts] = useState<Post[]>([]);
  const [filter, setFilter] = useState<'all' | 'saved' | 'popular'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Active playing video tracking
  const [muted, setMuted] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);

  // Real-time listener for posts that have videoUrl or mediaType === 'video'
  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: Post[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          if (data.videoUrl || data.hasVideoChunks || data.mediaType === 'video') {
            list.push({ ...data, id: d.id } as Post);
          }
        });
        setVideoPosts(list);
        setIsLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'posts');
      }
    );

    return () => unsub();
  }, []);

  const handleToggleLike = async (post: Post) => {
    if (!currentUser) return;
    const isLiked = post.likes?.includes(currentUser.uid);
    const updatedLikes = isLiked
      ? (post.likes || []).filter((id) => id !== currentUser.uid)
      : [...(post.likes || []), currentUser.uid];

    try {
      await updateDoc(doc(db, 'posts', post.id), {
        likes: updatedLikes,
        likesCount: updatedLikes.length
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${post.id}`);
    }
  };

  const handleToggleSave = async (postId: string) => {
    await toggleSavePost(postId);
  };

  const handleShare = (postId: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/#video-${postId}`);
    setCopiedId(postId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredPosts = videoPosts.filter((post) => {
    if (filter === 'saved') {
      return (userProfile?.savedPostIds || []).includes(post.id);
    }
    if (filter === 'popular') {
      return (post.likesCount || 0) > 0;
    }
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 text-[#0F172A] shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)] flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#3B82F6] border border-blue-200/70 text-xs font-semibold uppercase tracking-wider mb-2">
            <Film size={14} className="text-[#10B981]" />
            <span>Wave Reels & Video Hub</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0F172A]">
            Community Video Showcase
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm mt-1 max-w-xl">
            Watch, like, save, and share high-definition videos uploaded directly from members' device folders.
          </p>
        </div>

        <button
          onClick={onNavigateToFeed}
          className="px-5 py-2.5 rounded-2xl bg-[#3B82F6] text-white hover:bg-blue-600 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm shadow-blue-500/20 transition active:scale-95 shrink-0"
        >
          <Upload size={16} />
          <span>Upload Video from Folders</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex rounded-2xl bg-white border border-slate-200/80 p-1 text-xs font-semibold shadow-2xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl transition ${
              filter === 'all'
                ? 'bg-[#3B82F6] text-white shadow-xs'
                : 'text-slate-600 hover:text-[#0F172A]'
            }`}
          >
            All Videos ({videoPosts.length})
          </button>

          <button
            onClick={() => setFilter('popular')}
            className={`px-4 py-2 rounded-xl transition ${
              filter === 'popular'
                ? 'bg-[#3B82F6] text-white shadow-xs'
                : 'text-slate-600 hover:text-[#0F172A]'
            }`}
          >
            Trending & Liked
          </button>

          <button
            onClick={() => setFilter('saved')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${
              filter === 'saved'
                ? 'bg-[#3B82F6] text-white shadow-xs'
                : 'text-slate-600 hover:text-[#0F172A]'
            }`}
          >
            <Bookmark size={13} />
            <span>Saved Videos ({userProfile?.savedPostIds?.length || 0})</span>
          </button>
        </div>

        <button
          onClick={() => setMuted(!muted)}
          className="px-3.5 py-2 rounded-2xl border border-slate-200 bg-white text-xs font-semibold text-[#0F172A] flex items-center gap-2 shadow-2xs hover:border-blue-300 transition"
        >
          {muted ? <VolumeX size={15} className="text-slate-400" /> : <Volume2 size={15} className="text-[#10B981]" />}
          <span>{muted ? 'Audio Muted' : 'Audio On'}</span>
        </button>
      </div>

      {/* Video Grid */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400 text-xs">
          <div className="w-8 h-8 border-3 border-[#3B82F6] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading community video hub...
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="text-center py-20 px-6 bg-white border border-slate-200/80 rounded-3xl shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)]">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#3B82F6] mx-auto flex items-center justify-center mb-4 ring-8 ring-blue-50/50">
            <VideoIcon size={32} />
          </div>
          <h3 className="text-lg font-bold text-[#0F172A] mb-1">
            {filter === 'saved' ? 'No Saved Videos Yet' : 'No Videos Shared Yet'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mb-6 leading-relaxed">
            {filter === 'saved'
              ? 'Bookmark any video from the hub to save it here for quick playback.'
              : 'Be the first member to upload a video clip directly from your folders in the Wave Feed!'}
          </p>
          <button
            onClick={onNavigateToFeed}
            className="px-6 py-2.5 rounded-2xl bg-[#3B82F6] hover:bg-blue-600 text-white font-semibold text-xs sm:text-sm shadow-sm shadow-blue-500/20 transition active:scale-95"
          >
            Upload a Video Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post) => {
            const isLiked = post.likes?.includes(currentUser?.uid || '');
            const isSaved = (userProfile?.savedPostIds || []).includes(post.id);

            return (
              <div
                key={post.id}
                className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)] flex flex-col justify-between transition hover:border-blue-300"
              >
                {/* Video Player Card */}
                <div className="relative aspect-video bg-slate-900 flex items-center justify-center overflow-hidden">
                  <VideoPlayer
                    postId={post.id}
                    videoUrl={post.videoUrl}
                    hasVideoChunks={post.hasVideoChunks}
                    defaultMuted={muted}
                    autoPlayOnVisible={true}
                  />

                  {/* Top Floating Badge */}
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md text-[10px] font-bold text-[#0F172A] flex items-center gap-1 pointer-events-none z-10 shadow-xs">
                    <Film size={11} className="text-[#3B82F6]" />
                    <span>Wave Reel</span>
                  </div>
                </div>

                {/* Video Details */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    {/* Author & Timestamp */}
                    <div className="flex items-center gap-2.5 mb-2">
                      <img
                        src={post.authorPhotoURL || `https://api.dicebear.com/7.x/shapes/svg?seed=${post.authorId}`}
                        alt={post.authorName}
                        className="w-7 h-7 rounded-full object-cover ring-1 ring-blue-500/20"
                      />
                      <div className="min-w-0">
                        <CrystalBadge email={post.authorEmail} name={post.authorName} size="sm" />
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {post.authorUsername || '@waver'} · {new Date(post.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Attached Online Soundtrack */}
                    {post.songPreviewUrl && post.songTitle && (
                      <div className="mb-2">
                        <SongPlayerCard
                          title={post.songTitle}
                          artist={post.songArtist || ''}
                          albumArt={post.songAlbumArt}
                          previewUrl={post.songPreviewUrl}
                          albumName={post.songAlbumName}
                          compact
                        />
                      </div>
                    )}

                    {/* Caption */}
                    <p className="text-xs text-[#0F172A] line-clamp-2 leading-relaxed">
                      {post.content}
                    </p>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-3">
                      {/* Like */}
                      <button
                        onClick={() => handleToggleLike(post)}
                        className={`flex items-center gap-1 py-1 px-2.5 rounded-xl transition active:scale-95 ${
                          isLiked ? 'text-rose-600 font-bold bg-rose-50' : 'hover:bg-[#F8FAFC]'
                        }`}
                        title="Like Video"
                      >
                        <Heart size={15} className={isLiked ? 'fill-rose-600' : ''} />
                        <span className="font-mono tabular-numbers">{post.likesCount || 0}</span>
                      </button>

                      {/* Save */}
                      <button
                        onClick={() => handleToggleSave(post.id)}
                        className={`flex items-center gap-1 py-1 px-2.5 rounded-xl transition active:scale-95 ${
                          isSaved ? 'text-[#3B82F6] font-bold bg-blue-50' : 'hover:bg-[#F8FAFC]'
                        }`}
                        title={isSaved ? 'Remove from Saved' : 'Save Video'}
                      >
                        <Bookmark size={15} className={isSaved ? 'fill-[#3B82F6]' : ''} />
                        <span className="font-mono tabular-numbers">{post.savesCount || 0}</span>
                      </button>
                    </div>

                    {/* Share */}
                    <button
                      onClick={() => handleShare(post.id)}
                      className="flex items-center gap-1 py-1 px-2.5 rounded-xl hover:bg-[#F8FAFC] transition"
                      title="Share Video Link"
                    >
                      {copiedId === post.id ? <Check size={14} className="text-[#10B981]" /> : <Share2 size={14} />}
                      <span>{copiedId === post.id ? 'Copied' : 'Share'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
