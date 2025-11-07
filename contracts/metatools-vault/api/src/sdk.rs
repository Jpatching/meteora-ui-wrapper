use steel::*;

use crate::prelude::*;

/// Helper function to build InitializeConfig instruction
pub fn initialize_config(
    admin: Pubkey,
    treasury: Pubkey,
    buyback_wallet: Pubkey,
    fee_bps: u16,
    referral_pct: u8,
    buyback_pct: u8,
    treasury_pct: u8,
) -> Instruction {
    let config_pda = GlobalConfig::pda().0;

    Instruction {
        program_id: crate::ID,
        accounts: vec![
            AccountMeta::new(admin, true),
            AccountMeta::new(config_pda, false),
            AccountMeta::new_readonly(system_program::ID, false),
        ],
        data: InitializeConfig {
            treasury,
            buyback_wallet,
            fee_bps,
            referral_pct,
            buyback_pct,
            treasury_pct,
            _padding: [0; 3],
        }
        .to_bytes(),
    }
}

/// Helper function to build CreateVault instruction
pub fn create_vault(
    main_wallet: Pubkey,
    session_wallet: Pubkey,
    referrer: Pubkey,
) -> Instruction {
    let vault_pda = VaultMetadata::pda(&session_wallet).0;

    Instruction {
        program_id: crate::ID,
        accounts: vec![
            AccountMeta::new(main_wallet, true),
            AccountMeta::new(session_wallet, true),
            AccountMeta::new(vault_pda, false),
            AccountMeta::new_readonly(system_program::ID, false),
        ],
        data: CreateVault { referrer }.to_bytes(),
    }
}

/// Helper function to build OpenPosition instruction
pub fn open_position(
    session_wallet: Pubkey,
    pool: Pubkey,
    base_mint: Pubkey,
    quote_mint: Pubkey,
    initial_tvl: u64,
    protocol: u8,
    strategy: u8,
) -> Instruction {
    let vault_pda = VaultMetadata::pda(&session_wallet).0;
    let config_pda = GlobalConfig::pda().0;

    Instruction {
        program_id: crate::ID,
        accounts: vec![
            AccountMeta::new(session_wallet, true),
            AccountMeta::new(vault_pda, false),
            AccountMeta::new_readonly(config_pda, false),
            AccountMeta::new_readonly(system_program::ID, false),
        ],
        data: OpenPosition {
            pool,
            base_mint,
            quote_mint,
            initial_tvl,
            protocol,
            strategy,
            _padding: [0; 6],
        }
        .to_bytes(),
    }
}

/// Helper function to build ClosePosition instruction
pub fn close_position(session_wallet: Pubkey, position_id: u64) -> Instruction {
    let vault_pda = VaultMetadata::pda(&session_wallet).0;
    let position_pda = Position::pda(&session_wallet, position_id).0;

    Instruction {
        program_id: crate::ID,
        accounts: vec![
            AccountMeta::new(session_wallet, true),
            AccountMeta::new(vault_pda, false),
            AccountMeta::new(position_pda, false),
        ],
        data: ClosePosition { position_id }.to_bytes(),
    }
}

/// Helper function to build UpdatePositionTVL instruction
pub fn update_position_tvl(
    session_wallet: Pubkey,
    position_id: u64,
    new_tvl: u64,
    fees_claimed: u64,
    total_compounded: u64,
) -> Instruction {
    let position_pda = Position::pda(&session_wallet, position_id).0;

    Instruction {
        program_id: crate::ID,
        accounts: vec![
            AccountMeta::new(session_wallet, true),
            AccountMeta::new(position_pda, false),
        ],
        data: UpdatePositionTVL {
            position_id,
            new_tvl,
            fees_claimed,
            total_compounded,
        }
        .to_bytes(),
    }
}

/// Helper function to build UpdateConfig instruction
pub fn update_config(
    admin: Pubkey,
    new_treasury: Pubkey,
    new_buyback_wallet: Pubkey,
    new_fee_bps: u16,
    new_referral_pct: u8,
    new_buyback_pct: u8,
    new_treasury_pct: u8,
    paused: u8,
) -> Instruction {
    let config_pda = GlobalConfig::pda().0;

    Instruction {
        program_id: crate::ID,
        accounts: vec![
            AccountMeta::new(admin, true),
            AccountMeta::new(config_pda, false),
        ],
        data: UpdateConfig {
            new_treasury,
            new_buyback_wallet,
            new_fee_bps,
            new_referral_pct,
            new_buyback_pct,
            new_treasury_pct,
            paused,
            _padding: [0; 2],
        }
        .to_bytes(),
    }
}
