import { x402Client, wrapFetchWithPayment } from '@x402-avm/fetch'
import { ALGORAND_TESTNET_CAIP2 } from '@x402-avm/avm'
import type { ClientAvmSigner } from '@x402-avm/avm'
import { ExactAvmScheme } from '@x402-avm/avm/exact/client'

/**
 * Creates a fetch wrapper that automatically handles x402 payment flows for meme generation
 * @param walletSigner - The connected wallet signer from use-wallet
 * @returns A fetch function that handles 402 payment challenges
 */
export async function createX402Fetch(walletSigner: any) {
  console.log('createX402Fetch: initializing for address', walletSigner.address)
  const client = new x402Client()

  let originalTxns: Uint8Array[] = []

  const x402Signer: ClientAvmSigner = {
    address: walletSigner.address,
    signTransactions: async (txns: Uint8Array[]) => {
      try {
        console.log('x402Signer.signTransactions: received', txns.length, 'transaction(s)')
        originalTxns = txns
        
        txns.forEach((txn, i) => {
          console.log(`Txn ${i}: ${txn.byteLength} bytes`)
        })

        console.log('Calling wallet.signTransactions...')
        const walletResult = await walletSigner.signTransactions(txns)
        
        console.log('Wallet returned result, processing...')
        
        if (Array.isArray(walletResult)) {
          const result = walletResult.map((item: any, i: number) => {
            if (item === null || item === undefined) {
              console.log(`Item ${i}: unsigned, using original`)
              return originalTxns[i]
            }
            if (item instanceof Uint8Array) {
              console.log(`Item ${i}: signed`)
              return item
            }
            if (typeof item === 'string') {
              console.log(`Item ${i}: base64 string, converting`)
              const binaryString = atob(item)
              const bytes = new Uint8Array(binaryString.length)
              for (let j = 0; j < binaryString.length; j++) {
                bytes[j] = binaryString.charCodeAt(j)
              }
              return bytes
            }
            console.log(`Item ${i}: unknown format, using original`)
            return originalTxns[i]
          })
          
          return result
        }
        
        return walletResult
      } catch (error) {
        console.error('signTransactions error:', error)
        throw error
      }
    },
  }

  client.register(ALGORAND_TESTNET_CAIP2, new ExactAvmScheme(x402Signer))
  console.log('x402 client registered for TestNet')

  return wrapFetchWithPayment(fetch, client)
}
