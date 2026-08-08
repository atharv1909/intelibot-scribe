import { useWallet } from '@txnlab/use-wallet-react'
import React, { useState } from 'react'
import ConnectWallet from './components/ConnectWallet'
import MemeGenerator from './components/MemeGenerator'

const MemeHome: React.FC = () => {
  const [openWalletModal, setOpenWalletModal] = useState<boolean>(false)
  const { activeAddress } = useWallet()

  const toggleWalletModal = () => {
    setOpenWalletModal(!openWalletModal)
  }

  return (
    <div className="hero min-h-screen bg-gradient-to-b from-purple-400 via-pink-500 to-red-500 p-4">
      <div className="hero-content w-full max-w-4xl flex flex-col gap-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-6xl font-bold text-white mb-2">🎨 Meme Factory</h1>
          <p className="text-xl text-white/90">
            AI-Powered Meme Generation on Algorand x402
          </p>
          <p className="text-md text-white/80 mt-2">
            RAG-Enhanced • Hugging Face • 0.1 USDC per meme
          </p>
        </div>

        {/* Wallet Connection Card */}
        <div className="card bg-white shadow-2xl">
          <div className="card-body">
            <h2 className="card-title">Step 1: Connect Your Wallet</h2>
            <p className="text-base-content/70">
              Connect your Algorand TestNet wallet with USDC to start generating memes.
            </p>
            <button
              className="btn btn-primary w-full"
              onClick={toggleWalletModal}
              data-test-id="connect-wallet"
            >
              {activeAddress ? `✓ ${activeAddress.slice(0, 12)}...` : 'Connect Wallet'}
            </button>
            {activeAddress && (
              <div className="alert alert-success mt-4">
                <div>
                  <span>✓ Wallet connected successfully</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Meme Generator */}
        {activeAddress && (
          <div className="card bg-white shadow-2xl">
            <div className="card-body">
              <h2 className="card-title">Step 2: Generate Your Meme</h2>
              <MemeGenerator />
            </div>
          </div>
        )}

        {/* Info Box */}
        {!activeAddress && (
          <div className="alert alert-info bg-white shadow-lg">
            <div>
              <span>💡 Connect your wallet to start generating AI-powered memes!</span>
            </div>
          </div>
        )}

        {/* Features */}
        <div className="card bg-white shadow-2xl">
          <div className="card-body">
            <h2 className="card-title text-lg">✨ Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-2xl">🤖</span>
                <div>
                  <strong>AI-Powered</strong>
                  <p className="text-base-content/70">Hugging Face FLUX model for high-quality generation</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-2xl">🧠</span>
                <div>
                  <strong>RAG-Enhanced</strong>
                  <p className="text-base-content/70">Custom context layer for better meme outputs</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-2xl">💰</span>
                <div>
                  <strong>Micro-Payments</strong>
                  <p className="text-base-content/70">Pay only 0.1 USDC per generation via x402</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-2xl">⚡</span>
                <div>
                  <strong>Fast & Dynamic</strong>
                  <p className="text-base-content/70">Real-time generation with blockchain payments</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Resources */}
        <div className="card bg-white shadow-2xl">
          <div className="card-body">
            <h2 className="card-title text-lg">📚 Developer Resources</h2>
            <div className="space-y-2 text-sm">
              <a
                href="https://algorand.co/agentic-commerce/x402"
                target="_blank"
                rel="noopener noreferrer"
                className="link link-primary"
              >
                → Learn about x402 Protocol
              </a>
              <a
                href="https://huggingface.co/"
                target="_blank"
                rel="noopener noreferrer"
                className="link link-primary"
              >
                → Hugging Face Models
              </a>
              <a
                href="http://localhost:4021/info"
                target="_blank"
                rel="noopener noreferrer"
                className="link link-primary"
              >
                → API Endpoints Info
              </a>
            </div>
          </div>
        </div>

        <ConnectWallet openModal={openWalletModal} closeModal={toggleWalletModal} />
      </div>
    </div>
  )
}

export default MemeHome
