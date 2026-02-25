
"use client";
import  { useState } from 'react';
import UnsentClaims from './UnsentClaims';
import ErroredClaims from './ErroredClaims';
import RejectedClaims from './RejectedClaims';
import DeniedClaims from './DeniedClaims';
import HistoryClaims from './HistoryClaims';
import UnclaimedClaims from './UnclaimedClaims';

const tabs = [
  { id: 'unsent', label: 'Unsent Claims', component: <UnsentClaims /> },
  { id: 'errored', label: 'Errored Claims', component: <ErroredClaims /> },
  { id: 'rejected', label: 'Rejected Claims', component: <RejectedClaims /> },
  { id: 'denied', label: 'Billing Denials', component: <DeniedClaims /> },
  { id: 'history', label: 'History Claims', component: <HistoryClaims /> },
  { id: 'unclaimed', label: 'Unclaimed Claims', component: <UnclaimedClaims /> },
];

const ClaimManagementDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('unsent');

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <h2 className="font-semibold text-xl mb-4">Claim Management</h2>
      <div className="flex gap-2 mb-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`px-4 py-2 rounded ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div>
        {tabs.find(tab => tab.id === activeTab)?.component}
      </div>
    </div>
  );
};

export default ClaimManagementDashboard;
