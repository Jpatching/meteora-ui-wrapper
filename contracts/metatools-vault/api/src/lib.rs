pub mod consts;
pub mod error;
pub mod instruction;
pub mod event;
pub mod sdk;
pub mod state;

pub mod prelude {
    pub use crate::consts::*;
    pub use crate::error::*;
    pub use crate::instruction::*;
    pub use crate::event::*;
    pub use crate::sdk::*;
    pub use crate::state::*;
}

use steel::*;

// Program ID - update this after deployment
declare_id!("z7msBPQHDJjTvdQRoEcKyENgXDhSRYeHieN1ZMTqo35");
