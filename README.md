# ⛓️ ChainTrust

**Blockchain-Powered Product Authentication & Anti-Counterfeiting Platform**

ChainTrust is a full-stack web application that leverages the Ethereum blockchain to provide an immutable, transparent supply chain verification system. Manufacturers register products on-chain, and consumers can instantly verify authenticity by scanning or entering a product ID.

---

## 🏗️ Architecture

```
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

- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/) (Package Manager)
- [Python](https://www.python.org/) (v3.11+) & [uv](https://docs.astral.sh/uv/) (for AI service)
- [MongoDB](https://www.mongodb.com/) (running locally or Atlas)
- [Ganache](https://trufflesuite.com/ganache/) (local blockchain for development)
- [MinIO](https://dl.min.io/community/server/minio/release/) (Local binary `minio.exe` is already provided in `./refs/`)
- [MetaMask](https://metamask.io/) (browser extension — optional for dev)

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/ChainTrust.git
cd ChainTrust
```

### 2. Setup Environment Variables

Copy the example files and fill in your values:

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env
```

### 3. Setup & Start Ganache (Local Blockchain)

Ganache provides a personal Ethereum blockchain for development. This project is configured to work with the **Ganache UI (Desktop Application)**.

1. **Download & Install:** Download Ganache from the [official website](https://trufflesuite.com/ganache/).
2. **Launch & Quickstart:** Open Ganache and select **"Quickstart"** (or create a New Workspace).
3. **Verify Port:**
   - Ganache UI typically defaults to port **`7545`** (which matches this project's configuration).
   - If your server is running on a different port, click the **Gear Icon (Settings)** in the top right.
   - Go to the **Server** tab and change the **Port Number** to `7545`, then click **Save and Restart**.
4. **Retrieve Private Key:**
   - In the **Accounts** tab, you will see 10 addresses.
   - Click the **Key Icon** on the right side of the first account.
   - **Copy the Private Key** and paste it into `backend/.env` under `PRIVATE_KEY`.

> **Connecting MetaMask to Ganache (Optional):**
>
> 1. Open MetaMask → Settings → Networks → Add Network
> 2. Fill in:
>    - **Network Name:** Ganache Local
>    - **RPC URL:** `http://127.0.0.1:7545`
>    - **Chain ID:** `1337`
>    - **Currency Symbol:** ETH
> 3. To use a Ganache account in MetaMask, click **Import Account** and paste the private key you copied from the Ganache UI.

### 4. Start Other Services

```bash
# MongoDB (default port 27017)
mongod

# MinIO (S3-compatible storage on port 9000, console on 9090)
./minio.exe server ./data --console-address :9090
```

### 4. Deploy the Smart Contract

This compiles `ChainTrust.sol`, deploys it to Ganache, and auto-updates your `.env` files with the new contract address.

```bash
cd backend
pnpm install
node scripts/deploy.js
```

### 5. Start the Backend

```bash
cd backend
pnpm install
pnpm dev
```

The backend API will be running at **http://localhost:5000**.

### 6. Start the Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

The frontend will be running at **http://localhost:3000**.

### 7. Start the AI Service (Optional)

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
