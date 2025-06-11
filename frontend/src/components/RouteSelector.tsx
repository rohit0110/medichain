'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

const RoleSelector = () => {
  const router = useRouter();

  const handleRoleSelect = (role: 'doctor' | 'patient') => {
    router.push(`/dashboard/${role}`);
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen space-y-6">
      <h2 className="text-2xl font-semibold">Select your role</h2>
      <div className="flex space-x-6">
        <button
          onClick={() => handleRoleSelect('doctor')}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
        >
        I am a Doctor
        </button>
        <button
          onClick={() => handleRoleSelect('patient')}
          className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700"
        >
        I am a Patient
        </button>
      </div>
    </div>
  );
};

export default RoleSelector;
