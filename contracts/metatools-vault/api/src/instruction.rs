use steel::*;

#[repr(u8)]
#[derive(Clone, Copy, Debug, Eq, PartialEq, TryFromPrimitive)]
pub enum MetatoolsInstruction {
    InitializeConfig = 0,
    CreateVault = 1,
    CloseVault = 2,
    OpenPosition = 3,
    ClosePosition = 4,
    UpdatePositionTVL = 5,
    UpdateConfig = 6,
}

/// Initialize global configuration (admin only, one-time)
#[repr(C)]
#[derive(Clone, Copy, Debug, Pod, Zeroable)]
pub struct InitializeConfig {
    pub treasury: Pubkey,
    pub buyback_wallet: Pubkey,
    pub fee_bps: u16,
    pub referral_pct: u8,
    pub buyback_pct: u8,
    pub treasury_pct: u8,
    pub _padding: [u8; 3],
}

/// Create vault metadata for a session wallet
#[repr(C)]
#[derive(Clone, Copy, Debug, Pod, Zeroable)]
pub struct CreateVault {
    pub referrer: Pubkey,
}

/// Close vault metadata (must have no open positions)
#[repr(C)]
#[derive(Clone, Copy, Debug, Pod, Zeroable)]
pub struct CloseVault {}

/// Open a position (charges 0.7% fee)
#[repr(C)]
#[derive(Clone, Copy, Debug, Pod, Zeroable)]
pub struct OpenPosition {
    pub pool: Pubkey,
    pub base_mint: Pubkey,
    pub quote_mint: Pubkey,
    pub initial_tvl: u64,
    pub protocol: u8,
    pub strategy: u8,
    pub _padding: [u8; 6],
}

/// Close a position
#[repr(C)]
#[derive(Clone, Copy, Debug, Pod, Zeroable)]
pub struct ClosePosition {
    pub position_id: u64,
}

/// Update position TVL (for analytics)
#[repr(C)]
#[derive(Clone, Copy, Debug, Pod, Zeroable)]
pub struct UpdatePositionTVL {
    pub position_id: u64,
    pub new_tvl: u64,
    pub fees_claimed: u64,
    pub total_compounded: u64,
}

/// Update global configuration (admin only)
#[repr(C)]
#[derive(Clone, Copy, Debug, Pod, Zeroable)]
pub struct UpdateConfig {
    pub new_treasury: Pubkey,
    pub new_buyback_wallet: Pubkey,
    pub new_fee_bps: u16,
    pub new_referral_pct: u8,
    pub new_buyback_pct: u8,
    pub new_treasury_pct: u8,
    pub paused: u8,
    pub _padding: [u8; 2],
}

instruction!(MetatoolsInstruction, InitializeConfig);
instruction!(MetatoolsInstruction, CreateVault);
instruction!(MetatoolsInstruction, CloseVault);
instruction!(MetatoolsInstruction, OpenPosition);
instruction!(MetatoolsInstruction, ClosePosition);
instruction!(MetatoolsInstruction, UpdatePositionTVL);
instruction!(MetatoolsInstruction, UpdateConfig);
