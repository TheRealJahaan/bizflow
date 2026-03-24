"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "../../../lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    business_name: "",
    gstin: "",
    state_code: "29",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/register", form);
      router.push("/login");
    } catch (err: any) {
      setError(err.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  const fields = [
    { name: "name", label: "Your Name", placeholder: "Rajesh Kumar", type: "text" },
    { name: "email", label: "Email", placeholder: "rajesh@company.com", type: "email" },
    { name: "password", label: "Password", placeholder: "Min 8 characters", type: "password" },
    { name: "business_name", label: "Business Name", placeholder: "TechSolutions Pvt. Ltd.", type: "text" },
    { name: "gstin", label: "GSTIN", placeholder: "29AABCT3518Q1ZV", type: "text" },
  ];

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-stone-200 p-8 w-full max-w-sm shadow-sm">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
            B
          </div>
          <div className="font-bold text-stone-800 text-sm">
            Create your BizFlow account
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {fields.map(({ name, label, placeholder, type }) => (
            <div key={name}>
              <label className="block text-xs font-medium text-stone-500 mb-1">
                {label}
              </label>
              <input
                name={name}
                type={type}
                placeholder={placeholder}
                value={(form as any)[name]}
                onChange={handleChange}
                required
                className={`w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-emerald-400 ${
                  name === "gstin" ? "font-mono uppercase" : ""
                }`}
              />
            </div>
          ))}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 text-white py-2.5 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 mt-2"
          >
            {loading ? "Creating..." : "Create Free Account"}
          </button>
        </form>

        <p className="text-center text-sm text-stone-400 mt-4">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-emerald-600 font-medium hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}