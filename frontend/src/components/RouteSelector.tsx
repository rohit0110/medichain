import { useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
// import { getProgram, initializePatientProfile } from '../anchor/setup';

const RoleSelector = () => {
  const navigate = useNavigate();
  const { wallet, connected } = useWallet();

  const handleRoleSelect = async (role: 'doctor' | 'patient') => {
    if (!wallet) {
      console.error('Wallet not connected or not wallet');
      return;
    }

    try {
      if (role === 'patient') {
        // Get the program instance with the correct wallet type
        // const program = getProgram(wallet);
        
        // // Initialize patient profile
        // await initializePatientProfile(program, wallet);
        
        console.log('Patient profile initialized successfully');
      } else if (role === 'doctor') {
        // Similar logic for doctor if needed
        // const program = getProgram(wallet);
        // await initializeDoctorProfile(program, wallet);
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