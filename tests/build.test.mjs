import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const CHAVE_ANON = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role: 'anon', ref: 'abcdefgh' })).toString('base64url')}.assinatura`;
const CHAVE_SECRETA = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url')}.assinatura`;

function construir(env) {
  const pasta = mkdtempSync(join(tmpdir(), 'decxz-build-'));
  const saida = relative(raiz, pasta);
  const limpo = { PATH: process.env.PATH, SAIDA: saida, ...env };
  const r = spawnSync(process.execPath, ['scripts/build.mjs'], { cwd: raiz, env: limpo, encoding: 'utf8' });
  return { ...r, pasta };
}

test('build com as chaves gera config, troca o endereço e deixa de fora o que é interno', () => {
  const r = construir({ SUPABASE_URL: 'https://abcdefgh.supabase.co', SUPABASE_ANON_KEY: CHAVE_ANON, SITE_URL: 'https://decxz.com.br/' });
  try {
    assert.equal(r.status, 0, r.stderr);
    const config = readFileSync(join(r.pasta, 'js/config.js'), 'utf8');
    assert.match(config, /SUPABASE_URL = "https:\/\/abcdefgh\.supabase\.co"/);
    assert.match(config, /SITE_URL = "https:\/\/decxz\.com\.br"/);
    assert.ok(config.includes(CHAVE_ANON));
    const index = readFileSync(join(r.pasta, 'index.html'), 'utf8');
    assert.ok(index.includes('https://decxz.com.br/'));
    assert.ok(!index.includes('portfolio-editor.vercel.app'));
    assert.ok(readFileSync(join(r.pasta, 'sitemap.xml'), 'utf8').includes('https://decxz.com.br/'));
    for (const interno of ['styleguide.html', 'tests', 'supabase', 'scripts', 'docs', 'package.json', 'README.md']) {
      assert.ok(!existsSync(join(r.pasta, interno)), `${interno} não devia ir ao ar`);
    }
    for (const publico of ['index.html', 'admin.html', '404.html', 'robots.txt', 'css/site.css', 'js/site.js', 'assets/favicon.svg']) {
      assert.ok(existsSync(join(r.pasta, publico)), `${publico} devia ir ao ar`);
    }
  } finally {
    rmSync(r.pasta, { recursive: true, force: true });
  }
});

test('sem as chaves do Supabase o build para com uma mensagem clara', () => {
  const r = construir({});
  try {
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /SUPABASE_URL/);
  } finally {
    rmSync(r.pasta, { recursive: true, force: true });
  }
});

test('a chave service_role é recusada', () => {
  const r = construir({ SUPABASE_URL: 'https://abcdefgh.supabase.co', SUPABASE_ANON_KEY: CHAVE_SECRETA });
  try {
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /service_role/);
  } finally {
    rmSync(r.pasta, { recursive: true, force: true });
  }
});

test('sem SITE_URL usa o endereço que a Vercel dá', () => {
  const r = construir({ SUPABASE_URL: 'https://abcdefgh.supabase.co', SUPABASE_ANON_KEY: CHAVE_ANON, VERCEL_PROJECT_PRODUCTION_URL: 'decxz.vercel.app' });
  try {
    assert.equal(r.status, 0, r.stderr);
    assert.match(readFileSync(join(r.pasta, 'js/config.js'), 'utf8'), /SITE_URL = "https:\/\/decxz\.vercel\.app"/);
  } finally {
    rmSync(r.pasta, { recursive: true, force: true });
  }
});

test('modo demonstração só com PERMITIR_DEMO=1', () => {
  const r = construir({ PERMITIR_DEMO: '1' });
  try {
    assert.equal(r.status, 0, r.stderr);
    assert.match(readFileSync(join(r.pasta, 'js/config.js'), 'utf8'), /SUPABASE_URL = ""/);
  } finally {
    rmSync(r.pasta, { recursive: true, force: true });
  }
});

test('os caminhos dos cabeçalhos do vercel.json usam só o formato que a Vercel aceita', () => {
  const { headers } = JSON.parse(readFileSync(join(raiz, 'vercel.json'), 'utf8'));
  for (const { source } of headers) {
    let nivel = 0;
    for (let i = 0; i < source.length; i += 1) {
      if (source[i] === '\\') { i += 1; continue; }
      if (source[i] === '(') {
        assert.equal(nivel, 0, `grupo dentro de grupo em ${source}`);
        nivel += 1;
      }
      if (source[i] === ')') nivel -= 1;
    }
    assert.equal(nivel, 0, `parênteses sem par em ${source}`);
  }
});

test('aceita as chaves coladas com aspas, espaços, nome na frente ou caminho no fim', () => {
  const casos = [
    { SUPABASE_URL: ' "https://abcdefgh.supabase.co/rest/v1/" ', SUPABASE_ANON_KEY: `SUPABASE_ANON_KEY=${CHAVE_ANON}\n` },
    { SUPABASE_URL: 'abcdefghijklmnopqrst', SUPABASE_ANON_KEY: 'sb_publishable_AbC123-xyz_9' },
    { SUPABASE_URL: 'abcdefgh.supabase.co', SUPABASE_ANON_KEY: `'${CHAVE_ANON}'` },
  ];
  const esperado = [
    ['https://abcdefgh.supabase.co', CHAVE_ANON],
    ['https://abcdefghijklmnopqrst.supabase.co', 'sb_publishable_AbC123-xyz_9'],
    ['https://abcdefgh.supabase.co', CHAVE_ANON],
  ];
  casos.forEach((env, i) => {
    const r = construir(env);
    try {
      assert.equal(r.status, 0, r.stderr);
      const config = readFileSync(join(r.pasta, 'js/config.js'), 'utf8');
      assert.ok(config.includes(`SUPABASE_URL = "${esperado[i][0]}";`), config);
      assert.ok(config.includes(`SUPABASE_ANON_KEY = "${esperado[i][1]}";`), config);
    } finally {
      rmSync(r.pasta, { recursive: true, force: true });
    }
  });
});

test('a chave secret nova também é recusada', () => {
  const r = construir({ SUPABASE_URL: 'https://abcdefgh.supabase.co', SUPABASE_ANON_KEY: 'sb_secret_abc123' });
  try {
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /secret/);
  } finally {
    rmSync(r.pasta, { recursive: true, force: true });
  }
});
