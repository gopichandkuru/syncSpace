import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center p-6 text-center space-y-6">
      <h1 className="text-7xl font-extrabold text-primary-500">404</h1>
      <div>
        <h2 className="text-2xl font-bold text-white">Page Not Found</h2>
        <p className="text-surface-400 text-sm mt-1">
          The link you followed may be broken or the workspace might have been deleted.
        </p>
      </div>
      <Link to="/dashboard" className="btn-primary">
        Back to Dashboard
      </Link>
    </div>
  );
}
