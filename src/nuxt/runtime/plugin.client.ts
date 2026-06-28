import { defineNuxtPlugin, useRuntimeConfig } from '#imports'
import { initDevAnnotation, type DevAnnotationOptions } from 'dev-annotate'

export default defineNuxtPlugin(() => {
  const cfg = (useRuntimeConfig().public as { devAnnotate?: DevAnnotationOptions }).devAnnotate ?? {}
  const destroy = initDevAnnotation(cfg)
  if (import.meta.hot) import.meta.hot.dispose(() => destroy())
})
