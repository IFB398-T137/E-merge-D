import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // log to console — the console output will appear in the devtools
    console.error("Unhandled error caught by ErrorBoundary:", error, info);
    this.setState({ info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20 }}>
          <h2>Something went wrong</h2>
          <pre style={{ whiteSpace: "pre-wrap", color: "#b00020" }}>
            {String(this.state.error && this.state.error.toString())}
          </pre>
          <details style={{ whiteSpace: "pre-wrap" }}>
            {this.state.info && this.state.info.componentStack}
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
