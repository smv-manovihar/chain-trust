# ⛓️ Chain Trust

**Blockchain-Powered Product Authentication & Anti-Counterfeiting Platform**

Chain Trust is a full-stack web application that leverages the Ethereum blockchain to provide an immutable, transparent supply chain verification system. Manufacturers register products on-chain, and consumers can instantly verify authenticity by scanning or entering a product ID.

---

## 🏗️ Architecture

```text
ChainTrust/
├── frontend/         → Next.js 16 (React 19, TailwindCSS, Web3.js)
├── backend/          → Express 5 (TypeScript, MongoDB, Nodemailer)
├── ai-service/       → FastAPI (Python, LangChain, OpenRouter)
└── backend/contracts → Solidity Smart Contract (ChainTrust.sol)
```

| Layer          | Tech                          | Purpose                              |
| :------------- | :---------------------------- | :----------------------------------- |
| **Frontend**   | Next.js, TailwindCSS, Web3.js | User interface, wallet interaction   |
| **Backend**    | Express, TypeScript, Mongoose | REST API, auth, product CRUD         |
| **AI Service** | FastAPI, LangChain            | AI-powered medical assistant chatbot |
| **Blockchain** | Solidity, Web3.js             | Immutable product registration       |
| **Database**   | MongoDB                       | User accounts, product metadata      |
| **Storage**    | MinIO (S3-compatible)         | Product images and assets            |

---

## ✅ Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/)
- [pnpm](https://pnpm.io/) (Package Manager)
- [Python](https://www.python.org/) (v3.11+) & [uv](https://docs.astral.sh/uv/) (for AI service)
- [MongoDB](https://www.mongodb.com/) (running locally or Atlas)
- [Ganache](https://trufflesuite.com/ganache/) (local blockchain for development)
- [MinIO](https://dl.min.io/community/server/minio/release/)
- [MetaMask](https://metamask.io/) (browser extension — required for UI transactions)

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone [https://github.com/smv-manovihar/chain-trust.git](https://github.com/smv-manovihar/chain-trust.git)
cd chain-trust
```

### 2. Setup Environment Variables

Copy the example files. Most values for the blockchain will be **automatically populated** by the deployment script later.

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env
```

> [!NOTE] 
> You only need to manually add the `PRIVATE_KEY` (Step 3) and any external API keys (Google, Email, etc.). The `CONTRACT_ADDRESS` and `RPC_URL` are handled by `deploy.js`.

### 3. Start Ganache (Local Blockchain)

Ganache provides a personal Ethereum blockchain for development. This project is configured to work with the **Ganache UI (Desktop Application)**.

1. **Launch & Quickstart:** Open Ganache and select **"Quickstart"**.
2. **Verify Port:** The app defaults to port **`7545`**.
   - _If your server is running on a different port, click the Gear Icon (Settings) -> Server tab -> Change Port Number to `7545` -> Save and Restart._
3. **Retrieve Deployer Key:** In the Accounts tab, click the Key Icon next to the **first account (Index 0)**. Copy this Private Key and paste it into `backend/.env` under `PRIVATE_KEY`.

### 4. Deploy the Smart Contract (Initial Setup)

Before starting the main app, you **must** deploy the smart contract. This compiles `ChainTrust.sol`, deploys it to Ganache, and **automatically configures your `.env` files** with the new address.

```bash
cd backend
pnpm install
node scripts/deploy.js
```

### 5. MetaMask Configuration (Crucial for Local Dev)

To interact with the local blockchain through the frontend, MetaMask must be configured correctly.

1. **Add the Local Network:**
   - Open MetaMask -> Go to settings -> Click the Networks -> **Add Custom Network**.
   - **Network Name:** Ganache Local
   - **New RPC URL:** `http://127.0.0.1:7545`
   - **Chain ID:** `1337`
   - **Currency Symbol:** ETH
   - Click **Save** and switch to this network.

2. **Import the Ganache Account (Deployer/Manufacturer):**
   - Click the **Account Circle Icon** (top right) -> **Import Account**.
   - Paste the **Private Key** you copied from Ganache (Step 3.3).
   - Click **Import**. You now have the funds needed to register products.

3. **The "Nonce" Reset (Fixing Stuck Transactions):**
   - If transactions fail silently or get stuck pending after a Ganache restart, go to MetaMask **Settings -> Advanced -> Clear activity tab data** to reset the internal counter.

### 6. Start the Services

Now that the contract is deployed and configured, you can start the backend and frontend.

```bash
# Terminal 1: MongoDB & MinIO
mongod
./minio.exe server ./data --console-address :9090

# Terminal 2: Backend
cd backend
pnpm dev

# Terminal 3: Frontend
cd frontend
pnpm dev
```

The frontend will be running at **http://localhost:3000**.

### 9. Start the AI Service (Optional)

```bash
cd ai-service
uv sync
uv run main.py
```

The AI service will be running at **http://localhost:8000**.

---

## 🔑 Environment Variables

### Backend (`backend/.env`)

| Variable               | Description                              |
| :--------------------- | :--------------------------------------- |
| `PORT`                 | Server port (default: `5000`)            |
| `MONGODB_ADMIN_URI`    | MongoDB connection string                |
| `JWT_SECRET`           | Secret key for JWT tokens                |
| `FRONTEND_URL`         | Frontend URL for CORS                    |
| `EMAIL_HOST`           | SMTP host (e.g. Brevo)                   |
| `EMAIL_USER`           | SMTP username                            |
| `EMAIL_PASS`           | SMTP password                            |
| `EMAIL_FROM`           | Sender email address                     |
| `GOOGLE_CLIENT_ID`     | Google OAuth client ID                   |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret               |
| `CONTRACT_ADDRESS`     | Deployed smart contract address          |
| `RPC_URL`              | Blockchain RPC endpoint                  |
| `PRIVATE_KEY`          | Wallet private key (for deployment only) |
| `S3_ENDPOINT`          | S3/MinIO endpoint                        |
| `S3_ACCESS_KEY`        | S3 access key                            |
| `S3_SECRET_KEY`        | S3 secret key                            |
| `OPENROUTER_API_KEY`   | API key for AI service                   |

### Frontend (`frontend/.env`)

| Variable                       | Description             |
| :----------------------------- | :---------------------- |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth client ID  |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | Smart contract address  |
| `NEXT_PUBLIC_RPC_URL`          | Blockchain RPC endpoint |
| `NEXT_PUBLIC_API_URL`          | Backend API base URL    |

---

## 🧪 How It Works

1. **Manufacturer** logs in, fills out a product form, and submits it.
2. The frontend calls the **smart contract** via MetaMask to register the product on-chain.
3. The blockchain returns a **transaction hash** (digital receipt).
4. The frontend sends the product data + hash to the **backend API**.
5. The backend saves everything in **MongoDB** for fast lookups.
6. A **consumer** enters a Product ID on the verification page.
7. The app checks both the **blockchain** (for trust) and the **database** (for details) to confirm authenticity.

---

## 📄 License

This project is for educational and development purposes.

