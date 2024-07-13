import prisma from 'prisma/clientInstance'
import { SideshiftShiftRes } from 'ws-service/types'

export async function createSideshiftShift (shiftRes: SideshiftShiftRes): Promise<void> {
  await prisma.sideshiftShift.create({
    data: shiftRes
  })
}
