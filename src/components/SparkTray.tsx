import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Spark } from '../types';
import { SparkViewerModal } from './SparkViewerModal';
import { SparkComposerModal } from './SparkComposerModal';
import {
  Flame,
  Plus,
  Clock,
  Sparkles,
  Zap,
  Play
} from 'lucide-react';

export const SparkTray: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const [activeSparks, setActiveSparks] = useState<Spark[]>([]);
  const [selectedSparkIndex, setSelectedSparkIndex] = useState<number | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  // Real-time listener for sparks
  useEffect(() => {
    const q = query(collection(db, 'sparks'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const now = new Date().getTime();
        const list: Spark[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Spark;
          // Filter strictly: only sparks that have not expired (< 24 hours)
          const expiresAtTime = new Date(data.expiresAt).getTime();
          if (expiresAtTime > now) {
            list.push({ ...data, id: docSnap.id });
          }
        });
        setActiveSparks(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'sparks');
      }
    );

    return () => unsub();
  }, []);

  // Periodic tick to remove expired sparks client-side every minute
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      setActiveSparks((prev) =>
        prev.filter((spark) => new Date(spark.expiresAt).getTime() > now)
      );
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Calculate short remaining time
  const getHoursLeft = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return '0m';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h left`;
    return `${minutes}m left`;
  };

  return (
    <>
      <div className="bg-white dark:bg-[#131927] border-2 border-amber-300/60 dark:border-amber-500/30 rounded-3xl p-4 sm:p-5 shadow-sm shadow-amber-500/5">
        {/* Tray Header */}
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white shadow-xs">
              <Flame size={15} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-black text-gray-900 dark:text-white tracking-tight">
                  Sparks (24h Legendary Moments)
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-0.5">
                  <Zap size={10} className="fill-amber-500 text-amber-500" />
                  <span>24H Only</span>
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsComposerOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition active:scale-95"
          >
            <Plus size={14} />
            <span>Post Spark</span>
          </button>
        </div>

        {/* Horizontal Carousel Tray */}
        <div className="flex items-center gap-3.5 overflow-x-auto pb-2 scrollbar-none pt-1">
          {/* Item 1: Current user "+ Add Spark" Button */}
          <div
            onClick={() => setIsComposerOpen(true)}
            className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
          >
            <div className="relative w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 transition-transform group-hover:scale-105 shadow-sm">
              <div className="w-full h-full rounded-full bg-white dark:bg-[#131927] p-0.5 flex items-center justify-center overflow-hidden">
                <img
                  src={
                    userProfile?.photoURL ||
                    currentUser?.photoURL ||
                    `https://api.dicebear.com/7.x/shapes/svg?seed=${currentUser?.uid || 'user'}`
                  }
                  alt="Your Spark"
                  className="w-full h-full rounded-full object-cover opacity-85 group-hover:opacity-100 transition-opacity"
                />
              </div>

              {/* Plus Badge */}
              <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 border-2 border-white dark:border-[#131927] text-white flex items-center justify-center shadow-xs">
                <Plus size={12} className="stroke-[3]" />
              </div>
            </div>

            <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 max-w-[70px] truncate text-center">
              Your Spark
            </span>
          </div>

          {/* Active Sparks posted by community within 24h */}
          {activeSparks.map((spark, index) => {
            const isMine = spark.authorId === currentUser?.uid;

            return (
              <div
                key={spark.id}
                onClick={() => setSelectedSparkIndex(index)}
                className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
              >
                {/* Glowing Legendary Ring Avatar */}
                <div className="relative w-16 h-16 rounded-full p-0.75 bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 transition-transform group-hover:scale-105 shadow-md shadow-amber-500/15">
                  <div className="w-full h-full rounded-full bg-black overflow-hidden ring-2 ring-white dark:ring-[#131927] relative">
                    {spark.mediaType === 'video' ? (
                      <div className="w-full h-full bg-gray-900 flex items-center justify-center relative">
                        <img
                          src={spark.authorPhotoURL || `https://api.dicebear.com/7.x/shapes/svg?seed=${spark.authorId}`}
                          alt={spark.authorName}
                          className="w-full h-full object-cover opacity-75"
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <Play size={14} className="fill-white text-white" />
                        </div>
                      </div>
                    ) : (
                      <img
                        src={spark.mediaUrl}
                        alt="Spark Moment"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  {/* Flame Badge */}
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 border-2 border-white dark:border-[#131927] text-white flex items-center justify-center shadow-xs">
                    <Flame size={11} className="fill-white text-white" />
                  </div>
                </div>

                {/* Author Name + Time Remaining */}
                <div className="flex flex-col items-center max-w-[72px]">
                  <span className="text-[11px] font-bold text-gray-800 dark:text-gray-200 truncate w-full text-center">
                    {isMine ? 'You' : spark.authorName.split(' ')[0]}
                  </span>
                  <span className="text-[9px] font-mono text-amber-600 dark:text-amber-400 font-bold truncate">
                    {getHoursLeft(spark.expiresAt)}
                  </span>
                </div>
              </div>
            );
          })}

          {activeSparks.length === 0 && (
            <div className="flex items-center gap-3 pl-3 pr-6 py-2 text-xs text-gray-400 dark:text-gray-500 italic">
              <span>No sparks right now. Be the first to ignite a 24-hour legendary moment!</span>
            </div>
          )}
        </div>
      </div>

      {/* Spark Composer Modal */}
      <SparkComposerModal
        isOpen={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
      />

      {/* Fullscreen Spark Story Viewer Modal */}
      {selectedSparkIndex !== null && activeSparks.length > 0 && (
        <SparkViewerModal
          sparks={activeSparks}
          initialIndex={selectedSparkIndex}
          onClose={() => setSelectedSparkIndex(null)}
        />
      )}
    </>
  );
};
