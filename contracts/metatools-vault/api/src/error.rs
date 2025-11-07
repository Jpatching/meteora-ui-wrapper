use steel::*;

/// Custom error codes for MetaTools Vault
#[repr(u32)]
#[derive(Debug, Error, Clone, Copy, PartialEq, Eq, IntoPrimitive)]
pub enum MetatoolsError {
    #[error("Invalid authority for this vault")]
    InvalidAuthority = 0,

    #[error("Vault is paused")]
    VaultPaused = 1,

    #[error("Vault has open positions, cannot close")]
    VaultHasOpenPositions = 2,

    #[error("Position not found")]
    PositionNotFound = 3,

    #[error("Position is closed")]
    PositionClosed = 4,

    #[error("Insufficient funds")]
    InsufficientFunds = 5,

    #[error("Invalid PDA derivation")]
    InvalidPDA = 6,

    #[error("Invalid protocol type")]
    InvalidProtocol = 7,

    #[error("Program is paused")]
    ProgramPaused = 8,

    #[error("Unauthorized admin action")]
    Unauthorized = 9,

    #[error("Invalid fee configuration")]
    InvalidFeeConfig = 10,

    #[error("Arithmetic overflow")]
    ArithmeticOverflow = 11,

    #[error("Invalid position status")]
    InvalidPositionStatus = 12,

    #[error("Invalid vault status")]
    InvalidVaultStatus = 13,

    #[error("Fee percentages do not sum to 100")]
    InvalidFeePercentages = 14,

    #[error("Session wallet mismatch")]
    SessionWalletMismatch = 15,
}

error!(MetatoolsError);
