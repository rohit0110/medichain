// TODO
When doctor clicks on doc from list, get encrypted file and then decrypt client side?
Whenever Upload button is clicked from patient side it should encrypt and put the file on IPFS
Add Navbar

// KEEP IN MIND WHILE BUILDING SMART CONTRACT
Upload function for PDF
Track Docs owned by Patient
Track Wallets allowed to access each document
Allow Docs to query Docs shared with them

initialize_document(owner, encrypted_ipfs_cid, allowed_wallets)
get_document_metadata(doc_id: Pubkey)
get_documents_by_wallet(wallet: Pubkey)
revoke_access(doc_id: Pubkey, doctor: Pubkey)
grant_access(doc_id: Pubkey, doctor: Pubkey)
