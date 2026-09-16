/**
 * Project State Persistence Module
 * Stores draft state (template, text box config, style, and names)
 * uses IndexedDB for robust large image persistence with localStorage fallback.
 */

const DB_NAME = 'certify_draft_db';
const DB_VERSION = 1;
const STORE_NAME = 'drafts';
const DRAFT_KEY = 'active_project';
const LOCALSTORAGE_META_KEY = 'certify_project_meta';

// Helper for IndexedDB promise operations
function openDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      resolve(null);
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

export class ProjectStorage {
  constructor() {
    this.debounceTimer = null;
  }

  /**
   * Saves the current project state (auto-save or manual save).
   * @param {object} projectData
   * @param {boolean} [immediate=false]
   * @returns {Promise<boolean>}
   */
  async save(projectData, immediate = false) {
    if (!immediate) {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      return new Promise((resolve) => {
        this.debounceTimer = setTimeout(async () => {
          const success = await this._persist(projectData);
          resolve(success);
        }, 600);
      });
    } else {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      return await this._persist(projectData);
    }
  }

  async _persist(projectData) {
    try {
      // 1. Try IndexedDB first (handles large images seamlessly)
      const db = await openDB();
      if (db) {
        await new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const req = store.put(projectData, DRAFT_KEY);
          req.onsuccess = () => resolve(true);
          req.onerror = () => reject(req.error);
        });
      }

      // 2. Also save metadata to localStorage
      const meta = {
        title: projectData.title || 'Untitled Certificate',
        hasTemplate: Boolean(projectData.template),
        textField: projectData.textField,
        namesCount: projectData.names ? projectData.names.length : 0,
        updatedAt: Date.now()
      };
      localStorage.setItem(LOCALSTORAGE_META_KEY, JSON.stringify(meta));

      // 3. Fallback: if IndexedDB wasn't available and image fits in localStorage
      if (!db) {
        try {
          localStorage.setItem('certify_full_draft', JSON.stringify(projectData));
        } catch {
          // Quota exceeded for dataUrl in localStorage; metadata is still saved
        }
      }

      return true;
    } catch (err) {
      console.warn('Could not auto-save project draft:', err);
      return false;
    }
  }

  /**
   * Loads the active draft if one exists.
   * @returns {Promise<object|null>}
   */
  async load() {
    try {
      const db = await openDB();
      if (db) {
        const draft = await new Promise((resolve) => {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.get(DRAFT_KEY);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        });

        if (draft) return draft;
      }

      // Check localStorage fallback
      const lsDraft = localStorage.getItem('certify_full_draft');
      if (lsDraft) {
        return JSON.parse(lsDraft);
      }

      return null;
    } catch (err) {
      console.warn('Error loading draft from storage:', err);
      return null;
    }
  }

  /**
   * Clears the saved active draft from storage.
   */
  async clear() {
    try {
      const db = await openDB();
      if (db) {
        await new Promise((resolve) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const req = store.delete(DRAFT_KEY);
          req.onsuccess = () => resolve();
          req.onerror = () => resolve();
        });
      }
      localStorage.removeItem(LOCALSTORAGE_META_KEY);
      localStorage.removeItem('certify_full_draft');
    } catch (err) {
      console.warn('Error clearing draft:', err);
    }
  }

  /**
   * Exports project configuration and data as a downloadable JSON file.
   * @param {object} projectData 
   * @param {string} [filename='certify-project.json'] 
   */
  exportJSON(projectData, filename = 'certify-project.json') {
    const jsonStr = JSON.stringify(projectData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}
