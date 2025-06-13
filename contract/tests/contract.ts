import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Contract } from "../target/types/contract";
import { assert } from "chai";

describe("contract", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Contract as Program<Contract>;
  const patient = anchor.web3.Keypair.generate();
  const doctor = anchor.web3.Keypair.generate();
  const ipfsHashes = ["ipfs1", "ipfs2"];
  const documentPDAs: anchor.web3.PublicKey[] = [];

  const airdrop = async (key: anchor.web3.PublicKey) => {
    const sig = await provider.connection.requestAirdrop(key, 5 * anchor.web3.LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(sig);
  };

  const getPatientProfilePDA = () =>
    anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("patient_profile"), patient.publicKey.toBuffer()],
      program.programId
    );

  const getDoctorProfilePDA = () =>
    anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("doctor_profile"), doctor.publicKey.toBuffer()],
      program.programId
    );

  const getDocumentPDA = (ipfsHash: string) =>
    anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("document"), patient.publicKey.toBuffer(), Buffer.from(ipfsHash)],
      program.programId
    );

  it("Initializes patient and doctor profiles", async () => {
    await airdrop(patient.publicKey);
    await airdrop(doctor.publicKey);

    const [patientPDA] = getPatientProfilePDA();
    const [doctorPDA] = getDoctorProfilePDA();

    await program.methods.initializePatientProfile()
      .accounts({
        patientProfile: patientPDA,
        user: patient.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([patient])
      .rpc();

    await program.methods.initializeDoctorProfile()
      .accounts({
        doctorProfile: doctorPDA,
        user: doctor.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([doctor])
      .rpc();

    const patientProfile = await provider.connection.getAccountInfo(patientPDA);
    const profile = await program.account.patientProfile.fetch(patientPDA);
    console.log("Patient profile size", patientProfile.data.length);
    console.log("Patient documents variable size", profile.documents.length);
    const doctorProfile = await provider.connection.getAccountInfo(doctorPDA);
    const docProfile = await program.account.doctorProfile.fetch(doctorPDA);
    console.log("Doctor profile size", doctorProfile.data.length);
    console.log("Doctor documents variable size", docProfile.documents.length);
  });

  it("Creates multiple documents for patient", async () => {
    const [patientPDA] = getPatientProfilePDA();

    for (let i = 0; i < ipfsHashes.length; i++) {
      const ipfsHash = ipfsHashes[i];
      const [docPDA] = getDocumentPDA(ipfsHash);
      documentPDAs.push(docPDA);

      await program.methods.initializeDocument(ipfsHash, `Title ${i + 1}`)
        .accounts({
          document: docPDA,
          patientProfile: patientPDA,
          user: patient.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([patient])
        .rpc();
    }
    const accInfo = await provider.connection.getAccountInfo(documentPDAs[0]);
    console.log("Actual allocated space:", accInfo.data.length);
    const profile = await program.account.patientProfile.fetch(patientPDA);
    assert.equal(profile.documents.length, ipfsHashes.length);
  });

  it("Debug account sizes before grant access", async () => {
    const [doctorPDA] = getDoctorProfilePDA();
    const [patientPDA] = getPatientProfilePDA();
    
    // Get raw account info
    const documentAccountInfo = await program.provider.connection.getAccountInfo(documentPDAs[0]);
    const doctorAccountInfo = await program.provider.connection.getAccountInfo(doctorPDA);
    const patientAccountInfo = await program.provider.connection.getAccountInfo(patientPDA);
    
    console.log("=== ACCOUNT SIZES ===");
    console.log("Document account data length:", documentAccountInfo.data.length);
    console.log("Doctor account data length:", doctorAccountInfo.data.length);
    console.log("Patient account data length:", patientAccountInfo.data.length);
    
    // Get parsed account data
    const documentData = await program.account.document.fetch(documentPDAs[0]);
    const doctorData = await program.account.doctorProfile.fetch(doctorPDA);
    const patientData = await program.account.patientProfile.fetch(patientPDA);
    
    console.log("=== CURRENT DATA ===");
    console.log("Document access_list length:", documentData.accessList.length);
    console.log("Document access_list:", documentData.accessList.map(k => k.toString()));
    console.log("Doctor documents length:", doctorData.documents.length);
    console.log("Doctor documents:", doctorData.documents.map(k => k.toString()));
    console.log("Patient documents length:", patientData.documents.length);
    
    // Check if accounts have enough space for one more entry
    console.log("=== SPACE ANALYSIS ===");
    console.log("Document has space for more access?", documentData.accessList.length < 10);
    console.log("Doctor has space for more docs?", doctorData.documents.length < 10);
});

  it("Grants access to doctor", async () => {
    const [doctorPDA] = getDoctorProfilePDA();
    const [patientPDA] = getPatientProfilePDA();

    await program.methods.grantAccess(doctor.publicKey, ipfsHashes[0])
      .accounts({
        document: documentPDAs[0],
        owner: patient.publicKey,
        doctorProfile: doctorPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([patient])
      .rpc();

    const doc = await program.account.document.fetch(documentPDAs[0]);
    assert.include(doc.accessList.map(k => k.toBase58()), doctor.publicKey.toBase58());

    const docProfile = await program.account.doctorProfile.fetch(doctorPDA);
    assert.include(docProfile.documents.map(k => k.toBase58()), documentPDAs[0].toBase58());
  });

  it("Revokes access from doctor", async () => {
    const [doctorPDA] = getDoctorProfilePDA();
    const [patientPDA] = getPatientProfilePDA();

    await program.methods.revokeAccess(doctor.publicKey, ipfsHashes[0])
      .accounts({
        document: documentPDAs[0],
        owner: patient.publicKey,
        doctorProfile: doctorPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([patient])
      .rpc();

    const doc = await program.account.document.fetch(documentPDAs[0]);
    assert.notInclude(doc.accessList.map(k => k.toBase58()), doctor.publicKey.toBase58());

    const docProfile = await program.account.doctorProfile.fetch(doctorPDA);
    assert.notInclude(docProfile.documents.map(k => k.toBase58()), documentPDAs[0].toBase58());
  });

  it("Deletes document", async () => {
    const [patientPDA] = getPatientProfilePDA();
    const [docPDA] = getDocumentPDA(ipfsHashes[0]);
    await program.methods.deleteDocument(ipfsHashes[0])
      .accounts({
        document: docPDA,
        patientProfile: patientPDA,
        user: patient.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([patient])
      .rpc();
    const accInfo = await provider.connection.getAccountInfo(docPDA);
    assert.isNull(accInfo, "Document account should be deleted");
    const profile = await program.account.patientProfile.fetch(patientPDA);
    assert.notInclude(profile.documents.map(k => k.toBase58()), docPDA.toBase58(), "Document should be removed from patient profile");
  });
});
