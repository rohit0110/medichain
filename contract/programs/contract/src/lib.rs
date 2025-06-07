use anchor_lang::prelude::*;

declare_id!("98TGc38djoRGd7rczpJ2nJWgLv2oNpXrDcGkJ8n4kPDG");

#[program]
pub mod contract {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
