import { Link } from 'react-router-dom';

export default function EmptyState({ title, text, actionLabel, actionTo, onAction }) {
  return (
    <div className="state">
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {actionTo && <Link className="btn btn-primary" to={actionTo}>{actionLabel}</Link>}
      {onAction && <button className="btn btn-outline" onClick={onAction}>{actionLabel}</button>}
    </div>
  );
}
