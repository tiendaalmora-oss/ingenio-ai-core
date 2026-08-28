import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
      <h2 className="text-2xl font-semibold text-gray-700 mb-6">Página no encontrada</h2>
      <p className="text-gray-500 mb-8 text-center max-w-md">
        La ruta que intentas acceder no existe o fue movida temporalmente.
      </p>
      <Link href="/dashboard" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
        Volver al inicio
      </Link>
    </div>
  );
}
