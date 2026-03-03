// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ChainTrust {
    
    // Custom Errors for gas efficiency
    error NotAuthorized(address caller);
    error ProductAlreadyExists(string productId);
    error ProductNotFound(string productId);
    error InvalidInput(string parameter);
    error UnauthorizedManufacturer(address manufacturer);

    struct Product {
        string productId;
        string name;
        string category;
        string brand;
        uint256 manufactureDate;
        string batchNumber;
        uint256 price;
        uint256 expiryDate;
        bool exists;
        string saltValue;
        address creator;
        bool isRecalled;
    }

    address public owner;
    uint256 public productCount = 0;
    
    // Access Control Mappings
    mapping(address => bool) public isManufacturer;

    // Product mappings
    mapping(string => Product) public products;
    mapping(string => bool) public productExists;
    mapping(string => string) public productIndex; // salt -> productId
    
    // Image mapping
    mapping(string => string[]) public productImages;

    event ProductAdded(string productId, address creator);
    event ProductRecalled(string productId, address caller);
    event ProductRemoved(string productId);
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
        isManufacturer[msg.sender] = true; // Owner is manufacturer by default for testing
    }

    // Role Management
    function authorizeManufacturer(address _account) external onlyOwner {
        isManufacturer[_account] = true;
        emit RoleGranted(_account, "MANUFACTURER");
    }

    function revokeRole(address _account) external onlyOwner {
        isManufacturer[_account] = false;
        emit RoleRevoked(_account, "ALL");
    }

    function addProductWithExpiry(
        string memory _name,
        string memory _category,
        string memory _brand,
        string memory _productId,
        uint256 _manufactureDate,
        string memory _batchNumber,
        uint256 _price,
        uint256 _expiryDate,
        string memory _salt,
        string[] memory _imageUrls
    ) external onlyManufacturer {
        if (productExists[_productId]) revert ProductAlreadyExists(_productId);
        if (bytes(_name).length == 0) revert InvalidInput("name");
        if (bytes(_salt).length == 0) revert InvalidInput("salt");
        if (bytes(_productId).length == 0) revert InvalidInput("productId");
        
        products[_productId] = Product(
            _productId,
            _name,
            _category,
            _brand,
            _manufactureDate,
            _batchNumber,
            _price,
            _expiryDate,
            true,
            _salt,
            msg.sender,
            false // isRecalled
        );
        
        productExists[_productId] = true;
        productIndex[_salt] = _productId;
        productCount++;

        // Store image URLs
        for (uint i = 0; i < _imageUrls.length; i++) {
            productImages[_productId].push(_imageUrls[i]);
        }

        emit ProductAdded(_productId, msg.sender);
    }

    function addProductWithoutExpiry(
        string memory _name,
        string memory _category,
        string memory _brand,
        string memory _productId,
        uint256 _manufactureDate,
        string memory _batchNumber,
        uint256 _price,
        string memory _salt,
        string[] memory _imageUrls
    ) external onlyManufacturer {
        if (productExists[_productId]) revert ProductAlreadyExists(_productId);
        if (bytes(_name).length == 0) revert InvalidInput("name");
        if (bytes(_productId).length == 0) revert InvalidInput("productId");
        
        products[_productId] = Product(
            _productId,
            _name,
            _category,
            _brand,
            _manufactureDate,
            _batchNumber,
            _price,
            0, 
            true,
            _salt,
            msg.sender,
            false
        );
        
        productExists[_productId] = true;
        productIndex[_salt] = _productId;
        productCount++;

        for (uint i = 0; i < _imageUrls.length; i++) {
            productImages[_productId].push(_imageUrls[i]);
        }

        emit ProductAdded(_productId, msg.sender);
    }

    function recallProduct(string memory _saltValue) external onlyManufacturer {
        string memory _productId = productIndex[_saltValue];
        if (!productExists[_productId]) revert ProductNotFound(_productId);
        
        // Ensure that the recaller is the creator or the owner
        if (products[_productId].creator != msg.sender && msg.sender != owner) {
             revert NotAuthorized(msg.sender);
        }

        products[_productId].isRecalled = true;
        emit ProductRecalled(_productId, msg.sender);
    }

    function getFullProductBySalt(string memory _saltValue) external view returns (
        Product memory product,
        string[] memory images
    ) {
        string memory _productId = productIndex[_saltValue];
        if (!productExists[_productId]) revert ProductNotFound(_productId);
        
        return (
            products[_productId],
            productImages[_productId]
        );
    }
    
    function getProductBySalt(string memory _saltValue) external view returns (
        string memory name,
        string memory category,
        string memory brand,
        uint256 manufactureDate,
        string memory batchNumber,
        uint256 price,
        uint256 expiryDate,
        bool isRecalled
    ) {
        string memory _productId = productIndex[_saltValue];
        if (!productExists[_productId]) revert ProductNotFound(_productId);
        
        Product memory p = products[_productId];
        return (p.name, p.category, p.brand, p.manufactureDate, p.batchNumber, p.price, p.expiryDate, p.isRecalled);
    }

    function removeProduct(string memory _productId) external onlyOwner {
        if (!productExists[_productId]) revert ProductNotFound(_productId);
        productExists[_productId] = false;
        productCount--;
        emit ProductRemoved(_productId);
    }
}
