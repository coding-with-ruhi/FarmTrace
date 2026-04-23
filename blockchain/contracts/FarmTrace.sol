// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;


contract FarmTrace {

    // Structure to store one product batch
    struct Batch {
        uint256 id;
        string farmerName;
        string farmLocation;
        string cropName;
        uint256 quantity;       // in kg
        string harvestDate;
        string qualityGrade;
        bool isOrganic;
        string notes;
        address farmerAddress;
        uint256 timestamp;
    }

    // Storage
    uint256 public batchCount = 0;
    mapping(uint256 => Batch) public batches;

    // Event emitted when a new batch is created
    event BatchCreated(uint256 id, string cropName, address farmerAddress);

    // Farmer calls this to register a product batch
    function createBatch(
        string memory _farmerName,
        string memory _farmLocation,
        string memory _cropName,
        uint256 _quantity,
        string memory _harvestDate,
        string memory _qualityGrade,
        bool _isOrganic,
        string memory _notes
    ) public returns (uint256) {
        batchCount++;

        batches[batchCount] = Batch({
            id: batchCount,
            farmerName: _farmerName,
            farmLocation: _farmLocation,
            cropName: _cropName,
            quantity: _quantity,
            harvestDate: _harvestDate,
            qualityGrade: _qualityGrade,
            isOrganic: _isOrganic,
            notes: _notes,
            farmerAddress: msg.sender,
            timestamp: block.timestamp
        });

        emit BatchCreated(batchCount, _cropName, msg.sender);
        return batchCount;
    }

    // Buyer calls this to view batch details (by QR code ID)
    function getBatch(uint256 _id) public view returns (Batch memory) {
        require(_id > 0 && _id <= batchCount, "Batch not found");
        return batches[_id];
    }
}