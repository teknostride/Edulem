import { useParams } from 'react-router-dom';
import StudentForm from './StudentForm';

const StudentFormWrapper = () => {
  const { id } = useParams<{ id?: string }>();
  
  return <StudentForm studentId={id ? parseInt(id) : undefined} />;
};

export default StudentFormWrapper;
