import React, { useState, useContext } from "react";
import { useMutation, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useLocation } from "wouter";

// Define User and Credential types
interface User {
    id: string;
    username: string;
    email: string;
}
interface LoginCredentials {
    email: string;
    password: string;
}

// Simple schema-like validation for demonstration
const loginSchema = {
    safeParse: (data: any) => {
        if (data.email && data.password && data.email.includes("@") && data.password.length >= 6) {
            return { success: true, data: data as LoginCredentials };
        }
        return { success: false, error: { issues: [{ message: "Email must be valid and password must be at least 6 characters." }] } };
    },
};

// Minimal UserContext
const UserContext = React.createContext({
    user: null as User | null,
    setUser: (_user: User | null) => { },
});

const queryClient = new QueryClient();

export const LoginForm = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const { setUser } = useContext(UserContext);
    const [, setLocation] = useLocation();

    const loginMutation = useMutation({
        mutationFn: async (credentials: LoginCredentials) => {
            const response = await fetch("/api/user/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(credentials),
            });
            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = `Login failed (Status: ${response.status}).`;

                try {
                    const errorData = JSON.parse(errorText);
                    if (Array.isArray(errorData) && errorData[0]?.message) {
                        errorMessage = `Validation Error: ${errorData[0].message}`;
                    } else if (typeof errorData === "object" && "message" in errorData) {
                        errorMessage = errorData.message;
                    }
                } catch {
                    errorMessage = errorText || errorMessage;
                }
                throw new Error(errorMessage);
            }
            return response.json();
        },
        onSuccess: (data: { user: User }) => {
            setUser(data.user);
            localStorage.setItem("sessionId", data.sessionId);  // Save your session id or token
            localStorage.setItem("user", JSON.stringify(data.user)); // Save user info if needed
            setLocation("/");
        },
        onError: (error: Error) => {
            setError(error.message || "An unexpected error occurred during login.");
        },
    });

    const isLoggingIn = loginMutation.isLoading;

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");

        const validation = loginSchema.safeParse({ email, password });
        if (!validation.success) {
            setError(validation.error.issues[0].message);
            return;
        }
        loginMutation.mutate({ email, password });
    };

    return (
        <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md font-inter">
            <div className="text-center logo-border">
                <div className="mb-4 text-center">
                    <img
                    className="logoimage h-full object-contain rounded"
                    loading="lazy"  
                    src="https://img-2.outlookindia.com/outlookindia/2024-02/96fb06ce-1cc8-410e-ad6c-da4de57405f8/Outlook.svg" alt="Logo"   />
                    
                </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6 mt-3 text-center">Login to Flipbook</h2>
            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Email
                    </label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="Email (e.g., test@example.com)"
                        autoComplete="email"
                        disabled={isLoggingIn}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        style={{ color: "black" }}
                    />
                </div>

                <div className="mb-6">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                        Password
                    </label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="Password"
                        disabled={isLoggingIn}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        style={{ color: "black" }}
                    />
                </div>

                {error && (
                    <div className="p-3 mb-4 text-red-700 bg-red-100 rounded-lg text-sm font-medium border border-red-300">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full justify-center py-2 px-4 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50 transition disabled:bg-blue-400"
                >
                    {isLoggingIn ? "Authenticating..." : "Login"}
                </button>

                <div className="text-center text-xs text-gray-500 pt-3">
                    <p> 
                        2025 &copy; Knowledge Jockey - outlookindia.com
                    </p>
                </div>
            </form>
        </div>
    );
};

// export default function App() {
//   const [user, setUser] = useState<User | null>(null);

//   return (
//     <QueryClientProvider client={queryClient}>
//       <UserContext.Provider value={{ user, setUser }}>
//         <div className="min-h-screen flex items-center justify-center bg-gray-50">
//           <LoginForm />
//         </div>
//       </UserContext.Provider>
//     </QueryClientProvider>
//   );
// }
