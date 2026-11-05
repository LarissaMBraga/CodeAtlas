
import Link from "next/link";
import AuthLayout from "@/components/auth/AuthLayout";
import LoginForm from "@/features/auth/components/LoginForm";

export default function LoginPage() {
  return (
    <AuthLayout
      title="Welcome back"
      description="Sign in to continue exploring your codebase."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-medium text-[#b7a1ff] transition hover:text-white"
          >
            Create account
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthLayout>
  );
}
