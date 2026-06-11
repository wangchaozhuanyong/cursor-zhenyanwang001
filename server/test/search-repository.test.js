const test = require('node:test');
const assert = require('node:assert/strict');

const repoPath = require.resolve('../src/modules/search/repository/search.repository');
const dbPath = require.resolve('../src/config/db');

function loadRepository(query) {
  delete require.cache[repoPath];
  delete require.cache[dbPath];
  require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: { query },
  };
  return require(repoPath);
}

test('selectHotTerms hides blocked terms and allows manual or pinned zero-result terms', async () => {
  const queries = [];
  const repo = loadRepository(async (sql, params) => {
    queries.push({ sql, params });
    return [[{ id: 1, keyword: '薄荷' }]];
  });

  await repo.selectHotTerms(10);

  const sql = queries[0].sql;
  assert.match(sql, /COALESCE\(is_hidden,\s*0\)\s*=\s*0/);
  assert.match(sql, /result_count\s*>\s*0\s+OR\s+COALESCE\(is_pinned,\s*0\)\s*=\s*1\s+OR\s+COALESCE\(source,\s*'auto'\)\s*=\s*'manual'/);
  assert.match(sql, /ORDER BY COALESCE\(is_pinned,\s*0\) DESC/);
  assert.deepEqual(queries[0].params, [10]);
});

test('selectSuggestions filters hidden search terms before merging product suggestions', async () => {
  const queries = [];
  const repo = loadRepository(async (sql, params) => {
    queries.push({ sql, params });
    return [[]];
  });

  await repo.selectSuggestions('薄', '%薄%', '%bo%', 8);

  assert.equal(queries.length, 2);
  assert.match(queries[0].sql, /FROM search_terms/);
  assert.match(queries[0].sql, /COALESCE\(is_hidden,\s*0\)\s*=\s*0/);
  assert.match(queries[1].sql, /FROM products/);
  assert.deepEqual(queries[0].params, ['薄%', 8]);
});
