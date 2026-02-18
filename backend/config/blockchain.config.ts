import dotenv from 'dotenv';
dotenv.config();

export const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:7545';
export const WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY || ''; // Must be set in .env
export const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '0x5D719d78c1Ab55B00ba07f40D7EC19457493A3D9'; // Default from ref, but should be env
