import React, { useState } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { fetchWeatherWithPayment, formatWeatherData } from '../utils/weatherApi'

const Weather: React.FC = () => {
  const { activeAddress, signTransactions } = useWallet()
  const [loading, setLoading] = useState(false)
  const [weatherData, setWeatherData] = useState<any>(null)
  const [error, setError] = useState<string>('')
  const [paymentStatus, setPaymentStatus] = useState('')

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4021'
  const weatherUrl = `${apiBaseUrl}/weather`

  const handleRequestWeather = async () => {
    if (!activeAddress) {
      setError('Please connect your wallet first')
      return
    }

    if (!signTransactions) {
      setError('Wallet does not support transaction signing')
      return
    }

    setLoading(true)
    setError('')
    setPaymentStatus('')
    setWeatherData(null)

    try {
      setPaymentStatus('Requesting weather data...')

      // Create a signer compatible with x402
      const signer = {
        address: activeAddress,
        signTransactions: signTransactions,
      }

      setPaymentStatus('Processing payment...')
      const data = await fetchWeatherWithPayment(weatherUrl, signer)

      setPaymentStatus('Payment settled!')
      setWeatherData(data)
      setPaymentStatus('')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMsg)
      setPaymentStatus('')
      console.error('Weather request error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">Weather API (x402 Payment Required)</h2>

        {/* Wallet Status */}
        <div className="alert alert-info">
          <div>
            <span>
              Wallet Status:{' '}
              <span className="font-bold">
                {activeAddress ? `Connected (${activeAddress.slice(0, 8)}...)` : 'Not Connected'}
              </span>
            </span>
          </div>
        </div>

        {/* Request Button */}
        <button
          className={`btn btn-primary ${loading ? 'loading' : ''}`}
          onClick={handleRequestWeather}
          disabled={!activeAddress || loading}
        >
          {loading ? 'Processing...' : 'Request Weather (Pay 0.005 USDC)'}
        </button>

        {/* Payment Status */}
        {paymentStatus && (
          <div className="alert alert-warning">
            <div>
              <span>{paymentStatus}</span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="alert alert-error">
            <div>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Weather Data Display */}
        {weatherData && (
          <div className="alert alert-success">
            <div>
              <span>✓ Weather data received and payment settled!</span>
            </div>
          </div>
        )}

        {weatherData && (
          <div className="mockup-code bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-lg shadow-lg border border-slate-700">
            <pre className="text-sm overflow-auto max-h-64 font-mono text-emerald-300 leading-relaxed">
              <code className="whitespace-pre-wrap break-words">{formatWeatherData(weatherData)}</code>
            </pre>
          </div>
        )}

        {/* Instructions */}
        <div className="text-sm text-base-content/60 space-y-2">
          <p>
            <strong>How it works:</strong>
          </p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Connect your Algorand TestNet wallet above</li>
            <li>Click "Request Weather" to initiate payment</li>
            <li>Sign the payment transaction when prompted</li>
            <li>The facilitator verifies and settles your payment on-chain</li>
            <li>Weather JSON data is returned and displayed here</li>
          </ol>
        </div>
      </div>
    </div>
  )
}

export default Weather
