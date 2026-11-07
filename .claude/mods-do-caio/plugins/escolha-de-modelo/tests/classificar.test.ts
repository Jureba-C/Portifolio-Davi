import { describe, expect, test } from 'claude-code/testing'

import { classificar, familia, lerNivel, nivelDe } from '../hooks/classificar'

describe('classificar', () => {
  test('confirmações curtas vão para o Haiku', () => {
    for (const texto of ['ok', 'Sim', 'não', 'pode subir', 'Continue', 'pode publicar!', 'beleza, valeu', '👍']) {
      const r = classificar(texto)
      expect(r.nivel, texto).toBe('haiku')
      expect(r.certo, texto).toBe(true)
    }
  })

  test('palavras de trabalho pesado vão para o Opus', () => {
    for (const texto of [
      'investigue por que o login falha',
      'tem um bug no lightbox',
      'a página trava no iPhone',
      'refatorar o módulo de fotos',
      'revise a arquitetura da API',
      'redesenhar a home',
      'planejar a migração do banco',
      'checar a segurança das URLs assinadas',
      'melhorar o desempenho da galeria',
      '/savvy-flow corrigir o menu',
      'sim, mas antes investigue o erro',
    ]) {
      expect(classificar(texto).nivel, texto).toBe('opus')
    }
  })

  test('texto longo e vários itens vão para o Opus', () => {
    expect(classificar('a'.repeat(700)).nivel).toBe('opus')
    expect(classificar('faça:\n- trocar o título\n- mudar a cor\n- ajustar o rodapé').nivel).toBe('opus')
  })

  test('pedido comum vai para o Sonnet com certeza', () => {
    const r = classificar('troque o título da página inicial por Portfólio')
    expect(r.nivel).toBe('sonnet')
    expect(r.certo).toBe(true)
  })

  test('pedido médio sem sinal claro fica incerto', () => {
    const r = classificar('ajuste o texto da seção sobre mim '.repeat(8))
    expect(r.nivel).toBe('sonnet')
    expect(r.certo).toBe(false)
  })

  test('lê a família do modelo e a resposta do Haiku', () => {
    expect(familia('claude-opus-5-5')).toBe('opus')
    expect(familia('claude-sonnet-4-6')).toBe('sonnet')
    expect(familia('outro-modelo')).toBe(null)
    expect(lerNivel('Opus.')).toBe('opus')
    expect(lerNivel('não sei')).toBe(null)
    expect(nivelDe('claude-haiku-4-5')).toBeLessThan(nivelDe('claude-opus-5-5'))
    expect(nivelDe('modelo-desconhecido')).toBeGreaterThan(nivelDe('claude-opus-5-5'))
  })
})
