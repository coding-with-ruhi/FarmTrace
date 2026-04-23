import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const FarmTraceModule = buildModule("FarmTraceModule", (m) => {
  const farmTrace = m.contract("FarmTrace");

  return { farmTrace };
});

export default FarmTraceModule;
