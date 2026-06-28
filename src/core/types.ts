export interface SizePreset {
  label: string
  pen: number
  font: number
}

export interface DevAnnotationOptions {
  /** Upload endpoint. Default '/api/dev/save-annotation'. */
  endpoint?: string
  /** Color palette. */
  colors?: string[]
  /** Size presets (S/M/L). */
  sizes?: SizePreset[]
  /** Keyboard shortcut to toggle the panel. Default 'a'. */
  shortcutKey?: string
  /** Base z-index for the UI layers. Default 100000. */
  zIndexBase?: number
}

export const DEFAULTS: Required<DevAnnotationOptions> = {
  endpoint: '/api/dev/save-annotation',
  colors: ['#ff3b30', '#ff9500', '#ffd60a', '#ffffff'],
  sizes: [
    { label: 'S', pen: 3, font: 14 },
    { label: 'M', pen: 6, font: 18 },
    { label: 'L', pen: 12, font: 24 },
  ],
  shortcutKey: 'a',
  zIndexBase: 100000,
}
