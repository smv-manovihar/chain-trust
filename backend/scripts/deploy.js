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
    console.log(`Connecting to network: ${RPC_URL}`);
    
    let deployer;
    const privateKey = process.env.PRIVATE_KEY;

    // Detect if we are likely on a public network vs local Ganache
    const isLocalNetwork = RPC_URL.includes('127.0.0.1') || RPC_URL.includes('localhost');

    if (privateKey && privateKey !== 'your_private_key_here') {
        const account = web3.eth.accounts.privateKeyToAccount(privateKey);
        web3.eth.accounts.wallet.add(account);
        deployer = account.address;
        console.log('Wallet configured via Private Key.');
    } else if (isLocalNetwork) {
        const accounts = await web3.eth.getAccounts();
        deployer = accounts[0];
        console.log('Wallet configured via Local Node Account (Ganache).');
    } else {
        throw new Error('CRITICAL: Private key is required for deploying to public networks!');
    }

    console.log('Deployer Account:', deployer);

    // Get current deployer balance for safety check
    const balanceWei = await web3.eth.getBalance(deployer);
    console.log(`Deployer Balance: ${web3.utils.fromWei(balanceWei, 'ether')} ETH`);

    // --- COMPILATION ---
    const contractPath = path.join(__dirname, '../contracts/ChainTrust.sol');
    if (!fs.existsSync(contractPath)) throw new Error(`Contract not found at ${contractPath}`);
    const source = fs.readFileSync(contractPath, 'utf8');

    const input = {
        language: 'Solidity',
        sources: { 'ChainTrust.sol': { content: source } },
        settings: {
            evmVersion: 'paris',
            optimizer: { enabled: true, runs: 200 }, // Added optimizer for cheaper gas deployments
            outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } },
        },
    };

    console.log('Compiling contract...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
        let hasFatalError = false;
        output.errors.forEach((err) => {
            console[err.severity === 'error' ? 'error' : 'warn'](err.formattedMessage);
            if (err.severity === 'error') hasFatalError = true;
        });
        if (hasFatalError) throw new Error('Compilation failed. See errors above.');
    }

    const contractData = output.contracts['ChainTrust.sol']['ChainTrust'];
    const abi = contractData.abi;
    const bytecode = contractData.evm.bytecode.object;

    // --- ARTIFACT MANAGEMENT ---
    const rootDir = path.join(__dirname, '../../');
    const contractsDir = path.join(__dirname, '../contracts'); 
    const frontendTargetDir = path.join(rootDir, 'frontend/api');

    if (!fs.existsSync(contractsDir)) fs.mkdirSync(contractsDir, { recursive: true });
    if (!fs.existsSync(frontendTargetDir)) fs.mkdirSync(frontendTargetDir, { recursive: true });

    fs.writeFileSync(path.join(contractsDir, 'ChainTrust.json'), JSON.stringify(abi, null, 2));
    fs.writeFileSync(path.join(frontendTargetDir, 'ChainTrust.json'), JSON.stringify(abi, null, 2));
    console.log('ABI artifacts saved and synced to frontend.');

    // --- DEPLOYMENT PREPARATION ---
    console.log('Preparing deployment transaction...');
    const contract = new web3.eth.Contract(abi);
    const deployTx = contract.deploy({ data: '0x' + bytecode });

    try {
        // 1. Dynamic Gas Estimation
        const estimatedGas = await deployTx.estimateGas({ from: deployer });
        // Add a 10% safety buffer to the estimated gas
        const gasLimit = (BigInt(estimatedGas) * 110n) / 100n; 

        // 2. Dynamic Network Fees (EIP-1559)
        const feeData = await web3.eth.calculateFeeData();
        
        console.log(`Estimated Gas: ${estimatedGas} (Limit set to ${gasLimit})`);

        // --- EXECUTE DEPLOYMENT ---
        console.log('Broadcasting to blockchain (Waiting for confirmations)...');
        const deployedInstance = await deployTx.send({
            from: deployer,
            gas: gasLimit.toString(),
            maxFeePerGas: feeData.maxFeePerGas,
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
        })
        .on('transactionHash', (hash) => {
            console.log(`\n[Pending] Transaction Hash: ${hash}`);
            console.log(`You can track this on the block explorer.`);
        })
        .on('receipt', (receipt) => {
            console.log(`[Mined] Block Number: ${receipt.blockNumber}`);
            console.log(`[Mined] Gas Used: ${receipt.gasUsed}`);
        });

        const address = deployedInstance.options.address;
        console.log('\n--- Deployment Successful! ---');
        console.log('Contract Address:', address);

        // --- METADATA & ENV SYNC ---
        const metadata = {
            contractAddress: address,
            deployer: deployer,
            network: RPC_URL,
            timestamp: new Date().toISOString(),
        };
        fs.writeFileSync(path.join(contractsDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
        
        const frontendEnvPath = path.join(rootDir, 'frontend/.env');
        const backendEnvPath = path.join(rootDir, 'backend/.env');

        updateEnvFile(frontendEnvPath, {
            'NEXT_PUBLIC_CONTRACT_ADDRESS': address,
            'NEXT_PUBLIC_RPC_URL': RPC_URL
        });

        updateEnvFile(backendEnvPath, {
            'CONTRACT_ADDRESS': address,
            'RPC_URL': RPC_URL
        });
        console.log('Metadata and both .env files successfully updated.');

    } catch (error) {
        console.error('\n❌ Deployment failed:');
        console.error(error.message || error);
        process.exit(1);
    }
}

deploy();