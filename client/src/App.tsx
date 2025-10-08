import { createContext, useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import FlipBookPage from "@/pages/flipbook";
import NotFound from "@/pages/not-found";

//import { AuthProvider, useAuth } from "@/contexts/AuthContext"
//import { ProtectedRoute } from "@/components/ProtectedRoute";
import { LoginForm } from "./pages/LoginForm";
//import { BodyParser } from "body-parser"

export type User = {
  id: string;
  username: string;
  email?: string;
};

export const UserContext = createContext<{
  user: User | null;
  setUser: (user: User | null) => void;
}>({
  user: null,
  setUser: () => { },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={FlipBookPage} />
      <Route path="/login" component={LoginForm} />
      <Route path="/document/:id" component={FlipBookPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <UserContext.Provider value={{ user, setUser }}>
          <Toaster />
          <Router />
        </UserContext.Provider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
