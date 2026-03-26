'use strict';

/**
 * Build a consistent pagination response shape.
 *
 * @param {object[]} data        - The current page's rows
 * @param {number}   total       - Total matching rows (from Supabase count)
 * @param {number}   page        - Current page (1-indexed)
 * @param {number}   limit       - Page size
 * @returns {{ data, total, page, limit, total_pages }}
 */
function paginate(data, total, page, limit) {
  return {
    data:        data || [],
    total:       total || 0,
    page,
    limit,
    total_pages: Math.ceil((total || 0) / limit) || 1,
  };
}

/**
 * Parse pagination params from query string.
 * Enforces sane defaults and max limit.
 *
 * @param {object} query  - req.query
 * @param {object} [opts]
 * @param {number} [opts.defaultLimit=20]
 * @param {number} [opts.maxLimit=100]
 * @returns {{ page, limit, from, to }}
 */
function parsePagination(query, { defaultLimit = 20, maxLimit = 100 } = {}) {
  const page  = Math.max(1, parseInt(query.page  || '1',  10));
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit || String(defaultLimit), 10)));
  const from  = (page - 1) * limit;
  const to    = from + limit - 1;
  return { page, limit, from, to };
}

module.exports = { paginate, parsePagination };
