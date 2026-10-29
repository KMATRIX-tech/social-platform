import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType, cleanFirestoreData } from '../firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  addDoc,
  updateDoc,
  limit
} from 'firebase/firestore';
import { Post, PostComment, Announcement } from '../types';
import { CrystalBadge } from './CrystalBadge';
import { VideoPlayer } from './VideoPlayer';
import { SongPlayerCard } from './SongPlayerCard';
import { SparkTray } from './SparkTray';
import { AdsterraAdBanner } from './AdsterraAdBanner';
import { shouldShowAds } from './AdsterraManager';
import {
  Heart,
  MessageCircle,
  Share2,
  Trash2,
  Send,
  Image as ImageIcon,
  Video as VideoIcon,
  Waves,
  Check,
  ShieldCheck,
  Megaphone,
  HelpCircle,
  X,
  Sparkles,
  Flame,
  Bookmark,
  Play,
  UploadCloud,
  Film,
  Clapperboard,
  Music,
  Camera,
  Zap,
  Disc,
  Wand2,
  Edit2,
  Crown,
  Eye,
  HandCoins,
  Rocket,
  ShoppingBag,
  ExternalLink,
  Tag,
  Coins,
  PlusCircle,
  Hash
} from 'lucide-react';
import { MobileMoneyPaymentModal } from './MobileMoneyPaymentModal';
import { CreatorTipModal } from './CreatorTipModal';
import { PostBoostModal } from './PostBoostModal';
import { RightSidebar } from './RightSidebar';
import { PostSkeleton } from './PostSkeleton';
import { LegalFooter } from './LegalModals';
import { sendNotification } from '../services/notificationService';

const SPONSORED_ADS: Post[] = [
  {
    id: 'ad_starlink_1',
    authorId: 'brand_starlink',
    authorEmail: 'partner@starlink.com',
    authorName: 'Starlink Tanzania',
    authorUsername: '@starlink_tz',
    authorPhotoURL: 'https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?w=120&auto=format&fit=crop&q=80',
    content: 'Experience revolutionary high-speed, low-latency satellite internet anywhere in Tanzania. Stream 4K video reels and enjoy crystal-clear WebRTC calling with WaveLink! 🛰️⚡',
    imageUrl: 'https://images.unsplash.com/photo-1517976487502-5f60639e3650?w=1200&auto=format&fit=crop&q=80',
    mediaType: 'image',
    likes: [],
    likesCount: 342,
    commentsCount: 28,
    isSponsored: true,
    sponsorBrand: 'Starlink Official',
    affiliateProductTitle: 'Starlink Standard Satellite Dish & Router Kit',
    affiliateProductPrice: 'TZS 990,000',
    affiliateProductUrl: 'https://www.starlink.com',
    affiliateButtonText: 'Order Kit • Free Delivery',
    affiliateRating: 5.0,
    createdAt: new Date().toISOString()
  },
  {
    id: 'ad_sony_2',
    authorId: 'brand_sony',
    authorEmail: 'creators@sony.com',
    authorName: 'Sony Audio East Africa',
    authorUsername: '@sony_audio',
    authorPhotoURL: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=120&auto=format&fit=crop&q=80',
    content: 'Studio-grade acoustic precision with world-class noise cancellation. Edit your WaveLink sound mixes and video reels in pristine audio fidelity. 🎧✨',
    imageUrl: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=1200&auto=format&fit=crop&q=80',
    mediaType: 'image',
    likes: [],
    likesCount: 519,
    commentsCount: 44,
    isSponsored: true,
    sponsorBrand: 'Sony Partner',
    affiliateProductTitle: 'Sony WH-1000XM5 Wireless Headphones (Midnight Silver)',
    affiliateProductPrice: 'TZS 850,000',
    affiliateProductUrl: 'https://www.sony.com',
    affiliateButtonText: 'Shop Now • 15% Off',
    affiliateRating: 4.9,
    createdAt: new Date().toISOString()
  },
  {
    id: 'ad_dji_3',
    authorId: 'brand_dji',
    authorEmail: 'creatorgear@dji.com',
    authorName: 'DJI Creator Studio',
    authorUsername: '@dji_creators',
    authorPhotoURL: 'https://images.unsplash.com/photo-1589492477829-5e65395b66cc?w=120&auto=format&fit=crop&q=80',
    content: 'Capture ultra-smooth cinematic Wave Reels with 3-axis stabilization, ActiveTrack 6.0, and magnetic phone clamp. Transform your smartphone into a movie camera. 🎬📱',
    imageUrl: 'https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?w=1200&auto=format&fit=crop&q=80',
    mediaType: 'image',
    likes: [],
    likesCount: 412,
    commentsCount: 19,
    isSponsored: true,
    sponsorBrand: 'DJI Tanzania',
    affiliateProductTitle: 'DJI Osmo Mobile 6 Smart Gimbal Stabilizer',
    affiliateProductPrice: 'TZS 420,000',
    affiliateProductUrl: 'https://www.dji.com',
    affiliateButtonText: 'Shop with Mobile Money',
    affiliateRating: 4.8,
    createdAt: new Date().toISOString()
  }
];

