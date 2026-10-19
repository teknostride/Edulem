import { useParams } from 'react-router-dom';
import UserDetail from './UserDetail';

const UserDetailWrapper = () => {
  const { id } = useParams<{ id: string }>();
  
  if (!id) {
    return <div>Kullanıcı ID bulunamadı!</div>;
  }

  return <UserDetail userId={parseInt(id)} />;
};

export default UserDetailWrapper;
