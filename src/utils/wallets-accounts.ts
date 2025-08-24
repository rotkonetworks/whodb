import { decodeAddress } from "@polkadot/keyring";
import { SS58String } from "polkadot-api";

const checkPublicKey = (publicKey: Uint8Array) => {
  if ([1, 2, 4, 8, 32, 33].includes(publicKey.length)) {
    return true;
  }
  // Addresses with invalid public key length don't work well with Polkadot.js and the ecosystem.
  //  This is the case for EVM chains like Moonbeam, which use 20-byte addresses.
  console.warn("Invalid public key length:", publicKey.length);
  return false;
};

export const getPublicKey = (address: SS58String) => {
  // Input validation
  if (!address || typeof address !== 'string' || address.trim().length === 0) {
    throw new Error('Address is required and must be a non-empty string');
  }
  
  try {
    const publicKey = decodeAddress(address);
    
    // Validate public key length (should be 32 bytes for most Substrate chains)
    if (!publicKey || !checkPublicKey(publicKey)) {
      throw new Error('Invalid address format');
    }
    
    return publicKey;
  } catch (error) {
    throw new Error('Invalid address format');
  }
}