interface FeedViewProps {
  onNavigateTab?: (tab: string) => void;
  initialFilterTag?: string | null;
  onClearFilterTag?: () => void;
}

export const FeedView: React.FC<FeedViewProps> = ({
  onNavigateTab,
  initialFilterTag,
  onClearFilterTag
}) => {
  const { currentUser, userProfile, isAdmin, isProEffective, toggleSavePost } = useAuth();

  // Ads Rule: HIDE if user.isPro === true, user has Blue Star, or user is admin. SHOW only to regular free users.
  const showAds = shouldShowAds(userProfile, isAdmin, isProEffective);
  const isProUser = !showAds;

  const [posts, setPosts] = useState<Post[]>([]);
  const [latestAnnouncement, setLatestAnnouncement] = useState<Announcement | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Post editing state (WaveLink Pro / Admin privilege)
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editPostContent, setEditPostContent] = useState('');
  const [isSavingPostEdit, setIsSavingPostEdit] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Post creation state for center feed creation box
  const [inlineContent, setInlineContent] = useState('');
  const [inlineMediaFile, setInlineMediaFile] = useState<File | null>(null);
  const [inlineMediaPreview, setInlineMediaPreview] = useState<string | null>(null);
  const [inlineMediaType, setInlineMediaType] = useState<'image' | 'video'>('image');
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Monetization modals
  const [tippingPost, setTippingPost] = useState<Post | null>(null);
  const [boostingPost, setBoostingPost] = useState<Post | null>(null);

  // Comments state: map of postId -> PostComment[]
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentsMap, setCommentsMap] = useState<Record<string, PostComment[]>>({});
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);


  // Real-time listener for posts
  useEffect(() => {
    const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      postsQuery,
      (snapshot) => {
        const docs: Post[] = [];
        snapshot.forEach((docSnap) => {
          docs.push({ id: docSnap.id, ...docSnap.data() } as Post);
        });
        setPosts(docs);
        setIsLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'posts');
      }
    );

    return () => unsub();
  }, []);

  // Fetch latest announcement for the right rail widget
  useEffect(() => {
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(1));
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setLatestAnnouncement({ id: snap.docs[0].id, ...snap.docs[0].data() } as Announcement);
      } else {
        setLatestAnnouncement(null);
      }
    });
    return () => unsub();
  }, []);

  // Toggle comments expander
  const toggleComments = (postId: string) => {
    setExpandedComments((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    Object.keys(expandedComments).forEach((postId) => {
      if (expandedComments[postId]) {
        const commentsRef = collection(db, 'posts', postId, 'comments');
        const q = query(commentsRef, orderBy('createdAt', 'asc'));
        const unsub = onSnapshot(
          q,
          (snap) => {
            const list: PostComment[] = [];
            snap.forEach((d) => list.push({ id: d.id, ...d.data() } as PostComment));
            setCommentsMap((prev) => ({ ...prev, [postId]: list }));
          },
          (err) => {
            console.error('Comments error:', err);
          }
        );
        unsubscribers.push(unsub);
      }
    });

    return () => {
      unsubscribers.forEach((u) => u());
    };
  }, [expandedComments]);

  // Like / Unlike post
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

      // Dispatch post_like notification to the author if not self
      if (!isLiked && post.authorId && post.authorId !== currentUser.uid) {
        sendNotification({
          recipientId: post.authorId,
          type: 'post_like',
          title: 'Wave Liked! ❤️',
          body: `${userProfile?.displayName || currentUser.displayName || 'A waver'} liked your wave.`,
          entityId: post.id,
          actorId: currentUser.uid,
          actorName: userProfile?.displayName || currentUser.displayName || 'A waver',
          actorPhotoURL: userProfile?.photoURL || currentUser.photoURL || undefined
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${post.id}`);
    }
  };

  // Save / Bookmark post
  const handleToggleSave = async (postId: string) => {
    await toggleSavePost(postId);
  };

  // Start editing post (Pro or Admin privilege)
  const handleStartEditPost = (post: Post) => {
    setEditingPostId(post.id);
    setEditPostContent(post.content || '');
  };

  // Save edited post
  const handleSavePostEdit = async (postId: string) => {
    if (!editPostContent.trim()) return;
    setIsSavingPostEdit(true);
    try {
      await updateDoc(doc(db, 'posts', postId), {
        content: editPostContent.trim(),
        isEdited: true,
        updatedAt: new Date().toISOString()
      });
      setEditingPostId(null);
      setEditPostContent('');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `posts/${postId}`);
    } finally {
      setIsSavingPostEdit(false);
    }
  };

  // Delete post
  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this wave?')) return;
    try {
      await deleteDoc(doc(db, 'posts', postId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `posts/${postId}`);
    }
  };

  // Handle media selection for inline post creator
  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    if (!isVideo && !isImage) {
      console.warn('Please select an image or video file.');
      return;
    }

    setInlineMediaFile(file);
    setInlineMediaType(isVideo ? 'video' : 'image');

    const reader = new FileReader();
    reader.onload = (event) => {
      setInlineMediaPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Submit inline post
  const handleCreatePost = async () => {
    if (!currentUser || (!inlineContent.trim() && !inlineMediaPreview)) return;
    setIsSubmittingPost(true);

    try {
      const emailPrefix = currentUser.email ? currentUser.email.split('@')[0] : 'waver';
      const newPost: Partial<Post> = {
        authorId: currentUser.uid,
        authorEmail: currentUser.email || '',
        authorName: userProfile?.displayName || currentUser.displayName || 'Waver',
        authorUsername: userProfile?.username || `@${emailPrefix}`,
        authorPhotoURL: userProfile?.photoURL || currentUser.photoURL || `https://api.dicebear.com/7.x/shapes/svg?seed=${currentUser.uid}`,
        content: inlineContent.trim(),
        imageUrl: inlineMediaType === 'image' && inlineMediaPreview ? inlineMediaPreview : undefined,
        videoUrl: inlineMediaType === 'video' && inlineMediaPreview ? inlineMediaPreview : undefined,
        mediaType: inlineMediaType === 'video' ? 'video' : inlineMediaType === 'image' && inlineMediaPreview ? 'image' : undefined,
        likes: [],
        likesCount: 0,
        commentsCount: 0,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'posts'), cleanFirestoreData(newPost));

      // Reset form
      setInlineContent('');
      setInlineMediaFile(null);
      setInlineMediaPreview(null);
    } catch (err) {
      console.error('Post creation error:', err);
    } finally {
      setIsSubmittingPost(false);
    }
  };


  // Add Comment
  const handleAddComment = async (postId: string) => {
    const text = commentInput[postId]?.trim();
    if (!text || !currentUser) return;

    try {
      const commentData = {
        postId,
        authorId: currentUser.uid,
        authorEmail: currentUser.email || '',
        authorName: userProfile?.displayName || currentUser.displayName || 'Waver',
        authorUsername: userProfile?.username || `@${currentUser.email?.split('@')[0] || 'waver'}`,
        authorPhotoURL:
          userProfile?.photoURL ||
          currentUser.photoURL ||
          `https://api.dicebear.com/7.x/shapes/svg?seed=${currentUser.uid}`,
        content: text,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'posts', postId, 'comments'), commentData);

      const post = posts.find((p) => p.id === postId);
      const newCount = (post?.commentsCount || 0) + 1;
      await updateDoc(doc(db, 'posts', postId), {
        commentsCount: newCount
      });

      // Dispatch post_comment notification to author
      if (post && post.authorId && post.authorId !== currentUser.uid) {
        sendNotification({
          recipientId: post.authorId,
          type: 'post_comment',
          title: 'New Comment on Wave 💬',
          body: `${userProfile?.displayName || currentUser.displayName || 'A waver'} commented: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`,
          entityId: postId,
          actorId: currentUser.uid,
          actorName: userProfile?.displayName || currentUser.displayName || 'A waver',
          actorPhotoURL: userProfile?.photoURL || currentUser.photoURL || undefined
        });
      }

      setCommentInput((prev) => ({ ...prev, [postId]: '' }));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `posts/${postId}/comments`);
    }
  };

  const copyPostLink = (postId: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/#post-${postId}`);
    setCopiedId(postId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Priority sorting: Boosted posts first, then newest
  const sortedPosts = [...posts].sort((a, b) => {
    if (a.isBoosted && !b.isBoosted) return -1;
    if (!a.isBoosted && b.isBoosted) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // If hashtag filter active from global search
  const filteredSortedPosts = initialFilterTag
    ? sortedPosts.filter((p) => p.content?.toLowerCase().includes(initialFilterTag.toLowerCase()))
    : sortedPosts;

  // Interleave subtle, non-intrusive sponsored posts every 8 scrolls/items
  // (Exempt: Admins, Verified members, and Pro users have an ad-free experience!)
  const combinedFeed: Post[] = [];
  let adIdx = 0;
  filteredSortedPosts.forEach((p, idx) => {
    combinedFeed.push(p);
    if (!isProUser && (idx + 1) % 8 === 0 && SPONSORED_ADS[adIdx % SPONSORED_ADS.length]) {
      combinedFeed.push(SPONSORED_ADS[adIdx % SPONSORED_ADS.length]);
      adIdx++;
    }
  });

  // For standard free accounts with small feed, append a sponsored post so the feature is visible
  if (!isProUser && filteredSortedPosts.length < 8 && SPONSORED_ADS.length > 0 && !combinedFeed.some((p) => p.isSponsored) && !initialFilterTag) {
    combinedFeed.push(SPONSORED_ADS[0]);
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-6">
      <div className="flex flex-row gap-6 items-start justify-center">
        {/* Center Main Feed (Width < 768px: Full Width, Width >= 768px: max-w-2xl) */}
        <div className="flex-1 min-w-0 max-w-full md:max-w-2xl w-full space-y-5 overflow-hidden">
          {/* Active Hashtag Filter Banner from Global Search */}
          {initialFilterTag && (
            <div className="p-3.5 sm:p-4 rounded-3xl bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/80 border border-purple-500/40 text-white flex items-center justify-between gap-3 shadow-md animate-in fade-in">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-pink-500/20 text-pink-400 shrink-0">
                  <Hash size={18} />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] text-purple-300 font-bold uppercase tracking-wider block">Hashtag Filter</span>
                  <h4 className="text-xs sm:text-sm font-extrabold truncate">
                    Filtered by <span className="text-pink-400">{initialFilterTag}</span> ({filteredSortedPosts.length} waves)
                  </h4>
                </div>
              </div>
              {onClearFilterTag && (
                <button
                  onClick={onClearFilterTag}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shrink-0"
                >
                  <span>Clear</span>
                  <X size={13} />
                </button>
              )}
            </div>
          )}

          {/* Vibrant Colorful Welcome Hero Banner */}
          <div className="relative overflow-hidden rounded-3xl p-5 sm:p-7 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-amber-500 text-white shadow-xl shadow-purple-900/25">
          {/* Ambient floating spheres */}
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-cyan-400/30 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 left-1/3 w-40 h-40 rounded-full bg-pink-400/30 blur-2xl pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider mb-2">
                <Sparkles size={14} className="text-amber-300 animate-spin" style={{ animationDuration: '6s' }} />
                <span>Explore Community Waves</span>
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight">
                Welcome to WaveFeed, {userProfile?.displayName || 'Friend'}! 🌊
              </h2>
              <p className="text-purple-100 text-xs sm:text-sm mt-1 max-w-xl font-medium">
                Share moments, post photos & reels, tip creators directly with mobile money, and connect.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {onNavigateTab && (
                <>
                  <button
                    onClick={() => onNavigateTab('monetization')}
                    className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 hover:opacity-95 text-white font-bold text-xs flex items-center gap-1.5 border border-amber-300/40 shadow-sm active:scale-95 transition"
                  >
                    <Coins size={14} />
                    <span>Monetization</span>
                  </button>
                  <button
                    onClick={() => onNavigateTab('videos')}
                    className="px-3.5 py-2 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-bold text-xs flex items-center gap-2 border border-white/30 transition shadow-sm active:scale-95"
                  >
                    <VideoIcon size={14} className="text-amber-300" />
                    <span>Reels</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 24-Hour Moments Spark Tray */}
        <div className="w-full max-w-full overflow-hidden">
          <SparkTray />
        </div>

        {/* Center Main Feed: Post Creation Box */}
        <div className="w-full max-w-full overflow-hidden bg-white dark:bg-[#131927] border border-gray-200/90 dark:border-gray-800 rounded-3xl p-4 sm:p-5 shadow-xs transition">
          <div className="flex items-start gap-3">
            <img
              src={
                userProfile?.photoURL ||
                currentUser?.photoURL ||
                `https://api.dicebear.com/7.x/shapes/svg?seed=${currentUser?.uid || 'user'}`
              }
              alt="User"
              className="w-10 h-10 rounded-full object-cover ring-2 ring-purple-500/20 shrink-0 mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <textarea
                value={inlineContent}
                onChange={(e) => setInlineContent(e.target.value)}
                placeholder={`What's making waves today, ${userProfile?.displayName?.split(' ')[0] || 'Friend'}?`}
                rows={2}
                className="w-full max-w-full bg-transparent border-0 resize-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-hidden focus:ring-0 break-words leading-relaxed"
              />

              {inlineMediaPreview && (
                <div className="relative rounded-2xl overflow-hidden my-2 border border-gray-200 dark:border-gray-700 max-h-60 bg-black/10">
                  {inlineMediaType === 'video' ? (
                    <video src={inlineMediaPreview} controls className="w-full h-auto max-h-60 object-cover" />
                  ) : (
                    <img src={inlineMediaPreview} alt="Preview" className="w-full h-auto max-h-60 object-cover" />
                  )}
                  <button
                    onClick={() => {
                      setInlineMediaFile(null);
                      setInlineMediaPreview(null);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-black/90 transition"
                    title="Remove attachment"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800/80 flex-wrap gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*,video/*"
                    onChange={handleMediaSelect}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.accept = 'image/*';
                        fileInputRef.current.click();
                      }
                    }}
                    className="px-2.5 py-1.5 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-950/40 text-purple-600 dark:text-purple-400 text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <ImageIcon size={15} />
                    <span className="hidden sm:inline">Photo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.accept = 'video/*';
                        fileInputRef.current.click();
                      }
                    }}
                    className="px-2.5 py-1.5 rounded-xl hover:bg-pink-50 dark:hover:bg-pink-950/40 text-pink-600 dark:text-pink-400 text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <VideoIcon size={15} />
                    <span className="hidden sm:inline">Reel</span>
                  </button>

                  {onNavigateTab && (
                    <button
                      type="button"
                      onClick={() => onNavigateTab('studio')}
                      className="px-2.5 py-1.5 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <Wand2 size={15} />
                      <span className="hidden sm:inline">Studio</span>
                    </button>
                  )}
                </div>

                <button
                  onClick={handleCreatePost}
                  disabled={isSubmittingPost || (!inlineContent.trim() && !inlineMediaPreview)}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition"
                >
                  {isSubmittingPost ? (
                    <span>Posting...</span>
                  ) : (
                    <>
                      <Send size={13} />
                      <span>Wave It</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

          {/* Wave Studio Quick Action */}
          <div className="bg-gradient-to-r from-purple-900/30 via-indigo-900/20 to-pink-900/25 border-2 border-purple-200/80 dark:border-purple-800/60 rounded-3xl p-5 shadow-sm flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 text-white shadow-md shadow-purple-600/30">
                <Wand2 size={22} className="text-amber-300" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-gray-900 dark:text-white flex items-center gap-1.5">
                  <span>Wave Studio Editor</span>
                  <Sparkles size={14} className="text-amber-400" />
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md">
                  Edit photos & videos, add stylish text overlays, vibe stickers, and online soundtracks to publish on the feed!
                </p>
              </div>
            </div>

            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('studio')}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-purple-600/25 active:scale-95 transition"
              >
                <Wand2 size={15} />
                <span>Open Media Studio</span>
              </button>
            )}
          </div>

          {/* Posts Stream */}
          <div className="space-y-5">
            {isLoading ? (
              <PostSkeleton count={3} />
            ) : combinedFeed.length === 0 ? (
              <div className="text-center py-16 px-6 bg-white dark:bg-[#131927] border-2 border-purple-100 dark:border-purple-900/40 rounded-3xl shadow-xs">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-500 to-pink-500 text-white mx-auto flex items-center justify-center mb-4 shadow-lg shadow-purple-500/20">
                  <Waves size={32} />
                </div>
                <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mb-1">
                  Feed Is Clear & Ready!
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6 leading-relaxed">
                  WaveLink operates with strict zero mock data. Open the Media Studio to design, edit photos & videos, and post the very first wave!
                </p>
                {onNavigateTab && (
                  <button
                    onClick={() => onNavigateTab('studio')}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white font-bold text-xs sm:text-sm shadow-md transition inline-flex items-center gap-2"
                  >
                    <Wand2 size={16} />
                    <span>Open Media Studio</span>
                  </button>
                )}
              </div>
            ) : (
              combinedFeed.map((post) => {
                const isLiked = post.likes?.includes(currentUser?.uid || '');
                const isSaved = (userProfile?.savedPostIds || []).includes(post.id);
                const isAuthor = post.authorId === currentUser?.uid;
                const canDelete = isAuthor || isAdmin;
                const canEdit = isAuthor && isProEffective;
                const comments = commentsMap[post.id] || [];
                const isExpanded = !!expandedComments[post.id];

                // Case A: Designated Native In-Feed Sponsored Ad Unit with Smart Affiliate Tagging
                if (post.isSponsored) {
                  return (
                    <div
                      key={post.id}
                      className="w-full my-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4 sm:p-5 overflow-hidden text-slate-100 shadow-md transition hover:border-slate-700"
                    >
                      {/* Sponsored Header */}
                      <div className="flex items-center justify-between mb-3.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={post.authorPhotoURL}
                            alt={post.authorName}
                            className="w-9 h-9 rounded-full object-cover ring-2 ring-purple-500/40 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-extrabold text-sm sm:text-base text-white truncate">
                                {post.authorName}
                              </span>
                              <span className="text-xs font-mono text-purple-400 truncate">
                                {post.authorUsername}
                              </span>
                              {/* Subtle tiny sponsored tag */}
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                                <Tag size={10} className="text-amber-500" />
                                <span>Sponsored</span>
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                              <span>Recommended Community Wave</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed mb-3.5">
                        {post.content}
                      </p>

                      {/* Image */}
                      {post.imageUrl && (
                        <div className="rounded-2xl overflow-hidden mb-3.5 border border-gray-100 dark:border-gray-800 max-h-96 bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                          <img
                            src={post.imageUrl}
                            alt="Sponsored item"
                            className="w-full h-auto max-h-96 object-cover"
                          />
                        </div>
                      )}

                      {/* Smart Contextual Affiliate Shop Box */}
                      {post.affiliateProductTitle && (
                        <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50/50 to-pink-50/40 dark:from-purple-950/40 dark:via-indigo-950/30 dark:to-slate-900/40 border border-purple-200 dark:border-purple-800/80 mb-3.5 flex items-center justify-between flex-wrap gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black uppercase text-purple-600 dark:text-purple-400 tracking-wider">
                                Featured Product
                              </span>
                              <span className="text-[10px] font-bold text-amber-500">
                                ★ {post.affiliateRating || 4.9}
                              </span>
                            </div>
                            <h4 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white truncate mt-0.5">
                              {post.affiliateProductTitle}
                            </h4>
                            <span className="text-xs font-black font-mono text-purple-600 dark:text-purple-400">
                              {post.affiliateProductPrice}
                            </span>
                          </div>

                          <a
                            href={post.affiliateProductUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-purple-600/20 active:scale-95 transition shrink-0"
                          >
                            <ShoppingBag size={14} />
                            <span>{post.affiliateButtonText || 'Shop Now'}</span>
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      )}

                      {/* Action Bar */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleToggleLike(post)}
                            className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl transition hover:bg-gray-100 dark:hover:bg-gray-800"
                          >
                            <Heart size={16} />
                            <span className="font-mono tabular-numbers">{post.likesCount || 0}</span>
                          </button>
                          <button
                            onClick={() => toggleComments(post.id)}
                            className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
                          >
                            <MessageCircle size={16} />
                            <span className="font-mono tabular-numbers">{post.commentsCount || 0}</span>
                          </button>
                        </div>
                        <button
                          onClick={() => copyPostLink(post.id)}
                          className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                        >
                          <Share2 size={14} />
                          <span>Share</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                // Case B: Standard Community Wave Post (with Boosting & Tipping)
                return (
                  <article
                    key={post.id}
                    className={`w-full max-w-full overflow-hidden break-words bg-white dark:bg-[#131927] border rounded-3xl p-4 sm:p-6 shadow-xs transition ${
                      post.isBoosted
                        ? 'border-amber-400 dark:border-amber-500/60 ring-2 ring-amber-400/20 shadow-md shadow-amber-500/10'
                        : 'border-gray-200/90 dark:border-gray-800 hover:border-purple-300 dark:hover:border-purple-900/60'
                    }`}
                  >
                    {/* Author Header */}
                    <div className="flex items-center justify-between mb-3.5">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            post.authorPhotoURL ||
                            `https://api.dicebear.com/7.x/shapes/svg?seed=${post.authorId}`
                          }
                          alt={post.authorName}
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-purple-500/20"
                        />
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <CrystalBadge
                              email={post.authorEmail}
                              name={post.authorName}
                              size="md"
                            />
                            {post.authorUsername && (
                              <span className="text-xs font-mono text-purple-600 dark:text-purple-400">
                                {post.authorUsername}
                              </span>
                            )}
                            {/* Golden Boosted Badge */}
                            {post.isBoosted && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 text-white shadow-xs animate-pulse">
                                <Rocket size={10} className="fill-white" />
                                <span>Boosted</span>
                              </span>
                            )}
                            {/* Tips received count */}
                            {Boolean(post.tipsTotalTZS && post.tipsTotalTZS > 0) && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40">
                                <HandCoins size={10} />
                                <span>TZS {post.tipsTotalTZS?.toLocaleString()} tips</span>
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                            <span className="font-mono tabular-numbers">
                              {new Date(post.createdAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>Wave</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Boost Button for Author if not yet boosted */}
                        {isAuthor && !post.isBoosted && (
                          <button
                            onClick={() => setBoostingPost(post)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800 transition active:scale-95 shadow-2xs"
                            title="Boost Post Reach for 2,000 TZS micro-payment"
                          >
                            <Rocket size={12} className="text-amber-500" />
                            <span>Boost (2k)</span>
                          </button>
                        )}

                        {canEdit && (
                          <button
                            onClick={() => handleStartEditPost(post)}
                            className="p-1.5 text-gray-400 hover:text-purple-600 rounded-lg transition"
                            title="Edit Wave Content (Pro Privilege)"
                          >
                            <Edit2 size={15} />
                          </button>
                        )}

                        {canDelete && (
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg transition"
                            title={isAdmin && !isAuthor ? 'Admin Moderation: Delete' : 'Delete Post'}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Content or Inline Editor */}
                    {editingPostId === post.id ? (
                      <div className="mb-3.5 p-3 rounded-2xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 space-y-2">
                        <textarea
                          rows={3}
                          value={editPostContent}
                          onChange={(e) => setEditPostContent(e.target.value)}
                          className="w-full p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-purple-300 dark:border-purple-700 text-xs sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingPostId(null)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={isSavingPostEdit}
                            onClick={() => handleSavePostEdit(post.id)}
                            className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs disabled:opacity-50"
                          >
                            {isSavingPostEdit ? 'Saving...' : 'Save Wave'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      post.content && (
                        <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed mb-3.5">
                          {post.content}
                          {post.isEdited && (
                            <span className="text-[10px] text-gray-400 italic ml-2">
                              (edited)
                            </span>
                          )}
                        </p>
                      )
                    )}

                    {/* Attached Online Song Soundtrack */}
                    {post.songPreviewUrl && post.songTitle && (
                      <div className="mb-3.5">
                        <SongPlayerCard
                          title={post.songTitle}
                          artist={post.songArtist || ''}
                          albumArt={post.songAlbumArt}
                          previewUrl={post.songPreviewUrl}
                          albumName={post.songAlbumName}
                        />
                      </div>
                    )}

                    {/* Attached Video from Folders / Community Hub */}
                    {(post.videoUrl || post.hasVideoChunks || post.mediaType === 'video') && (
                      <div className="mb-3.5">
                        <VideoPlayer
                          postId={post.id}
                          videoUrl={post.videoUrl}
                          hasVideoChunks={post.hasVideoChunks}
                        />
                      </div>
                    )}

                    {/* Attached Image from Folders */}
                    {post.imageUrl && !post.videoUrl && !post.hasVideoChunks && post.mediaType !== 'video' && (
                      <div className="rounded-2xl overflow-hidden mb-3.5 border border-gray-100 dark:border-gray-800 max-h-96 bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                        <img
                          src={post.imageUrl}
                          alt="Wave attachment"
                          className="w-full h-auto max-h-96 object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                        {/* Like */}
                        <button
                          onClick={() => handleToggleLike(post)}
                          className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl transition active:scale-95 ${
                            isLiked
                              ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 font-bold'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                        >
                          <Heart size={16} className={isLiked ? 'fill-rose-600 text-rose-600' : ''} />
                          <span className="font-mono tabular-numbers">{post.likesCount || 0}</span>
                        </button>

                        {/* Comments */}
                        <button
                          onClick={() => toggleComments(post.id)}
                          className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl transition ${
                            isExpanded
                              ? 'text-purple-600 bg-purple-50 dark:bg-purple-950/40'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                        >
                          <MessageCircle size={16} />
                          <span className="font-mono tabular-numbers">{post.commentsCount || 0} Replies</span>
                        </button>

                        {/* Creator Tip Button */}
                        <button
                          onClick={() => setTippingPost(post)}
                          className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl transition hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold active:scale-95 border border-amber-300/40"
                          title="Tip creator directly via Mobile Money"
                        >
                          <HandCoins size={15} className="text-amber-500" />
                          <span>Tip {post.tipsCount ? `(${post.tipsCount})` : ''}</span>
                        </button>

                        {/* Save / Bookmark */}
                        <button
                          onClick={() => handleToggleSave(post.id)}
                          className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl transition active:scale-95 ${
                            isSaved
                              ? 'text-purple-600 bg-purple-50 dark:bg-purple-950/40 font-bold'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                          title={isSaved ? 'Saved to bookmarks' : 'Save post'}
                        >
                          <Bookmark size={16} className={isSaved ? 'fill-purple-600 text-purple-600' : ''} />
                          <span className="font-mono tabular-numbers">{post.savesCount || 0}</span>
                        </button>
                      </div>

                      <button
                        onClick={() => copyPostLink(post.id)}
                        className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                      >
                        {copiedId === post.id ? (
                          <Check size={14} className="text-emerald-500" />
                        ) : (
                          <Share2 size={14} />
                        )}
                        <span>{copiedId === post.id ? 'Copied' : 'Share'}</span>
                      </button>
                    </div>

                    {/* Collapsible Comments Section */}
                    {isExpanded && (
                      <div className="mt-4 pt-3.5 border-t border-gray-100 dark:border-gray-800 space-y-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={commentInput[post.id] || ''}
                            onChange={(e) =>
                              setCommentInput((prev) => ({ ...prev, [post.id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddComment(post.id);
                            }}
                            placeholder="Write a reply..."
                            className="flex-1 py-2 px-3.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                          <button
                            onClick={() => handleAddComment(post.id)}
                            disabled={!commentInput[post.id]?.trim()}
                            className="p-2 rounded-xl bg-purple-600 text-white disabled:opacity-40 hover:bg-purple-700 transition"
                          >
                            <Send size={14} />
                          </button>
                        </div>

                        {comments.length === 0 ? (
                          <p className="text-[11px] text-gray-400 italic py-1">
                            No replies yet. Be the first to chime in!
                          </p>
                        ) : (
                          <div className="space-y-2 pt-1">
                            {comments.map((comment) => (
                              <div
                                key={comment.id}
                                className="flex items-start gap-2.5 p-3 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 text-xs"
                              >
                                <img
                                  src={
                                    comment.authorPhotoURL ||
                                    `https://api.dicebear.com/7.x/shapes/svg?seed=${comment.authorId}`
                                  }
                                  alt={comment.authorName}
                                  className="w-7 h-7 rounded-full object-cover ring-1 ring-purple-500/20 shrink-0 mt-0.5"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <CrystalBadge
                                      email={comment.authorEmail}
                                      name={comment.authorName}
                                      size="sm"
                                    />
                                    <span className="text-[10px] text-gray-400 font-mono tabular-numbers">
                                      {new Date(comment.createdAt).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-gray-700 dark:text-gray-300 leading-relaxed">
                                    {comment.content}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })
            )}

            {/* Adsterra Native In-Feed Banner (Visible only for free users, instant auto-hide when upgrading to Pro) */}
            <AdsterraAdBanner
              variant="feed"
              slotId="feed_bottom"
              onOpenUpgradeModal={() => setIsPaymentModalOpen(true)}
            />
          </div>

          {/* Legal Footer for Privacy, Terms & Refund policies */}
          <LegalFooter className="mt-6" />
        </div>

        {/* Right Sidebar (Desktop Width >= 768px: 3rd Column, Width < 768px: hidden md:block) */}
        <RightSidebar onNavigateTab={(tab) => onNavigateTab && onNavigateTab(tab as any)} />
      </div>

      {/* Mobile Money Payment Modal */}
      {isPaymentModalOpen && (
        <MobileMoneyPaymentModal
          onClose={() => setIsPaymentModalOpen(false)}
          onSuccess={() => setIsPaymentModalOpen(false)}
        />
      )}

      {/* Creator Tipping Modal */}
      {tippingPost && (
        <CreatorTipModal
          post={tippingPost}
          isOpen={true}
          onClose={() => setTippingPost(null)}
          onSuccess={() => {
            // refresh or keep
          }}
        />
      )}

      {/* Post Boost Modal */}
      {boostingPost && (
        <PostBoostModal
          post={boostingPost}
          isOpen={true}
          onClose={() => setBoostingPost(null)}
          onSuccess={() => {
            // refresh or keep
          }}
        />
      )}
    </div>
  );
};

