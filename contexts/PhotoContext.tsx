// PhotoContext.tsx
// Context for managing photo state across components

/* ------------------------------------------------------
WHAT IT DOES
- Provides global photo list state management (`photos`, `isLoading`).
- Manages the currently selected snapshot (`selectedSnapshot`).
- Handles photo list refresh triggers.
- Shares photo list loading state.
- Caches photo list in AsyncStorage for faster loading.
- Manages photo list data synchronization with API.

RESPONSIBILITIES REMOVED (Now in ThreadContext/SnapshotScreen):
- Thread creation and management.
- Loading individual snapshot details (handled by screens using selectedSnapshot.id).

DEV PRINCIPLES
- Uses TypeScript for type safety
- Implements React Context API
- Keeps photo *list* state management centralized
- Uses AsyncStorage for persistent caching
------------------------------------------------------*/

import React, { createContext, useState, useContext, useEffect, useCallback, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserPhotos } from '../utils/newApiService';
import useAuthStore from '../stores/authStore';

const CACHE_KEY = 'PHOTO_CACHE';
const CACHE_TIMESTAMP_KEY = 'PHOTO_CACHE_TIMESTAMP';

interface Photo {
  id: string;
  timestamp?: string | Date;
  storageUrl: string;
  threadId?: string;
  maskResults?: any;
  maskImages?: any;
  metrics?: any;
  url?: string;
  apiData?: any;
  [key: string]: any;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}

interface PhotoContextType {
  photos: Photo[];
  isLoading: boolean;
  refreshPhotos: () => void;
  lastUpdated: Date | null;
  clearCache: () => Promise<void>;
  selectedSnapshot: Photo | null;
  setSelectedSnapshot: (snapshot: Photo | null | ((prev: Photo | null) => Photo | null)) => void;
  pagination: Pagination;
  isLoadingMore: boolean;
  loadMorePhotos: () => Promise<void>;
}

interface PhotoProviderProps {
  children: ReactNode;
}

const PhotoContext = createContext<PhotoContextType | undefined>(undefined);

