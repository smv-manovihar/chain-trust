import dotenv from 'dotenv';
dotenv.config();

export const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:7545';
export const WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY || ''; // Must be set in .env
export const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '0xfC6617A16Ff9f9AE967D51247Ab3540727215141'; // Synced with frontend default
