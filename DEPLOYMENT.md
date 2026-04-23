# Deployment Guide: AgroLedger

This project is a decentralized agricultural traceability platform. It consists of a Solidity smart contract and a React frontend.

## 1. Smart Contract Deployment (Hardhat)

The smart contract `FarmTrace.sol` is located in the `blockchain` directory.

### Prerequisites
- Node.js 22+ (Recommended)
- A Sepolia RPC URL (from Alchemy or Infura)
- A private key for the deployment account

### Steps
1. Navigate to the blockchain directory:
   ```bash
   cd blockchain
   ```
2. Create a `.env` or use Hardhat variables:
   - `SEPOLIA_RPC_URL`: Your RPC URL
   - `SEPOLIA_PRIVATE_KEY`: Your private key
3. Deploy the contract:
   ```bash
   npx hardhat ignition deploy ./ignition/modules/FarmTrace.ts --network sepolia
   ```
4. **Important**: Copy the deployed contract address from the terminal output.

## 2. Frontend Deployment (Vite)

The frontend is located in the `frontend` directory.

### Prerequisites
- The deployed contract address from the previous step.

### Steps
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Update the `.env` file:
   ```env
   VITE_CONTRACT_ADDRESS=0xYourDeployedContractAddress
   VITE_NETWORK_RPC=https://rpc.sepolia.org
   ```
3. Build the frontend:
   ```bash
   npm run build
   ```
4. Deploy the `dist` folder to your preferred hosting provider:
   - **Vercel**: Import the repository and set the `Root Directory` to `farmTrace/frontend`. Add environment variables in the Vercel dashboard.
   - **Netlify**: Similar to Vercel, set the build command to `npm run build` and publish directory to `dist`.

## 3. Local Development

To run the project locally for testing:

- **Blockchain**: `npx hardhat node`
- **Frontend**: `npm run dev` (Ensure `.env` points to your local node if testing locally)

---

**Note**: The frontend has a built-in fallback to mock data if no contract address is provided, allowing for UI/UX testing without a wallet.
