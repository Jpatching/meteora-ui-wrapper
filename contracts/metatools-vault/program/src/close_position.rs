use metatools_vault_api::prelude::*;
use steel::*;

pub fn process_close_position(accounts: &[AccountInfo<'_>], data: &[u8]) -> ProgramResult {
    // Parse accounts
    let [session_wallet_info, vault_metadata_info, position_info] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };

    // Session wallet must sign
    session_wallet_info.is_signer()?;

    // Parse instruction data
    let args = ClosePosition::try_from_bytes(data)?;

    // Validate position PDA
    let (position_pda, _position_bump) = Position::pda(session_wallet_info.key, args.position_id);
    if position_pda != *position_info.key {
        return Err(MetatoolsError::InvalidPDA.into());
    }

    // Load position
    let position = position_info.as_account::<Position>(&metatools_vault_api::ID)?;

    // Verify ownership
    if position.session_wallet != *session_wallet_info.key {
        return Err(MetatoolsError::Unauthorized.into());
    }

    // Verify position is open
    if position.status != Position::STATUS_OPEN {
        return Err(MetatoolsError::InvalidPositionStatus.into());
    }

    // Load vault metadata
    let vault = vault_metadata_info
        .as_account_mut::<VaultMetadata>(&metatools_vault_api::ID)?
        .assert_mut(|v| v.session_wallet == *session_wallet_info.key)?;

    // Update vault metadata
    vault.active_positions = vault.active_positions.saturating_sub(1);
    vault.total_value_locked = vault.total_value_locked.saturating_sub(position.current_tvl);
    vault.total_withdrawals = vault.total_withdrawals.saturating_add(position.current_tvl);
    vault.last_activity = Clock::get()?.unix_timestamp;

    // Update position status to closed
    let position_mut = position_info.as_account_mut::<Position>(&metatools_vault_api::ID)?;
    position_mut.status = Position::STATUS_CLOSED;

    // Emit event
    let event = PositionClosedEvent {
        session_wallet: *session_wallet_info.key,
        position_id: args.position_id,
        final_tvl: position.current_tvl,
        total_fees_claimed: position.fees_claimed,
        timestamp: Clock::get()?.unix_timestamp,
    };
    event.log();

    Ok(())
}
