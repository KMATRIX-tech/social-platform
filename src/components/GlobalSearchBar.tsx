import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { UserProfile, Post, ActiveTab } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  X,
  User,
  Film,
  Hash,
  MessageSquare,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Image as ImageIcon,
  Heart,
  Crown
} from 'lucide-react';
import { CrystalBadge } from './CrystalBadge';

interface GlobalSearchBarProps {
  onNavigateTab: (tab: ActiveTab) => void;
  onStartChat?: (userId: string) => void;
  onSelectHashtag?: (hashtag: string) => void;
}

const DEFAULT_TRENDING_TAGS = [
  '#WaveLinkTZ',
  '#AirtelMoneyTZ',
  '#BongoCreatives',
  '#DarTech2026',
  '#PostBoostTZ',
  '#EastAfricaMusic',
  '#ReelsTZ'
];

export const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({
  onNavigateTab,
  onStartChat,
  onSelectHashtag
}) => {
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'all' | 'users' | 'posts' | 'hashtags'>('all');

  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [allHashtags, setAllHashtags] = useState<string[]>(DEFAULT_TRENDING_TAGS);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch users & posts for instant live search
  useEffect(() => {
    const usersQ = query(collection(db, 'users'), limit(100));
    const unsubUsers = onSnapshot(usersQ, (snap) => {
      const list: UserProfile[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as UserProfile));
      setAllUsers(list);
    });

    const postsQ = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(150));
    const unsubPosts = onSnapshot(postsQ, (snap) => {
      const list: Post[] = [];
      const tagSet = new Set<string>(DEFAULT_TRENDING_TAGS);
      snap.forEach((d) => {
        const post = { id: d.id, ...d.data() } as Post;
        list.push(post);
        // Extract hashtags from content
        const matches = post.content?.match(/#[a-zA-Z0-9_]+/g);
        if (matches) {
          matches.forEach((t) => tagSet.add(t));
        }
      });
      setAllPosts(list);
      setAllHashtags(Array.from(tagSet));
    });

    return () => {
      unsubUsers();
      unsubPosts();
    };
  }, []);

  // Keyboard shortcut listener ('/' opens search, 'Escape' closes)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== inputRef.current && !['INPUT', 'TEXTAREA'].includes((document.activeElement as HTMLElement)?.tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter matching entities
  const cleanQuery = searchTerm.trim().toLowerCase();

  const matchedUsers = cleanQuery
    ? allUsers.filter(
        (u) =>
          (u.displayName || '').toLowerCase().includes(cleanQuery) ||
          (u.username || '').toLowerCase().includes(cleanQuery) ||
          (u.email || '').toLowerCase().includes(cleanQuery) ||
          (u.bio || '').toLowerCase().includes(cleanQuery)
      )
    : [];

  const matchedPosts = cleanQuery
    ? allPosts.filter(
        (p) =>
          (p.content || '').toLowerCase().includes(cleanQuery) ||
          (p.authorName || '').toLowerCase().includes(cleanQuery) ||
          (p.authorUsername || '').toLowerCase().includes(cleanQuery)
      )
    : [];

  const matchedHashtags = cleanQuery
    ? allHashtags.filter((tag) => tag.toLowerCase().includes(cleanQuery.replace(/^#/, '')))
    : allHashtags.slice(0, 5);

  const totalResults = matchedUsers.length + matchedPosts.length + matchedHashtags.length;

  const handleSelectUser = (user: UserProfile) => {
    setIsOpen(false);
    if (onStartChat) {
      onStartChat(user.id);
    } else {
      onNavigateTab('directory');
    }
  };

  const handleSelectPost = (_post: Post) => {
    setIsOpen(false);
    onNavigateTab('feed');
  };

  const handleSelectTag = (tag: string) => {
    setIsOpen(false);
    if (onSelectHashtag) {
      onSelectHashtag(tag);
    }
    onNavigateTab('feed');
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg">
      {/* Search Input Box */}
      <div className="relative flex items-center">
        <Search
          size={16}
          className="absolute left-3.5 text-slate-400 pointer-events-none transition-colors"
        />
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search waves, @users, #hashtags..."
          className="w-full pl-9 pr-14 py-1.5 sm:py-2 rounded-2xl bg-gray-100/90 dark:bg-slate-900/90 border border-gray-200/90 dark:border-slate-800 text-xs sm:text-sm text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition-all shadow-2xs"
        />

        <div className="absolute right-2.5 flex items-center gap-1">
          {searchTerm ? (
            <button
              onClick={() => {
                setSearchTerm('');
                inputRef.current?.focus();
              }}
              className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-white transition"
              title="Clear search"
            >
              <X size={14} />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-gray-400 dark:text-slate-500 bg-gray-200/60 dark:bg-slate-800/80 rounded border border-gray-300/40 dark:border-slate-700">
              /
            </kbd>
          )}
        </div>
      </div>

      {/* Floating Results Dropdown Popover */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-3xl bg-white/95 dark:bg-[#0e1424]/95 backdrop-blur-xl border border-gray-200 dark:border-purple-500/30 shadow-2xl overflow-hidden animate-in fade-in">
          {/* Category Tabs */}
          <div className="flex border-b border-gray-100 dark:border-slate-800/80 bg-gray-50/80 dark:bg-slate-950/40 px-3 pt-2 gap-1 text-[11px] font-semibold overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1.5 rounded-t-xl transition whitespace-nowrap flex items-center gap-1.5 border-b-2 ${
                activeCategory === 'all'
                  ? 'border-purple-500 text-purple-600 dark:text-purple-300 font-bold bg-white dark:bg-slate-900/60'
                  : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-slate-200'
              }`}
            >
              <span>All Results</span>
              {cleanQuery && <span className="text-[10px] opacity-75 font-mono">({totalResults})</span>}
            </button>
            <button
              onClick={() => setActiveCategory('users')}
              className={`px-3 py-1.5 rounded-t-xl transition whitespace-nowrap flex items-center gap-1.5 border-b-2 ${
                activeCategory === 'users'
                  ? 'border-purple-500 text-purple-600 dark:text-purple-300 font-bold bg-white dark:bg-slate-900/60'
                  : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-slate-200'
              }`}
            >
              <User size={12} />
              <span>Users</span>
              {cleanQuery && <span className="text-[10px] opacity-75 font-mono">({matchedUsers.length})</span>}
            </button>
            <button
              onClick={() => setActiveCategory('posts')}
              className={`px-3 py-1.5 rounded-t-xl transition whitespace-nowrap flex items-center gap-1.5 border-b-2 ${
                activeCategory === 'posts'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-300 font-bold bg-white dark:bg-slate-900/60'
                  : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-slate-200'
              }`}
            >
              <Film size={12} />
              <span>Posts</span>
              {cleanQuery && <span className="text-[10px] opacity-75 font-mono">({matchedPosts.length})</span>}
            </button>
            <button
              onClick={() => setActiveCategory('hashtags')}
              className={`px-3 py-1.5 rounded-t-xl transition whitespace-nowrap flex items-center gap-1.5 border-b-2 ${
                activeCategory === 'hashtags'
                  ? 'border-pink-500 text-pink-600 dark:text-pink-300 font-bold bg-white dark:bg-slate-900/60'
                  : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-slate-200'
              }`}
            >
              <Hash size={12} />
              <span>Hashtags</span>
              {cleanQuery && <span className="text-[10px] opacity-75 font-mono">({matchedHashtags.length})</span>}
            </button>
          </div>

          {/* Results List */}
          <div className="max-h-80 overflow-y-auto p-2 space-y-3">
            {/* If query empty: show trending recommendations */}
            {!cleanQuery && (
              <div className="p-3 text-xs">
                <div className="flex items-center gap-1.5 text-amber-500 dark:text-amber-400 font-bold uppercase tracking-wider text-[10px] mb-2">
                  <TrendingUp size={13} />
                  <span>Trending on WaveLink</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {DEFAULT_TRENDING_TAGS.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleSelectTag(tag)}
                      className="px-2.5 py-1 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/50 text-xs font-semibold flex items-center gap-1 transition active:scale-95"
                    >
                      <Hash size={11} className="text-purple-400" />
                      <span>{tag.replace(/^#/, '')}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* No results state */}
            {cleanQuery && totalResults === 0 && (
              <div className="p-8 text-center text-gray-400 dark:text-slate-500">
                <Search size={28} className="mx-auto mb-2 opacity-40 text-purple-400" />
                <p className="text-xs font-medium">No results found for &quot;{cleanQuery}&quot;</p>
                <p className="text-[11px] text-gray-400 mt-1">Try searching by username, creator name, or #trending tags</p>
              </div>
            )}

            {/* 1. Users Section */}
            {(activeCategory === 'all' || activeCategory === 'users') && matchedUsers.length > 0 && (
              <div className="space-y-1">
                <div className="px-2 py-1 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Users ({matchedUsers.length})</span>
                  <button onClick={() => onNavigateTab('directory')} className="text-purple-500 hover:underline">
                    View All
                  </button>
                </div>
                {matchedUsers.slice(0, 4).map((u) => (
                  <div
                    key={u.id}
                    onClick={() => handleSelectUser(u)}
                    className="p-2 rounded-2xl hover:bg-gray-100 dark:hover:bg-slate-800/70 transition cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={u.photoURL || `https://api.dicebear.com/7.x/shapes/svg?seed=${u.id}`}
                        alt="Avatar"
                        className="w-9 h-9 rounded-full object-cover ring-1 ring-purple-500/20 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-bold text-xs text-gray-900 dark:text-white truncate">
                            {u.displayName}
                          </span>
                          {u.isPro && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-400/20 text-amber-300 font-extrabold flex items-center gap-0.5">
                              <Crown size={9} />
                              PRO
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-gray-400 dark:text-slate-400 block truncate font-mono">
                          {u.username || `@${u.email.split('@')[0]}`}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 opacity-80 group-hover:opacity-100 transition">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectUser(u);
                        }}
                        className="px-2.5 py-1 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold flex items-center gap-1 transition"
                      >
                        <MessageSquare size={11} />
                        <span>Chat</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 2. Posts Section */}
            {(activeCategory === 'all' || activeCategory === 'posts') && matchedPosts.length > 0 && (
              <div className="space-y-1 pt-1 border-t border-gray-100 dark:border-slate-800/60">
                <div className="px-2 py-1 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Waves &amp; Reels ({matchedPosts.length})</span>
                  <button onClick={() => onNavigateTab('feed')} className="text-purple-500 hover:underline">
                    Feed
                  </button>
                </div>
                {matchedPosts.slice(0, 4).map((post) => (
                  <div
                    key={post.id}
                    onClick={() => handleSelectPost(post)}
                    className="p-2 rounded-2xl hover:bg-gray-100 dark:hover:bg-slate-800/70 transition cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-bold text-xs text-purple-600 dark:text-purple-400 truncate">
                          {post.authorName}
                        </span>
                        {post.mediaType === 'video' ? (
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-pink-500/20 text-pink-300 font-bold flex items-center gap-0.5">
                            <Film size={9} />
                            Reel
                          </span>
                        ) : post.imageUrl ? (
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-teal-500/20 text-teal-300 font-bold flex items-center gap-0.5">
                            <ImageIcon size={9} />
                            Photo
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-gray-700 dark:text-slate-300 line-clamp-1 break-words">
                        {post.content}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400 text-[11px] shrink-0">
                      <span className="flex items-center gap-0.5">
                        <Heart size={11} className="text-rose-400" />
                        {post.likesCount || 0}
                      </span>
                      <ArrowRight size={13} className="text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 3. Hashtags Section */}
            {(activeCategory === 'all' || activeCategory === 'hashtags') && matchedHashtags.length > 0 && (
              <div className="space-y-1 pt-1 border-t border-gray-100 dark:border-slate-800/60">
                <div className="px-2 py-1 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                  <span>Hashtags ({matchedHashtags.length})</span>
                </div>
                <div className="flex flex-wrap gap-1.5 px-2">
                  {matchedHashtags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleSelectTag(tag)}
                      className="px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/20 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
                    >
                      <Hash size={12} className="text-pink-400" />
                      <span>{tag}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Footer */}
          <div className="p-2.5 bg-gray-50 dark:bg-slate-950/80 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-gray-400 dark:text-slate-500">
            <span>Press <strong>Esc</strong> to close</span>
            <span>Global Real-Time Search</span>
          </div>
        </div>
      )}
    </div>
  );
};
