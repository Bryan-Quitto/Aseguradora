import { RouterProvider } from "react-router-dom";
import { Flowbite, ThemeModeScript } from 'flowbite-react';
import customTheme from './utils/theme/custom-theme';
import router from "./routes/Router";
import { AuthProvider } from "./contexts/AuthContext"; 

function App() {
  return (
    <>
      <ThemeModeScript />
      <Flowbite theme={{ theme: customTheme }}>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </Flowbite>
    </>
  );
}

export default App;