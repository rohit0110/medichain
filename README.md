// TODO
When doctor clicks on doc from list, get encrypted file and then decrypt client side?
Whenever Upload button is clicked from patient side it should encrypt and put the file on IPFS <-------
Add document limit reached error
add test for multiple users adding a doctor and checking list
add conditions for not being able to add more doctors to a document if already at limit
~Delete Document~
add checks on doctor transactions for on the list that has been shared with them


// KEEP IN MIND WHILE BUILDING SMART CONTRACT
Upload function for PDF
Track Docs owned by Patient
Track Wallets allowed to access each document
Allow Docs to query Docs shared with them

initialize_document(owner, encrypted_ipfs_cid, allowed_wallets)
get_document_metadata(doc_id: Pubkey)
get_documents_by_wallet(wallet: Pubkey)
revoke_access(doctor: Pubkey)
grant_access(doctor: Pubkey)

// THINK
Should doctor be requesting access, otherwise doctors pubkey can be spammed by anyone and their view filled? \

Better Names
Needs to be Mobile Friendly
MRI scans etc probably needs to be shared without ZK but Medical history can be ZK?