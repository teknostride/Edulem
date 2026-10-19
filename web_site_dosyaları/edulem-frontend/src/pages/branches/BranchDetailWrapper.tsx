import { useParams } from 'react-router-dom';
import BranchDetail from './BranchDetail';

const BranchDetailWrapper = () => {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <BranchDetail branchId={parseInt(id)} />;
};

export default BranchDetailWrapper;
