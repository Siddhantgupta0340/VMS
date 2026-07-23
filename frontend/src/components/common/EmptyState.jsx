const EmptyState = ({ icon: Icon, title, description, action }) => {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16">
      <div className="mb-4 rounded-full bg-slate-100 p-4">
        {Icon && <Icon className="h-8 w-8 text-slate-400" />}
      </div>

      <h3 className="mb-2 text-lg font-semibold text-slate-900">
        {title}
      </h3>

      <p className="mb-6 max-w-sm text-center text-sm text-slate-500">
        {description}
      </p>

      {action && <div>{action}</div>}
    </div>
  );
};

export default EmptyState;