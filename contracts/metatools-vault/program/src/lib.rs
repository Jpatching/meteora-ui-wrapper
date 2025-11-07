mod initialize_config;
mod create_vault;
mod open_position;
mod close_position;
mod update_position_tvl;
mod update_config;

use create_vault::*;
use initialize_config::*;
use open_position::*;
use close_position::*;
use update_position_tvl::*;
use update_config::*;

use metatools_vault_api::prelude::*;
use steel::*;

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    data: &[u8],
) -> ProgramResult {
    let (ix, data) = parse_instruction(&metatools_vault_api::ID, program_id, data)?;

    match ix {
        MetatoolsInstruction::InitializeConfig => process_initialize_config(accounts, data)?,
        MetatoolsInstruction::CreateVault => process_create_vault(accounts, data)?,
        MetatoolsInstruction::OpenPosition => process_open_position(accounts, data)?,
        MetatoolsInstruction::ClosePosition => process_close_position(accounts, data)?,
        MetatoolsInstruction::UpdatePositionTVL => process_update_position_tvl(accounts, data)?,
        MetatoolsInstruction::UpdateConfig => process_update_config(accounts, data)?,
        MetatoolsInstruction::CloseVault => {
            // CloseVault instruction not implemented yet
            // This would close the entire vault (requires no open positions)
            return Err(ProgramError::InvalidInstructionData);
        }
    }

    Ok(())
}

entrypoint!(process_instruction);
