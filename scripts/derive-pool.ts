import { PublicKey } from '@solana/web3.js';
import { deriveCustomizablePermissionlessLbPair } from '@meteora-ag/dlmm';

const baseMint = new PublicKey('EQ6P8HNDYLT7rcsCGv8AK4vwH2q8YoJDunnQLtDWceMa'); // User's token
const quoteMint = new PublicKey('So11111111111111111111111111111111111111112'); // SOL
const dlmmProgramId = new PublicKey('LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo'); // DLMM devnet

const [poolAddress] = deriveCustomizablePermissionlessLbPair(
  baseMint,
  quoteMint,
  dlmmProgramId
);

console.log('Base Token:', baseMint.toString());
console.log('Quote Token:', quoteMint.toString());
console.log('Derived Pool Address:', poolAddress.toString());
console.log('\nExplorer Link:');
console.log(`https://explorer.solana.com/address/${poolAddress.toString()}?cluster=devnet`);
