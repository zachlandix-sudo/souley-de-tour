import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { I18nProvider } from './i18n/I18nContext';
import { router } from './routes/router';

// v7_startTransition: a click on a link updates the router inside React.startTransition, so rendering the next page can be
// split into slices and the click handler returns at once. Without it the whole page renders inside the click (INP processing time).
export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
      </AuthProvider>
    </I18nProvider>
  );
}
