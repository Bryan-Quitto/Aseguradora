import { useEffect, ReactNode } from 'react';

interface PageContainerProps {
  title?: string;
  description?: string;
  children: ReactNode;
  headerContent?: ReactNode; // Para botones y otros elementos en la cabecera
}

const PageContainer = ({ title, description, children, headerContent }: PageContainerProps) => {
  
  useEffect(() => {
    const defaultTitle = 'Savalta Seguros';
    const defaultDescription = 'Tu Tranquilidad, Nuestra Prioridad.';

    if (title) {
      document.title = `${title} | Savalta Seguros`;
    } else {
      document.title = defaultTitle;
    }

    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }

    if (description) {
      metaDescription.setAttribute('content', description);
    } else {
      metaDescription.setAttribute('content', defaultDescription);
    }
  }, [title, description]);

  return (
    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 md:p-8 w-full">
      {(title || headerContent) && (
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
          {title && <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{title}</h2>}
          <div>{headerContent}</div>
        </div>
      )}
      <div>{children}</div>
    </div>
  );
};

export default PageContainer;