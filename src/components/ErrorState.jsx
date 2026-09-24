export default function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <div className="state state-error" role="alert">
      <h3>We hit a snag</h3>
      <p>{message}</p>
      {onRetry && <button className="btn btn-outline" onClick={() => onRetry()}>Try again</button>}
    </div>
  );
}
