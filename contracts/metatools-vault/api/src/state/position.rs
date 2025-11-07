use steel::*;
use super::MetatoolsAccount;

/// Position account
/// Tracks an individual LP position within a vault
#[repr(C)]
#[derive(Clone, Copy, Debug, Pod, Zeroable)]
pub struct Position {
    /// Session wallet that owns this position
    pub session_wallet: Pubkey,

    /// Meteora pool address
    pub pool: Pubkey,

    /// Base token mint
    pub base_mint: Pubkey,

    /// Quote token mint
    pub quote_mint: Pubkey,

    /// Position ID within this session wallet
    pub position_id: u64,

    /// Initial TVL in lamports (SOL equivalent)
    pub initial_tvl: u64,

    /// Current TVL (updated on refresh)
    pub current_tvl: u64,

    /// Platform fee paid (0.7% of initial TVL)
    pub fee_paid: u64,

    /// Total fees claimed from pool
    pub fees_claimed: u64,

    /// Total compounded amount
    pub total_compounded: u64,

    /// Position opened timestamp
    pub opened_at: i64,

    /// Last rebalance timestamp
    pub last_rebalance: i64,

    /// Protocol type (0=DLMM, 1=DAMMv2, 2=DAMMv1, 3=DBC, 4=AlphaVault)
    pub protocol: u8,

    /// Strategy type (0=Manual, 1=AutoCompound, 2=RangeRebalance, etc.)
    pub strategy: u8,

    /// Position status (0=Open, 1=Closed)
    pub status: u8,

    /// Padding for alignment
    pub _padding: [u8; 5],

    /// Reserved for future use
    pub _reserved: [u8; 64],
}

account!(MetatoolsAccount, Position);

impl Position {
    /// Size of Position account
    pub const LEN: usize = 32 + 32 + 32 + 32 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 1 + 1 + 1 + 5 + 64;

    // Protocol constants
    pub const PROTOCOL_DLMM: u8 = 0;
    pub const PROTOCOL_DAMM_V2: u8 = 1;
    pub const PROTOCOL_DAMM_V1: u8 = 2;
    pub const PROTOCOL_DBC: u8 = 3;
    pub const PROTOCOL_ALPHA_VAULT: u8 = 4;

    // Strategy constants
    pub const STRATEGY_MANUAL: u8 = 0;
    pub const STRATEGY_AUTO_COMPOUND: u8 = 1;
    pub const STRATEGY_RANGE_REBALANCE: u8 = 2;
    pub const STRATEGY_STOP_LOSS: u8 = 3;
    pub const STRATEGY_TAKE_PROFIT: u8 = 4;
    pub const STRATEGY_AUTO_COMPOUND_REBALANCE: u8 = 5;

    // Status constants
    pub const STATUS_OPEN: u8 = 0;
    pub const STATUS_CLOSED: u8 = 1;

    /// Get PDA for position
    /// Seeds: [b"position", session_wallet, position_id]
    pub fn pda(session_wallet: &Pubkey, position_id: u64) -> (Pubkey, u8) {
        Pubkey::find_program_address(
            &[
                b"position",
                session_wallet.as_ref(),
                &position_id.to_le_bytes(),
            ],
            &crate::ID,
        )
    }
}
