import { DEFAULTS, type DevAnnotationOptions } from './types.js'
export type { DevAnnotationOptions } from './types.js'

export function initDevAnnotation(options: DevAnnotationOptions = {}): () => void {
  // Defensive fallbacks: callers (e.g. Nuxt runtime config) may hand us empty
  // strings or otherwise malformed values for which `??` is not enough, so we
  // validate the shape before use to avoid `colors.map` / `sizes.map` crashes.
  const endpoint    = typeof options.endpoint === 'string' && options.endpoint ? options.endpoint : DEFAULTS.endpoint
  const colors      = Array.isArray(options.colors) && options.colors.length ? options.colors : DEFAULTS.colors
  const sizePresets = Array.isArray(options.sizes) && options.sizes.length ? options.sizes : DEFAULTS.sizes
  const shortcutKey = (typeof options.shortcutKey === 'string' && options.shortcutKey ? options.shortcutKey : DEFAULTS.shortcutKey).toLowerCase()
  const z           = typeof options.zIndexBase === 'number' ? options.zIndexBase : DEFAULTS.zIndexBase

  // ── Teardown registry ───────────────────────────────────────
  const nodes: ChildNode[] = []
  const cleanups: Array<() => void> = []
  const track = <T extends ChildNode>(n: T): T => { nodes.push(n); return n }
  const on = (
    target: EventTarget,
    type: string,
    handler: EventListenerOrEventListenerObject,
    opts?: AddEventListenerOptions | boolean,
  ) => {
    target.addEventListener(type, handler, opts)
    cleanups.push(() => target.removeEventListener(type, handler, opts as EventListenerOptions | boolean | undefined))
  }

  // ── State ──────────────────────────────────────────────────
  let panelOpen = false
  let tool: 'free' | 'pen' | 'pin' | 'text' = 'free'
  let color = colors[0] ?? '#ff3b30'
  let penSize = 3
  let fontSize = 16
  let pinCount = 0
  let isDrawing = false
  let lastX = 0
  let lastY = 0
  const history: ImageData[] = []

  // ── Styles ─────────────────────────────────────────────────
  const style = document.createElement('style')
  style.textContent = `
    #__da-toggle {
      position: fixed; bottom: 24px; right: 24px;
      width: 48px; height: 48px; border-radius: 50%;
      background: rgba(15,15,30,0.9); border: 2px solid #ff3b30;
      color: #ff3b30; font-size: 18px; cursor: pointer;
      z-index: ${z}; display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 16px rgba(0,0,0,0.5); transition: transform 0.15s;
      line-height: 1;
    }
    #__da-toggle:hover { transform: scale(1.1); }
    #__da-toggle.on { background: #ff3b30; color: #fff; }

    #__da-canvas {
      position: fixed; inset: 0; z-index: ${z - 2};
      pointer-events: none; cursor: crosshair;
    }
    #__da-canvas.on { }

    #__da-bar {
      position: fixed; bottom: 80px; right: 16px;
      background: rgba(10,10,20,0.97); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px; padding: 12px 14px; z-index: ${z + 1};
      display: none; flex-direction: column; gap: 10px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.6); min-width: 172px;
      font-family: monospace;
    }
    #__da-bar.on { display: flex; }

    .__da-sec-label {
      font-size: 9px; letter-spacing: 0.12em;
      color: rgba(255,255,255,0.3); margin-bottom: -4px;
    }
    .__da-row { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }

    .__da-btn {
      padding: 5px 10px; border-radius: 6px;
      border: 1px solid rgba(255,255,255,0.13);
      background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.8);
      font: 12px/1 monospace; cursor: pointer; transition: background 0.1s;
      white-space: nowrap;
    }
    .__da-btn:hover { background: rgba(255,255,255,0.13); }
    .__da-btn.on { background: #ff3b30; border-color: #ff3b30; color: #fff; }

    .__da-swatch {
      width: 22px; height: 22px; border-radius: 50%;
      border: 2px solid transparent; cursor: pointer; flex-shrink: 0;
      transition: transform 0.1s;
    }
    .__da-swatch:hover { transform: scale(1.15); }
    .__da-swatch.on { border-color: #fff; }

    .__da-hr { height: 1px; background: rgba(255,255,255,0.07); }

    #__da-save {
      background: #ff3b30 !important; border-color: #ff3b30 !important;
      color: #fff !important; font-weight: 700; text-align: center;
      width: 100%; padding: 7px 0;
    }
    #__da-save:hover { background: #ff6259 !important; }
    #__da-save:disabled { opacity: 0.6; cursor: default; }

    #__da-status {
      font-size: 10px; color: #4caf50; text-align: center;
      display: none; word-break: break-all; line-height: 1.4;
    }

    #__da-text-input {
      position: fixed; z-index: ${z + 2};
      background: rgba(10,10,20,0.92);
      border: 1.5px solid #ff3b30; border-radius: 4px;
      padding: 4px 8px; color: #fff;
      font-size: 16px;
      font-family: 'Noto Sans JP', sans-serif;
      outline: none; min-width: 160px; max-width: 320px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.5);
      display: none;
    }
    #__da-text-hint {
      position: fixed; z-index: ${z + 2};
      font: 10px/1 monospace;
      color: rgba(255,255,255,0.4);
      background: rgba(0,0,0,0.4); padding: 2px 6px; border-radius: 3px;
      pointer-events: none; display: none;
    }
  `
  document.head.appendChild(track(style))

  // ── Canvas ─────────────────────────────────────────────────
  const canvas = document.createElement('canvas')
  canvas.id = '__da-canvas'
  document.body.appendChild(track(canvas))
  const ctx = canvas.getContext('2d')

  // ── Text input ─────────────────────────────────────────────
  const textInput = document.createElement('input')
  textInput.id = '__da-text-input'
  textInput.placeholder = 'テキストを入力… Enter で確定'
  document.body.appendChild(track(textInput))

  const textHint = document.createElement('div')
  textHint.id = '__da-text-hint'
  textHint.textContent = 'Enter: 確定  Esc: キャンセル'
  document.body.appendChild(track(textHint))

  // ── Toolbar ────────────────────────────────────────────────
  const bar = document.createElement('div')
  bar.id = '__da-bar'

  const toggle = document.createElement('button')
  toggle.id = '__da-toggle'
  toggle.title = 'アノテーション (A)'
  toggle.textContent = '✏'
  document.body.appendChild(track(toggle))
  document.body.appendChild(track(bar))

  function mkSection(label: string) {
    const el = document.createElement('div')
    el.className = '__da-sec-label'
    el.textContent = label
    bar.appendChild(el)
  }
  function mkRow() {
    const el = document.createElement('div')
    el.className = '__da-row'
    bar.appendChild(el)
    return el
  }
  function mkHr() {
    const el = document.createElement('div')
    el.className = '__da-hr'
    bar.appendChild(el)
  }
  function mkBtn(label: string, parent: HTMLElement, active = false) {
    const el = document.createElement('button')
    el.className = '__da-btn' + (active ? ' on' : '')
    el.textContent = label
    parent.appendChild(el)
    return el
  }

  // Tools
  mkSection('TOOL')
  const toolRow = mkRow()
  const freeBtn = mkBtn('🖐 フリー',   toolRow, true)
  const penBtn  = mkBtn('✏ ペン',     toolRow)
  const textBtn = mkBtn('T テキスト', toolRow)
  const pinBtn  = mkBtn('📍 ピン',    toolRow)
  const allToolBtns = [freeBtn, penBtn, textBtn, pinBtn]

  // Color
  mkSection('COLOR')
  const colorRow = mkRow()
  const swatches = colors.map((hex, i) => {
    const el = document.createElement('div')
    el.className = '__da-swatch' + (i === 0 ? ' on' : '')
    el.style.background = hex
    el.title = hex
    on(el, 'click', () => {
      color = hex
      swatches.forEach(s => s.classList.remove('on'))
      el.classList.add('on')
      textInput.style.color = hex
      textInput.style.borderColor = hex
    })
    colorRow.appendChild(el)
    return el
  })

  // Size
  mkSection('SIZE')
  const sizeRow = mkRow()
  const sizeBtns = sizePresets.map(({ label, pen, font }, i) => {
    const el = mkBtn(label, sizeRow, i === 0)
    on(el, 'click', () => {
      penSize = pen; fontSize = font
      sizeBtns.forEach(b => b.classList.remove('on'))
      el.classList.add('on')
      textInput.style.fontSize = font + 'px'
    })
    return el
  })

  mkHr()

  // Actions
  mkSection('ACTION')
  const actRow = mkRow()
  const undoBtn  = mkBtn('↩ Undo',  actRow)
  const clearBtn = mkBtn('🗑 Clear', actRow)

  mkHr()

  // 📷 撮影モード
  const cameraBtn = document.createElement('button')
  cameraBtn.id = '__da-save'
  cameraBtn.className = '__da-btn'
  cameraBtn.textContent = '📷 撮影モード（UIを隠す）'
  bar.appendChild(cameraBtn)

  // ⬆ アップロード
  const uploadBtn = document.createElement('button')
  uploadBtn.className = '__da-btn'
  uploadBtn.style.cssText = 'width:100%; padding:7px 0; margin-top:8px; text-align:center; font-weight:700;'
  uploadBtn.textContent = '⬆ スクショをアップロード'
  bar.appendChild(uploadBtn)

  const fileInput = document.createElement('input')
  fileInput.type = 'file'
  fileInput.accept = 'image/*'
  fileInput.style.display = 'none'
  document.body.appendChild(track(fileInput))

  const statusEl = document.createElement('div')
  statusEl.id = '__da-status'
  bar.appendChild(statusEl)

  // ── Canvas resize ──────────────────────────────────────────
  function resizeCanvas() {
    const data = (ctx && canvas.width > 0) ? ctx.getImageData(0, 0, canvas.width, canvas.height) : null
    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight
    if (ctx && data) ctx.putImageData(data, 0, 0)
  }
  resizeCanvas()
  on(window, 'resize', resizeCanvas)

  // ── Tool switching ─────────────────────────────────────────
  function updateCanvasInteraction() {
    const drawing = tool !== 'free'
    canvas.style.pointerEvents = drawing ? 'all' : 'none'
    canvas.style.touchAction   = drawing ? 'none' : 'auto'
    canvas.classList.toggle('on', panelOpen || drawing)
  }

  function updateToggleAppearance() {
    const drawing = tool !== 'free'
    toggle.textContent = panelOpen ? '✕' : '✏'
    toggle.classList.toggle('on', panelOpen || drawing)
  }

  function setTool(t: typeof tool) {
    tool = t
    allToolBtns.forEach(b => b.classList.remove('on'))
    if (t === 'free') { freeBtn.classList.add('on'); canvas.style.cursor = 'default' }
    if (t === 'pen')  { penBtn.classList.add('on');  canvas.style.cursor = 'crosshair' }
    if (t === 'text') { textBtn.classList.add('on'); canvas.style.cursor = 'text' }
    if (t === 'pin')  { pinBtn.classList.add('on');  canvas.style.cursor = 'cell' }
    updateCanvasInteraction()
    updateToggleAppearance()
  }
  on(freeBtn, 'click', () => setTool('free'))
  on(penBtn,  'click', () => setTool('pen'))
  on(textBtn, 'click', () => setTool('text'))
  on(pinBtn,  'click', () => setTool('pin'))

  // ── Drawing ────────────────────────────────────────────────
  function pushHistory() {
    if (!ctx) return
    if (history.length >= 30) history.shift()
    history.push(ctx.getImageData(0, 0, canvas.width, canvas.height))
  }

  function drawPin(x: number, y: number, n: number) {
    if (!ctx) return
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 4
    ctx.fillStyle = color; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2)
    ctx.fill(); ctx.stroke()
    ctx.shadowBlur = 0
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 12px monospace'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(String(n), x, y)
    ctx.restore()
  }

  // ── Text input ─────────────────────────────────────────────
  let textX = 0; let textY = 0

  function showTextInput(x: number, y: number) {
    textX = x; textY = y
    textInput.value = ''
    textInput.style.display = 'block'
    textInput.style.color = color
    textInput.style.borderColor = color
    textInput.style.fontSize = Math.max(fontSize, 16) + 'px'
    const maxLeft = window.innerWidth - 340
    const maxTop  = window.innerHeight - 80
    textInput.style.left = Math.min(x, maxLeft) + 'px'
    textInput.style.top  = Math.min(y, maxTop)  + 'px'
    textHint.style.display = 'block'
    textHint.style.left = Math.min(x, maxLeft) + 'px'
    textHint.style.top  = (Math.min(y, maxTop) - 22) + 'px'
    canvas.style.pointerEvents = 'none'
    requestAnimationFrame(() => textInput.focus())
  }

  function commitText() {
    const text = textInput.value.trim()
    if (text && ctx) {
      pushHistory()
      ctx.save()
      const fSize = Math.max(fontSize, 14)
      ctx.font = `bold ${fSize}px 'Noto Sans JP', sans-serif`
      ctx.textBaseline = 'top'
      const metrics = ctx.measureText(text)
      const pad = 5; const bgH = fSize + pad * 2
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.fillRect(textX - pad, textY - pad, metrics.width + pad * 2, bgH)
      ctx.fillStyle = color
      ctx.fillText(text, textX, textY)
      ctx.restore()
    }
    hideTextInput()
  }

  function hideTextInput() {
    textInput.style.display = 'none'
    textHint.style.display  = 'none'
    textInput.value = ''
    if (tool !== 'free') canvas.style.pointerEvents = 'all'
  }

  on(textInput, 'keydown', (e) => {
    const ke = e as KeyboardEvent
    if (ke.key === 'Enter')  { ke.preventDefault(); commitText() }
    if (ke.key === 'Escape') { ke.preventDefault(); hideTextInput() }
    ke.stopPropagation()
  })
  on(textInput, 'blur', () => {
    setTimeout(() => { if (document.activeElement !== textInput) commitText() }, 150)
  })

  // ── Mouse + Touch ──────────────────────────────────────────
  function onStart(x: number, y: number) {
    if (tool === 'pin')  { pushHistory(); pinCount++; drawPin(x, y, pinCount); return }
    if (tool === 'text') { showTextInput(x, y); return }
    isDrawing = true; lastX = x; lastY = y
    pushHistory()
    if (ctx) { ctx.beginPath(); ctx.moveTo(x, y) }
  }
  function onMove(x: number, y: number) {
    if (!isDrawing || tool !== 'pen' || !ctx) return
    ctx.strokeStyle = color; ctx.lineWidth = penSize
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.lineTo(x, y); ctx.stroke()
    lastX = x; lastY = y
  }
  function onEnd() { isDrawing = false }

  on(canvas, 'mousedown', (e) => { const me = e as MouseEvent; onStart(me.offsetX, me.offsetY) })
  on(canvas, 'mousemove', (e) => { const me = e as MouseEvent; onMove(me.offsetX, me.offsetY) })
  on(canvas, 'mouseup',    onEnd)
  on(canvas, 'mouseleave', onEnd)

  on(canvas, 'touchstart', (e) => {
    const te = e as TouchEvent
    if (tool === 'free') return
    te.preventDefault()
    const t = te.touches[0]
    if (!t) return
    const r = canvas.getBoundingClientRect()
    onStart(t.clientX - r.left, t.clientY - r.top)
  }, { passive: false })

  on(canvas, 'touchmove', (e) => {
    const te = e as TouchEvent
    if (tool === 'free') return
    te.preventDefault()
    const t = te.touches[0]
    if (!t) return
    const r = canvas.getBoundingClientRect()
    onMove(t.clientX - r.left, t.clientY - r.top)
  }, { passive: false })

  on(canvas, 'touchend', (e) => {
    const te = e as TouchEvent
    if (tool === 'free') return
    te.preventDefault(); onEnd()
  }, { passive: false })

  // ── Undo / Clear ───────────────────────────────────────────
  on(undoBtn, 'click', () => {
    if (!history.length || !ctx) return
    ctx.putImageData(history.pop()!, 0, 0)
    if (tool === 'pin') pinCount = Math.max(0, pinCount - 1)
  })
  on(clearBtn, 'click', () => {
    pushHistory()
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    pinCount = 0
  })

  // ── 撮影モード ──────────────────────────────────────────────
  const camTap = document.createElement('div')
  camTap.style.cssText
    = `position:fixed; inset:0; z-index:${z + 3}; display:none; background:transparent;`
  document.body.appendChild(track(camTap))

  const camToast = document.createElement('div')
  camToast.style.cssText
    = 'position:fixed; left:50%; top:50%; transform:translate(-50%,-50%);'
    + `z-index:${z + 4}; max-width:80vw; padding:14px 18px; border-radius:12px;`
    + 'background:rgba(10,10,20,0.92); border:1px solid #ff3b30; color:#fff;'
    + 'font:600 13px/1.6 \'Noto Sans JP\',sans-serif; text-align:center;'
    + 'box-shadow:0 8px 32px rgba(0,0,0,0.6); pointer-events:none;'
    + 'opacity:0; transition:opacity 0.4s; display:none;'
  document.body.appendChild(track(camToast))

  function enterCameraMode() {
    panelOpen = false
    bar.classList.remove('on')
    toggle.style.display = 'none'
    hideTextInput()
    camTap.style.display = 'block'
    camToast.style.display = 'block'
    camToast.textContent = '📸 メニューを隠しました。このメッセージが消えたら OS スクショを撮影 → 画面タップでメニュー復帰'
    requestAnimationFrame(() => { camToast.style.opacity = '1' })
    setTimeout(() => { camToast.style.opacity = '0' }, 2200)
    setTimeout(() => { camToast.style.display = 'none' }, 2700)
  }

  function exitCameraMode() {
    camTap.style.display = 'none'
    camToast.style.display = 'none'
    camToast.style.opacity = '0'
    toggle.style.display = ''
    panelOpen = true
    bar.classList.add('on')
    updateToggleAppearance()
  }
  on(camTap,    'click', exitCameraMode)
  on(cameraBtn, 'click', enterCameraMode)

  // ── アップロード ────────────────────────────────────────────
  function showStatus(msg: string, col: string) {
    statusEl.style.display = 'block'
    statusEl.style.color = col
    statusEl.textContent = msg
    setTimeout(() => { statusEl.style.display = 'none' }, 5000)
  }

  on(uploadBtn, 'click', () => fileInput.click())
  on(fileInput, 'change', async () => {
    const file = fileInput.files?.[0]
    if (!file) return
    uploadBtn.disabled = true
    uploadBtn.textContent = '⏳ アップロード中...'
    try {
      const fd = new FormData()
      fd.append('file', file, file.name)
      const res = await fetch(endpoint, { method: 'POST', body: fd })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as { path: string; bytes: number }
      showStatus(`✓ 保存: ${data.path} (${Math.round(data.bytes / 1024)}KB)`, '#4caf50')
    }
    catch (err) {
      showStatus(`✗ 失敗: ${err}`, '#ff3b30')
    }
    finally {
      uploadBtn.disabled = false
      uploadBtn.textContent = '⬆ スクショをアップロード'
      fileInput.value = ''
    }
  })

  // ── Toggle ─────────────────────────────────────────────────
  function togglePanel() {
    panelOpen = !panelOpen
    bar.classList.toggle('on', panelOpen)
    canvas.classList.toggle('on', panelOpen || tool !== 'free')
    if (!panelOpen) {
      isDrawing = false
      hideTextInput()
    }
    updateToggleAppearance()
  }
  on(toggle, 'click', togglePanel)

  on(window, 'keydown', (e) => {
    const ke = e as KeyboardEvent
    const tag = (ke.target as HTMLElement).tagName
    if (ke.key.toLowerCase() === shortcutKey && tag !== 'INPUT' && tag !== 'TEXTAREA') togglePanel()
  })

  // ── Destroy ────────────────────────────────────────────────
  return () => {
    for (const c of cleanups) c()
    for (const n of nodes) n.remove()
  }
}
