use anchor_lang::prelude::*;
use sha2::{Sha256, Digest};
declare_id!("98TGc38djoRGd7rczpJ2nJWgLv2oNpXrDcGkJ8n4kPDG");

#[program]
pub mod contract {
    use super::*;

    pub fn initialize_document(ctx: Context<InitializeDocument>, ipfs_hash: String, title: String, description: String, salt: [u8;16]) -> Result<()> {
        let document = &mut ctx.accounts.document;
        document.ipfs_hash = ipfs_hash;
        document.title = title;
        document.description = description;
        document.salt = salt;
        document.owner = ctx.accounts.user.key();
        document.access_list = vec![]; // Initialize with an empty access list
        document.access_list.push(ctx.accounts.user.key()); // Add the user to the access list
        ctx.accounts.patient_profile.documents.push(document.key());

        Ok(())
    }

    pub fn initialize_patient_profile(ctx: Context<InitializePatient>) -> Result<()> {
        let patient_profile = &mut ctx.accounts.patient_profile;
        patient_profile.user = ctx.accounts.user.key();
        patient_profile.documents = vec![]; // Initialize with an empty document list
        Ok(())
    }

    pub fn initialize_doctor_profile(ctx: Context<InitializeDoctor>) -> Result<()> {
        let doctor_profile = &mut ctx.accounts.doctor_profile;
        doctor_profile.user = ctx.accounts.user.key();
        doctor_profile.documents = Vec::with_capacity(10); // Initialize with an empty document list
        Ok(())
    }

    pub fn grant_access(ctx: Context<ModifyAccess>, doctor_pubkey: Pubkey, _ipfs_hash: String) -> Result<()> {
        let document = &mut ctx.accounts.document;
        let doctor_profile = &mut ctx.accounts.doctor_profile;
        
        // Check if doctor already has access
        if document.access_list.contains(&doctor_pubkey) {
            msg!("Doctor already has access");
            return Ok(());
        }
    
        document.access_list.push(doctor_pubkey);
        doctor_profile.documents.push(document.key());
        Ok(())
    }

    pub fn revoke_access(ctx: Context<ModifyAccess>, doctor_pubkey: Pubkey, _ipfs_hash: String) -> Result<()> {
        let document = &mut ctx.accounts.document;
        require!(document.owner == ctx.accounts.owner.key(), ContractError::Unauthorized);
        if let Some(pos) = document.access_list.iter().position(|&x| x == doctor_pubkey) {
            document.access_list.remove(pos);
        }
        if let Some(pos) = ctx.accounts.doctor_profile.documents.iter().position(|&x| x == document.key()) {
            ctx.accounts.doctor_profile.documents.remove(pos);
        }
        Ok(())
    }

    pub fn delete_document(ctx: Context<DeleteDocument>, _ipfs_hash: String) -> Result<()> {
        let document = &mut ctx.accounts.document;
        require!(document.owner == ctx.accounts.user.key(), ContractError::Unauthorized);
        
        // Remove the document from the patient's profile
        if let Some(pos) = ctx.accounts.patient_profile.documents.iter().position(|&x| x == document.key()) {
            ctx.accounts.patient_profile.documents.remove(pos);
        }

        Ok(())
    }

    
}

#[derive(Accounts)]
#[instruction(ipfs_hash: String, title: String, description: String, salt: [u8;16])]
pub struct InitializeDocument<'info> {
    #[account(
        init,
        payer = user, 
        space = 8 + Document::INIT_SPACE,
        seeds = [b"document", user.key().as_ref(), &hash_ipfs(&ipfs_hash).as_ref()],
        bump
    )]
    pub document: Account<'info, Document>,
    #[account(
        mut,
        seeds = [b"patient_profile", user.key().as_ref()],
        bump
    )]
    pub patient_profile: Account<'info, PatientProfile>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializePatient<'info> {
    #[account(
        init,
        payer = user, 
        space = 8 + PatientProfile::INIT_SPACE,
        seeds = [b"patient_profile", user.key().as_ref()],
        bump
    )]
    pub patient_profile: Account<'info, PatientProfile>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeDoctor<'info> {
    #[account(
        init,
        payer = user, 
        space = 8 + DoctorProfile::INIT_SPACE,
        seeds = [b"doctor_profile", user.key().as_ref()],
        bump
    )]
    pub doctor_profile: Account<'info, DoctorProfile>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(doctor_pubkey: Pubkey ,ipfs_hash: String)]
pub struct ModifyAccess<'info> {
    #[account(
        mut,
        seeds = [b"document", owner.key().as_ref(), &hash_ipfs(&ipfs_hash).as_ref()],
        bump
    )]
    pub document: Account<'info, Document>,
    pub owner: Signer<'info>, 
    #[account(
        mut,
        seeds = [b"doctor_profile", doctor_pubkey.as_ref()],
        bump
        )]
    pub doctor_profile: Account<'info, DoctorProfile>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(ipfs_hash: String)]
pub struct DeleteDocument<'info> {
    #[account(
        mut,
        close = user, // Close the account and transfer lamports to the user
        constraint = document.owner == user.key(),
        seeds = [b"document", user.key().as_ref(), &hash_ipfs(&ipfs_hash).as_ref()],
        bump
    )]
    pub document: Account<'info, Document>,
    #[account(
        mut,
        seeds = [b"patient_profile", user.key().as_ref()],
        constraint = patient_profile.user == user.key(),
        bump
    )]
    pub patient_profile: Account<'info, PatientProfile>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct Document {
    #[max_len(64)]
    pub ipfs_hash: String,
    #[max_len(64)]
    pub title: String,
    #[max_len(256)]
    pub description: String,
    pub salt: [u8;16], // Unique salt for the document
    pub owner: Pubkey,
    #[max_len(10)]
    pub access_list: Vec<Pubkey>, // List of addresses with access
}

#[account]
#[derive(InitSpace)]
pub struct PatientProfile {
    pub user: Pubkey,
    #[max_len(10)]
    pub documents: Vec<Pubkey>, // List of document accounts associated with the patient
}

#[account]
#[derive(InitSpace)]
pub struct DoctorProfile {
    pub user: Pubkey,
    #[max_len(10)]
    pub documents: Vec<Pubkey>, // List of documents whos access has been given to the doctor
}

#[error_code]
pub enum ContractError {
    #[msg("Unauthorized access attempt.")]
    Unauthorized,
    #[msg("Attempted to create a document without being a valid patient.")]
    NoPatientProfile
}

pub fn hash_ipfs(ipfs: &str) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(ipfs.as_bytes());
    hasher.finalize().into()
}

