import { useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { getPatientProfilePDA,getDoctorProfilePDA, program } from '../anchor/setup';
import { SystemProgram } from '@solana/web3.js';

const RoleSelector = () => {
  const navigate = useNavigate();
  const { wallet, connected, publicKey, sendTransaction } = useWallet();
  const connection = program.provider.connection;

  const handleRoleSelect = async (role: 'doctor' | 'patient') => {
    if (!wallet) {
      console.error('Wallet not connected or not wallet');
      return;
    }
    if (!publicKey) {
        alert("Missing required data");
        return;
    }
    try {
      if (role === 'patient') {
        const patientProfilePDA = await getPatientProfilePDA(publicKey);

        const existingAccount = await program.account.patientProfile.fetchNullable(patientProfilePDA);
      
        if (existingAccount) {
          console.log("Patient profile already exists.");
          navigate(`/dashboard/patient`);
          return;
        }

        const tx = await program.methods
          .initializePatientProfile()
          .accounts({
            patientProfile: patientProfilePDA,
            user: publicKey,
            systemProgram: SystemProgram.programId,
          })
          .transaction();
        const txSig = await sendTransaction(tx, connection);
        console.log(
          `Patient Profile Created! View transaction: https://solana.fm/tx/${txSig}?cluster=devnet-alpha`
        );
        console.log('Patient profile initialized successfully');
      } else if (role === 'doctor') {
        const doctorProfilePDA = await getDoctorProfilePDA(publicKey);

        const existingAccount = await program.account.doctorProfile.fetchNullable(doctorProfilePDA);
        if (existingAccount) {
          console.log("Doctor profile already exists.");
          navigate(`/dashboard/doctor`);
          return;
        }
        const tx = await program.methods
          .initializeDoctorProfile()
          .accounts({
            doctorProfile: doctorProfilePDA,
            user: publicKey,
            systemProgram: SystemProgram.programId,
          })
          .transaction();
        const txSig = await sendTransaction(tx, connection);
        console.log(
          `Doctor Profile Created! View transaction: https://solana.fm/tx/${txSig}?cluster=devnet-alpha`
        );
        console.log('Doctor profile initialized successfully');
      }
      
      // Navigate to dashboard
      navigate(`/dashboard/${role}`);
    } catch (error) {
      console.error('Error initializing profile:', error);
      // Handle error (show toast, etc.)
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen space-y-6">
      <h2 className="text-2xl font-semibold">Select your role</h2>
      
      {!connected && (
        <p className="text-red-500 mb-4">Please connect your wallet first</p>
      )}
      
      <div className="flex space-x-6">
        <button
          onClick={() => handleRoleSelect('doctor')}
          disabled={!connected || !wallet}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          I am a Doctor
        </button>
        <button
          onClick={() => handleRoleSelect('patient')}
          disabled={!connected || !wallet}
          className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          I am a Patient
        </button>
      </div>
    </div>
  );
};

export default RoleSelector;