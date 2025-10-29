use anchor_lang::prelude::Pubkey;
use anchor_lang::prelude::*;

declare_id!("9dP6Ndf5x5gbB1ezBmh4kyPeuyXCii9jWoVUSbtWcc75");

pub const MAX_METADATA_LEN: usize = 256;

#[program]
pub mod nfc_registry {
    use super::*;

    // Register a UID -> owner mapping. Payer funds rent; owner does not need to sign (enforced by SAS/relayer off-chain).
    pub fn register(
        ctx: Context<Register>,
        uid_hash: [u8; 32],
        owner: Pubkey,
        metadata: Vec<u8>,
    ) -> Result<()> {
        let record = &mut ctx.accounts.uid_record;
        require!(
            metadata.len() <= MAX_METADATA_LEN,
            NfcError::MetadataTooLarge
        );
        record.owner = owner;
        record.uid_hash = uid_hash;
        record.bump = ctx.bumps.uid_record;
        record.metadata = metadata;
        emit!(Registered { uid_hash, owner });
        Ok(())
    }

    // Rebind to a new owner. Must be signed by current owner.
    pub fn rebind(ctx: Context<Rebind>, uid_hash: [u8; 32], new_owner: Pubkey) -> Result<()> {
        let record = &mut ctx.accounts.uid_record;
        require!(record.uid_hash == uid_hash, NfcError::UidMismatch);
        require_keys_eq!(
            ctx.accounts.current_owner.key(),
            record.owner,
            NfcError::Unauthorized
        );
        record.owner = new_owner;
        emit!(Rebound {
            uid_hash,
            new_owner
        });
        Ok(())
    }

    // Update metadata for an existing UID. Must be signed by current owner.
    pub fn update_metadata(
        ctx: Context<UpdateMetadata>,
        uid_hash: [u8; 32],
        metadata: Vec<u8>,
    ) -> Result<()> {
        let record = &mut ctx.accounts.uid_record;
        require!(record.uid_hash == uid_hash, NfcError::UidMismatch);
        require_keys_eq!(
            ctx.accounts.current_owner.key(),
            record.owner,
            NfcError::Unauthorized
        );
        require!(
            metadata.len() <= MAX_METADATA_LEN,
            NfcError::MetadataTooLarge
        );
        record.metadata = metadata;
        emit!(MetadataUpdated {
            uid_hash,
            owner: record.owner
        });
        Ok(())
    }

    // Revoke and close. Must be signed by current owner.
    pub fn revoke(ctx: Context<Revoke>, uid_hash: [u8; 32]) -> Result<()> {
        let record = &ctx.accounts.uid_record;
        require!(record.uid_hash == uid_hash, NfcError::UidMismatch);
        require_keys_eq!(
            ctx.accounts.current_owner.key(),
            record.owner,
            NfcError::Unauthorized
        );
        emit!(Revoked {
            uid_hash,
            owner: record.owner
        });
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(uid_hash: [u8;32], owner: Pubkey)]
pub struct Register<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + UidRecord::SIZE,
        seeds = [b"uid", uid_hash.as_ref()],
        bump,
    )]
    pub uid_record: Account<'info, UidRecord>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(uid_hash: [u8;32], new_owner: Pubkey)]
pub struct Rebind<'info> {
    #[account(
        mut,
        seeds = [b"uid", uid_hash.as_ref()],
        bump = uid_record.bump,
    )]
    pub uid_record: Account<'info, UidRecord>,
    pub current_owner: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(uid_hash: [u8;32])]
pub struct UpdateMetadata<'info> {
    #[account(
        mut,
        seeds = [b"uid", uid_hash.as_ref()],
        bump = uid_record.bump,
    )]
    pub uid_record: Account<'info, UidRecord>,
    pub current_owner: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(uid_hash: [u8;32])]
pub struct Revoke<'info> {
    #[account(
        mut,
        close = current_owner,
        seeds = [b"uid", uid_hash.as_ref()],
        bump = uid_record.bump,
    )]
    pub uid_record: Account<'info, UidRecord>,
    #[account(mut)]
    pub current_owner: Signer<'info>,
}

#[account]
pub struct UidRecord {
    pub owner: Pubkey,
    pub uid_hash: [u8; 32],
    pub bump: u8,
    pub metadata: Vec<u8>,
}

impl UidRecord {
    pub const SIZE: usize = 32 + 32 + 1 + 4 + MAX_METADATA_LEN;
}

#[event]
pub struct Registered {
    pub uid_hash: [u8; 32],
    pub owner: Pubkey,
}

#[event]
pub struct Rebound {
    pub uid_hash: [u8; 32],
    pub new_owner: Pubkey,
}

#[event]
pub struct Revoked {
    pub uid_hash: [u8; 32],
    pub owner: Pubkey,
}

#[event]
pub struct MetadataUpdated {
    pub uid_hash: [u8; 32],
    pub owner: Pubkey,
}

#[error_code]
pub enum NfcError {
    #[msg("UID mismatch")]
    UidMismatch,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Metadata too large")]
    MetadataTooLarge,
}
