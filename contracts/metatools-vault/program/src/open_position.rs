use metatools_vault_api::prelude::*;
use steel::*;

pub fn process_open_position(accounts: &[AccountInfo<'_>], data: &[u8]) -> ProgramResult {
    // Parse accounts
    let [
        session_wallet_info,
        vault_metadata_info,
        position_info,
        config_info,
        treasury_info,
        buyback_info,
        referrer_info,
        system_program,
    ] = accounts
    else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };

    // Session wallet must sign
    session_wallet_info.is_signer()?;

    // Parse instruction data
    let args = OpenPosition::try_from_bytes(data)?;

    // Load config
    let config = config_info.as_account::<GlobalConfig>(&metatools_vault_api::ID)?;

    // Check program not paused
    if config.paused != 0 {
        return Err(MetatoolsError::ProgramPaused.into());
    }

    // Load vault metadata
    let vault = vault_metadata_info
        .as_account_mut::<VaultMetadata>(&metatools_vault_api::ID)?
        .assert_mut(|v| v.session_wallet == *session_wallet_info.key)?
        .assert_mut(|v| v.status == VaultMetadata::STATUS_ACTIVE)?;

    // Calculate fee (0.7% of TVL)
    let fee_amount = (args.initial_tvl as u128 * config.fee_bps as u128 / 10_000) as u64;

    // Calculate fee distribution
    let referral_fee = if vault.referrer != Pubkey::default() {
        (fee_amount as u128 * config.referral_percentage as u128 / 100) as u64
    } else {
        0
    };
    let buyback_fee = (fee_amount as u128 * config.buyback_percentage as u128 / 100) as u64;
    let treasury_fee = fee_amount - referral_fee - buyback_fee; // Remainder to treasury

    // Transfer fees
    if referral_fee > 0 {
        solana_program::program::invoke(
            &solana_program::system_instruction::transfer(
                session_wallet_info.key,
                referrer_info.key,
                referral_fee,
            ),
            &[session_wallet_info.clone(), referrer_info.clone()],
        )?;
    }
    solana_program::program::invoke(
        &solana_program::system_instruction::transfer(
            session_wallet_info.key,
            buyback_info.key,
            buyback_fee,
        ),
        &[session_wallet_info.clone(), buyback_info.clone()],
    )?;
    solana_program::program::invoke(
        &solana_program::system_instruction::transfer(
            session_wallet_info.key,
            treasury_info.key,
            treasury_fee,
        ),
        &[session_wallet_info.clone(), treasury_info.clone()],
    )?;

    // Create position account
    let position_id = vault.next_position_id;
    let (position_pda, position_bump) = Position::pda(session_wallet_info.key, position_id);
    if position_pda != *position_info.key {
        return Err(MetatoolsError::InvalidPDA.into());
    }

    create_program_account_with_bump::<Position>(
        position_info,
        system_program,
        session_wallet_info,
        &metatools_vault_api::ID,
        &[
            b"position",
            session_wallet_info.key.as_ref(),
            &position_id.to_le_bytes(),
        ],
        position_bump,
    )?;

    // Initialize position data
    let position = position_info.as_account_mut::<Position>(&metatools_vault_api::ID)?;
    position.session_wallet = *session_wallet_info.key;
    position.position_id = position_id;
    position.protocol = args.protocol;
    position.pool = args.pool;
    position.base_mint = args.base_mint;
    position.quote_mint = args.quote_mint;
    position.strategy = args.strategy;
    position.initial_tvl = args.initial_tvl;
    position.current_tvl = args.initial_tvl;
    position.fee_paid = fee_amount;
    position.fees_claimed = 0;
    position.total_compounded = 0;
    position.opened_at = Clock::get()?.unix_timestamp;
    position.last_rebalance = Clock::get()?.unix_timestamp;
    position.status = Position::STATUS_OPEN;

    // Update vault metadata
    vault.active_positions += 1;
    vault.next_position_id += 1;
    vault.total_fees_paid += fee_amount;
    vault.total_value_locked += args.initial_tvl;
    vault.last_activity = Clock::get()?.unix_timestamp;

    // Emit event
    let event = PositionOpenedEvent {
        session_wallet: *session_wallet_info.key,
        pool: args.pool,
        position_id,
        initial_tvl: args.initial_tvl,
        fee_paid: fee_amount,
        timestamp: Clock::get()?.unix_timestamp,
        protocol: args.protocol,
        _padding: [0; 7],
    };
    event.log();

    Ok(())
}
