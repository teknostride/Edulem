import { useParams } from 'react-router-dom';
import BranchForm from './BranchForm';

const BranchFormWrapper = () => {
  const { id } = useParams<{ id?: string }>();
  return <BranchForm branchId={id ? parseInt(id) : undefined} />;
};

export default BranchFormWrapper;
