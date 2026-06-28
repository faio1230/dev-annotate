export function resolveExt(input: { mime?: string; filename?: string }): string {
  const typeExt = /image\/(png|jpe?g|webp)/.exec(input.mime ?? '')?.[1]
  const nameExt = /\.(png|jpe?g|webp)$/i.exec(input.filename ?? '')?.[1]
  let ext = (typeExt ?? nameExt ?? 'png').toLowerCase()
  if (ext === 'jpeg') ext = 'jpg'
  return ext
}
