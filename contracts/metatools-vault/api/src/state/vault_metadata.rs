use steel::*;

/// Account type discriminator
#[repr(u8)]
#[derive(Clone, Copy, Debug, Eq, PartialEq, IntoPrimitive, TryFromPrimitive)]
pub enum MetatoolsAccount {
    VaultMetadata = 0,
    Position = 1,
    GlobalConfig = 2,
}

/// Vault metadata account
/// Tracks metadata for a session wallet (the session wallet itself is just a regular Solana wallet)
#[repr(C)]
#[derive(Clone, Copy, Debug, Pod, Zeroable)]
pub struct VaultMetadata {
    /// Session wallet address (this is the user's generated session wallet)
    pub session_wallet: Pubkey,

    /// User's main wallet address (for attribution/analytics)
    pub main_wallet: Pubkey,

    /// Referrer wallet (if user was referred)
    pub referrer: Pubkey,

    /// Total value locked in lamports (SOL equivalent)
    pub total_value_locked: u64,

    /// Total deposits made (cumulative, in lamports)
    pub total_deposits: u64,

    /// Total withdrawals made (cumulative, in lamports)
    pub total_withdrawals: u64,

    /// Total platform fees paid (in lamports)
    pub total_fees_paid: u64,

    /// Next position ID (auto-increments)
    pub next_position_id: u64,

    /// Vault creation timestamp
    pub created_at: i64,

    /// Last activity timestamp
    pub last_activity: i64,

    /// Number of active positions
    pub active_positions: u32,

    /// Vault status (0=Active, 1=Paused, 2=Closed)
    pub status: u8,

    /// Padding for alignment
    pub _padding: [u8; 3],

    /// Reserved for future use
    pub _reserved: [u8; 128],
}

// Link VaultMetadata with Steel's account macro
account!(MetatoolsAccount, VaultMetadata);

impl VaultMetadata {
    /// Size of VaultMetadata account
    pub const LEN: usize = 32 + 32 + 32 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 4 + 1 + 3 + 128;

    // Vault status constants
    pub const STATUS_ACTIVE: u8 = 0;
    pub const STATUS_PAUSED: u8 = 1;
    pub const STATUS_CLOSED: u8 = 2;

    /// Get PDA for vault metadata
    /// Seeds: [b"vault_metadata", session_wallet]
    pub fn pda(session_wallet: &Pubkey) -> (Pubkey, u8) {
        Pubkey::find_program_address(
            &[b"vault_metadata", session_wallet.as_ref()],
            &crate::ID,
        )
    }
}
