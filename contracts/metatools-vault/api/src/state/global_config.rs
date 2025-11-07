use steel::*;
use super::MetatoolsAccount;

/// Global configuration account
/// Program-wide settings
#[repr(C)]
#[derive(Clone, Copy, Debug, PartialEq, Pod, Zeroable)]
pub struct GlobalConfig {
    /// Program admin (can update config)
    pub admin: Pubkey,

    /// Treasury wallet for platform fees
    pub treasury: Pubkey,

    /// Buyback wallet for token buybacks
    pub buyback_wallet: Pubkey,

    /// Fee in basis points (70 = 0.7%)
    pub fee_bps: u16,

    /// Referral percentage (10%)
    pub referral_percentage: u8,

    /// Buyback percentage (45%)
    pub buyback_percentage: u8,

    /// Treasury percentage (45%)
    pub treasury_percentage: u8,

    /// Program paused (0=false, 1=true)
    pub paused: u8,

    /// Reserved for future use
    pub _reserved: [u8; 128],
}

account!(MetatoolsAccount, GlobalConfig);

impl GlobalConfig {
    /// Size of GlobalConfig account
    pub const LEN: usize = 32 + 32 + 32 + 2 + 1 + 1 + 1 + 1 + 128;

    /// Default fee: 0.7% = 70 basis points
    pub const DEFAULT_FEE_BPS: u16 = 70;

    /// Default referral percentage: 10%
    pub const DEFAULT_REFERRAL_PCT: u8 = 10;

    /// Default buyback percentage: 45%
    pub const DEFAULT_BUYBACK_PCT: u8 = 45;

    /// Default treasury percentage: 45%
    pub const DEFAULT_TREASURY_PCT: u8 = 45;

    /// Get PDA for global config
    /// Seeds: [b"config"]
    pub fn pda() -> (Pubkey, u8) {
        Pubkey::find_program_address(&[b"config"], &crate::ID)
    }
}
