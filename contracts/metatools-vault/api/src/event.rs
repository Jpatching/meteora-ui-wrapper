use steel::*;

/// Event: Vault created
#[repr(C)]
#[derive(Clone, Copy, Debug, Pod, Zeroable)]
pub struct VaultCreatedEvent {
    pub session_wallet: Pubkey,
    pub main_wallet: Pubkey,
    pub timestamp: i64,
}

/// Event: Position opened
#[repr(C)]
#[derive(Clone, Copy, Debug, Pod, Zeroable)]
pub struct PositionOpenedEvent {
    pub session_wallet: Pubkey,
    pub pool: Pubkey,
    pub position_id: u64,
    pub initial_tvl: u64,
    pub fee_paid: u64,
    pub timestamp: i64,
    pub protocol: u8,
    pub _padding: [u8; 7],
}

/// Event: Position closed
#[repr(C)]
#[derive(Clone, Copy, Debug, Pod, Zeroable)]
pub struct PositionClosedEvent {
    pub session_wallet: Pubkey,
    pub position_id: u64,
    pub final_tvl: u64,
    pub total_fees_claimed: u64,
    pub timestamp: i64,
}

/// Event: Position updated
#[repr(C)]
#[derive(Clone, Copy, Debug, Pod, Zeroable)]
pub struct PositionUpdatedEvent {
    pub session_wallet: Pubkey,
    pub position_id: u64,
    pub new_tvl: u64,
    pub fees_claimed: u64,
    pub timestamp: i64,
}

event!(VaultCreatedEvent);
event!(PositionOpenedEvent);
event!(PositionClosedEvent);
event!(PositionUpdatedEvent);
