use metatools_vault_api::prelude::*;
use steel::*;

pub fn process_update_config(accounts: &[AccountInfo<'_>], data: &[u8]) -> ProgramResult {
    // Parse accounts
    let [admin_info, config_info] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };

    // Admin must sign
    admin_info.is_signer()?;

    // Parse instruction data
    let args = UpdateConfig::try_from_bytes(data)?;

    // Validate fee percentages sum to 100
    let total_pct = args.new_referral_pct as u16 + args.new_buyback_pct as u16 + args.new_treasury_pct as u16;
    if total_pct != 100 {
        return Err(MetatoolsError::InvalidFeePercentages.into());
    }

    // Validate PDA
    let (config_pda, _config_bump) = GlobalConfig::pda();
    if config_pda != *config_info.key {
        return Err(MetatoolsError::InvalidPDA.into());
    }

    // Load config and verify admin
    let config = config_info.as_account_mut::<GlobalConfig>(&metatools_vault_api::ID)?;

    if config.admin != *admin_info.key {
        return Err(MetatoolsError::InvalidAuthority.into());
    }

    // Update config
    config.treasury = args.new_treasury;
    config.buyback_wallet = args.new_buyback_wallet;
    config.fee_bps = args.new_fee_bps;
    config.referral_percentage = args.new_referral_pct;
    config.buyback_percentage = args.new_buyback_pct;
    config.treasury_percentage = args.new_treasury_pct;
    config.paused = args.paused;

    Ok(())
}
