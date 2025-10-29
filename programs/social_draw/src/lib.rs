use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_lang::system_program::Transfer;

declare_id!("GYzL4uQngaBZzsopSackFZNJpy7uP5PMsFtCnmL4aGHt");

#[program]
pub mod social_draw {
    use super::*;

    pub fn create_pool(
        ctx: Context<CreatePool>,
        pool_id: u64,
        ticket_price: u64,
        randomness_authority: Pubkey,
    ) -> Result<()> {
        require!(ticket_price > 0, DrawError::InvalidTicketPrice);
        let pool = &mut ctx.accounts.pool;
        pool.creator = ctx.accounts.creator.key();
        pool.randomness_authority = randomness_authority;
        pool.pool_id = pool_id;
        pool.ticket_price = ticket_price;
        pool.total_tickets = 0;
        pool.randomness = [0u8; 32];
        pool.winning_ticket = 0;
        pool.winner = Pubkey::default();
        pool.status = PoolStatus::Open as u8;
        pool.bump = ctx.bumps.pool;
        emit!(PoolCreated {
            pool: pool.key(),
            creator: pool.creator,
            ticket_price,
            randomness_authority,
        });
        Ok(())
    }

    pub fn join_pool(ctx: Context<JoinPool>, tickets: u64) -> Result<()> {
        require!(tickets > 0, DrawError::InvalidTicketCount);
        let pool = &mut ctx.accounts.pool;
        pool.assert_seeds(pool.key())?;
        require!(
            pool.status == PoolStatus::Open as u8,
            DrawError::PoolNotOpen
        );

        let cost = pool
            .ticket_price
            .checked_mul(tickets)
            .ok_or(DrawError::ArithmeticOverflow)?;

        let participant = &mut ctx.accounts.participant;
        if participant.pool == Pubkey::default() {
            participant.pool = pool.key();
            participant.user = ctx.accounts.user.key();
            let (_pda, bump) = Pubkey::find_program_address(
                &[
                    b"participant",
                    pool.key().as_ref(),
                    ctx.accounts.user.key().as_ref(),
                ],
                ctx.program_id,
            );
            participant.bump = bump;
        }
        require_keys_eq!(
            participant.pool,
            pool.key(),
            DrawError::ParticipantPoolMismatch
        );
        require_keys_eq!(
            participant.user,
            ctx.accounts.user.key(),
            DrawError::UnauthorizedParticipantAccount
        );

        participant.tickets = participant
            .tickets
            .checked_add(tickets)
            .ok_or(DrawError::ArithmeticOverflow)?;
        pool.total_tickets = pool
            .total_tickets
            .checked_add(tickets)
            .ok_or(DrawError::ArithmeticOverflow)?;

        let transfer_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user.to_account_info(),
                to: pool.to_account_info(),
            },
        );
        system_program::transfer(transfer_ctx, cost)?;

        emit!(Joined {
            pool: pool.key(),
            user: participant.user,
            tickets_purchased: tickets,
            total_user_tickets: participant.tickets,
            total_pool_tickets: pool.total_tickets,
            lamports_paid: cost,
        });
        Ok(())
    }

    pub fn request_randomness(ctx: Context<RequestRandomness>) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        pool.assert_seeds(pool.key())?;
        require_keys_eq!(
            pool.creator,
            ctx.accounts.creator.key(),
            DrawError::UnauthorizedCreator
        );
        require!(
            pool.status == PoolStatus::Open as u8,
            DrawError::PoolNotOpen
        );
        require!(pool.total_tickets > 0, DrawError::NoTicketsSold);
        pool.status = PoolStatus::RandomnessRequested as u8;
        emit!(RandomnessRequested {
            pool: pool.key(),
            requester: ctx.accounts.creator.key(),
        });
        Ok(())
    }

    pub fn fulfill_randomness(ctx: Context<FulfillRandomness>, randomness: [u8; 32]) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        pool.assert_seeds(pool.key())?;
        require_keys_eq!(
            pool.randomness_authority,
            ctx.accounts.authority.key(),
            DrawError::InvalidRandomnessAuthority
        );
        require!(
            pool.status == PoolStatus::RandomnessRequested as u8,
            DrawError::RandomnessNotRequested
        );
        require!(pool.total_tickets > 0, DrawError::NoTicketsSold);

        let winning_ticket = derive_winning_ticket(&randomness, pool.total_tickets);
        pool.randomness = randomness;
        pool.winning_ticket = winning_ticket;
        pool.status = PoolStatus::RandomnessFulfilled as u8;
        emit!(RandomnessFulfilled {
            pool: pool.key(),
            winning_ticket,
            total_tickets: pool.total_tickets,
        });
        Ok(())
    }

    pub fn distribute_rewards<'info>(
        ctx: Context<'_, '_, 'info, 'info, DistributeRewards<'info>>,
    ) -> Result<()> {
        let pool_key = ctx.accounts.pool.key();
        let creator_key = ctx.accounts.creator.key();
        let (winning_ticket, total_tickets) = {
            let pool = &ctx.accounts.pool;
            pool.assert_seeds(pool_key)?;
            require_keys_eq!(pool.creator, creator_key, DrawError::UnauthorizedCreator);
            require!(
                pool.status == PoolStatus::RandomnessFulfilled as u8,
                DrawError::RandomnessNotFulfilled
            );
            require!(pool.total_tickets > 0, DrawError::NoTicketsSold);
            (pool.winning_ticket, pool.total_tickets)
        };

        let mut cumulative: u64 = 0;
        let mut winner_key: Option<Pubkey> = None;
        for account_info in ctx.remaining_accounts.iter() {
            let participant: Account<Participant> = Account::try_from(account_info)?;
            require_keys_eq!(
                participant.pool,
                pool_key,
                DrawError::ParticipantPoolMismatch
            );
            let next = cumulative
                .checked_add(participant.tickets)
                .ok_or(DrawError::ArithmeticOverflow)?;
            if winner_key.is_none() && winning_ticket < next {
                winner_key = Some(participant.user);
            }
            cumulative = next;
        }
        let winner_key = winner_key.ok_or(DrawError::WinnerNotFound)?;
        require!(
            cumulative == total_tickets,
            DrawError::ParticipantListIncomplete
        );
        require_keys_eq!(
            ctx.accounts.payout.key(),
            winner_key,
            DrawError::PayoutRecipientMismatch
        );

        let pool = &mut ctx.accounts.pool;
        let rent = Rent::get()?;
        let minimum_balance = rent.minimum_balance(Pool::SPACE);
        let pool_account = pool.to_account_info();
        let available = pool_account
            .lamports()
            .checked_sub(minimum_balance)
            .ok_or(DrawError::InsufficientTreasury)?;
        require!(available > 0, DrawError::InsufficientTreasury);

        let pool_id_bytes = pool.pool_id.to_le_bytes();
        let bump_seed = [pool.bump];
        let seeds = [
            b"pool".as_ref(),
            pool.creator.as_ref(),
            pool_id_bytes.as_ref(),
            bump_seed.as_ref(),
        ];
        let signer_seeds = [&seeds[..]];

        let cpi_accounts = Transfer {
            from: pool_account.clone(),
            to: ctx.accounts.payout.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            cpi_accounts,
            &signer_seeds,
        );
        system_program::transfer(cpi_ctx, available)?;

        pool.status = PoolStatus::Settled as u8;
        pool.winner = winner_key;
        emit!(RewardsDistributed {
            pool: pool.key(),
            winner: winner_key,
            payout_lamports: available,
        });
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(pool_id: u64)]
pub struct CreatePool<'info> {
    #[account(
        init,
        payer = creator,
        space = Pool::SPACE,
        seeds = [b"pool", creator.key().as_ref(), &pool_id.to_le_bytes()],
        bump,
    )]
    pub pool: Account<'info, Pool>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinPool<'info> {
    #[account(mut)]
    pub pool: Account<'info, Pool>,
    #[account(
        init_if_needed,
        payer = user,
        space = Participant::SPACE,
        seeds = [b"participant", pool.key().as_ref(), user.key().as_ref()],
        bump,
    )]
    pub participant: Account<'info, Participant>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RequestRandomness<'info> {
    #[account(mut)]
    pub pool: Account<'info, Pool>,
    pub creator: Signer<'info>,
}

