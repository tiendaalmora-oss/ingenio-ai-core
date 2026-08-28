import React from 'react';
import PageContainer from '@/components/PageContainer';
import PageHeader from '@/components/PageHeader';

export default function ComingSoonPage() {
  return (
    <PageContainer>
      <PageHeader title="Coming Soon" description="This module is under construction." />
      <div className="flex flex-col items-center justify-center h-[50vh] text-gray-500">
        <h2 className="text-2xl font-bold mb-2 text-gray-700">Work in Progress</h2>
        <p>This feature will be available in the next release.</p>
      </div>
    </PageContainer>
  );
}
