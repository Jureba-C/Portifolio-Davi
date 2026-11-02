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