#[derive(Accounts)]
pub struct FulfillRandomness<'info> {
    #[account(mut)]
    pub pool: Account<'info, Pool>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct DistributeRewards<'info> {
    #[account(mut)]
    pub pool: Account<'info, Pool>,
    pub creator: Signer<'info>,
    #[account(mut)]
    pub payout: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Pool {
    pub creator: Pubkey,
    pub randomness_authority: Pubkey,
    pub pool_id: u64,
    pub ticket_price: u64,
    pub total_tickets: u64,
    pub randomness: [u8; 32],
    pub winning_ticket: u64,
    pub winner: Pubkey,
    pub status: u8,
    pub bump: u8,
}

impl Pool {
    pub const SIZE: usize = 32 + 32 + 8 + 8 + 8 + 32 + 8 + 32 + 1 + 1;
    pub const SPACE: usize = 8 + Self::SIZE;

    fn assert_seeds(&self, pool_key: Pubkey) -> Result<()> {
        let pool_id_bytes = self.pool_id.to_le_bytes();
        let bump_seed = [self.bump];
        let seeds = [
            b"pool".as_ref(),
            self.creator.as_ref(),
            pool_id_bytes.as_ref(),
            bump_seed.as_ref(),
        ];
        let expected = Pubkey::create_program_address(&seeds, &crate::ID)
            .map_err(|_| DrawError::InvalidPoolSeeds)?;
        require_keys_eq!(expected, pool_key, DrawError::InvalidPoolSeeds);
        Ok(())
    }
}

#[account]
pub struct Participant {
    pub pool: Pubkey,
    pub user: Pubkey,
    pub tickets: u64,
    pub bump: u8,
}

impl Participant {
    pub const SIZE: usize = 32 + 32 + 8 + 1;
    pub const SPACE: usize = 8 + Self::SIZE;
}

#[event]
pub struct PoolCreated {
    pub pool: Pubkey,
    pub creator: Pubkey,
    pub ticket_price: u64,
    pub randomness_authority: Pubkey,
}

#[event]
pub struct Joined {
    pub pool: Pubkey,
    pub user: Pubkey,
    pub tickets_purchased: u64,
    pub total_user_tickets: u64,
    pub total_pool_tickets: u64,
    pub lamports_paid: u64,
}

#[event]
pub struct RandomnessRequested {
    pub pool: Pubkey,
    pub requester: Pubkey,
}

#[event]
pub struct RandomnessFulfilled {
    pub pool: Pubkey,
    pub winning_ticket: u64,
    pub total_tickets: u64,
}

#[event]
pub struct RewardsDistributed {
    pub pool: Pubkey,
    pub winner: Pubkey,
    pub payout_lamports: u64,
}

fn derive_winning_ticket(randomness: &[u8; 32], total_tickets: u64) -> u64 {
    let mut eight_bytes = [0u8; 8];
    eight_bytes.copy_from_slice(&randomness[..8]);
    let raw = u64::from_le_bytes(eight_bytes);
    raw % total_tickets
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum PoolStatus {
    Open = 0,
    RandomnessRequested = 1,
    RandomnessFulfilled = 2,
    Settled = 3,
}

#[error_code]
pub enum DrawError {
    #[msg("Ticket price must be greater than zero")]
    InvalidTicketPrice,
    #[msg("Ticket count must be greater than zero")]
    InvalidTicketCount,
    #[msg("Pool is not open")]
    PoolNotOpen,
    #[msg("No tickets sold for this pool")]
    NoTicketsSold,
    #[msg("Randomness has not been requested")]
    RandomnessNotRequested,
    #[msg("Randomness has not been fulfilled")]
    RandomnessNotFulfilled,
    #[msg("Randomness fulfiller is not authorized")]
    InvalidRandomnessAuthority,
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
    #[msg("Participant account belongs to a different pool")]
    ParticipantPoolMismatch,
    #[msg("Participant account does not belong to signer")]
    UnauthorizedParticipantAccount,
    #[msg("Pool PDA seeds invalid")]
    InvalidPoolSeeds,
    #[msg("Unauthorized pool creator")]
    UnauthorizedCreator,
    #[msg("Participant list does not cover all tickets")]
    ParticipantListIncomplete,
    #[msg("Unable to locate winner in participant list")]
    WinnerNotFound,
    #[msg("Payout recipient must match computed winner")]
    PayoutRecipientMismatch,
    #[msg("Insufficient lamports to distribute after rent")]
    InsufficientTreasury,
}
