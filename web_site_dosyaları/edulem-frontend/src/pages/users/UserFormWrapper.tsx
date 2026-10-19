import { useParams } from 'react-router-dom';
import UserForm from './UserForm';

const UserFormWrapper = () => {
  // id değişkeni kullanılmıyor, UserForm kendi içinde useParams kullanıyor
  void useParams<{ id?: string }>();
  
  // UserForm artık kendi içinde useParams kullanıyor, prop geçmiyoruz
  return <UserForm />;
};

export default UserFormWrapper;
