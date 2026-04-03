// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title ChainTrust Pharmaceutical Verification
 * @dev Re-engineered for Batch-Aware Decentralized Verification (dApp)
 */
contract ChainTrust {
    
    // Custom Errors for gas efficiency
    error NotAuthorized(address caller);
    error BatchAlreadyExists(bytes32 batchSalt);
    error BatchNotFound(bytes32 batchSalt);
    error InvalidInput(string parameter);
    error UnauthorizedManufacturer(address manufacturer);

    struct Batch {
        string productId;       // The unique SKU/NDC from the manufacturer
        string productName;     // Core metadata for offline verification
        string brand;           // Core metadata for offline verification
        string batchNumber;     // Manufacturer's batch identifier
        bytes32 batchSalt;      // Root salt (converted to bytes32 for gas)
        uint256 manufactureDate;
        uint256 expiryDate;
        uint32 quantity;        // Total units in this batch
        address manufacturer;
        bool isRecalled;
        bool exists;
    }

    address public owner;
    uint256 public totalBatches = 0;
    
    // Manufacturer Access Control
    mapping(address => bool) public isManufacturer;

    // batchSalt -> Batch data
    mapping(bytes32 => Batch) public batches;

    event BatchRegistered(bytes32 indexed batchSalt, string productId, string batchNumber, address manufacturer);
    event BatchRecalled(bytes32 indexed batchSalt, address manufacturer);
    event RoleGranted(address indexed account, string role);
    event RoleRevoked(address indexed account, string role);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotAuthorized(msg.sender);
        _;
    }

    modifier onlyManufacturer() {
        if (!isManufacturer[msg.sender] && msg.sender != owner) revert UnauthorizedManufacturer(msg.sender);
        _;
    }

    constructor() {
        owner = msg.sender;
        isManufacturer[msg.sender] = true;
    }

    // --- Role Management ---
    
    function authorizeManufacturer(address _account) external onlyOwner {
        isManufacturer[_account] = true;
        emit RoleGranted(_account, "MANUFACTURER");
    }

    function revokeRole(address _account) external onlyOwner {
        isManufacturer[_account] = false;
        emit RoleRevoked(_account, "ALL");
    }

    // --- Core Batch Logic ---

    /**
     * @dev Register a new production batch on-chain.
     * Includes physical identifiers for backend-independent matching.
     */
    function registerBatch(
        string calldata _productId,
        string calldata _productName,
        string calldata _brand,
        string calldata _batchNumber,
        bytes32 _batchSalt,
        uint256 _manufactureDate,
        uint256 _expiryDate,
        uint32 _quantity
    ) external onlyManufacturer {
        if (batches[_batchSalt].exists) revert BatchAlreadyExists(_batchSalt);
        if (_batchSalt == 0) revert InvalidInput("batchSalt");
        if (bytes(_productId).length == 0) revert InvalidInput("productId");
        
        batches[_batchSalt] = Batch({
            productId: _productId,
            productName: _productName,
            brand: _brand,
            batchNumber: _batchNumber,
            batchSalt: _batchSalt,
            manufactureDate: _manufactureDate,
            expiryDate: _expiryDate,
            quantity: _quantity,
            manufacturer: msg.sender,
            isRecalled: false,
            exists: true
        });
        
        totalBatches++;
        emit BatchRegistered(_batchSalt, _productId, _batchNumber, msg.sender);
    }

    /**
     * @dev Flag a batch as recalled.
     * Only the original manufacturer or the contract owner can recall.
     */
    function recallBatch(bytes32 _batchSalt) external {
        if (!batches[_batchSalt].exists) revert BatchNotFound(_batchSalt);
        
        // Authorization check
        if (batches[_batchSalt].manufacturer != msg.sender && msg.sender != owner) {
             revert NotAuthorized(msg.sender);
        }

        batches[_batchSalt].isRecalled = true;
        emit BatchRecalled(_batchSalt, msg.sender);
    }

    /**
     * @dev Restore a recalled batch.
     * Reverses the recall flag on-chain.
     */
    function restoreBatch(bytes32 _batchSalt) external {
        if (!batches[_batchSalt].exists) revert BatchNotFound(_batchSalt);
        
        // Authorization check
        if (batches[_batchSalt].manufacturer != msg.sender && msg.sender != owner) {
             revert NotAuthorized(msg.sender);
        }

        batches[_batchSalt].isRecalled = false;
    }

    /**
     * @dev Get full batch data for verification.
     */
    function getBatch(bytes32 _batchSalt) external view returns (Batch memory) {
        if (!batches[_batchSalt].exists) revert BatchNotFound(_batchSalt);
        return batches[_batchSalt];
    }
}
