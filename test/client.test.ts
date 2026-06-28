// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { initDevAnnotation } from '../src/core/client.js'

describe('initDevAnnotation', () => {
  it('mounts UI nodes and tears them all down on destroy', () => {
    const before = document.body.childElementCount
    const destroy = initDevAnnotation()
    expect(document.getElementById('__da-toggle')).not.toBeNull()
    expect(document.getElementById('__da-canvas')).not.toBeNull()
    expect(document.getElementById('__da-bar')).not.toBeNull()
    destroy()
    expect(document.getElementById('__da-toggle')).toBeNull()
    expect(document.getElementById('__da-canvas')).toBeNull()
    expect(document.getElementById('__da-bar')).toBeNull()
    // no leftover style/element from this tool
    expect(document.querySelectorAll('[id^="__da-"]').length).toBe(0)
    expect(document.body.childElementCount).toBe(before)
  })

  it('uses a custom shortcut key to toggle the panel', () => {
    const destroy = initDevAnnotation({ shortcutKey: 'q' })
    const bar = document.getElementById('__da-bar')!
    expect(bar.classList.contains('on')).toBe(false)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'q' }))
    expect(bar.classList.contains('on')).toBe(true)
    destroy()
  })

  it('respects a custom endpoint and color palette without throwing', () => {
    const destroy = initDevAnnotation({ endpoint: '/x/save', colors: ['#000000', '#111111'] })
    const swatches = document.querySelectorAll('.__da-swatch')
    expect(swatches.length).toBe(2)
    destroy()
  })
})
