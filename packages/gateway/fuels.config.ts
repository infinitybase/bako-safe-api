import { createConfig } from "fuels";
import * as path from "node:path";

const FIXTURES_PATH = path.resolve(__dirname, "tests", "fixtures");
const CONTRACTS_PATH = path.resolve(FIXTURES_PATH, "contracts");
const OUTPUT_PATH = path.resolve(CONTRACTS_PATH, "types");

const resolveContractPath = (contract: string) =>
  path.resolve(CONTRACTS_PATH, "sway", contract);

export default createConfig({
  contracts: [
    resolveContractPath("contract"),
    resolveContractPath("big-contract"),
  ],
  output: OUTPUT_PATH,
});
