import React, { useState, useEffect } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { createX402Fetch } from '../utils/memeApi'

interface MemeStyles {
  styles: string[]
  themes: string[]
  visualStyles: string[]
  enhancementRules: string[]
  models: {
    available: string[]
    primary: string
    descriptions: Record<string, string>
  }
}

const MemeGenerator: React.FC = () => {
  const { activeAddress, signTransactions } = useWallet()
  const [loading, setLoading] = useState(false)
  const [memeData, setMemeData] = useState<any>(null)
  const [error, setError] = useState<string>('')
  const [paymentStatus, setPaymentStatus] = useState('')
  const [availableStyles, setAvailableStyles] = useState<MemeStyles | null>(null)

  // Form state
  const [prompt, setPrompt] = useState('')
  const [selectedStyle, setSelectedStyle] = useState('')
  const [selectedTheme, setSelectedTheme] = useState('')
  const [selectedVisualStyle, setSelectedVisualStyle] = useState('')
  const [useMultiModel, setUseMultiModel] = useState(false)

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4021'

  // Fetch available styles on mount (free endpoint)
  useEffect(() => {
    fetch(`${apiBaseUrl}/meme-styles`)
      .then(res => res.json())
      .then(data => setAvailableStyles(data))
      .catch(err => console.error('Failed to fetch styles:', err))
  }, [apiBaseUrl])

  const handleGenerateMeme = async () => {
    if (!activeAddress) {
      setError('Please connect your wallet first')
      return
    }

    if (!signTransactions) {
      setError('Wallet does not support transaction signing')
      return
    }

    if (!prompt.trim()) {
      setError('Please enter a meme prompt')
      return
    }

    setLoading(true)
    setError('')
    setPaymentStatus('')
    setMemeData(null)

    try {
      setPaymentStatus('Initializing payment...')

      const signer = {
        address: activeAddress,
        signTransactions: signTransactions,
      }

      setPaymentStatus('Processing payment (0.1 USDC)...')
      
      const fetchFn = await createX402Fetch(signer)
      const response = await fetchFn(`${apiBaseUrl}/meme-generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          style: selectedStyle || undefined,
          theme: selectedTheme || undefined,
          visualStyle: selectedVisualStyle || undefined,
          useMultiModel: useMultiModel,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success) {
        setPaymentStatus('Payment settled! Meme generated!')
        setMemeData(data)
        setTimeout(() => setPaymentStatus(''), 3000)
      } else {
        throw new Error(data.details || 'Failed to generate meme')
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMsg)
      setPaymentStatus('')
      console.error('Meme generation error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title text-2xl">🎨 AI Meme Generator</h2>
        <p className="text-base-content/70">
          Generate custom memes using AI - Pay 0.1 USDC per generation
        </p>

        {/* Wallet Status */}
        <div className="alert alert-info">
          <div>
            <span>
              💰 Cost: <span className="font-bold">0.1 USDC</span> per meme generation
            </span>
          </div>
        </div>

        {/* Prompt Input */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold">Meme Prompt *</span>
          </label>
          <textarea
            className="textarea textarea-bordered h-24"
            placeholder="e.g., When you finally fix that bug at 3 AM"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={loading}
          />
        </div>

        {/* Style Selection */}
        {availableStyles && (
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Meme Style (optional)</span>
            </label>
            <select
              className="select select-bordered"
              value={selectedStyle}
              onChange={(e) => setSelectedStyle(e.target.value)}
              disabled={loading}
            >
              <option value="">Auto-detect</option>
              {availableStyles.styles.map(style => (
                <option key={style} value={style}>{style}</option>
              ))}
            </select>
          </div>
        )}

        {/* Theme Selection */}
        {availableStyles && (
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Theme (optional)</span>
            </label>
            <select
              className="select select-bordered"
              value={selectedTheme}
              onChange={(e) => setSelectedTheme(e.target.value)}
              disabled={loading}
            >
              <option value="">General</option>
              {availableStyles.themes.map(theme => (
                <option key={theme} value={theme}>{theme}</option>
              ))}
            </select>
          </div>
        )}

        {/* Visual Style Selection */}
        {availableStyles && availableStyles.visualStyles && (
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Visual Style (optional)</span>
            </label>
            <select
              className="select select-bordered"
              value={selectedVisualStyle}
              onChange={(e) => setSelectedVisualStyle(e.target.value)}
              disabled={loading}
            >
              <option value="">Default</option>
              {availableStyles.visualStyles.map(vstyle => (
                <option key={vstyle} value={vstyle}>{vstyle}</option>
              ))}
            </select>
          </div>
        )}

        {/* Multi-Model Toggle */}
        <div className="form-control">
          <label className="label cursor-pointer">
            <span className="label-text">
              <span className="font-semibold">🔄 Multi-Model Generation</span>
              <span className="text-xs block text-base-content/60">Use multiple AI models for best results (slower but higher quality)</span>
            </span>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={useMultiModel}
              onChange={(e) => setUseMultiModel(e.target.checked)}
              disabled={loading}
            />
          </label>
        </div>

        {/* Generate Button */}
        <button
          className={`btn btn-primary btn-lg ${loading ? 'loading' : ''}`}
          onClick={handleGenerateMeme}
          disabled={!activeAddress || loading || !prompt.trim()}
        >
          {loading ? 'Generating...' : '🎨 Generate Meme (Pay 0.1 USDC)'}
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

        {/* Generated Meme Display */}
        {memeData && memeData.success && (
          <div className="space-y-4">
            <div className="alert alert-success">
              <div>
                <span>✓ Meme generated successfully!</span>
              </div>
            </div>

            {/* Meme Image */}
            <div className="card bg-base-200">
              <figure className="px-4 pt-4">
                <img
                  src={memeData.meme.imageUrl}
                  alt="Generated Meme"
                  className="rounded-xl max-w-full h-auto"
                />
              </figure>
              <div className="card-body">
                <h3 className="card-title text-sm">Your Meme</h3>
                <div className="text-xs space-y-1">
                  <p><strong>Your Prompt:</strong> {memeData.meme.prompt}</p>
                  {memeData.meme.generatedText && (
                    <div className="bg-base-300 p-2 rounded mt-2">
                      <p className="text-success font-bold">✨ AI Generated Text:</p>
                      <p><strong>Top:</strong> {memeData.meme.generatedText.topText}</p>
                      <p><strong>Bottom:</strong> {memeData.meme.generatedText.bottomText}</p>
                      <p className="text-xs text-base-content/60 mt-1">{memeData.meme.generatedText.explanation}</p>
                    </div>
                  )}
                  <p><strong>Style:</strong> {memeData.meme.style}</p>
                  <p><strong>Theme:</strong> {memeData.meme.theme}</p>
                  {memeData.meme.visualStyle && <p><strong>Visual:</strong> {memeData.meme.visualStyle}</p>}
                  <p><strong>Model:</strong> {memeData.metadata.model}</p>
                  {memeData.metadata.multiModel && <p className="text-success"><strong>🔄 Multi-Model Used</strong></p>}
                  {memeData.metadata.textOverlay && <p className="text-success"><strong>✏️ Perfect Text Overlay</strong></p>}
                </div>
                <div className="card-actions justify-end">
                  <a
                    href={memeData.meme.imageUrl}
                    download={`meme-${Date.now()}.png`}
                    className="btn btn-sm btn-primary"
                  >
                    Download
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="text-sm text-base-content/60 space-y-2 mt-4">
          <p><strong>How it works:</strong></p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Enter your meme idea in the prompt field</li>
            <li>Optionally select a style and theme</li>
            <li>Click Generate to pay 0.1 USDC via x402</li>
            <li>Sign the payment transaction</li>
            <li>AI generates your custom meme using Hugging Face + RAG</li>
            <li>Download and share your meme!</li>
          </ol>
          <div className="badge badge-outline mt-2">RAG-Enhanced</div>
          <div className="badge badge-outline mt-2 ml-2">Hugging Face Powered</div>
        </div>
      </div>
    </div>
  )
}

export default MemeGenerator
