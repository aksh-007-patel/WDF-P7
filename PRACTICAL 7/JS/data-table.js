/**
 * STUDENT HUB - DYNAMIC DATA TABLE / CARD VIEW  (data-table.js)
 * Plug-and-play controller for datasets:
 *   - Fetch JSON via SHDataManager
 *   - Real-time search across multiple fields
 *   - Multi-select category filters
 *   - Multi-field sorting with persisted preferences
 *   - Client-side pagination with page-size selector
 *   - Loading skeletons + user-friendly error messages
 *
 * Usage (Events page):
 *   SHDynTable.init({
 *     pageKey: "events",
 *     datasetKey: "events",
 *     root: "#events-root",
 *     searchFields: ["eventId","title","description","location","organizer","category"],
 *     columns: [...],
 *     sortOptions: [...],
 *     filterFields: [...],
 *     cardTemplateFn: (item) => `<div>...</div>`,
 *     perPageOptions: [5, 10, 20, 50],
 *     defaultPerPage: 10
 *   });
 */

(function (global) {
  "use strict";

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === "class") node.className = v;
      else if (k === "html") node.innerHTML = v;
      else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2).toLowerCase(), v);
      else if (v === true) node.setAttribute(k, "");
      else if (v !== false && v != null) node.setAttribute(k, v);
    });
    [].concat(children).forEach(c => {
      if (c == null) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  function buildToolbar(state) {
    const toolbar = el("div", { class: "dyn-toolbar" });

    const left = el("div", { class: "dyn-toolbar-left" });
    const right = el("div", { class: "dyn-toolbar-right" });
    toolbar.appendChild(left);
    toolbar.appendChild(right);

    const searchWrap = el("div", { class: "dyn-search" });
    const searchIcon = el("span", { class: "dyn-search-icon", html: "🔍" });
    const searchInput = el("input", {
      type: "search",
      class: "dyn-search-input",
      placeholder: "Search " + (state.pageKey) + "...",
      value: state.searchQuery,
      "aria-label": "Search"
    });
    let searchTimer;
    searchInput.addEventListener("input", () => {
      clearTimeout(searchTimer);
      const q = searchInput.value;
      searchTimer = setTimeout(() => {
        state.searchQuery = q;
        state.currentPage = 1;
        render(state);
      }, 180);
    });
    if (state.searchQuery) searchInput.value = state.searchQuery;
    searchWrap.appendChild(searchIcon);
    searchWrap.appendChild(searchInput);
    left.appendChild(searchWrap);

    state.filterFields.forEach(ff => {
      const uniqueVals = SHDataManager.getUniqueValues(state.allRecords, ff.field);
      if (uniqueVals.length === 0) return;
      const filterBox = el("div", { class: "dyn-filter", "data-field": ff.field });
      const label = el("label", { class: "dyn-filter-label" }, ff.label || ff.field);
      const multi = el("select", {
        class: "dyn-filter-select",
        multiple: true,
        "aria-label": "Filter by " + (ff.label || ff.field),
        size: Math.min(5, uniqueVals.length)
      });
      uniqueVals.forEach(v => {
        const opt = el("option", { value: v }, v);
        if ((state.activeFilters[ff.field] || []).includes(v)) opt.selected = true;
        multi.appendChild(opt);
      });
      multi.addEventListener("change", () => {
        const selected = Array.from(multi.selectedOptions).map(o => o.value);
        state.activeFilters = { ...state.activeFilters, [ff.field]: selected };
        state.currentPage = 1;
        SHDataManager.saveFiltersPref(state.pageKey, state.activeFilters);
        render(state);
      });
      const clearBtn = el("button", {
        type: "button",
        class: "dyn-filter-clear",
        title: "Clear filter",
        onclick: () => {
          Array.from(multi.options).forEach(o => o.selected = false);
          const { [ff.field]: _, ...rest } = state.activeFilters;
          state.activeFilters = rest;
          state.currentPage = 1;
          SHDataManager.saveFiltersPref(state.pageKey, state.activeFilters);
          render(state);
        }
      }, "×");
      filterBox.appendChild(label);
      const controls = el("div", { class: "dyn-filter-controls" });
      controls.appendChild(multi);
      controls.appendChild(clearBtn);
      filterBox.appendChild(controls);
      left.appendChild(filterBox);
    });

    const sortBox = el("div", { class: "dyn-sort" });
    const sortLabel = el("label", { class: "dyn-sort-label" }, "Sort by:");
    const sortSelect = el("select", { class: "dyn-sort-select", "aria-label": "Sort by" });
    state.sortOptions.forEach(opt => {
      const v = opt.value;
      const oAsc = el("option", { value: v + "__asc" }, opt.label + " ↑ (Ascending)");
      const oDesc = el("option", { value: v + "__desc" }, opt.label + " ↓ (Descending)");
      if (state.sortField === opt.field && state.sortDir === "asc") oAsc.selected = true;
      if (state.sortField === opt.field && state.sortDir === "desc") oDesc.selected = true;
      sortSelect.appendChild(oAsc);
      sortSelect.appendChild(oDesc);
    });
    sortSelect.addEventListener("change", () => {
      const [field, dir] = sortSelect.value.split("__");
      const sortMeta = state.sortOptions.find(o => o.value === sortSelect.value.split("__")[0]);
      state.sortField = field;
      state.sortDir = dir;
      state.sortMeta = sortMeta || {};
      SHDataManager.saveSortPreference(state.pageKey, state.sortField, state.sortDir);
      SHDataManager.savePagePref(state.pageKey, "sortMetaValue", state.sortMeta.value);
      render(state);
    });
    sortBox.appendChild(sortLabel);
    sortBox.appendChild(sortSelect);
    right.appendChild(sortBox);

    return toolbar;
  }

  function buildPagination(state) {
    if (state.paginated.totalPages <= 1 && state.totalItems === 0) return null;
    const wrap = el("div", { class: "dyn-pagination" });

    const left = el("div", { class: "dyn-pg-info" });
    if (state.totalItems === 0) {
      left.textContent = "0 items";
    } else {
      left.textContent = `Showing ${state.paginated.startIndex}–${state.paginated.endIndex} of ${state.totalItems} items`;
    }

    const mid = el("div", { class: "dyn-pg-buttons" });

    const makeBtn = (label, page, opts = {}) => {
      const cls = ["dyn-pg-btn"];
      if (opts.active) cls.push("dyn-pg-active");
      if (opts.disabled) cls.push("dyn-pg-disabled");
      const b = el("button", {
        type: "button",
        class: cls.join(" "),
        disabled: opts.disabled ? true : false,
        "aria-label": opts.ariaLabel || ("Go to page " + page),
        onclick: () => {
          if (!opts.disabled) {
            state.currentPage = page;
            render(state);
          }
        }
      }, label);
      return b;
    };

    mid.appendChild(makeBtn("« First", 1, { disabled: !state.paginated.hasPrev, ariaLabel: "Go to first page" }));
    mid.appendChild(makeBtn("‹ Prev", state.currentPage - 1, { disabled: !state.paginated.hasPrev }));

    const total = state.paginated.totalPages;
    const cur = state.currentPage;
    const pages = [];
    const push = (n) => pages.push(n);
    if (total <= 7) {
      for (let i = 1; i <= total; i++) push(i);
    } else {
      push(1);
      if (cur > 4) push("...");
      for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) push(i);
      if (cur < total - 3) push("...");
      push(total);
    }
    pages.forEach(p => {
      if (p === "...") mid.appendChild(el("span", { class: "dyn-pg-ellipsis" }, "…"));
      else mid.appendChild(makeBtn(String(p), p, { active: p === cur }));
    });

    mid.appendChild(makeBtn("Next ›", state.currentPage + 1, { disabled: !state.paginated.hasNext }));
    mid.appendChild(makeBtn("Last »", total, { disabled: !state.paginated.hasNext, ariaLabel: "Go to last page" }));

    const right = el("div", { class: "dyn-perpage" });
    right.appendChild(el("label", {}, "Per page:"));
    const sel = el("select", { class: "dyn-perpage-select", "aria-label": "Items per page" });
    state.perPageOptions.forEach(n => {
      const o = el("option", { value: String(n) }, String(n));
      if (n === state.perPage) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener("change", () => {
      state.perPage = parseInt(sel.value, 10) || 10;
      state.currentPage = 1;
      SHDataManager.savePagePref(state.pageKey, "perPage", state.perPage);
      render(state);
    });
    right.appendChild(sel);

    wrap.appendChild(left);
    wrap.appendChild(mid);
    wrap.appendChild(right);
    return wrap;
  }

  function buildSkeleton(state) {
    const root = el("div", { class: "dyn-skeleton-wrap" });
    for (let i = 0; i < (state.perPage || 6); i++) {
      root.appendChild(el("div", { class: "dyn-skeleton-card" }, [
        el("div", { class: "dyn-sk dyn-sk-title" }),
        el("div", { class: "dyn-sk dyn-sk-sub" }),
        el("div", { class: "dyn-sk dyn-sk-line w-75" }),
        el("div", { class: "dyn-sk dyn-sk-line w-50" })
      ]));
    }
    return root;
  }

  function buildErrorBox(error) {
    const box = el("div", { class: "dyn-error" });
    box.appendChild(el("div", { class: "dyn-error-icon", html: "⚠️" }));
    const textWrap = el("div", { class: "dyn-error-text" });
    textWrap.appendChild(el("div", { class: "dyn-error-title" }, "Oops! We couldn't load the data"));
    textWrap.appendChild(el("div", { class: "dyn-error-msg" }, error.userMessage || error.message || "Unknown error"));
    const actions = el("div", { class: "dyn-error-actions" });
    actions.appendChild(el("button", {
      type: "button",
      class: "dyn-btn dyn-btn-primary",
      onclick: () => { if (error && error._retryFn) error._retryFn(); }
    }, "🔄 Retry"));
    actions.appendChild(el("button", {
      type: "button",
      class: "dyn-btn dyn-btn-outline",
      onclick: () => location.reload()
    }, "Reload page"));
    textWrap.appendChild(actions);
    if (error && error.code === "notFound") {
      const hint = el("div", { class: "dyn-error-hint" },
        "Tip: Make sure the data files exist in the DATA/ folder, and you're opening the page via a web server (e.g. Live Server).");
      textWrap.appendChild(hint);
    }
    box.appendChild(textWrap);
    return box;
  }

  function buildEmptyState(query, hasFilters) {
    const box = el("div", { class: "dyn-empty" });
    box.appendChild(el("div", { class: "dyn-empty-icon", html: "🔍" }));
    const title = (query || hasFilters) ? "No matches found" : "No records available";
    box.appendChild(el("div", { class: "dyn-empty-title" }, title));
    const desc = (query || hasFilters)
      ? `Try adjusting your search terms or clearing filters to see more results.`
      : `The dataset appears to be empty. Please check back later.`;
    box.appendChild(el("div", { class: "dyn-empty-desc" }, desc));
    return box;
  }

  function applyTransforms(state) {
    let data = state.allRecords.slice();
    data = SHDataManager.searchRecords(data, state.searchQuery, state.searchFields);
    data = SHDataManager.filterRecords(data, state.activeFilters);
    const meta = state.sortMeta || {};
    data = SHDataManager.sortRecords(data, state.sortField, state.sortDir, {
      numeric: !!meta.numeric,
      dateLike: !!meta.dateLike,
      caseSensitive: !!meta.caseSensitive
    });
    const paginated = SHDataManager.paginateRecords(data, state.currentPage, state.perPage);
    return { filtered: data, paginated };
  }

  function render(state) {
    const { filtered, paginated } = applyTransforms(state);
    state.totalItems = filtered.length;
    state.paginated = paginated;

    const root = typeof state.root === "string" ? document.querySelector(state.root) : state.root;
    if (!root) return;
    root.innerHTML = "";

    const header = el("div", { class: "dyn-header" });
    const total = el("div", { class: "dyn-total" });
    const badgeBase = el("span", { class: "badge" }, (state.totalItems) + " record" + (state.totalItems === 1 ? "" : "s"));
    total.appendChild(badgeBase);
    if (state.searchQuery) {
      total.appendChild(el("span", { class: "dyn-tag dyn-tag-search" }, `Search: "${state.searchQuery}"`));
    }
    Object.entries(state.activeFilters).forEach(([field, vals]) => {
      if (vals && vals.length) {
        const meta = (state.filterFields || []).find(f => f.field === field) || {};
        const label = vals.join(", ");
        total.appendChild(el("span", { class: "dyn-tag dyn-tag-filter" }, `${meta.label || field}: ${label}`));
      }
    });
    const refreshBtn = el("button", {
      type: "button",
      class: "dyn-refresh-btn",
      title: "Refresh data",
      onclick: () => {
        SHDataManager.clearCache(state.datasetKey);
        if (typeof state._reloadFn === "function") state._reloadFn();
      }
    }, "⟳ Refresh");
    header.appendChild(total);
    header.appendChild(refreshBtn);
    root.appendChild(header);

    const toolbar = buildToolbar(state);
    root.appendChild(toolbar);

    const contentArea = el("div", { class: "dyn-content" });
    root.appendChild(contentArea);

    if (filtered.length === 0) {
      contentArea.appendChild(buildEmptyState(state.searchQuery, Object.keys(state.activeFilters).length > 0));
      return;
    }

    if (state.renderMode === "table") {
      const table = buildTableView(state, paginated.items);
      contentArea.appendChild(table);
    } else if (state.renderMode === "faq") {
      const list = buildFaqView(state, paginated.items);
      contentArea.appendChild(list);
    } else {
      const grid = buildCardView(state, paginated.items);
      contentArea.appendChild(grid);
    }

    const pg = buildPagination(state);
    if (pg) root.appendChild(pg);
  }

  function buildCardView(state, items) {
    const grid = el("div", { class: "dyn-cards" });
    items.forEach(item => {
      const html = state.cardTemplateFn ? state.cardTemplateFn(item) : `<pre>${JSON.stringify(item, null, 2)}</pre>`;
      const card = el("div", { class: "dyn-card", html });
      grid.appendChild(card);
    });
    return grid;
  }

  function buildTableView(state, items) {
    const wrap = el("div", { class: "table-responsive dyn-table-wrap" });
    const table = el("table", { class: "dyn-table" });
    const thead = el("thead");
    const trHead = el("tr");
    state.columns.forEach(col => {
      const th = el("th", { class: "dyn-th" });
      const sortable = state.sortOptions.some(s => s.field === col.field);
      th.appendChild(el("span", {}, col.label));
      if (sortable) {
        const cur = state.sortField === col.field;
        const arrow = el("span", { class: "dyn-sort-arrow" },
          cur ? (state.sortDir === "asc" ? " ▲" : " ▼") : " ↕");
        th.appendChild(arrow);
        th.style.cursor = "pointer";
        th.addEventListener("click", () => {
          if (cur) {
            state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
          } else {
            state.sortField = col.field;
            state.sortDir = col.defaultDir || "asc";
            const meta = state.sortOptions.find(s => s.field === col.field);
            state.sortMeta = meta || {};
          }
          SHDataManager.saveSortPreference(state.pageKey, state.sortField, state.sortDir);
          render(state);
        });
      }
      trHead.appendChild(th);
    });
    thead.appendChild(trHead);
    table.appendChild(thead);

    const tbody = el("tbody");
    items.forEach(item => {
      const tr = el("tr", { class: "dyn-tr" });
      state.columns.forEach(col => {
        const td = el("td", { class: "dyn-td" });
        if (col.renderFn) {
          const v = col.renderFn(SHDataManager.getNested(item, col.field), item);
          if (typeof v === "string") td.innerHTML = v;
          else td.appendChild(v);
        } else {
          const raw = SHDataManager.getNested(item, col.field);
          if (Array.isArray(raw)) td.textContent = raw.join(", ");
          else if (raw == null) td.textContent = "—";
          else td.textContent = String(raw);
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    return wrap;
  }

  function buildFaqView(state, items) {
    const ul = el("ul", { class: "faq-accordion dyn-faq", role: "list", "aria-label": "Frequently Asked Questions" });
    items.forEach((item, idx) => {
      const li = el("li", { class: "faq-item" });
      const qBtn = el("button", { class: "faq-question", type: "button" });
      qBtn.appendChild(el("span", {}, item.questionText));
      qBtn.appendChild(el("span", { class: "faq-chevron", "aria-hidden": "true" }, "▼"));
      const answer = el("div", { class: "faq-answer", role: "region" });
      answer.style.maxHeight = "0";
      answer.style.overflow = "hidden";
      answer.style.transition = "max-height 0.35s ease, padding 0.25s ease";
      answer.style.paddingTop = "0";
      answer.style.paddingBottom = "0";
      const body = el("p", {}, item.answerText);
      const meta = el("div", { class: "dyn-faq-meta" });
      if (item.category) {
        meta.appendChild(el("span", { class: "dyn-tag dyn-tag-filter" }, item.category));
      }
      if (item.publicationDate) {
        meta.appendChild(el("span", { class: "dyn-faq-date" }, "📅 " + formatDate(item.publicationDate)));
      }
      if (item.views != null) {
        meta.appendChild(el("span", { class: "dyn-faq-views" }, "👁 " + item.views));
      }
      answer.appendChild(body);
      answer.appendChild(meta);

      qBtn.addEventListener("click", () => {
        const isOpen = li.classList.contains("faq-open");
        document.querySelectorAll(".dyn-faq .faq-item").forEach(i => {
          i.classList.remove("faq-open");
          const a = i.querySelector(".faq-answer");
          const q = i.querySelector(".faq-question");
          if (a) { a.style.maxHeight = "0"; a.style.paddingTop = "0"; a.style.paddingBottom = "0"; }
          if (q) q.setAttribute("aria-expanded", "false");
        });
        if (!isOpen) {
          li.classList.add("faq-open");
          answer.style.maxHeight = (answer.scrollHeight + 40) + "px";
          answer.style.paddingTop = "14px";
          answer.style.paddingBottom = "14px";
          qBtn.setAttribute("aria-expanded", "true");
        }
      });

      li.appendChild(qBtn);
      li.appendChild(answer);
      ul.appendChild(li);
    });
    return ul;
  }

  function formatDate(s) {
    if (!s) return "—";
    try {
      const d = new Date(String(s));
      if (isNaN(d.getTime())) return String(s);
      return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch { return String(s); }
  }

  async function loadData(state) {
    const root = typeof state.root === "string" ? document.querySelector(state.root) : state.root;
    if (!root) return;
    root.innerHTML = "";

    const header = el("div", { class: "dyn-header" });
    header.appendChild(el("span", { class: "badge" }, "Loading…"));
    root.appendChild(header);

    const toolbarPlaceholder = el("div", { class: "dyn-toolbar dyn-toolbar-placeholder" }, [
      el("div", { class: "dyn-skeleton dyn-sk-1" }),
      el("div", { class: "dyn-skeleton dyn-sk-2" })
    ]);
    root.appendChild(toolbarPlaceholder);
    root.appendChild(buildSkeleton(state));

    const retry = () => loadData(state);
    state._reloadFn = retry;

    try {
      const parsed = await SHDataManager.loadJSON(state.datasetKey, { forceRefresh: false });
      state.allRecords = parsed.records || [];
      state.metadata = parsed.metadata || {};
      render(state);
    } catch (err) {
      err._retryFn = retry;
      root.innerHTML = "";
      root.appendChild(buildErrorBox(err));
    }
  }

  function init(opts) {
    if (!opts || !opts.root || !opts.datasetKey) {
      console.error("[SHDynTable] Missing required options: root, datasetKey");
      return;
    }
    const savedSort = SHDataManager.getSortPreference(opts.pageKey, null);
    const savedSortMetaValue = SHDataManager.getPagePref(opts.pageKey, "sortMetaValue", null);
    const defaultSort = opts.sortOptions && opts.sortOptions[0] ? opts.sortOptions[0] : { field: null };

    const state = {
      pageKey: opts.pageKey || opts.datasetKey,
      datasetKey: opts.datasetKey,
      root: opts.root,
      searchFields: opts.searchFields || [],
      columns: opts.columns || [],
      sortOptions: opts.sortOptions || [],
      filterFields: opts.filterFields || [],
      cardTemplateFn: opts.cardTemplateFn || null,
      renderMode: opts.renderMode || "card",

      searchQuery: opts.searchQuery || "",
      activeFilters: opts.activeFilters || SHDataManager.getFiltersPref(opts.pageKey) || {},
      sortField: (savedSort && savedSort.sortField) || defaultSort.field || null,
      sortDir: (savedSort && savedSort.sortDir) || defaultSort.defaultDir || "asc",
      sortMeta: (savedSortMetaValue ? opts.sortOptions.find(o => o.value === savedSortMetaValue) : null) || defaultSort || {},

      perPageOptions: opts.perPageOptions || [5, 10, 20, 50],
      perPage: parseInt(SHDataManager.getPagePref(opts.pageKey, "perPage", opts.defaultPerPage || 10), 10) || 10,
      currentPage: 1,

      allRecords: [],
      metadata: {},
      totalItems: 0,
      paginated: { items: [], totalPages: 1, page: 1 }
    };

    if (state.sortField && !state.sortMeta) {
      state.sortMeta = opts.sortOptions.find(o => o.field === state.sortField) || {};
    }

    state._reloadFn = () => loadData(state);
    loadData(state);

    return {
      render: () => render(state),
      refresh: () => { SHDataManager.clearCache(state.datasetKey); loadData(state); },
      getState: () => state,
      setSearch: (q) => { state.searchQuery = q || ""; state.currentPage = 1; render(state); }
    };
  }

  global.SHDynTable = { init, formatDate };

})(window);
