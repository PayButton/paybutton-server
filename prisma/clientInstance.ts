import { PrismaClient } from '@prisma/client'

let prisma: PrismaClient

interface CustomNodeJsGlobal extends NodeJS.Global {
  prisma: PrismaClient
}
declare const global: CustomNodeJsGlobal

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient()
  // Iterate over keys of PrismaClient
  for (const modelKey of Object.keys(prisma) as Array<keyof PrismaClient>) {
    const model = prisma[modelKey]

    // Check if the model is an object (e.g., a Prisma model)
    if (typeof model === 'object' && model !== null) {
      for (const methodKey of Object.keys(model) as Array<keyof typeof model>) {
        const originalMethod = model[methodKey]

        // Check if the property is a function
        if (typeof originalMethod === 'function') {
          // Replace the original method with a wrapper
          (model[methodKey] as unknown) = async (...args: unknown[]) => {
            console.log(`Prisma Call: ${String(modelKey)}.${String(methodKey)}`)
            console.log(`Args: ${JSON.stringify(args)}`)
            console.trace('Stack Trace:')

            // Call the original method
            return (originalMethod as Function).apply(model, args)
          }
        }
      }
    }
  }
} else {
  if (global.prisma === undefined) {
    global.prisma = new PrismaClient()
  }

  prisma = global.prisma
}

export default prisma

// https://github.com/prisma/prisma/issues/1983#issuecomment-620621213
