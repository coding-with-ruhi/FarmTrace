export const FARM_TRACE_ABI = [
  {
    "inputs": [
      { "internalType": "string", "name": "_farmerName", "type": "string" },
      { "internalType": "string", "name": "_farmLocation", "type": "string" },
      { "internalType": "string", "name": "_cropName", "type": "string" },
      { "internalType": "uint256", "name": "_quantity", "type": "uint256" },
      { "internalType": "string", "name": "_harvestDate", "type": "string" },
      { "internalType": "string", "name": "_qualityGrade", "type": "string" },
      { "internalType": "bool", "name": "_isOrganic", "type": "bool" },
      { "internalType": "string", "name": "_notes", "type": "string" }
    ],
    "name": "createBatch",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "_id", "type": "uint256" }],
    "name": "getBatch",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "id", "type": "uint256" },
          { "internalType": "string", "name": "farmerName", "type": "string" },
          { "internalType": "string", "name": "farmLocation", "type": "string" },
          { "internalType": "string", "name": "cropName", "type": "string" },
          { "internalType": "uint256", "name": "quantity", "type": "uint256" },
          { "internalType": "string", "name": "harvestDate", "type": "string" },
          { "internalType": "string", "name": "qualityGrade", "type": "string" },
          { "internalType": "bool", "name": "isOrganic", "type": "bool" },
          { "internalType": "string", "name": "notes", "type": "string" },
          { "internalType": "address", "name": "farmerAddress", "type": "address" },
          { "internalType": "uint256", "name": "timestamp", "type": "uint256" }
        ],
        "internalType": "struct FarmTrace.Batch",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "batchCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": false, "internalType": "uint256", "name": "id", "type": "uint256" },
      { "indexed": false, "internalType": "string", "name": "cropName", "type": "string" },
      { "indexed": false, "internalType": "address", "name": "farmerAddress", "type": "address" }
    ],
    "name": "BatchCreated",
    "type": "event"
  }
];

export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "";
