import fs from 'fs';
import path from 'path';
import { Web3 } from 'web3';
import solc from 'solc';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Setup __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:7545';
const web3 = new Web3(RPC_URL);

/**
 * Utility to update .env files robustly
 */
function updateEnvFile(filePath, updates) {
    let content = '';
    if (fs.existsSync(filePath)) {
        content = fs.readFileSync(filePath, 'utf8');
    }

    for (const [key, value] of Object.entries(updates)) {
        const regex = new RegExp(`^${key}\\s*=.*$`, 'm');
        if (content.match(regex)) {
            content = content.replace(regex, `${key}=${value}`);
        } else {
            content += content.endsWith('\n') || content === '' ? `${key}=${value}\n` : `\n${key}=${value}\n`;
        }
    }

    fs.writeFileSync(filePath, content);
}

async function deploy() {
    console.log('--- Starting Deployment ---');
    
    let deployer;
    const privateKey = process.env.PRIVATE_KEY;

    if (privateKey && privateKey !== 'your_private_key_here') {
        const account = web3.eth.accounts.privateKeyToAccount(privateKey);
        web3.eth.accounts.wallet.add(account);
        deployer = account.address;
        console.log('Using Private Key for Deployment.');
    } else {
        const accounts = await web3.eth.getAccounts();
        deployer = accounts[0];
        console.log('Using Local Node Account for Deployment.');
    }

    console.log('Deployer Account:', deployer);

    // Read Contract File
    const contractPath = path.join(__dirname, '../contracts/ChainTrust.sol');
    const source = fs.readFileSync(contractPath, 'utf8');

    // Compile Contract
    const input = {
        language: 'Solidity',
        sources: {
            'ChainTrust.sol': {
                content: source,
            },
        },
        settings: {
            evmVersion: 'paris',
            outputSelection: {
                '*': {
                    '*': ['abi', 'evm.bytecode'],
                },
            },
        },
    };

    console.log('Compiling contract with Paris EVM version...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
        output.errors.forEach((err) => {
            console.error(err.formattedMessage);
        });
        if (Object.values(output.errors).some(err => err.severity === 'error')) {
            throw new Error('Compilation failed');
        }
    }

    const contractData = output.contracts['ChainTrust.sol']['ChainTrust'];
    const abi = contractData.abi;
    const bytecode = contractData.evm.bytecode.object;

    // --- DEPLOYMENT ARTIFACTS ---
    const rootDir = path.join(__dirname, '../../');
    const contractsDir = path.join(__dirname, '../contracts'); // backend/contracts
    if (!fs.existsSync(contractsDir)) fs.mkdirSync(contractsDir, { recursive: true });

    // 1. Backend Record (Source of truth for backend)
    fs.writeFileSync(path.join(contractsDir, 'ChainTrust.json'), JSON.stringify(abi, null, 2));
    console.log('ABI saved to backend/contracts/ChainTrust.json');

    // 2. Frontend Sync (Required for frontend build)
    const frontendTarget = path.join(rootDir, 'frontend/api/ChainTrust.json');
    fs.writeFileSync(frontendTarget, JSON.stringify(abi, null, 2));
    console.log('ABI synced to frontend/api/ChainTrust.json');

    // Deploy Contract
    console.log('Deploying to blockchain...');
    const contract = new web3.eth.Contract(abi);
    const deployTx = contract.deploy({ data: '0x' + bytecode });

    try {
        const deployedInstance = await deployTx.send({
            from: deployer,
            gas: '5000000',
        });

        const address = deployedInstance.options.address;
        console.log('--- Deployment Successful! ---');
        console.log('Contract Address:', address);

        // 3. Save Metadata to backend/contracts
        const metadata = {
            contractAddress: address,
            deployer: deployer,
            network: RPC_URL,
            timestamp: new Date().toISOString(),
        };
        fs.writeFileSync(
            path.join(contractsDir, 'metadata.json'),
            JSON.stringify(metadata, null, 2)
        );
        console.log('Deployment metadata saved to backend/contracts/metadata.json');

        // 4. Update frontend .env
        const frontendEnvPath = path.join(rootDir, 'frontend/.env');
        updateEnvFile(frontendEnvPath, {
            'NEXT_PUBLIC_CONTRACT_ADDRESS': address,
            'NEXT_PUBLIC_RPC_URL': RPC_URL
        });
        console.log(`Updated frontend/.env`);

    } catch (error) {
        console.error('Deployment failed:', error);
    }
}

deploy();
