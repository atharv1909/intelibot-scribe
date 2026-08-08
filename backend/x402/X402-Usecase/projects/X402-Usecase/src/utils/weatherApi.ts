import { x402Client, wrapFetchWithPayment } from '@x402-avm/fetch'
import { ALGORAND_TESTNET_CAIP2 } from '@x402-avm/avm'
import type { ClientAvmSigner } from '@x402-avm/avm'
import { ExactAvmScheme } from '@x402-avm/avm/exact/client'

/**
 * Creates a fetch wrapper that automatically handles x402 payment flows
 * @param walletSigner - The connected wallet signer from use-wallet
 * @returns A fetch function that handles 402 payment challenges
 */
export async function createX402Fetch(walletSigner: any) {
  console.log('createX402Fetch: initializing for address', walletSigner.address)
  const client = new x402Client()

  // Keep a reference to original transactions
  let originalTxns: Uint8Array[] = []

  const x402Signer: ClientAvmSigner = {
    address: walletSigner.address,
    signTransactions: async (txns: Uint8Array[]) => {
      try {
        console.log('x402Signer.signTransactions: received', txns.length, 'transaction(s)')
        originalTxns = txns
        
        // Log details
        txns.forEach((txn, i) => {
          console.log(`Txn ${i}: ${txn.byteLength} bytes, first 10 bytes:`, Array.from(txn.slice(0, 10)))
        })

        console.log('Calling wallet.signTransactions...')
        const walletResult = await walletSigner.signTransactions(txns)
        
        console.log('Wallet returned:', typeof walletResult)
        console.log('Is array?', Array.isArray(walletResult))
        console.log('Array length:', Array.isArray(walletResult) ? walletResult.length : 'N/A')
        
        // Log each element in detail
        if (Array.isArray(walletResult)) {
          walletResult.forEach((item, i) => {
            console.log(`Item ${i}: type=${typeof item}, is null=${item === null}, is Uint8Array=${item instanceof Uint8Array}`)
          })
          
          // Map wallet response back to transactions array, keeping unsigned where wallet returned null
          const result = walletResult.map((item: any, i: number) => {
            if (item === null || item === undefined) {
              // Wallet didn't sign this one, use original
              console.log(`Item ${i}: unsigned, using original unsigned transaction (${originalTxns[i]?.byteLength} bytes)`)
              return originalTxns[i]
            }
            if (item instanceof Uint8Array) {
              console.log(`Item ${i}: signed (${item.byteLength} bytes)`)
              return item
            }
            if (typeof item === 'string') {
              // base64 string
              console.log(`Item ${i}: base64 string`)
              const binaryString = atob(item)
              const bytes = new Uint8Array(binaryString.length)
              for (let j = 0; j < binaryString.length; j++) {
                bytes[j] = binaryString.charCodeAt(j)
              }
              return bytes
            }
            // Fallback
            console.log(`Item ${i}: unknown format, using original`)
            return originalTxns[i]
          })
          
          console.log('Returning', result.length, 'transactions')
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

/**
 * Fetches weather data with x402 payment handling
 * @param url - The weather API endpoint
 * @param walletSigner - The connected wallet signer from use-wallet
 * @returns The weather JSON response
 */
export async function fetchWeatherWithPayment(
  url: string,
  walletSigner: any,
): Promise<any> {
  try {
    console.log('\n=== fetchWeatherWithPayment START ===')
    console.log('URL:', url)

    const fetchFn = await createX402Fetch(walletSigner)
    console.log('Making request to:', url)

    const response = await fetchFn(url)
    console.log('Response status:', response.status)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    console.log('SUCCESS - Weather data:', data)
    return data
  } catch (error) {
    console.error('FAILED:', error)
    if (error instanceof Error) {
      throw new Error(`Weather API: ${error.message}`)
    }
    throw error
  }
}

/**
 * Formats weather data for display
 */
export function formatWeatherData(data: any): string {
  if (!data) return 'No data'
  return JSON.stringify(data, null, 2)
}
