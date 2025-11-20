/**
 * Thumbnail Cache Utility
 * Manages thumbnail caching in localStorage with size limits
 */

const CACHE_PREFIX = 'thumbnail_'
const MAX_CACHE_SIZE = 50 * 1024 * 1024 // 50MB max cache size
const MAX_CACHE_ITEMS = 100 // Max number of cached items

interface CacheEntry {
  dataUrl: string
  timestamp: number
  size: number
}

export class ThumbnailCache {
  /**
   * Save thumbnail to cache
   */
  static set(modelId: string, dataUrl: string): void {
    try {
      const entry: CacheEntry = {
        dataUrl,
        timestamp: Date.now(),
        size: dataUrl.length
      }

      // Check if cache needs cleanup
      this.cleanupIfNeeded()

      const key = CACHE_PREFIX + modelId
      localStorage.setItem(key, JSON.stringify(entry))
    } catch (error) {
      console.warn('Failed to cache thumbnail:', error)
      // If localStorage is full, try cleanup and retry
      this.cleanup(10)
      try {
        const key = CACHE_PREFIX + modelId
        const entry: CacheEntry = {
          dataUrl,
          timestamp: Date.now(),
          size: dataUrl.length
        }
        localStorage.setItem(key, JSON.stringify(entry))
      } catch (retryError) {
        console.error('Failed to cache thumbnail after cleanup:', retryError)
      }
    }
  }

  /**
   * Get thumbnail from cache
   */
  static get(modelId: string): string | null {
    try {
      const key = CACHE_PREFIX + modelId
      const item = localStorage.getItem(key)
      
      if (!item) return null

      const entry: CacheEntry = JSON.parse(item)
      
      // Check if cache entry is older than 7 days
      const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 days
      if (Date.now() - entry.timestamp > maxAge) {
        localStorage.removeItem(key)
        return null
      }

      return entry.dataUrl
    } catch (error) {
      console.warn('Failed to retrieve cached thumbnail:', error)
      return null
    }
  }

  /**
   * Remove thumbnail from cache
   */
  static remove(modelId: string): void {
    try {
      const key = CACHE_PREFIX + modelId
      localStorage.removeItem(key)
    } catch (error) {
      console.warn('Failed to remove cached thumbnail:', error)
    }
  }

  /**
   * Get all cached entries
   */
  private static getAllEntries(): Array<{ key: string; entry: CacheEntry }> {
    const entries: Array<{ key: string; entry: CacheEntry }> = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(CACHE_PREFIX)) {
        try {
          const item = localStorage.getItem(key)
          if (item) {
            const entry: CacheEntry = JSON.parse(item)
            entries.push({ key, entry })
          }
        } catch (error) {
          // Invalid entry, remove it
          localStorage.removeItem(key)
        }
      }
    }

    return entries
  }

  /**
   * Get total cache size
   */
  static getCacheSize(): number {
    const entries = this.getAllEntries()
    return entries.reduce((total, { entry }) => total + entry.size, 0)
  }

  /**
   * Get cache statistics
   */
  static getStats(): { count: number; size: number; sizeFormatted: string } {
    const entries = this.getAllEntries()
    const size = entries.reduce((total, { entry }) => total + entry.size, 0)
    
    const sizeFormatted = this.formatSize(size)
    
    return {
      count: entries.length,
      size,
      sizeFormatted
    }
  }

  /**
   * Format size in bytes to human readable
   */
  private static formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  /**
   * Check if cleanup is needed and perform it
   */
  private static cleanupIfNeeded(): void {
    const entries = this.getAllEntries()
    const totalSize = entries.reduce((sum, { entry }) => sum + entry.size, 0)

    // Cleanup if size exceeds limit or too many items
    if (totalSize > MAX_CACHE_SIZE || entries.length > MAX_CACHE_ITEMS) {
      const removeCount = Math.max(
        entries.length - MAX_CACHE_ITEMS + 10,
        Math.ceil(entries.length * 0.2) // Remove 20% of items
      )
      this.cleanup(removeCount)
    }
  }

  /**
   * Clean up old cache entries
   * @param count Number of oldest entries to remove
   */
  static cleanup(count: number = 10): void {
    try {
      const entries = this.getAllEntries()
      
      // Sort by timestamp (oldest first)
      entries.sort((a, b) => a.entry.timestamp - b.entry.timestamp)

      // Remove oldest entries
      const toRemove = entries.slice(0, Math.min(count, entries.length))
      toRemove.forEach(({ key }) => {
        localStorage.removeItem(key)
      })

      console.log(`Cleaned up ${toRemove.length} cached thumbnails`)
    } catch (error) {
      console.warn('Failed to cleanup cache:', error)
    }
  }

  /**
   * Clear all cached thumbnails
   */
  static clear(): void {
    try {
      const entries = this.getAllEntries()
      entries.forEach(({ key }) => {
        localStorage.removeItem(key)
      })
      console.log(`Cleared ${entries.length} cached thumbnails`)
    } catch (error) {
      console.warn('Failed to clear cache:', error)
    }
  }

  /**
   * Check if thumbnail is cached
   */
  static has(modelId: string): boolean {
    return this.get(modelId) !== null
  }
}

export default ThumbnailCache
