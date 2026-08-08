// src/components/Home.tsx
import { useWallet } from '@txnlab/use-wallet-react'
import React, { useState } from 'react'
import ConnectWallet from './components/ConnectWallet'
import Weather from './components/Weather'

interface HomeProps {}

const Home: React.FC<HomeProps> = () => {
  const [openWalletModal, setOpenWalletModal] = useState<boolean>(false)
  const { activeAddress } = useWallet()

  const toggleWalletModal = () => {
    setOpenWalletModal(!openWalletModal)
  }

  return (
    <div className="hero min-h-screen bg-gradient-to-b from-teal-400 to-teal-600 p-4">
      <div className="hero-content w-full max-w-3xl flex flex-col gap-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-5xl font-bold text-white mb-2">x402 Demo</h1>
          <p className="text-lg text-teal-100">
            Pay-per-API on Algorand: Connect wallet, sign payment, get data
          </p>
        </div>

        {/* Wallet Connection Card */}
        <div className="card bg-white shadow-lg">
          <div className="card-body">
            <h2 className="card-title">Step 1: Connect Your Wallet</h2>
            <p className="text-base-content/70">
              Choose your Algorand TestNet wallet to get started. Make sure you have USDC available.
            </p>
            <button
              className="btn btn-primary w-full"
              onClick={toggleWalletModal}
              data-test-id="connect-wallet"
            >
              {activeAddress ? `Wallet Connected: ${activeAddress.slice(0, 12)}...` : 'Connect Wallet'}
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

        {/* Weather Demo */}
        {activeAddress && (
          <div className="card bg-white shadow-lg">
            <div className="card-body">
              <h2 className="card-title">Step 2: Request Weather Data</h2>
              <Weather />
            </div>
          </div>
        )}

        {/* Info Box */}
        {!activeAddress && (
          <div className="alert alert-info bg-white">
            <div>
              <span>💡 Connect your wallet above to start the demo and pay for weather data!</span>
            </div>
          </div>
        )}

        {/* Resources */}
        <div className="card bg-white shadow-lg">
          <div className="card-body">
            <h2 className="card-title text-lg">Resources</h2>
            <div className="space-y-2 text-sm">
              <a
                href="https://algorand.co/agentic-commerce/x402"
                target="_blank"
                rel="noopener noreferrer"
                className="link link-primary"
              >
                → Learn about x402
              </a>
              <a
                href="https://github.com/GoPlausible/.github/blob/main/profile/algorand-x402-documentation/typescript/x402-avm-paywall-examples.md"
                target="_blank"
                rel="noopener noreferrer"
                className="link link-primary"
              >
                → x402 Paywall Examples
              </a>
              <a
                href="https://facilitator.goplausible.xyz/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="link link-primary"
              >
                → Facilitator API Docs
              </a>
            </div>
          </div>
        </div>

        <ConnectWallet openModal={openWalletModal} closeModal={toggleWalletModal} />
      </div>
    </div>
  )
}

export default Home
