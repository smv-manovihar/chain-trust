// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ChainTrust {
    
    // Custom Errors for gas efficiency
    error NotAuthorized(address caller);
    error ProductAlreadyExists(uint256 productId);
    error ProductNotFound(uint256 productId);
    error InvalidInput(string parameter);
    error UnauthorizedManufacturer(address manufacturer);
    error UnauthorizedDistributor(address distributor);

    struct TrackingEvent {
        uint256 timestamp;
        string location;
        string status;
        address updatedBy;
    }
    
    struct Product {
        uint256 productId;
        string name;
        string category;
        string brand;
        uint256 manufactureDate;
        uint256 batchNumber;
        uint256 price;
        uint256 expiryDate;
        bool exists;
        string saltValue;
        address creator;
    }

    address public owner;
    uint256 public productCount = 0;
    
    // Access Control Mappings
    mapping(address => bool) public isManufacturer;
    mapping(address => bool) public isDistributor;

    // Product mappings
    mapping(uint256 => Product) public products;
    mapping(uint256 => bool) public productExists;
    mapping(string => uint256) public productIndex; // salt -> productId
    
    // History mapping
    mapping(uint256 => TrackingEvent[]) public productHistory;

    // Image mapping
    mapping(uint256 => string[]) public productImages;

    event ProductAdded(uint256 productId, address creator);
    event ProductUpdated(uint256 productId, string status);
    event ProductRemoved(uint256 productId);
    event TrackingEventAdded(uint256 productId, string status, string location, address updater);
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

    modifier onlyAuthorizedUpdater(uint256 _productId) {
        if (!isManufacturer[msg.sender] && !isDistributor[msg.sender] && msg.sender != owner) 
            revert NotAuthorized(msg.sender);
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

    function authorizeDistributor(address _account) external onlyOwner {
        isDistributor[_account] = true;
        emit RoleGranted(_account, "DISTRIBUTOR");
    }

    function revokeRole(address _account) external onlyOwner {
        isManufacturer[_account] = false;
        isDistributor[_account] = false;
        emit RoleRevoked(_account, "ALL");
    }

    function addProductWithExpiry(
        string memory _name,
        string memory _category,
        string memory _brand,
        uint256 _productId,
        uint256 _manufactureDate,
        uint256 _batchNumber,
        uint256 _price,
        uint256 _expiryDate,
        string memory _salt,
        string[] memory _imageUrls
    ) external onlyManufacturer {
        if (productExists[_productId]) revert ProductAlreadyExists(_productId);
        if (bytes(_name).length == 0) revert InvalidInput("name");
        if (bytes(_salt).length == 0) revert InvalidInput("salt");
        
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
            msg.sender
        );
        
        productExists[_productId] = true;
        productIndex[_salt] = _productId;
        productCount++;

        // Store image URLs
        for (uint i = 0; i < _imageUrls.length; i++) {
            productImages[_productId].push(_imageUrls[i]);
        }

        // Add first tracking event
        _addInternalTrackingEvent(_productId, "Manufactured", "Factory");

        emit ProductAdded(_productId, msg.sender);
    }

    function addProductWithoutExpiry(
        string memory _name,
        string memory _category,
        string memory _brand,
        uint256 _productId,
        uint256 _manufactureDate,
        uint256 _batchNumber,
        uint256 _price,
        string memory _salt,
        string[] memory _imageUrls
    ) external onlyManufacturer {
        if (productExists[_productId]) revert ProductAlreadyExists(_productId);
        if (bytes(_name).length == 0) revert InvalidInput("name");
        
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
            msg.sender
        );
        
        productExists[_productId] = true;
        productIndex[_salt] = _productId;
        productCount++;

        for (uint i = 0; i < _imageUrls.length; i++) {
            productImages[_productId].push(_imageUrls[i]);
        }

        _addInternalTrackingEvent(_productId, "Manufactured", "Factory");

        emit ProductAdded(_productId, msg.sender);
    }

    function addTrackingEvent(
        uint256 _productId,
        string memory _status,
        string memory _location
    ) external onlyAuthorizedUpdater(_productId) {
        if (!productExists[_productId]) revert ProductNotFound(_productId);
        if (bytes(_status).length == 0) revert InvalidInput("status");
        
        _addInternalTrackingEvent(_productId, _status, _location);
        
        emit ProductUpdated(_productId, _status);
    }

    function _addInternalTrackingEvent(uint256 _productId, string memory _status, string memory _location) internal {
        TrackingEvent memory newEvent = TrackingEvent({
            timestamp: block.timestamp,
            location: _location,
            status: _status,
            updatedBy: msg.sender
        });
        productHistory[_productId].push(newEvent);
        emit TrackingEventAdded(_productId, _status, _location, msg.sender);
    }

    function getFullProductBySalt(string memory _saltValue) external view returns (
        Product memory product,
        string[] memory images,
        TrackingEvent[] memory history
    ) {
        uint256 _productId = productIndex[_saltValue];
        if (!productExists[_productId]) revert ProductNotFound(_productId);
        
        return (
            products[_productId],
            productImages[_productId],
            productHistory[_productId]
        );
    }
    
    function getProductBySalt(string memory _saltValue) external view returns (
        string memory name,
        string memory category,
        string memory brand,
        uint256 manufactureDate,
        uint256 batchNumber,
        uint256 price,
        uint256 expiryDate
    ) {
        uint256 _productId = productIndex[_saltValue];
        if (!productExists[_productId]) revert ProductNotFound(_productId);
        
        Product memory p = products[_productId];
        return (p.name, p.category, p.brand, p.manufactureDate, p.batchNumber, p.price, p.expiryDate);
    }

    function removeProduct(uint256 _productId) external onlyOwner {
        if (!productExists[_productId]) revert ProductNotFound(_productId);
        productExists[_productId] = false;
        productCount--;
        emit ProductRemoved(_productId);
    }
}
