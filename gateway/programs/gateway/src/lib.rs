use anchor_lang::prelude::*;

declare_id!("5MaCfmuFCgK9FJ4N194CsvZihcyCpfr5VX5gEVDuijaH");

#[program]
pub mod gateway {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
