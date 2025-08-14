import path from 'node:path'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: path.join('prisma-local', 'schema.prisma'),
  migrations: {
    seed: 'ts-node --compiler-options {"module":"CommonJS"} -r tsconfig-paths/register prisma-local/seed.ts'
  }
})
