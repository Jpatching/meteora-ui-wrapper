use metatools_vault_api::prelude::*;
use steel::*;

pub fn process_create_vault(accounts: &[AccountInfo<'_>], data: &[u8]) -> ProgramResult {
    // Parse accounts
    let [session_wallet_info, main_wallet_info, vault_metadata_info, system_program] = accounts
    else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };

    // Session wallet must sign (user's generated session wallet)
    session_wallet_info.is_signer()?;

    // Main wallet must sign (user's main Phantom wallet for authentication)
    main_wallet_info.is_signer()?;

    // Parse instruction data
    let args = CreateVault::try_from_bytes(data)?;

    // Validate PDA
    let (vault_pda, vault_bump) = VaultMetadata::pda(session_wallet_info.key);
    if vault_pda != *vault_metadata_info.key {
        return Err(MetatoolsError::InvalidPDA.into());
    }

    // Create vault metadata account
    create_program_account_with_bump::<VaultMetadata>(
        vault_metadata_info,
        system_program,
        session_wallet_info,
        &metatools_vault_api::ID,
        &[b"vault_metadata", session_wallet_info.key.as_ref()],
        vault_bump,
    )?;

    // Initialize vault data
    let vault = vault_metadata_info.as_account_mut::<VaultMetadata>(&metatools_vault_api::ID)?;
    vault.session_wallet = *session_wallet_info.key;
    vault.main_wallet = *main_wallet_info.key;
    vault.referrer = args.referrer;
    vault.total_value_locked = 0;
    vault.total_deposits = 0;
    vault.total_withdrawals = 0;
    vault.total_fees_paid = 0;
    vault.active_positions = 0;
    vault.next_position_id = 0;
    vault.created_at = Clock::get()?.unix_timestamp;
    vault.last_activity = Clock::get()?.unix_timestamp;
    vault.status = VaultMetadata::STATUS_ACTIVE;

    // Emit event
    let event = VaultCreatedEvent {
        session_wallet: *session_wallet_info.key,
        main_wallet: *main_wallet_info.key,
        timestamp: Clock::get()?.unix_timestamp,
    };
    event.log();

    Ok(())
}
