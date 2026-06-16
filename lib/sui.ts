import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

export type SuiNetwork = "mainnet" | "testnet" | "devnet" | "localnet";

export function getNetwork(): SuiNetwork {
  const n = (process.env.NEXT_PUBLIC_SUI_NETWORK ?? "testnet") as SuiNetwork;
  return n;
}

export function makeClient(network: SuiNetwork = getNetwork()) {
  return new SuiJsonRpcClient({
    network,
    url: getJsonRpcFullnodeUrl(network),
  });
}

export function explorerTxUrl(digest: string, network: SuiNetwork = getNetwork()) {
  return `https://suiexplorer.com/txblock/${digest}?network=${network}`;
}

export function explorerObjectUrl(id: string, network: SuiNetwork = getNetwork()) {
  return `https://suiexplorer.com/object/${id}?network=${network}`;
}

export function explorerAddressUrl(addr: string, network: SuiNetwork = getNetwork()) {
  return `https://suiexplorer.com/address/${addr}?network=${network}`;
}

export function shortAddr(addr: string, head = 6, tail = 4) {
  if (!addr) return "";
  if (addr.length <= head + tail + 2) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

export function loadServerKeypair(envName: "SPONSOR_PRIVATE_KEY" | "HOST_PRIVATE_KEY") {
  const raw = process.env[envName];
  if (!raw) throw new Error(`Missing env: ${envName}`);
  return Ed25519Keypair.fromSecretKey(raw);
}

export function getQuizConfig() {
  const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID;
  const quizObjectId = process.env.NEXT_PUBLIC_QUIZ_OBJECT_ID;
  if (!packageId || !quizObjectId) {
    throw new Error(
      "NEXT_PUBLIC_PACKAGE_ID / NEXT_PUBLIC_QUIZ_OBJECT_ID not set. Publish the Move package and create the Quiz object first.",
    );
  }
  return { packageId, quizObjectId, network: getNetwork() };
}
