
import Link from "next/link";
import AuthLayout from "@/components/auth/AuthLayout";
import RegisterForm from "@/features/auth/components/RegisterForm";

export default function RegisterPage() {
  return (
    <AuthLayout
      title="Create your account"
      description="Start exploring your codebase with a clearer view of its architecture."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-[#b7a1ff] transition hover:text-white"
          >
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthLayout>
  );
}
