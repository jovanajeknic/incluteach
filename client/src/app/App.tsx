import { createBrowserRouter, RouterProvider } from 'react-router';
import { DemoParentProvider } from '@/features/parent/data/DemoParentProvider';
import { DemoSchoolProvider } from '@/features/school/DemoSchoolProvider';
import { DemoStudentProvider } from '@/features/student/data/DemoStudentProvider';
import { routes } from './routes';

const router = createBrowserRouter(routes);

export function App() {
  return (
    // One shared demo school above the router: teacher, student and parent views read the same
    // data, and it survives navigation (but not a page reload).
    <DemoSchoolProvider>
      <DemoStudentProvider>
        <DemoParentProvider>
          <RouterProvider router={router} />
        </DemoParentProvider>
      </DemoStudentProvider>
    </DemoSchoolProvider>
  );
}
