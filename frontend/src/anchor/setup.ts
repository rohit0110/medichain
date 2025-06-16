import { type IdlAccounts, Program } from "@coral-xyz/anchor";
import { IDL, type Contract } from "./idl";
import { Connection, PublicKey } from "@solana/web3.js";
import { Buffer } from "buffer";
import { PROGRAM_ID } from "../constants/constants";


// Constants
// export const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
export const connection = new Connection("http://127.0.0.1:8899", "confirmed");
// export const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");

// Program instance
export const program = new Program<Contract>(IDL, PROGRAM_ID, { connection });

// Get Doctor Profile PDA
function getDoctorProfilePDA(doctor: PublicKey) : PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("doctor_profile"), doctor.toBuffer()],
    PROGRAM_ID
  )[0];
}

// Get Patient Profile PDA
function getPatientProfilePDA(patient: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("patient_profile"), patient.toBuffer()],
    PROGRAM_ID
  )[0];
}

function getDocumentPDA(patient: PublicKey, ipfsHash: string): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("document"), patient.toBuffer(), Buffer.from(ipfsHash)],
    PROGRAM_ID
  )[0];
}

export type DoctorProfile = IdlAccounts<Contract>["doctorProfile"];
export type PatientProfile = IdlAccounts<Contract>["patientProfile"];
export type Document = IdlAccounts<Contract>["document"];

export { getDoctorProfilePDA, getPatientProfilePDA, getDocumentPDA};