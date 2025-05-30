import CardBox from 'src/components/shared/CardBox'; // Importa CardBox


const LandingPage = () => {
  return (
    <div className="p-4">
      <div className="flex items-center justify-center mb-8">
        <h1 className="text-4xl font-bold text-center">Savalta Seguros: Tu Tranquilidad, Nuestra Prioridad </h1>
      </div>

      {/* Sección Principal: Presentación de Savalta */}
      <CardBox className="mb-8 p-8 h-64 flex items-center justify-center">
        <p className="text-xl text-center">
          En Savalta Seguros, entendemos la importancia de proteger lo que más valoras. Ofrecemos soluciones de seguros personalizadas para brindarte la tranquilidad que mereces. Desde seguros de vida y salud todo con el fin de tu bienestar, estamos aquí para acompañarte en cada paso.
        </p>
        <img src="/images/familiaamorosa.avif" alt="Familia Amorosa" className="w-full h-auto mt-4" />
        {/* Comentario: Aquí se puede insertar una imagen grande y atractiva que represente seguridad y confianza, como una familia feliz o un paisaje sereno. */}
      </CardBox>

      {/* Sección de Servicios Destacados */}
      <CardBox className="mb-8 p-8 h-64 flex items-center justify-center">
        <p className="text-xl text-center">
          Descubre nuestra amplia gama de productos diseñados para cubrir todas tus necesidades:
          <br />
          <b>Seguro de Vida:</b> Protege el futuro de tus seres queridos.
          <br />
          <b>Seguro de Salud:</b> Acceso a la mejor atención médica.
          <br />
        </p>
        <img src="/images/S.jpg" alt="Nuestros Productos" className="w-full h-auto mt-4" />
        {/* Comentario: Aquí se puede insertar una imagen que muestre los diferentes tipos de seguros ofrecidos, quizás con iconos representativos para cada uno. */}
      </CardBox>

      {/* Tres rectángulos pequeños: Beneficios Clave */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <CardBox className="p-6 h-48 flex items-center justify-center text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Atención Personalizada</h2>
          <p>Asesoramiento experto para encontrar el seguro ideal para ti.</p>
          {/* Espacio para imagen de Atención Personalizada */}
          <img src="/images/p.png" alt="Atención Personalizada" className="w-full h-auto mt-4" />
        </CardBox>

        <CardBox>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Cobertura Integral</h2>
          <p>Amplias opciones de cobertura para tu total tranquilidad.</p>
          {/* Espacio para imagen de Cobertura Integral */}
          <img src="/images/c.webp" alt="Cobertura Integral" className="w-full h-auto mt-4" />
        </CardBox>

        <CardBox>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Soporte 24/7</h2>
          <p>Siempre disponibles para resolver tus dudas y asistirte en cada paso.</p>
          {/* Espacio para imagen de Soporte 24/7 */}
          <img src="/images/Atencioncliente" alt="Soporte 24/7" className="w-full h-auto mt-4" />
        </CardBox>
      </div>
    </div>
  );
};

export default LandingPage;