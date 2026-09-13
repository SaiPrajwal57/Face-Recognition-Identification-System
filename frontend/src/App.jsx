import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Identification from './pages/Identification';
import Enrollment from './pages/Enrollment';
import PeopleDatabase from './pages/PeopleDatabase';
import PersonDetails from './pages/PersonDetails';
import RecognitionHistory from './pages/RecognitionHistory';
import Settings from './pages/Settings';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/live" element={<Identification defaultMode="live" />} />
        <Route path="/identify" element={<Identification />} />
        <Route path="/enroll" element={<Enrollment />} />
        <Route path="/people" element={<PeopleDatabase />} />
        <Route path="/people/:personId" element={<PersonDetails />} />
        <Route path="/history" element={<RecognitionHistory />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
