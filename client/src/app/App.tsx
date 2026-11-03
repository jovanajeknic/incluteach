import { createBrowserRouter, RouterProvider } from 'react-router';
import { DemoLessonsProvider } from '@/features/lessons/data/DemoLessonsProvider';
import { DemoParentProvider } from '@/features/parent/data/DemoParentProvider';
import { DemoStudentProvider } from '@/features/student/data/DemoStudentProvider';
import { routes } from './routes';

const router = createBrowserRouter(routes);

export function App() {
  return (
    // The provider sits above the router so lesson data survives navigation.
    <DemoLessonsProvider>
      <DemoStudentProvider>
        {/* Inside the student provider: the parent sees the demo student's live progress. */}
        <DemoParentProvider>
          <RouterProvider router={router} />
        </DemoParentProvider>
      </DemoStudentProvider>
    </DemoLessonsProvider>
  );
}
