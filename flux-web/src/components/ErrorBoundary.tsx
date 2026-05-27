import { Component, ReactNode } from "react";

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: string; }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#080820",
          padding: "24px",
          gap: "16px",
        }}>
          <p style={{ fontSize: "32px" }}>⚡</p>
          <h2 style={{ color: "#e8e8f0", fontSize: "20px", fontWeight: "700" }}>
            Something went wrong
          </h2>
          <p style={{ color: "#6b7280", fontSize: "14px", textAlign: "center" }}>
            {this.state.error}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: "linear-gradient(135deg, #6c63ff, #00d4ff)",
              border: "none",
              borderRadius: "12px",
              padding: "12px 24px",
              color: "white",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