export function PhotoProvider({ children }: PhotoProviderProps): React.JSX.Element {
  // Manual state management instead of React Query
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState<Photo | null>(null);
  
  // Pagination state
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 10,
    pages: 0,
    has_next: false,
    has_prev: false
  });
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  // --- Logging Helper ---
  const logSnapshot = (location: string, snapshot: Photo | null): void => {
    const snapshotSummary = snapshot
      ? { id: snapshot.id, urlExists: !!snapshot.storageUrl, threadIdExists: !!snapshot.threadId }
      : null;
    // console.log(`[PhotoContext.tsx] -> ${location} : selectedSnapshot =`, snapshotSummary);
  };

  // --- Wrapped State Setter ---
  const setSelectedSnapshotWithLogging = useCallback((newValueOrFn: Photo | null | ((prev: Photo | null) => Photo | null)): void => {
    setSelectedSnapshot(currentSnapshot => {
      logSnapshot("setSelectedSnapshot (before)", currentSnapshot);
      const newValue = typeof newValueOrFn === 'function'
        ? newValueOrFn(currentSnapshot)
        : newValueOrFn;
      const newSnapshotSummary = newValue
        ? { id: newValue.id, urlExists: !!newValue.storageUrl, threadIdExists: !!newValue.threadId }
        : null;
      // console.log("[PhotoContext.tsx] -> setSelectedSnapshot (new value)", newSnapshotSummary);
      // Only update if the ID or presence of URL/threadId actually changes
      // Or if going to/from null
      const currentSummary = currentSnapshot
          ? { id: currentSnapshot.id, urlExists: !!currentSnapshot.storageUrl, threadIdExists: !!currentSnapshot.threadId }
          : null;
      if (JSON.stringify(currentSummary) !== JSON.stringify(newSnapshotSummary)) {
         return newValue;
      }
      // console.log("[PhotoContext.tsx] -> setSelectedSnapshot : New value identical, skipping state update.");
      return currentSnapshot; // Return current state if no change detected

    });
  }, []); // No dependency needed for useCallback wrapping setter

  // Log when selectedSnapshot actually changes state
  useEffect(() => {
     logSnapshot("useEffect[selectedSnapshot]", selectedSnapshot);
  }, [selectedSnapshot]);

  // Cache photos helper
  const cachePhotos = useCallback(async (photosToCache: Photo[]): Promise<void> => {
    if (!photosToCache || photosToCache.length === 0) return; // Don't cache empty arrays
    try {
      const timestamp = Date.now();
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(photosToCache));
      await AsyncStorage.setItem(CACHE_TIMESTAMP_KEY, timestamp.toString());
    } catch (error) {
      console.error('🔴 PHOTO_CONTEXT: Error caching photos:', error);
    }
  }, []);

  // Load cached photos helper
  const loadCachedPhotos = useCallback(async (): Promise<Photo[] | null> => {
    try {
      const cachedPhotosJson = await AsyncStorage.getItem(CACHE_KEY);
      const cachedTimestamp = await AsyncStorage.getItem(CACHE_TIMESTAMP_KEY);

      if (cachedPhotosJson) {
        const cachedPhotos: Photo[] = JSON.parse(cachedPhotosJson);
        console.log('🔵 PHOTO_CONTEXT: Loaded cached photos:', cachedPhotos.length);
        setPhotos(cachedPhotos);
        setLastUpdated(cachedTimestamp ? new Date(parseInt(cachedTimestamp)) : new Date());
        return cachedPhotos;
      }
    } catch (error) {
      console.error('🔴 PHOTO_CONTEXT: Error loading cached photos:', error);
    }
    return null;
  }, []);

  // Fetch photos when the authenticated user changes (Zustand store)
  const { user, isAuthenticated } = useAuthStore();

  // Main fetch photos function
  const fetchPhotos = useCallback(async (useCache: boolean = true, page: number = 1): Promise<void> => {
    try {
      // Check if user is authenticated before fetching photos
      if (!isAuthenticated || !user?.user_id) {
        console.log('🔴 PHOTO_CONTEXT: User not authenticated, skipping photo fetch');
        return;
      }
      
      setIsLoading(true);
      console.log('🔵 PHOTO_CONTEXT: Fetching photos from API - page:', page, 'user:', user.user_id);
      
      // Load cached photos first if requested (only for first page)
      if (useCache && page === 1) {
        await loadCachedPhotos();
      }
      
      const result = await getUserPhotos(page, 5);
      const apiPhotos: Photo[] = (result as any).photos;
      
      // Sort the photos by timestamp (Newest to Oldest) 
      const sortedPhotos = [...apiPhotos].sort((a, b) => {
        const dateA = a.timestamp ? new Date(a.timestamp) : new Date(0);
        const dateB = b.timestamp ? new Date(b.timestamp) : new Date(0);
        return dateB.getTime() - dateA.getTime(); // Descending sort (newest first)
      });

      // Deduplicate photos based on ID
      const uniquePhotos = sortedPhotos.filter((photo, index, self) => 
        index === self.findIndex(p => p.id === photo.id)
      );

      if (page === 1) {
        // First page - replace all photos
        setPhotos(uniquePhotos);
        setPagination((result as any).pagination);
      } else {
        // Subsequent pages - append to existing photos with deduplication
        setPhotos(prevPhotos => {
          const existingIds = new Set(prevPhotos.map(p => p.id));
          const newPhotos = uniquePhotos.filter(photo => !existingIds.has(photo.id));
          return [...prevPhotos, ...newPhotos];
        });
        setPagination((result as any).pagination);
      }

      setLastUpdated(new Date());
      if (page === 1) {
        await cachePhotos(uniquePhotos);
      }

      console.log('✅ PHOTO_CONTEXT: Photos fetched and sorted successfully:', uniquePhotos.length);
    } catch (error) {
      console.error('🔴 PHOTO_CONTEXT: Error fetching photos from API:', error);
    } finally {
      setIsLoading(false);
    }
  }, [loadCachedPhotos, cachePhotos, isAuthenticated, user?.user_id]);

  useEffect(() => {
    if (!isAuthenticated || !user?.user_id) {
      setPhotos([]);
      setLastUpdated(null);
      setSelectedSnapshotWithLogging(null);
      setPagination({
        total: 0,
        page: 1,
        limit: 10,
        pages: 0,
        has_next: false,
        has_prev: false
      });
      return;
    }

    // Clear previous cache and state when user changes, then fetch
    (async () => {
      await clearCache();
      setSelectedSnapshotWithLogging(null);
      await fetchPhotos(false); // Don't use cache on user change
    })();
  }, [isAuthenticated, user?.user_id, fetchPhotos, setSelectedSnapshotWithLogging]);

  // Load cached photos on initial mount
  const hasFetchedFromApiRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isAuthenticated || !user?.user_id) return;

    if (!hasFetchedFromApiRef.current) {
      hasFetchedFromApiRef.current = true;
      fetchPhotos(true); // Use cache on initial load
    }
  }, [isAuthenticated, user?.user_id, fetchPhotos]);

  // Refresh photos function - force refresh without cache
  const refreshPhotos = useCallback((): void => {
    console.log('🔵 PHOTO_CONTEXT: Refreshing photos...');
    fetchPhotos(false, 1); // Don't use cache when refreshing, start from page 1
  }, [fetchPhotos]);

  // Load more photos function for pagination
  const loadMorePhotos = useCallback(async (): Promise<void> => {
    if (isLoadingMore || !pagination.has_next) return;
    
    // Check if user is authenticated before loading more photos
    if (!isAuthenticated || !user?.user_id) {
      console.log('🔴 PHOTO_CONTEXT: User not authenticated, skipping load more photos');
      return;
    }
    
    try {
      setIsLoadingMore(true);
      console.log('🔵 PHOTO_CONTEXT: Loading more photos - page:', pagination.page + 1);
      await fetchPhotos(false, pagination.page + 1);
    } catch (error) {
      console.error('🔴 PHOTO_CONTEXT: Error loading more photos:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [fetchPhotos, isLoadingMore, pagination.has_next, pagination.page, isAuthenticated, user?.user_id]);

  // Clear cache function
  const clearCache = useCallback(async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
      await AsyncStorage.removeItem(CACHE_TIMESTAMP_KEY);
      console.log('🔵 PHOTO_CONTEXT: Cache cleared');
    } catch (error) {
      console.error('🔴 PHOTO_CONTEXT: Error clearing cache:', error);
    }
  }, []);

  // Define the value provided by the context
  const value: PhotoContextType = {
    photos,
    isLoading,
    refreshPhotos,
    lastUpdated,
    clearCache,
    selectedSnapshot,     // Provide the selected snapshot state
    setSelectedSnapshot: setSelectedSnapshotWithLogging,  // Provide the logging setter
    // Pagination state
    pagination,
    isLoadingMore,
    loadMorePhotos,
  };

  return <PhotoContext.Provider value={value}>{children}</PhotoContext.Provider>;
}

export const usePhotoContext = (): PhotoContextType => {
    const context = useContext(PhotoContext);
    if (context === undefined) {
        throw new Error('usePhotoContext must be used within a PhotoProvider');
    }
    // Optional: Log consumption
    // const snapshotId = context.selectedSnapshot?.id;
    // console.log(`[PhotoContext.tsx] -> usePhotoContext : Consuming context (Snapshot ID: ${snapshotId ?? 'null'})`);
    return context;
};
