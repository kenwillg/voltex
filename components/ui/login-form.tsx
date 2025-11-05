"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface LoginFormData {
  email: string;
  password: string;
}

export function LoginForm() {
  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Simulate authentication process
      // In real app, this would be an API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For demo purposes, accept any email/password
      // In real app, validate credentials here
      if (formData.email && formData.password) {
        // Redirect to dashboard without exposing credentials in URL
        router.push('/dashboard');
      } else {
        alert('Please enter both email and password');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label
          className="text-sm font-medium text-foreground"
          htmlFor="email"
        >
          Work email
        </label>
        <input
          className="w-full rounded-2xl border border-border/70 bg-background/60 px-5 py-3 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
          id="email"
          name="email"
          placeholder="you@company.com"
          required
          type="email"
          value={formData.email}
          onChange={handleInputChange}
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <label className="font-medium text-foreground" htmlFor="password">
            Password
          </label>
          <Link
            className="font-medium text-primary transition hover:text-primary/80"
            href="#"
          >
            Forgot password?
          </Link>
        </div>
        <input
          className="w-full rounded-2xl border border-border/70 bg-background/60 px-5 py-3 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
          id="password"
          name="password"
          placeholder="Enter your password"
          required
          type="password"
          value={formData.password}
          onChange={handleInputChange}
          disabled={isLoading}
        />
      </div>

      <div className="flex flex-col gap-4 pt-4">
        <button
          className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-base font-semibold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-primary-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Signing in...
            </>
          ) : (
            "Sign in"
          )}
        </button>
        <p className="text-sm text-muted-foreground">
          By continuing you agree to our internal policies and confirm you are accessing company information securely.
        </p>
      </div>
    </form>
  );
}