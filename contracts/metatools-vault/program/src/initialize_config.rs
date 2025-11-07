use metatools_vault_api::prelude::*;
use steel::*;

pub fn process_initialize_config(accounts: &[AccountInfo<'_>], data: &[u8]) -> ProgramResult {
    // Parse accounts
    let [admin_info, config_info, system_program] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };

    // Admin must sign
    admin_info.is_signer()?;

    // Parse instruction data
    let args = InitializeConfig::try_from_bytes(data)?;

    // Validate fee percentages sum to 100
    let total_pct = args.referral_pct as u16 + args.buyback_pct as u16 + args.treasury_pct as u16;
    if total_pct != 100 {
        return Err(MetatoolsError::InvalidFeePercentages.into());
    }

    // Validate PDA
    let (config_pda, config_bump) = GlobalConfig::pda();
    if config_pda != *config_info.key {
        return Err(MetatoolsError::InvalidPDA.into());
    }

    // Create config account
    create_program_account_with_bump::<GlobalConfig>(
        config_info,
        system_program,
        admin_info,
        &metatools_vault_api::ID,
        &[b"config"],
        config_bump,
    )?;

    // Initialize config data
    let config = config_info.as_account_mut::<GlobalConfig>(&metatools_vault_api::ID)?;
    config.admin = *admin_info.key;
    config.treasury = args.treasury;
    config.buyback_wallet = args.buyback_wallet;
    config.fee_bps = args.fee_bps;
    config.referral_percentage = args.referral_pct;
    config.buyback_percentage = args.buyback_pct;
    config.treasury_percentage = args.treasury_pct;
    config.paused = 0; // false

    Ok(())
}
