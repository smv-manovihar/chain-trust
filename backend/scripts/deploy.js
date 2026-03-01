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

async function deploy() {
    console.log('--- Starting Deployment ---');
    const accounts = await web3.eth.getAccounts();
    const deployer = accounts[0];
    console.log('Deployer Account:', deployer);

    // Read Contract File
    const contractPath = path.join(__dirname, '../../contracts/ChainTrust.sol');
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

    // Save ABI to backend/abis/ChainTrust.json
    const abiDir = path.join(__dirname, '../abis');
    if (!fs.existsSync(abiDir)) fs.mkdirSync(abiDir, { recursive: true });
    fs.writeFileSync(
        path.join(abiDir, 'ChainTrust.json'),
        JSON.stringify(abi, null, 2)
    );
    console.log('ABI saved to backend/abis/ChainTrust.json');

    // Save ABI to frontend/abis/ChainTrust.json
    const frontendAbiDir = path.join(__dirname, '../../frontend/abis');
    if (!fs.existsSync(frontendAbiDir)) fs.mkdirSync(frontendAbiDir, { recursive: true });
    fs.writeFileSync(
        path.join(frontendAbiDir, 'ChainTrust.json'),
        JSON.stringify(abi, null, 2)
    );
    console.log('ABI also saved to frontend/abis/ChainTrust.json');
    console.log('ABI saved to backend/abis/ChainTrust.json');

    // Deploy Contract
    console.log('Deploying to Ganache...');
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

        // Update .env with new address (simple append/replace logic)
        const envPath = path.join(__dirname, '../.env');
        let envContent = fs.readFileSync(envPath, 'utf8');
        const addressKey = 'CONTRACT_ADDRESS';
        
        if (envContent.includes(addressKey)) {
            envContent = envContent.replace(new RegExp(`${addressKey}=.*`), `${addressKey}=${address}`);
        } else {
            envContent += `\n${addressKey}=${address}`;
        }
        
        fs.writeFileSync(envPath, envContent);
        console.log(`Updated ${addressKey} in backend/.env`);

    } catch (error) {
        console.error('Deployment failed:', error);
    }
}

deploy();
