import { useRuntimeConfig } from '#imports'
import { createSaveAnnotationHandler } from 'dev-annotate/server'

export default createSaveAnnotationHandler({
  dir: (useRuntimeConfig().devAnnotate as { dir?: string } | undefined)?.dir,
})
