

import React from 'react';
import CardBox from 'src/components/shared/CardBox'; // Importa CardBox

const LandingPage = () => {
  return (
    <div className="p-4">
      <h1 className="text-4xl font-bold text-center mb-8">[Nombre de la aseguradora]</h1>

      {/* Primer rectángulo grande */}
      <CardBox className="mb-8 p-8 h-64 flex items-center justify-center">
        <p className="text-xl">Contenido del primer rectángulo grande</p>
      </CardBox>

      {/* Tres rectángulos pequeños */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <CardBox className="p-6 h-48 flex items-center justify-center">
          <p>Contenido del rectángulo 1</p>
        </CardBox>
        <CardBox className="p-6 h-48 flex items-center justify-center">
          <p>Contenido del rectángulo 2</p>
        </CardBox>
        <CardBox className="p-6 h-48 flex items-center justify-center">
          <p>Contenido del rectángulo 3</p>
        </CardBox>
      </div>
    </div>
  );
};

export default LandingPage;