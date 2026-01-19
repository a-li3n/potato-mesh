/*
 * Copyright © 2025-26 l5yth & contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Escape HTML special characters to prevent XSS.
 *
 * @param {string} str Raw string to escape.
 * @returns {string} Escaped string safe for HTML insertion.
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Convert a value into a finite number or null when invalid.
 *
 * @param {*} value Raw value to convert.
 * @returns {number|null} Finite number or null.
 */
function toFiniteNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

/**
 * Compare two string-like values ignoring case.
 *
 * @param {*} a Left-hand operand.
 * @param {*} b Right-hand operand.
 * @returns {number} Comparator result.
 */
function compareString(a, b) {
  const left = typeof a === 'string' ? a.toLowerCase() : String(a ?? '').toLowerCase();
  const right = typeof b === 'string' ? b.toLowerCase() : String(b ?? '').toLowerCase();
  return left.localeCompare(right);
}

/**
 * Compare two numeric values.
 *
 * @param {*} a Left-hand operand.
 * @param {*} b Right-hand operand.
 * @returns {number} Comparator result.
 */
function compareNumber(a, b) {
  const left = toFiniteNumber(a);
  const right = toFiniteNumber(b);
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

/**
 * Determine whether a string-like value is present.
 *
 * @param {*} value Candidate value.
 * @returns {boolean} true when present.
 */
function hasStringValue(value) {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim() !== '';
  return String(value).trim() !== '';
}

/**
 * Determine whether a numeric value is present.
 *
 * @param {*} value Candidate value.
 * @returns {boolean} true when present.
 */
function hasNumberValue(value) {
  return toFiniteNumber(value) != null;
}

/**
 * Get the last 4 hex digits of a node ID for display.
 *
 * @param {string} nodeId Full node ID (e.g., "!32c423cd").
 * @returns {string} Last 4 hex digits in lowercase.
 */
function getShortNodeId(nodeId) {
  if (typeof nodeId !== 'string') return '';
  const cleaned = nodeId.replace(/^!/, '');
  return cleaned.slice(-4).toLowerCase();
}

/**
 * Initialize the packet statistics page by fetching data and rendering the table.
 *
 * @param {{
 *   config?: object,
 *   fetchImpl?: typeof fetch
 * }} [options] Optional overrides for testing.
 * @returns {Promise<void>}
 */
export async function initializePacketStatsPage(options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const tableEl = document.getElementById('packetStats');
  const tableBody = document.querySelector('#packetStats tbody');
  const statusEl = document.getElementById('status');
  const timeframeSelect = document.getElementById('timeframeSelect');
  const sortButtons = tableEl
    ? Array.from(tableEl.querySelectorAll('thead .sort-button[data-sort-key]'))
    : [];

  const tableSorters = {
    short_name: { getValue: stat => stat.long_name ?? stat.short_name ?? getShortNodeId(stat.node_id), compare: compareString, hasValue: hasStringValue, defaultDirection: 'asc' },
    telemetry_count: { getValue: stat => stat.telemetry_count ?? 0, compare: compareNumber, hasValue: hasNumberValue, defaultDirection: 'desc' },
    position_count: { getValue: stat => stat.position_count ?? 0, compare: compareNumber, hasValue: hasNumberValue, defaultDirection: 'desc' },
    trace_count: { getValue: stat => stat.trace_count ?? 0, compare: compareNumber, hasValue: hasNumberValue, defaultDirection: 'desc' },
    message_count: { getValue: stat => stat.message_count ?? 0, compare: compareNumber, hasValue: hasNumberValue, defaultDirection: 'desc' },
    total_count: { getValue: stat => stat.total_count ?? 0, compare: compareNumber, hasValue: hasNumberValue, defaultDirection: 'desc' }
  };

  let sortState = {
    key: 'total_count',
    direction: tableSorters.total_count ? tableSorters.total_count.defaultDirection : 'desc'
  };

  /**
   * Sort packet stats using the active sort configuration.
   *
   * @param {Array<Object>} data Packet stats rows.
   * @returns {Array<Object>} sorted rows.
   */
  const sortStatsData = data => {
    const sorter = tableSorters[sortState.key];
    if (!sorter) return Array.isArray(data) ? [...data] : [];
    const dir = sortState.direction === 'asc' ? 1 : -1;
    return [...(data || [])].sort((a, b) => {
      const aVal = sorter.getValue(a);
      const bVal = sorter.getValue(b);
      const aHas = sorter.hasValue ? sorter.hasValue(aVal) : hasStringValue(aVal);
      const bHas = sorter.hasValue ? sorter.hasValue(bVal) : hasStringValue(bVal);
      if (aHas && bHas) {
        return sorter.compare(aVal, bVal) * dir;
      }
      if (aHas) return -1;
      if (bHas) return 1;
      return 0;
    });
  };

  /**
   * Update the visual sort indicators for the active column.
   *
   * @returns {void}
   */
  const syncSortIndicators = () => {
    if (!tableEl || !sortButtons.length) return;
    tableEl.querySelectorAll('thead th').forEach(th => th.removeAttribute('aria-sort'));
    sortButtons.forEach(button => {
      button.removeAttribute('data-sort-active');
      const indicator = button.querySelector('.sort-indicator');
      if (indicator) indicator.textContent = '';
    });
    const active = sortButtons.find(button => button.dataset.sortKey === sortState.key);
    if (!active) return;
    const indicator = active.querySelector('.sort-indicator');
    if (indicator) indicator.textContent = sortState.direction === 'asc' ? '▲' : '▼';
    active.setAttribute('data-sort-active', 'true');
    const th = active.closest('th');
    if (th) {
      th.setAttribute('aria-sort', sortState.direction === 'asc' ? 'ascending' : 'descending');
    }
  };

  /**
   * Render the packet stats table body with sorting applied.
   *
   * @param {Array<Object>} data Packet stats rows.
   * @returns {void}
   */
  const renderTableRows = data => {
    if (!tableBody) return;
    const frag = document.createDocumentFragment();
    const sorted = sortStatsData(data);

    for (const stat of sorted) {
      const tr = document.createElement('tr');
      const longName = stat.long_name ? escapeHtml(stat.long_name) : null;
      const shortName = stat.short_name ? escapeHtml(stat.short_name) : null;
      const shortId = escapeHtml(getShortNodeId(stat.node_id) || '—');
      
      // Display long name if available, otherwise short name, otherwise short ID
      let displayName;
      if (longName) {
        // Show long name with short name or ID in parentheses
        const fallback = shortName || shortId;
        displayName = `${longName} <span class="node-short-id">(${fallback})</span>`;
      } else if (shortName) {
        displayName = shortName;
      } else {
        displayName = shortId;
      }

      const telCount = toFiniteNumber(stat.telemetry_count) ?? 0;
      const posCount = toFiniteNumber(stat.position_count) ?? 0;
      const traceCount = toFiniteNumber(stat.trace_count) ?? 0;
      const msgCount = toFiniteNumber(stat.message_count) ?? 0;
      const totalCount = toFiniteNumber(stat.total_count) ?? 0;

      tr.innerHTML = `
        <td class="packet-stats-col packet-stats-col--name">${displayName}</td>
        <td class="packet-stats-col packet-stats-col--tel mono">${escapeHtml(String(telCount))}</td>
        <td class="packet-stats-col packet-stats-col--pos mono">${escapeHtml(String(posCount))}</td>
        <td class="packet-stats-col packet-stats-col--tr mono">${escapeHtml(String(traceCount))}</td>
        <td class="packet-stats-col packet-stats-col--tc mono">${escapeHtml(String(msgCount))}</td>
        <td class="packet-stats-col packet-stats-col--all mono">${escapeHtml(String(totalCount))}</td>
      `;

      frag.appendChild(tr);
    }

    tableBody.replaceChildren(frag);
    syncSortIndicators();
  };

  /**
   * Wire up click and keyboard handlers for sortable headers.
   *
   * @param {Function} rerender Callback to refresh the table.
   * @returns {void}
   */
  const attachSortHandlers = rerender => {
    if (!sortButtons.length) return;
    const applySortKey = key => {
      if (!key) return;
      if (sortState.key === key) {
        sortState = { key, direction: sortState.direction === 'asc' ? 'desc' : 'asc' };
      } else {
        const defaultDir = tableSorters[key]?.defaultDirection || 'asc';
        sortState = { key, direction: defaultDir };
      }
      rerender();
    };

    sortButtons.forEach(button => {
      const key = button.dataset.sortKey;
      button.addEventListener('click', () => applySortKey(key));
      button.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          applySortKey(key);
        }
      });
    });
  };

  /**
   * Fetch packet stats data for the given timeframe.
   *
   * @param {number} timeframeSeconds Timeframe in seconds (0 for all time).
   * @returns {Promise<Array>} Packet statistics data.
   */
  const fetchData = async timeframeSeconds => {
    if (statusEl) {
      statusEl.textContent = 'loading…';
      statusEl.classList.add('pill--loading');
    }

    let stats = [];
    try {
      let url = '/api/packet-stats';
      if (timeframeSeconds > 0) {
        const now = Math.floor(Date.now() / 1000);
        const since = now - timeframeSeconds;
        url = `/api/packet-stats?since=${since}`;
      }
      const response = await fetchImpl(url, {
        headers: { Accept: 'application/json' },
        credentials: 'omit'
      });
      if (response.ok) {
        stats = await response.json();
      }
    } catch (err) {
      console.warn('Failed to fetch packet statistics', err);
    }

    if (statusEl) {
      statusEl.textContent = `${stats.length} nodes`;
      statusEl.classList.remove('pill--loading');
    }

    return stats;
  };

  /**
   * Load and render data for the current timeframe selection.
   *
   * @returns {Promise<void>}
   */
  const loadAndRender = async () => {
    const timeframeSeconds = timeframeSelect
      ? parseInt(timeframeSelect.value, 10)
      : 86400; // Default to 24 hours
    const stats = await fetchData(timeframeSeconds);
    if (tableBody && Array.isArray(stats)) {
      renderTableRows(stats);
    }
  };

  // Attach timeframe change handler
  if (timeframeSelect) {
    timeframeSelect.addEventListener('change', loadAndRender);
  }

  // Initial load and setup
  const initialTimeframe = timeframeSelect ? parseInt(timeframeSelect.value, 10) : 86400;
  const initialStats = await fetchData(initialTimeframe);

  if (tableBody && Array.isArray(initialStats)) {
    attachSortHandlers(() => loadAndRender());
    renderTableRows(initialStats);
  }
}
