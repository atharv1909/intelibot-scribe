import { SupportedWallet, WalletId, WalletManager, WalletProvider } from '@txnlab/use-wallet-react'
import { SnackbarProvider } from 'notistack'
import { useState } from 'react'
import Home from './Home'
import MemeHome from './MemeHome'
import { getAlgodConfigFromViteEnvironment, getKmdConfigFromViteEnvironment } from './utils/network/getAlgoClientConfigs'

let supportedWallets: SupportedWallet[]
if (import.meta.env.VITE_ALGOD_NETWORK === 'localnet') {
  const kmdConfig = getKmdConfigFromViteEnvironment()
  supportedWallets = [
    {
      id: WalletId.KMD,
      options: {
        baseServer: kmdConfig.server,
        token: String(kmdConfig.token),
        port: String(kmdConfig.port),
      },
    },
  ]
} else {
  supportedWallets = [
    { id: WalletId.DEFLY },
    { id: WalletId.PERA },
    { id: WalletId.EXODUS },
    { id: WalletId.LUTE}
  ]
}

type TabType = 'weather' | 'meme'

export default function App() {
  const algodConfig = getAlgodConfigFromViteEnvironment()
  const [activeTab, setActiveTab] = useState<TabType>('weather')

  const walletManager = new WalletManager({
    wallets: supportedWallets,
    defaultNetwork: algodConfig.network,
    networks: {
      [algodConfig.network]: {
        algod: {
          baseServer: algodConfig.server,
          port: algodConfig.port,
          token: String(algodConfig.token),
        },
      },
    },
    options: {
      resetNetwork: true,
    },
  })

  return (
    <SnackbarProvider maxSnack={3}>
      <WalletProvider manager={walletManager}>
        <div className="min-h-screen">
          {/* Tab Navigation */}
          <div className="bg-white shadow-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex space-x-1">
                <button
                  onClick={() => setActiveTab('weather')}
                  className={`px-6 py-4 font-semibold transition-all ${
                    activeTab === 'weather'
                      ? 'text-teal-600 border-b-4 border-teal-600 bg-teal-50'
                      : 'text-gray-600 hover:text-teal-600 hover:bg-gray-50'
                  }`}
                >
                  🌤️ Weather Demo
                </button>
                <button
                  onClick={() => setActiveTab('meme')}
                  className={`px-6 py-4 font-semibold transition-all ${
                    activeTab === 'meme'
                      ? 'text-purple-600 border-b-4 border-purple-600 bg-purple-50'
                      : 'text-gray-600 hover:text-purple-600 hover:bg-gray-50'
                  }`}
                >
                  🎨 Meme Generator
                </button>
              </div>
            </div>
          </div>

          {/* Tab Content */}
          <div className="transition-all duration-300">
            {activeTab === 'weather' && <Home />}
            {activeTab === 'meme' && <MemeHome />}
          </div>
        </div>
      </WalletProvider>
    </SnackbarProvider>
  )
}
