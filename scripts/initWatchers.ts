import 'tsconfig-paths/register'
import { multiBlockchainClient } from 'services/chronikService'

const main = async (): Promise<void> => {
  try {
    console.log('[WATCHERS] Starting Chronik multi-blockchain client...')
    await multiBlockchainClient.waitForStart()
    console.log('[WATCHERS] Chronik client started. URLs:', multiBlockchainClient.getUrls())
    const subs = multiBlockchainClient.getAllSubscribedAddresses()
    console.log('[WATCHERS] Subscribed addresses count:', {
      ecash: subs?.ecash?.length ?? 0,
      bitcoincash: subs?.bitcoincash?.length ?? 0
    })
  } catch (err: any) {
    console.error('[WATCHERS] Failed to start Chronik client:', err?.message)
    // Keep process alive; pm2 will handle restarts if it crashes later
  }
  // Prevent process from exiting; keep it alive
  setInterval(() => {}, 1 << 30)
}

void main()
