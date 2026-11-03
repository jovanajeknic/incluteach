import { createBrowserRouter, RouterProvider } from 'react-router';
import { DemoLessonsProvider } from '@/features/lessons/data/DemoLessonsProvider';
import { DemoStudentProvider } from '@/features/student/data/DemoStudentProvider';
import { routes } from './routes';

const router = createBrowserRouter(routes);

export function App() {
  return (
    // The provider sits above the router so lesson data survives navigation.
    <DemoLessonsProvider>
      <DemoStudentProvider>
        <RouterProvider router={router} />
      </DemoStudentProvider>
    </DemoLessonsProvider>
  );
}
