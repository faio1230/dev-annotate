export function resolveExt(input: { mime?: string; filename?: string }): 'png' | 'jpg' | 'webp' {
  const typeExt = /image\/(png|jpe?g|webp)/.exec(input.mime ?? '')?.[1]
  const nameExt = /\.(png|jpe?g|webp)$/i.exec(input.filename ?? '')?.[1]
  const raw = (typeExt ?? nameExt ?? 'png').toLowerCase()
  return (raw === 'jpeg' ? 'jpg' : raw) as 'png' | 'jpg' | 'webp'
}
