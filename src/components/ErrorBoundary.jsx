import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error(error, info); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="setup">
        <div className="setup-card">
          <h1>Something went wrong</h1>
          <p>An unexpected error occurred. Please reload the page.</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>Reload</button>
        </div>
      </div>
    );
  }
}
