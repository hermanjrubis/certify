/**
 * Project State Persistence Module
 * Uses IndexedDB for full Project v2 persistence with localStorage fallback.
 */

import { migrateProject } from './model/layers.js';

const DB_NAME = 'certify_draft_db';
const DB_VERSION = 2;
const STORE_NAME = 'projects';
const DRAFT_KEY = 'active_project_v2';
const LOCALSTORAGE_META_KEY = 'certify_project_meta';
const LOCALSTORAGE_FALLBACK_KEY = 'certify_v2_draft';

function openDB() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
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
   * Saves the current project state.
   * @param {object} project
   * @param {boolean} [immediate=false]
   * @returns {Promise<boolean>}
   */
  async save(project, immediate = false) {
    if (!immediate) {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      return new Promise((resolve) => {
        this.debounceTimer = setTimeout(async () => {
          const success = await this._persist(project);
          resolve(success);
        }, 500);
      });
    } else {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      return await this._persist(project);
    }
  }

  async _persist(project) {
    try {
      const db = await openDB();
      if (db) {
        await new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const req = store.put(project, DRAFT_KEY);
          req.onsuccess = () => resolve(true);
          req.onerror = () => reject(req.error);
        });
      }

      // Metadata to localStorage
      const meta = {
        title: project.title || 'Untitled batch',
        hasTemplate: Boolean(project.template),
        layersCount: project.layers ? project.layers.length : 0,
        recipientsCount: project.recipients?.rows ? project.recipients.rows.length : 0,
        updatedAt: Date.now()
      };
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(LOCALSTORAGE_META_KEY, JSON.stringify(meta));
      }

      // LocalStorage fallback if IndexedDB is not available
      if (!db && typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(LOCALSTORAGE_FALLBACK_KEY, JSON.stringify(project));
        } catch {
          // Exceeded quota for large images in localStorage
        }
      }

      return true;
    } catch (err) {
      console.warn('Could not persist project:', err);
      return false;
    }
  }

  /**
   * Loads the active draft if one exists, running migrateProject.
   * @returns {Promise<object|null>}
   */
  async load() {
    try {
      const db = await openDB();
      let raw = null;

      if (db) {
        raw = await new Promise((resolve) => {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.get(DRAFT_KEY);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        });

        // If no v2 draft in new store, check legacy DB_VERSION 1 draft store
        if (!raw) {
          raw = await this._loadLegacyV1Draft();
        }
      }

      if (!raw && typeof localStorage !== 'undefined') {
        const lsDraft = localStorage.getItem(LOCALSTORAGE_FALLBACK_KEY) || localStorage.getItem('certify_full_draft');
        if (lsDraft) {
          try {
            raw = JSON.parse(lsDraft);
          } catch {}
        }
      }

      if (!raw) return null;
      return migrateProject(raw);
    } catch (err) {
      console.warn('Error loading project from storage:', err);
      return null;
    }
  }

  async _loadLegacyV1Draft() {
    try {
      return new Promise((resolve) => {
        const req = indexedDB.open('certify_draft_db', 1);
        req.onsuccess = () => {
          const legacyDb = req.result;
          if (!legacyDb.objectStoreNames.contains('drafts')) {
            resolve(null);
            return;
          }
          const tx = legacyDb.transaction('drafts', 'readonly');
          const store = tx.objectStore('drafts');
          const getReq = store.get('active_project');
          getReq.onsuccess = () => resolve(getReq.result || null);
          getReq.onerror = () => resolve(null);
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  /**
   * Clears saved draft.
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
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(LOCALSTORAGE_META_KEY);
        localStorage.removeItem(LOCALSTORAGE_FALLBACK_KEY);
        localStorage.removeItem('certify_full_draft');
      }
    } catch (err) {
      console.warn('Error clearing project storage:', err);
    }
  }

  /**
   * Exports project configuration and data as a downloadable JSON file.
   * @param {object} project 
   * @param {string} [filename='certify-project.json'] 
   */
  exportJSON(project, filename = 'certify-project.json') {
    const jsonStr = JSON.stringify(project, null, 2);
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
