import { useAuthActions } from "@convex-dev/auth/react";
import { Github } from "lucide-react";

export default function Login() {
  const { signIn } = useAuthActions();

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Tasks</h1>
        <p>Sign in to manage your tasks</p>
        <button type="button" className="login-btn" onClick={() => void signIn("github")}>
          <Github size={18} />
          Sign in with GitHub
        </button>
      </div>
    </div>
  );
}
