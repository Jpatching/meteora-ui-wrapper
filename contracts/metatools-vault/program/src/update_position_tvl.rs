use metatools_vault_api::prelude::*;
use steel::*;

pub fn process_update_position_tvl(accounts: &[AccountInfo<'_>], data: &[u8]) -> ProgramResult {
    // Parse accounts
    let [session_wallet_info, position_info] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };

    // Session wallet must sign
    session_wallet_info.is_signer()?;

    // Parse instruction data
    let args = UpdatePositionTVL::try_from_bytes(data)?;

    // Validate position PDA
    let (position_pda, _position_bump) = Position::pda(session_wallet_info.key, args.position_id);
    if position_pda != *position_info.key {
        return Err(MetatoolsError::InvalidPDA.into());
    }

    // Load position
    let position = position_info.as_account_mut::<Position>(&metatools_vault_api::ID)?;

    // Verify ownership
    if position.session_wallet != *session_wallet_info.key {
        return Err(MetatoolsError::Unauthorized.into());
    }

    // Verify position is open
    if position.status != Position::STATUS_OPEN {
        return Err(MetatoolsError::InvalidPositionStatus.into());
    }

    // Update position data
    position.current_tvl = args.new_tvl;
    position.fees_claimed = args.fees_claimed;
    position.total_compounded = args.total_compounded;
    position.last_rebalance = Clock::get()?.unix_timestamp;

    // Emit event
    let event = PositionUpdatedEvent {
        session_wallet: *session_wallet_info.key,
        position_id: args.position_id,
        new_tvl: args.new_tvl,
        fees_claimed: args.fees_claimed,
        timestamp: Clock::get()?.unix_timestamp,
    };
    event.log();

    Ok(())
}
