import { useParams } from 'react-router-dom';
import StudentDetail from './StudentDetail';

const StudentDetailWrapper = () => {
  const { id } = useParams<{ id: string }>();
  
  if (!id) {
    return <div>Öğrenci ID bulunamadı!</div>;
  }

  return <StudentDetail studentId={parseInt(id)} />;
};

export default StudentDetailWrapper;
