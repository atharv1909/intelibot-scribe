#!/bin/bash

# X402 Meme Generator - Quick Setup Script

echo "🎨 X402 Meme Generator Setup"
echo "================================"
echo ""

# Check if .env exists in server
if [ ! -f "x402-demo-server/.env" ]; then
    echo "⚠️  Creating server .env file..."
    cp x402-demo-server/.env.meme-generator x402-demo-server/.env
    echo "✓ Created .env file from template"
    echo ""
    echo "🔑 IMPORTANT: Edit x402-demo-server/.env and add:"
    echo "   1. Your AVM_ADDRESS (Algorand wallet address)"
    echo "   2. Your HUGGINGFACE_API_KEY (get from https://huggingface.co/settings/tokens)"
    echo ""
else
    echo "✓ Server .env file already exists"
fi

# Check if Hugging Face key is set
if grep -q "hf_YOUR_API_KEY_HERE" x402-demo-server/.env 2>/dev/null; then
    echo "⚠️  WARNING: HUGGINGFACE_API_KEY not configured!"
    echo "   Get your free API key from: https://huggingface.co/settings/tokens"
    echo ""
fi

# Check if AVM address is set
if grep -q "YOUR_ALGORAND_ADDRESS_HERE" x402-demo-server/.env 2>/dev/null; then
    echo "⚠️  WARNING: AVM_ADDRESS not configured!"
    echo "   Add your Algorand TestNet wallet address"
    echo ""
fi

# Install server dependencies
echo "📦 Installing server dependencies..."
cd x402-demo-server
npm install
cd ..
echo "✓ Server dependencies installed"
echo ""

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd X402-Usecase/projects/X402-Usecase
npm install
cd ../../..
echo "✓ Frontend dependencies installed"
echo ""

# Create frontend .env if needed
if [ ! -f "X402-Usecase/projects/X402-Usecase/.env" ]; then
    echo "Creating frontend .env..."
    cat > X402-Usecase/projects/X402-Usecase/.env << EOF
VITE_API_BASE_URL=http://localhost:4021
VITE_APP_MODE=meme
VITE_ALGOD_NETWORK=testnet
EOF
    echo "✓ Created frontend .env"
fi

echo ""
echo "================================"
echo "✅ Setup Complete!"
echo "================================"
echo ""
echo "Next steps:"
echo ""
echo "1. Configure your environment:"
echo "   - Edit x402-demo-server/.env"
echo "   - Add HUGGINGFACE_API_KEY"
echo "   - Add AVM_ADDRESS"
echo ""
echo "2. Start the server:"
echo "   cd x402-demo-server"
echo "   npm start"
echo ""
echo "3. Start the frontend (in new terminal):"
echo "   cd X402-Usecase/projects/X402-Usecase"
echo "   npm run dev"
echo ""
echo "4. Open http://localhost:5173 in your browser"
echo ""
echo "📚 Read MEME_GENERATOR_README.md for detailed instructions"
echo ""
