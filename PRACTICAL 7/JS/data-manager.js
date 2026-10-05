/**
 * STUDENT HUB - DATA MANAGER (data-manager.js)
 * Handles JSON data loading via Fetch API with comprehensive error handling,
 * caching, and cross-page state management.
 */

(function (global) {
  "use strict";

  const STORAGE_PREFIX = "sh_datamgr_";
  const CACHE_PREFIX = "sh_cache_";
  const SORT_PREF_PREFIX = "sh_sortpref_";

  function resolveBasePath() {
    try {
      const here = window.location.pathname.split("/").slice(0, -1).join("/");
      const parts = here.split("/");
      const inSubDir = parts.length && parts[parts.length - 1].toUpperCase() === "PAGES";
      return inSubDir ? "../DATA/" : "DATA/";
    } catch (e) {
      return "../DATA/";
    }
  }

  const BASE = resolveBasePath();
  const DataPaths = {
    events: BASE + "events.json",
    students: BASE + "students.json",
    faqs: BASE + "faqs.json"
  };

  const ErrorMessages = {
    network: "Unable to load data. Please check your internet connection and try again.",
    notFound: "The requested data file could not be found on the server (Error 404).",
    serverError: "Server error encountered while loading data (Error 5xx). Please try again later.",
    invalidJson: "The data file is corrupted or in an invalid format. Please contact support.",
    unknown: "An unexpected error occurred while loading data. Please refresh the page.",
    timeout: "Data loading timed out. Please try again.",
    empty: "No records were found for the current selection."
  };

  const inMemoryCache = {};

  async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  function createDataError(code, message, originalError) {
    const error = new Error(message || ErrorMessages[code] || ErrorMessages.unknown);
    error.code = code;
    error.userMessage = message || ErrorMessages[code] || ErrorMessages.unknown;
    error.originalError = originalError || null;
    error.timestamp = new Date().toISOString();
    return error;
  }

  async function loadJSON(datasetKey, options = {}) {
    const { useCache = true, forceRefresh = false, timeoutMs = 10000 } = options;
    const url = DataPaths[datasetKey];

    if (!url) {
      throw createDataError("invalidDataset", `Unknown dataset key: "${datasetKey}"`);
    }

    const cacheKey = CACHE_PREFIX + datasetKey;
    if (useCache && !forceRefresh && inMemoryCache[cacheKey]) {
      return structuredClone(inMemoryCache[cacheKey]);
    }

    let response;
    try {
      response = await fetchWithTimeout(url, {
        method: "GET",
        headers: { "Accept": "application/json" }
      }, timeoutMs);
    } catch (fetchErr) {
      if (fetchErr.name === "AbortError") {
        throw createDataError("timeout", ErrorMessages.timeout, fetchErr);
      }
      if (fetchErr instanceof TypeError) {
        throw createDataError("network", ErrorMessages.network, fetchErr);
      }
      throw createDataError("unknown", ErrorMessages.unknown, fetchErr);
    }

    if (!response.ok) {
      if (response.status === 404) {
        throw createDataError("notFound", ErrorMessages.notFound);
      }
      if (response.status >= 500) {
        throw createDataError("serverError", ErrorMessages.serverError);
      }
      throw createDataError("unknown", `Failed to load data (HTTP ${response.status}).`);
    }

    let rawText;
    try {
      rawText = await response.text();
    } catch (readErr) {
      throw createDataError("network", ErrorMessages.network, readErr);
    }

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (jsonErr) {
      throw createDataError("invalidJson", ErrorMessages.invalidJson, jsonErr);
    }

    if (!parsed.records || !Array.isArray(parsed.records)) {
      throw createDataError("invalidJson", "The data file is missing a valid `records` array.");
    }

    if (useCache) {
      inMemoryCache[cacheKey] = structuredClone(parsed);
      try { localStorage.setItem(cacheKey + "_ts", String(Date.now())); } catch (e) { /* storage blocked */ }
    }

    return parsed;
  }

  function clearCache(datasetKey) {
    if (datasetKey) {
      delete inMemoryCache[CACHE_PREFIX + datasetKey];
      try { localStorage.removeItem(CACHE_PREFIX + datasetKey + "_ts"); } catch (e) { /* ignore */ }
    } else {
      Object.keys(inMemoryCache).forEach(k => delete inMemoryCache[k]);
    }
  }

  function searchRecords(records, query, searchableFields) {
    if (!query || !query.trim()) return records.slice();
    const q = query.trim().toLowerCase();
    return records.filter(record =>
      searchableFields.some(field => {
        const val = getNested(record, field);
        if (val == null) return false;
        if (Array.isArray(val)) {
          return val.some(v => String(v).toLowerCase().includes(q));
        }
        return String(val).toLowerCase().includes(q);
      })
    );
  }

  function filterRecords(records, filters) {
    return records.filter(record =>
      Object.entries(filters).every(([field, selectedValues]) => {
        if (!selectedValues || selectedValues.length === 0) return true;
        const val = getNested(record, field);
        if (val == null) return false;
        if (Array.isArray(val)) {
          return val.some(v => selectedValues.includes(String(v)));
        }
        return selectedValues.includes(String(val));
      })
    );
  }

  function sortRecords(records, sortField, sortDir = "asc", options = {}) {
    const { numeric = false, dateLike = false, caseSensitive = false } = options;
    const dir = sortDir === "desc" ? -1 : 1;
    return records.slice().sort((a, b) => {
      let va = getNested(a, sortField);
      let vb = getNested(b, sortField);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (dateLike) {
        va = new Date(String(va)).getTime();
        vb = new Date(String(vb)).getTime();
      } else if (numeric) {
        va = Number(va);
        vb = Number(vb);
      } else if (!caseSensitive) {
        va = String(va).toLowerCase();
        vb = String(vb).toLowerCase();
      } else {
        va = String(va);
        vb = String(vb);
      }
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }

  function paginateRecords(records, page, perPage) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const pp = Math.max(1, parseInt(perPage, 10) || 10);
    const totalItems = records.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pp));
    const currentPage = Math.min(p, totalPages);
    const start = (currentPage - 1) * pp;
    const end = start + pp;
    return {
      items: records.slice(start, end),
      page: currentPage,
      perPage: pp,
      totalItems,
      totalPages,
      startIndex: start + 1,
      endIndex: Math.min(end, totalItems),
      hasPrev: currentPage > 1,
      hasNext: currentPage < totalPages
    };
  }

  function getUniqueValues(records, field) {
    const set = new Set();
    records.forEach(r => {
      const val = getNested(r, field);
      if (val == null) return;
      if (Array.isArray(val)) val.forEach(v => set.add(String(v)));
      else set.add(String(val));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
  }

  function getNested(obj, path) {
    return path.split(".").reduce((o, k) => (o == null ? null : o[k]), obj);
  }

  function saveSortPreference(pageKey, sortField, sortDir) {
    try {
      localStorage.setItem(SORT_PREF_PREFIX + pageKey, JSON.stringify({ sortField, sortDir, ts: Date.now() }));
    } catch (e) { /* storage blocked */ }
  }

  function getSortPreference(pageKey, defaults) {
    try {
      const raw = localStorage.getItem(SORT_PREF_PREFIX + pageKey);
      if (!raw) return defaults || null;
      const parsed = JSON.parse(raw);
      if (Date.now() - (parsed.ts || 0) > 7 * 24 * 60 * 60 * 1000) {
        localStorage.removeItem(SORT_PREF_PREFIX + pageKey);
        return defaults || null;
      }
      return { sortField: parsed.sortField, sortDir: parsed.sortDir };
    } catch (e) {
      return defaults || null;
    }
  }

  function savePagePref(pageKey, field, value) {
    try { localStorage.setItem(STORAGE_PREFIX + pageKey + "_" + field, String(value)); } catch (e) { /* ignore */ }
  }

  function getPagePref(pageKey, field, defaultValue) {
    try {
      const v = localStorage.getItem(STORAGE_PREFIX + pageKey + "_" + field);
      return v == null ? defaultValue : v;
    } catch (e) {
      return defaultValue;
    }
  }

  function saveFiltersPref(pageKey, filters) {
    try { localStorage.setItem(STORAGE_PREFIX + pageKey + "_filters", JSON.stringify(filters)); } catch (e) { /* ignore */ }
  }

  function getFiltersPref(pageKey) {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + pageKey + "_filters");
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  global.SHDataManager = {
    DataPaths,
    ErrorMessages,
    loadJSON,
    clearCache,
    searchRecords,
    filterRecords,
    sortRecords,
    paginateRecords,
    getUniqueValues,
    getNested,
    saveSortPreference,
    getSortPreference,
    savePagePref,
    getPagePref,
    saveFiltersPref,
    getFiltersPref,
    createDataError
  };

})(window);
